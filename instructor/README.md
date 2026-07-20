# Instructor material

Not rendered into the site. `_quarto.yml` excludes `instructor/**` and
`**/solution/**` from `project.render`, so nothing here reaches `_site/`
or `_lms/`.

**That is a build-time exclusion, not access control.** These files are in
the Git repository. Anyone with repository access can read them. Since this
course is distributed via Moodle rather than published, that is fine — but it
means:

- the repository must stay **private**
- exams belong in a **separate** private repository, not here
- if the repository is ever opened up, solutions and notes must move out first

## Contents

- `semester-notes/` — post-session retrospectives, one file per session per
  semester. Written immediately after teaching, while it is still fresh.
  Over several years this is the most valuable directory in the repository:
  it is the only place that records what actually happened in the room.
- `lesson-plans/` — timing and delivery notes.
- `grading/` — rubrics.

## Semester rollover

1. Tag the state you actually taught: `git tag v2026-winter && git push --tags`
2. Write the retrospectives (if not already done per session).
3. Work the improvements into `main`.
4. Update `_course.yml` for the new term.

Do not branch per semester and let branches diverge — tag instead. Tags are
free, and a tag records history without creating a parallel version to
maintain.
