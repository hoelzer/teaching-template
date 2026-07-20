#!/usr/bin/env bash
#
# Verify that every local link in a rendered build resolves to a real file.
#
#   ./scripts/check-links.sh _site
#   ./scripts/check-links.sh _lms
#
# Catches two regressions that have already bitten once:
#   - .qmd links surviving into output (the `default` project type used by the
#     LMS profile does not rewrite them the way a website project does)
#   - links pointing at pages that were excluded from the render
#
# External (http/https) links are not checked -- that needs network access and
# belongs in a scheduled job, not the build.
#
set -euo pipefail

dir="${1:-_site}"

if [[ ! -d "$dir" ]]; then
  echo "error: '$dir' does not exist -- render it first" >&2
  exit 1
fi

broken=0
checked=0

while IFS= read -r page; do
  page_dir=$(dirname "$page")

  # Local hrefs only: skip absolute URLs, anchors, mailto:, data: etc.
  while IFS= read -r link; do
    [[ -z "$link" ]] && continue
    checked=$((checked + 1))
    target="${link%%#*}"            # strip any fragment
    [[ -z "$target" ]] && continue  # pure in-page anchor

    # A .qmd link must never survive into a build. Two ways it happens, both
    # bad, and neither is caught by an existence test:
    #   - the LMS build does not rewrite .qmd -> .html (see publish.sh)
    #   - linking to a session held back from the render allowlist makes
    #     Quarto copy its raw source into the output as a resource, so the
    #     file DOES exist and students get served markdown
    if [[ "$target" == *.qmd ]]; then
      echo "QMD LINK: $page -> $link"
      echo "          (a held-back session, or an unrewritten LMS link)"
      broken=$((broken + 1))
      continue
    fi

    if [[ ! -e "$page_dir/$target" ]]; then
      echo "BROKEN: $page -> $link"
      broken=$((broken + 1))
    fi
  done < <(grep -ohE 'href="[^":]*"' "$page" 2>/dev/null \
             | sed 's/^href="//; s/"$//' \
             | grep -vE '^(#|mailto:|data:|javascript:)' || true)

done < <(find "$dir" -name '*.html')

echo "checked $checked local link(s) in $dir"

if [[ "$broken" -gt 0 ]]; then
  echo "FAILED: $broken broken link(s)" >&2
  exit 1
fi

echo "OK: all local links resolve"
