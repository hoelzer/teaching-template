# CLAUDE.md — teaching-template

Permanent onboarding for this repository. Changes only when project knowledge
changes. Current working state lives in `NEXT.md`; session history in
`docs/sessions/`.

> **`README.md` is the real documentation.** It covers the layout, the design
> decisions, the full Cloudflare walkthrough, the cherry-pick sync workflow and
> eight hard-won gotchas. This file deliberately does **not** repeat it — read
> README first and treat it as authoritative. What follows is only the framing
> and the working rules a fresh session needs on top of it.

## Project overview

A reusable course skeleton: Quarto + pixi + Git, with one vertical slice
(lecture 01, practical 01) built end to end. Module repositories are created
from it with "Use this template" and then diverge.

Kept **public on purpose** — it is the open-educational-resource anchor that
teaching-hub points at. Making it private was proposed on 2026-07-21 and
rejected for that reason.

## Goals

- Let a new module start from working infrastructure instead of a blank repo.
- Be genuinely reusable by other educators, not just by Martin.
- Keep the per-semester rollover to a one-file edit (`_course.yml`).

## High-level architecture

```
teaching-hub          public    public front door             teaching.hoelzer.science
teaching-template     public    this repo — course skeleton   teaching-template.hoelzer.science (401)
<module>              private   actual courses                <module>.hoelzer.science (401)
<shared-prerequisite> public    material every module needs   (planned)
```

The fourth kind exists because cherry-pick sync moves **infrastructure only** — content
copied into each module drifts. Material every module needs and none owns (first case: a
Linux/bash crash course) gets its own public repo instead, and modules **link** to it from
`guide.qmd` rather than carrying a copy. Do not add such material to this template.

Sites are Quarto → Cloudflare Pages (Direct Upload from CI), fronted by
`cloudflare/_worker.js` doing HTTP basic auth that **fails closed**. There is no
GitHub–Cloudflare integration, so the repo can be private without a paid plan.

See README for the stack table, the layout map and why each choice was made.

## Coding conventions and style

- Hard-wrap prose at roughly 80 columns.
- Student-facing prose is **operational**: what to do, not why. The reasoning
  lives on the public hub (`teaching.hoelzer.science/philosophy`), which
  `guide.qmd` links to once.
- Anything that varies by course goes through `_course.yml` and
  `{{< meta course.* >}}` — never hardcode a course name, term, institution or
  LMS in prose.
- Python: `ruff` clean (`pixi run lint`).

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
2. **Keep infrastructure commits separate from content commits.** This is not
   style — it is what makes cherry-pick sync work. See README, "The discipline
   that makes this painless".
3. Push to `main`: CI validates, then deploys. Releasing a *session* is a
   separate gate — add it to the render allowlist in `_quarto.yml`.

## Known constraints

- **Publishing constraint (important).** This repository is public. No real
  institution name, module code, term, or scheduled course may appear in it —
  including in commit messages. `_course.yml` ships **placeholders**; the real
  values live only in the private module repos that override them. This leaked
  once (2026-07-21) and had to be fixed. If a change would add any of these,
  stop and ask.
- **Module sync is cherry-pick only.** "Use this template" gives modules an
  unrelated history, so merge and rebase are impossible. Backports go both ways;
  module → template is the common direction.
- **Never cherry-pick the `_course.yml` placeholder commit** (`87ea33f`) into a
  module — it would clobber that course's real configuration.
- **bioconda has no Windows builds.** `pixi.toml` lists macOS and Linux only;
  students on Windows need WSL2. Plan the first practical around it.
- `styles/website.scss` is duplicated by hand with the hub — keep the palette
  variables in sync. A shared Quarto extension is deliberately deferred until
  several modules exist.
- README's "Gotchas discovered while building this" is not optional reading —
  most of those failures are silent (published `.qmd` source, broken LMS links,
  file-collision errors with misleading messages).

## Important architectural decisions

These are summarised only so a session knows they exist; README has the reasoning.

- Slides and notes are separate files sharing partials — neither generates well
  from the other.
- `main` deploys continuously, but sessions are released deliberately via an
  **allowlist**, so CD never publishes unfinished material early.
- Solutions are excluded at **build time**, not access-controlled — so the
  repository itself must stay private, and exams belong elsewhere.
- Tags, not branches, for semesters.
- Access control is a password on the webserver, not repository visibility.
- No PDFs are generated; students export slides themselves.
- Dual licence: MIT for code, CC BY-SA 4.0 for teaching content.

## Things future sessions should always know

- Read `README.md`, then `NEXT.md`, then the newest file in `docs/sessions/`.
- This repo is **public**; the hub is public; module repos are private. Assume
  anything here is world-readable, including history.
- Verify any new course-site deployment by hand on a **direct asset URL**
  (e.g. `/lectures/01-alignment/slides.html`), not just the landing page. If the
  landing page prompts but the asset loads, the worker is not intercepting
  assets and the site is effectively public.
- `gh` is installed and authenticated as `hoelzer`; `wrangler` is authenticated
  via OAuth. Cloudflare account ID `6398bee0e2141168cd3fccf8cfbfe6ee`.
