/**
 * Tests for the basic-auth worker. Run with plain node, no dependencies:
 *
 *   node cloudflare/worker.test.mjs
 *
 * Auth code that has never been exercised is how a site ends up publicly
 * readable without anyone noticing, so this covers the reject paths and the
 * misconfiguration path, not just the happy one.
 */

import worker from "./_worker.js";

const GOOD_USER = "student";
const GOOD_PASS = "alignment2026";

const env = {
  COURSE_USER: GOOD_USER,
  COURSE_PASSWORD: GOOD_PASS,
  ASSETS: { fetch: async () => new Response("SITE CONTENT", { status: 200 }) },
};

const basic = (u, p) => ({ Authorization: "Basic " + btoa(`${u}:${p}`) });
const req = (headers = {}) =>
  new Request("https://course.example/lectures/01-alignment/", { headers });

let failures = 0;

async function check(name, request, environment, expectedStatus, expectBody) {
  const res = await worker.fetch(request, environment);
  const body = await res.text();
  const ok =
    res.status === expectedStatus &&
    (expectBody === undefined || body.includes(expectBody));
  if (!ok) failures++;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${name}` +
      (ok ? "" : `  (got ${res.status}, wanted ${expectedStatus})`),
  );
}

console.log("=== rejects ===");
await check("no Authorization header", req(), env, 401);
await check("wrong password", req(basic(GOOD_USER, "wrong")), env, 401);
await check("wrong user", req(basic("someone", GOOD_PASS)), env, 401);
await check("empty credentials", req(basic("", "")), env, 401);
await check("Bearer instead of Basic", req({ Authorization: "Bearer abc" }), env, 401);
await check("malformed base64", req({ Authorization: "Basic !!!!" }), env, 401);
await check(
  "no colon in decoded value",
  req({ Authorization: "Basic " + btoa("nocolon") }),
  env,
  401,
);
await check(
  "password is a prefix of the real one",
  req(basic(GOOD_USER, GOOD_PASS.slice(0, -1))),
  env,
  401,
);
await check(
  "password is the real one plus a suffix",
  req(basic(GOOD_USER, GOOD_PASS + "x")),
  env,
  401,
);

console.log("=== fails closed when misconfigured ===");
await check("no secrets set", req(basic(GOOD_USER, GOOD_PASS)), { ASSETS: env.ASSETS }, 503);
await check(
  "only user set",
  req(basic(GOOD_USER, GOOD_PASS)),
  { COURSE_USER: GOOD_USER, ASSETS: env.ASSETS },
  503,
);
await check(
  "empty password treated as unset",
  req(basic(GOOD_USER, "")),
  { COURSE_USER: GOOD_USER, COURSE_PASSWORD: "", ASSETS: env.ASSETS },
  503,
);

console.log("=== accepts ===");
await check("correct credentials", req(basic(GOOD_USER, GOOD_PASS)), env, 200, "SITE CONTENT");
await check(
  "password containing a colon",
  req(basic(GOOD_USER, "a:b:c")),
  { ...env, COURSE_PASSWORD: "a:b:c" },
  200,
  "SITE CONTENT",
);

console.log("=== challenge header ===");
const challenge = await worker.fetch(req(), env);
const wwwAuth = challenge.headers.get("WWW-Authenticate") || "";
const headerOk = wwwAuth.startsWith("Basic realm=");
if (!headerOk) failures++;
console.log(`  ${headerOk ? "PASS" : "FAIL"}  sends Basic challenge  [${wwwAuth}]`);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
