# Teaching Template

Course infrastructure as code: Quarto + pixi + Git. One vertical slice
(lecture 01 and practical 01) built end to end, to be extracted into a reusable
template once it has survived a real semester.

## Quick start

```bash
pixi install          # environment, incl. bioconda CLI tools
pixi run preview      # live-reloading site at localhost:4200
pixi run test         # run practical solutions against their tests
pixi run site         # render the website into _site/
pixi run lms          # render self-contained pages into _lms/
pixi run status       # which sessions are published, which are held back
pixi run check        # verify links and published output
```

## Layout

```
_quarto.yml               website config; also controls what is NOT rendered
_quarto-lms.yml           profile for Moodle delivery (self-contained HTML)
_course.yml               semester config — the only file to edit on rollover
pixi.toml / pixi.lock     environment; lockfile MUST be committed

lectures/01-alignment/    index.qmd, slides.qmd (revealjs), notes.qmd
practicals/01-alignment/  index.qmd, starter/, solution/, data/, tests/
shared/partials/          content included by both slides and notes
styles/                   slides.scss, website.scss
instructor/               retrospectives, plans — never rendered
scripts/publish.sh        deliberate publish step (site or LMS)
scripts/release.sh        show which sessions are published
scripts/check-links.sh    every local link resolves; no .qmd links survive
scripts/check-output.sh   no solutions, instructor material or source files
cloudflare/_worker.js     basic auth in front of the site; fails closed
cloudflare/worker.test.mjs  auth tests (plain node, no dependencies)
.github/workflows/        validate every push; deploy main to Cloudflare
```

## Design decisions

**Slides and notes are separate files sharing partials.** Slides need to be
sparse; notes need to be complete. Generating one from the other produces bad
versions of both. Shared definitions live in `shared/partials/` and are included
by each.

**`main` deploys continuously; sessions are released deliberately.** These are
separate gates. Every push to `main` that passes validation deploys to
Cloudflare Pages, so a typo fix reaches students in minutes. But a *session*
only becomes visible when you add it to the render allowlist — so continuous
deployment never publishes something before you meant it to.

**Solutions are excluded at build time, not access-controlled.** `_quarto.yml`
keeps `instructor/**` and `**/solution/**` out of `_site/` and `_lms/`, and CI
fails if either leaks. But those files are still in the repository — it must
stay private, and exams belong in a separate repository.

**Tags, not branches, for semesters.** Tag what you actually taught
(`v2026-winter`); keep improving `main`. Parallel semester branches diverge and
become four courses to maintain.

## Publishing and releasing

Content lives in exactly one place: the hosted site. Moodle holds the URL and
the password, not copies of the material. Fixing an error means one push, and
every student has it — there is no second copy to drift out of date.

Weekly loop:

```bash
pixi run preview   # write, check locally
pixi run status    # what is currently published
# release a session: uncomment its lines in the render allowlist in _quarto.yml
pixi run check     # links + output guards (CI runs these too)
git push           # validation, then deploy to Cloudflare Pages
```

`scripts/publish.sh site` still exists for rsync to a self-hosted server; it is
the fallback path, not the normal one.

### Hosting: Cloudflare Pages behind a password

The site is deployed by CI and protected by HTTP basic auth, so it is a
delimited group of participants rather than open publication — which matters
for teaching material containing third-party figures (§60a UrhG).

GitHub Pages was ruled out: it cannot be password-protected. Access-controlled
Pages requires Enterprise Cloud and grants access to *people with repository
read access*, which would hand students the unreleased content. Cloudflare
Access was ruled out too — its free tier is 50 seats, and four modules over
several years is hundreds of students.

Auth is a `_worker.js` copied into the deployed directory, which intercepts
every request including static assets. It **fails closed**: if the credentials
are unset, it returns 503 rather than serving the site.

There is **no GitHub–Cloudflare integration**. CI renders the site and uploads
it with `wrangler` (Direct Upload), so Cloudflare never has access to the
repository. Consequences worth knowing: the repository can stay private without
any special plan, and transferring or renaming it does not touch deployment.

### Setting up hosting for a module

One Pages project per module, because each module is its own repository and its
own site. The free tier allows 100 projects.

| Step | How often |
|---|---|
| `wrangler login` | once, ever |
| API token (Pages: Edit) | once — works for every project in the account |
| Account ID | once — same value everywhere |
| Create Pages project | per module |
| `COURSE_USER` / `COURSE_PASSWORD` | per module |
| Custom domain | per module |
| GitHub secrets + variable | per module |

Organization-level secrets do not help: on GitHub Free they are not readable
from private repositories.

**0. First commit in a new module: swap in the module's `CLAUDE.md`.**

```bash
git rm CLAUDE.md && git mv CLAUDE-module.md CLAUDE.md
# then replace the <module> / <MODULE> placeholders, and fill in _course.yml
```

Do this before anything else. The template's own `CLAUDE.md` states that the
repository is public and must contain no real institution, module code or term.
That is correct upstream and **inverted** in a module: a private module repo is
precisely where the real values belong. Left in place it instructs the next
reader — human or agent — to strip the course configuration back out.

**Naming.** Keep repository name, Pages project name and subdomain label
identical, so there is nothing to map:

```
repo:    hoelzer-science/course-bioinformatics
project: course-bioinformatics
domain:  course-bioinformatics.hoelzer.science
```

The **`course-` prefix marks a password-protected module**. Public sites — the
teaching hub, a research group page, standalone open resources — take bare
labels (`teaching`, `bioinformatics`, `linux`). Two reasons this matters:

- The domain's first-level labels are a scarce, permanent namespace and should
  belong to durable identities, not to individual modules. A course called
  `bioinformatics` blocks that label for a research group forever.
- Nesting instead (`bioinformatics.teaching.example.com`) is not available on
  the free tier: Universal SSL covers the apex and `*.example.com`, but not
  `*.teaching.example.com`. Everything must live one level deep, so a prefix is
  the only disambiguation there is.

Rename before the first semester or not at all — afterwards it means bookmarks,
LMS links and a certificate reissue.

**1. Create the Pages project.** It must exist before the first CI deploy.

```bash
npx wrangler login
npx wrangler pages project create <name> --production-branch=main
npx wrangler whoami          # prints the Account ID
```

**2. Set the credentials on the Pages project.** Cloudflare dashboard →
Workers & Pages → project → Settings → Environment variables → **Production**,
as encrypted secrets:

- `COURSE_USER` — e.g. `student`
- `COURSE_PASSWORD` — the shared password, posted in Moodle (ASCII only;
  `atob()` decodes bytes, so non-ASCII will not round-trip reliably)

These are **Cloudflare** variables read by the worker at runtime, not GitHub
secrets. Putting them in the wrong place is the most common setup mistake.

Preview deployments use a separate environment. If you leave Preview unset,
preview URLs return 503 — the worker failing closed, which is the safe
default. Set the same two variables on Preview only if you want previews
usable.

**3. Create an API token.** Cloudflare dashboard → My Profile → API Tokens →
Create Token → Custom token → permission **Account → Cloudflare Pages → Edit**.
Copy it immediately; it is shown once. The same token works for all modules.

**4. Configure the GitHub repository.** Settings → Secrets and variables →
Actions:

- Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- Variables: `CLOUDFLARE_PROJECT_NAME`

The project name is a variable, not a secret — it is not sensitive, and having
it visible in logs makes deploy failures readable. CI fails with an explicit
message naming anything missing.

Note that repository secrets do **not** survive a repository transfer. Move a
repository between accounts or organizations *before* configuring these.

**5. Add the custom domain.** Workers & Pages → project → **Custom domains** →
*Set up a custom domain*.

Do **not** create the DNS record by hand. Cloudflare creates it, binds the
hostname to the project, and issues the certificate. A manually created record
does none of that — and an `A` record is wrong regardless, since Pages has no
static IP. (By hand it would be a proxied `CNAME` to `<project>.pages.dev`, but
the hostname would still not be bound to the project.)

Keep subdomains **one level deep**. Universal SSL covers the apex and
`*.example.com`, but not `*.teaching.example.com`; two-level subdomains need
the paid Advanced Certificate Manager.

A brief SSL warning right after adding the domain is normal while the
certificate issues.

### Verifying a new deployment

Two checks, both by hand, because a routing mistake here publishes the course:

1. A private-window visit to the site prompts for the password.
2. A direct asset URL — e.g. `/lectures/01-alignment/slides.html` — **also**
   prompts rather than loading.

If the first prompts but the second loads, the worker is not intercepting asset
requests and the site is effectively public.

The `<project>.pages.dev` URL keeps working alongside the custom domain and is
protected by the same worker.

To change the password mid-semester, edit the Pages environment variable and
redeploy — no repository change needed.

**Releasing is an allowlist, not a draft flag.** Only sessions listed in
`project.render` in `_quarto.yml` are rendered; everything else has no page and
no URL. This is deliberate: forgetting to *add* a session means it is quietly
unpublished (harmless, obvious), whereas forgetting to *exclude* one would
publish unfinished material. Quarto's `draft:` feature is not used — `unlinked`
still serves the full page to anyone who guesses the URL, and `gone` publishes
an empty page. Neither is access control.

**Access control is a password on the webserver**, not repository visibility —
HTTP basic auth with one shared password, posted in Moodle.

**No PDFs are generated.** Students can export slides themselves via the
reveal.js Tools menu → PDF export mode → print. Generating PDFs weekly is
overhead for a format most will not use.

The `_lms` build is kept for two narrow cases: offline access, and an
end-of-semester archive. It is not the primary channel.

## Syncing changes with module repositories

Each module is a **separate** repository created from this template ("Use this
template"), so the module gets an *unrelated* git history — no shared commits.
That rules out merge and rebase between the two, but `git cherry-pick` applies a
commit's diff and does not need shared ancestry, so it works fine in both
directions:

- **template → module:** a template improvement you want an existing module to
  pick up.
- **module → template (the common case):** an infrastructure fix you made while
  teaching, backported so future modules inherit it.

One-time setup, from inside the template repo:

```bash
git remote add course-bioinformatics ~/git/course-bioinformatics   # adjust path
git fetch course-bioinformatics
git log course-bioinformatics/main --oneline         # find the commit to take
git cherry-pick <sha>
pixi run check                                       # confirm it still builds
```

### The discipline that makes this painless

**Keep infrastructure changes in their own commits, separate from content.** A
commit that only touches `scripts/`, `.github/` or `styles/` cherry-picks
cleanly. A commit that mixes a script fix with three new lecture slides drags
course content into the template. In the module, commit infra alone, then
content separately.

What is safe to move, and what is not:

| Backportable (infra) | Not backportable (content) |
|---|---|
| `scripts/`, `.github/`, `cloudflare/` | `lectures/*/`, `practicals/*/` material |
| `styles/`, `404.html`, `guide.qmd` | `_course.yml` values, schedule entries |
| `pixi.toml` tooling dependencies | session lists in the render allowlist |

`_quarto.yml` is the one file mixing both — project config (infra) plus the
navbar and render allowlist (content). Cherry-picks touching it may conflict;
resolve by taking only the config change and keeping the module's own session
list.

This is the pragmatic middle between copying files by hand (loses history, easy
to forget) and a shared Quarto extension (more machinery than the shared surface
yet justifies — see "Not done yet"). Revisit the extension only once several
modules exist and the backporting itself becomes the chore.

## Gotchas discovered while building this

These cost time to find. They are the reason the slice was built before the
template.

1. **Path resolution differs by context.** `{{< include >}}` resolves from the
   *project root* (`/shared/partials/x.qmd`); `theme:` resolves relative to the
   *document* (`../../styles/slides.scss`). Using the wrong one fails at render.

2. **`embed-resources` is incompatible with website projects.** Websites are
   built around a shared `site_libs/`. The LMS profile overrides
   `project.type` to `default` to get self-contained output.

3. **Never declare a format at project level that documents don't share.**
   Putting `revealjs:` in the LMS profile made `notes.qmd` render to both HTML
   and reveal.js — both writing `notes.html`, so the build failed on a file
   collision with a confusing error.

4. **Chalkboard and `embed-resources` are mutually exclusive.** Live annotation
   won; slides are delivered via the hosted site rather than as a single file.

5. **Only website projects rewrite `.qmd` links to `.html`.** Because the LMS
   profile must use `project.type: default` (see 2), every internal link came
   out as `href="...index.qmd"` and 404'd. `scripts/publish.sh lms` rewrites
   them as a post-processing step, and `scripts/check-links.sh` guards it.

6. **Linking to a held-back session publishes its source.** Quarto resolves a
   link to a non-rendered document by copying the raw `.qmd` into the output as
   a resource — so the file exists, the link "works", and students are served
   markdown. An existence test does not catch this, which is why
   `check-links.sh` rejects every `.qmd` href outright and `check-output.sh`
   fails on any source file in a build.

7. **bioconda has no Windows builds.** `pixi.toml` lists only macOS and Linux
   platforms. Students on Windows need WSL2 — plan the first practical session
   around this.

8. **GitHub Pages cannot be password-protected.** Access-controlled Pages needs
   Enterprise Cloud, and grants access to people with *repository read access* —
   which would hand students the unreleased content. Cloudflare Access is 50
   seats on the free tier, far too few across modules and years. Hence a worker
   doing basic auth.

## Verified

Site and LMS builds render; `mafft` 7.526 and Biopython 1.87 install from
bioconda on Python 3.12; all six practical tests pass, including a cross-check
of the reference Needleman–Wunsch against Biopython's `PairwiseAligner`; auth
worker passes 15 cases covering rejects, fail-closed and happy paths; ruff
clean; no solution content in either build.

Not verified locally: the Cloudflare deploy itself, which needs an account and
API token. Everything up to the `wrangler` call is exercised in CI.

## Licensing

Dual-licensed, because code and teaching content want different terms:

- **Code** (scripts, workflows, `.py`, `.scss`, config) — MIT, see `LICENSE`
- **Teaching content** (slides, notes, exercises, figures) — CC BY-SA 4.0,
  see `LICENSE-CONTENT`

Third-party figures or data reproduced from elsewhere keep their original
terms and are attributed where used.

## Not done yet

- extract shared design into a Quarto **extension** so future modules inherit
  updates instead of copying them (template repos do not propagate changes)
- fill in `_course.yml` (course URL and Moodle link once they exist)
- real content

Optional: `COURSE_REMOTE_HOST` in `scripts/publish.sh`, only if you ever want
the rsync fallback to a self-hosted server instead of Cloudflare.
