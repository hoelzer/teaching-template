#!/usr/bin/env bash
#
# Verify a rendered build contains only what students should receive.
#
#   ./scripts/check-output.sh _site
#   ./scripts/check-output.sh _lms
#
# Three separate failure modes, all seen in practice:
#   1. instructor material or reference solutions reaching the output
#   2. raw source files copied in as resources -- Quarto does this when a
#      page links to a document held back from the render allowlist, which
#      publishes the source of an unreleased session
#   3. leftovers from a previous render of a since-unreleased session
#      (output-dir is not pruned automatically)
#
set -euo pipefail

dir="${1:-_site}"

if [[ ! -d "$dir" ]]; then
  echo "error: '$dir' does not exist -- render it first" >&2
  exit 1
fi

fail=0

echo "== $dir =="

# 1. Instructor / solution material -------------------------------------
if grep -ril "reference solution" "$dir/" >/dev/null 2>&1 ; then
  echo "FAIL: solution text found in $dir/"
  grep -ril "reference solution" "$dir/" | sed 's/^/      /'
  fail=1
fi

if find "$dir/" -path '*solution*' -print 2>/dev/null | grep -q . ; then
  echo "FAIL: a path containing 'solution' was rendered into $dir/"
  find "$dir/" -path '*solution*' | sed 's/^/      /'
  fail=1
fi

if find "$dir/" -path '*instructor*' -print 2>/dev/null | grep -q . ; then
  echo "FAIL: instructor material found in $dir/"
  find "$dir/" -path '*instructor*' | sed 's/^/      /'
  fail=1
fi

# 2. Raw source files ----------------------------------------------------
# site_libs is third-party and legitimately contains .md/.yml.
sources=$(find "$dir" -type f \( -name '*.qmd' -o -name '*.py' \) \
            -not -path '*site_libs*' 2>/dev/null || true)

if [[ -n "$sources" ]]; then
  echo "FAIL: raw source files published in $dir/"
  echo "      (usually caused by linking to a held-back session)"
  echo "$sources" | sed 's/^/      /'
  fail=1
fi

if [[ "$fail" -eq 0 ]]; then
  echo "OK: nothing published that should not be"
fi

exit "$fail"
