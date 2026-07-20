/**
 * HTTP basic auth in front of the course site.
 *
 * Deployed as Cloudflare Pages "advanced mode": this file is copied to
 * _site/_worker.js at deploy time, and every request -- pages, images, CSS,
 * slide assets -- passes through it before env.ASSETS serves anything. That
 * is the point. The `functions/_middleware.js` convention was avoided because
 * the docs do not clearly state where wrangler discovers `functions/` during
 * a direct upload, and a middleware that silently fails to load would serve
 * the whole site unauthenticated.
 *
 * Credentials are Pages project environment variables (set in the Cloudflare
 * dashboard as encrypted secrets), NOT GitHub secrets and NOT in this repo:
 *
 *   COURSE_USER       e.g. "student"
 *   COURSE_PASSWORD   the shared password, posted in Moodle
 *
 * Use an ASCII password. atob() decodes bytes, so non-ASCII characters in the
 * credentials will not round-trip reliably across browsers.
 */

const REALM = "Course materials";

function unauthorized() {
  return new Response("Authentication required.\n", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      // Never let an intermediary cache the challenge or a rejected response.
      "Cache-Control": "no-store",
    },
  });
}

/** Constant-time comparison, so response timing does not leak the password. */
function safeEqual(a, b) {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  if (aBytes.length !== bBytes.length) return false;

  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

export default {
  async fetch(request, env) {
    const expectedUser = env.COURSE_USER;
    const expectedPassword = env.COURSE_PASSWORD;

    // Fail closed. If the secrets are missing or misspelled, refuse to serve
    // rather than publishing the whole course to the open internet.
    if (!expectedUser || !expectedPassword) {
      return new Response(
        "Site misconfigured: COURSE_USER / COURSE_PASSWORD are not set.\n",
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const header = request.headers.get("Authorization") || "";
    const [scheme, encoded] = header.split(" ");

    if (scheme !== "Basic" || !encoded) {
      return unauthorized();
    }

    let decoded;
    try {
      decoded = atob(encoded);
    } catch {
      return unauthorized();
    }

    // Split on the FIRST colon only -- passwords may legitimately contain one.
    const separator = decoded.indexOf(":");
    if (separator === -1) {
      return unauthorized();
    }

    const user = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);

    // Both comparisons always run, so timing does not reveal which failed.
    const userOk = safeEqual(user, expectedUser);
    const passwordOk = safeEqual(password, expectedPassword);

    if (!userOk || !passwordOk) {
      return unauthorized();
    }

    return env.ASSETS.fetch(request);
  },
};
