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
.github/workflows/        validation only; nothing deploys from CI
```

## Design decisions

**Slides and notes are separate files sharing partials.** Slides need to be
sparse; notes need to be complete. Generating one from the other produces bad
versions of both. Shared definitions live in `shared/partials/` and are included
by each.

**Nothing deploys automatically.** CI validates (lint, tests, render, leak
check); publishing is a deliberate `scripts/publish.sh` run. Week 5 goes out
when week 5 is ready, not when `main` changes. Since the course is distributed
via Moodle and a self-hosted site, there is no Pages deployment at all.

**Solutions are excluded at build time, not access-controlled.** `_quarto.yml`
keeps `instructor/**` and `**/solution/**` out of `_site/` and `_lms/`, and CI
fails if either leaks. But those files are still in the repository — it must
stay private, and exams belong in a separate repository.

**Tags, not branches, for semesters.** Tag what you actually taught
(`v2026-winter`); keep improving `main`. Parallel semester branches diverge and
become four courses to maintain.

## Publishing and releasing

Content lives in exactly one place: the self-hosted site. Moodle holds the URL
and the password, not copies of the material. Fixing an error means one
`publish.sh site` and every student has it — there is no second copy to drift.

Weekly loop:

```bash
pixi run preview            # write, check locally
pixi run status             # what is currently published
# release a session: uncomment its lines in the render allowlist in _quarto.yml
pixi run check              # links + output guards
./scripts/publish.sh site   # render and rsync
```

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

## Verified

Site and LMS builds render; `mafft` 7.526 and Biopython 1.87 install from
bioconda on Python 3.12; all six practical tests pass, including a cross-check
of the reference Needleman–Wunsch against Biopython's `PairwiseAligner`; ruff
clean; no solution content in either build.

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
- configure `COURSE_REMOTE_HOST` in `scripts/publish.sh`
- fill in `_course.yml`
- real content
