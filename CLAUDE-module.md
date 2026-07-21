# CLAUDE.md — course-<module>

<!--
THIS IS THE MODULE VERSION. In a repo created from teaching-template, run:

    git rm CLAUDE.md && git mv CLAUDE-module.md CLAUDE.md

then replace every <module> / <MODULE> placeholder below. Do this as the first
commit in a new module, before anything else: the template's own CLAUDE.md
states that the repository is public and must not contain real course values,
which is correct upstream and dangerously wrong in a module.
-->

Permanent onboarding for this repository. Changes only when project knowledge
changes. Current working state lives in `NEXT.md`; session history in
`docs/sessions/`.

> This repository was created from **teaching-template** with "Use this
> template", so it has an *unrelated* git history starting from a single initial
> commit. `README.md` came with it and is the authoritative documentation for
> the infrastructure — layout, Cloudflare walkthrough, release allowlist and
> eight hard-won gotchas. Read it first; this file does not repeat it.

## Project overview

The <MODULE> module: <lecture and practical, audience>. A Quarto site deployed
to **course-<module>.hoelzer.science**, password-protected for enrolled
students.

This is **the course itself**, not the skeleton. Course content lives here;
reusable infrastructure belongs upstream in the template.

## This repository is PRIVATE — and that is load-bearing

Unlike the hub and the template, this repo is private, and things depend on it
staying that way:

- **Solutions and instructor material are excluded at build time, not access
  controlled.** `_quarto.yml` keeps `instructor/**` and `**/solution/**` out of
  `_site/`, and CI fails if either leaks — but the files are still *in the
  repository*. Making this repo public would publish every solution.
- **`_course.yml` holds the real course values** — institution, module code,
  term. That is correct *here*; the public template ships placeholders. Never
  backport that file upstream.
- Exams belong in a **separate** repository, not this one.

The rendered site is protected separately, by HTTP basic auth in
`cloudflare/_worker.js`, which fails closed.

## Relation to the other repositories

```
teaching-hub          public    front door                    teaching.hoelzer.science
teaching-template     public    the skeleton this came from   teaching-template.hoelzer.science (401)
course-<module>       private   this repo                     course-<module>.hoelzer.science (401)
<shared-prerequisite> public    material every module needs   (e.g. linux.hoelzer.science)
```

The `course-` prefix marks a password-protected enrolled module; public sites
take bare labels. Repo name, Pages project name and subdomain label are
identical.

## Syncing with the template

**Cherry-pick only** — never merge or rebase. The histories are unrelated by
construction, so there is no common ancestor.

- **module → template** is the common direction: an infrastructure fix made
  while teaching, backported so future modules inherit it.
- **template → module** for improvements made upstream.

```bash
# from inside the template repo
git remote add course-<module> ~/git/course-<module>
git fetch course-<module>
git log course-<module>/main --oneline
git cherry-pick <sha>
```

**Keep infrastructure commits separate from content commits.** This is what
makes the above work: a commit touching only `scripts/`, `.github/`, `styles/`
or `guide.qmd` cherry-picks cleanly, while one mixing a script fix with three
lecture slides drags course content upstream. See README, "The discipline that
makes this painless", for the full table.

**Never backport:** `_course.yml`, schedule entries, session lists in the render
allowlist, and anything under `lectures/` or `practicals/`.

## Common commands

```bash
pixi install       # environment, incl. bioconda CLI tools
pixi run preview   # live-reloading site
pixi run test      # practical solutions against their tests
pixi run check     # links + output guards; what CI runs
pixi run status    # which sessions are published, which are held back
```

## Development workflow

1. Edit, `pixi run preview`, `pixi run check`.
2. Push to `main`: CI validates, then deploys.
3. **Releasing a session is a separate gate** from deploying. Only sessions
   listed in `project.render` in `_quarto.yml` exist on the site at all; adding
   one to the allowlist is what publishes it.

## Known constraints

- **Verify auth by hand after any hosting change**, on a **direct asset URL**
  (e.g. `/lectures/01-alignment/slides.html`), not just the landing page. If the
  landing page prompts but the asset loads, the worker is not intercepting
  assets and the course is effectively public. Check the `*.pages.dev` fallback
  URL too. A **401 means the worker read the credentials**; a 503 means they are
  unset and it is failing closed.
- `COURSE_USER` / `COURSE_PASSWORD` are **Cloudflare Pages** environment
  variables read by the worker at runtime — not GitHub secrets. Putting them in
  the wrong place is the most common setup mistake. Preview deployments use a
  separate environment; if unset, previews return 503, the safe default.
- GitHub side: secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; variable
  `CLOUDFLARE_PROJECT_NAME` = `course-<module>`.
- **bioconda has no Windows builds.** Students on Windows need WSL2; set it up
  together in the first practical.
- `pixi run lms` prints an EXCEPTION about `slides.html` not being
  self-contained. This is **expected** (README gotcha #4: chalkboard is
  incompatible with `embed-resources`), exit code is 0, and CI passes.
- README's "Gotchas discovered while building this" is not optional reading —
  most of those failures are silent, including one where linking to a held-back
  session serves students the raw `.qmd`.

## Audience

BSc and MSc students in **biotechnology and medical technology** at a university
of applied sciences. Hands-on and applied; programming is not their main focus.
Assume a basic computational science lecture and perhaps some Python or R
touched elsewhere — **assume no command line experience**. Concrete biological
examples (FASTA files, real sequences) land better than abstract `foo`/`bar`.

A Linux/bash crash course is a prerequisite for the practicals. It lives in its
own public repository and is **linked**, not copied.

## Things future sessions should always know

- Read `README.md`, then `NEXT.md`, then the newest file in `docs/sessions/`.
- `NEXT.md` and `docs/sessions/` are gitignored, inherited from the template's
  convention. Here that is habit rather than necessity, since this repo is
  private — but keep it, so one rule holds across all the teaching repos.
- `gh` is authenticated as `hoelzer`; `wrangler` via OAuth. Cloudflare account
  ID `6398bee0e2141168cd3fccf8cfbfe6ee`.
