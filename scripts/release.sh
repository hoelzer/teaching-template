#!/usr/bin/env bash
#
# Show which sessions exist in the repository and which are actually published.
#
#   ./scripts/release.sh status
#
# Read-only. Releasing a session means uncommenting its lines in the render
# allowlist in _quarto.yml -- deliberately a manual edit, so that publishing
# is always an explicit act rather than a side effect of writing content.
#
set -euo pipefail

cd "$(dirname "$0")/.."

cmd="${1:-status}"

if [[ "$cmd" != "status" ]]; then
  echo "usage: $0 status" >&2
  exit 2
fi

# A session is released if an uncommented render entry references its
# directory. Comment markers are what distinguish held-back from live.
is_released() {
  local dir="$1"
  grep -qE "^[[:space:]]*-[[:space:]]*\"${dir}/" _quarto.yml
}

printf "%-34s %s\n" "SESSION" "STATUS"
printf "%-34s %s\n" "-------" "------"

found=0
for dir in lectures/*/ practicals/*/ ; do
  [[ -d "$dir" ]] || continue
  dir="${dir%/}"
  found=1
  if is_released "$dir"; then
    printf "%-34s %s\n" "$dir" "released"
  else
    printf "%-34s %s\n" "$dir" "held back"
  fi
done

if [[ "$found" -eq 0 ]]; then
  echo "(no sessions found)"
  exit 0
fi

echo
echo "To release a session, uncomment its line in the render allowlist in"
echo "_quarto.yml, then run:  ./scripts/publish.sh site"
echo
echo "Note: schedule.qmd must not link to a held-back session -- the link"
echo "would 404. scripts/check-links.sh catches that in CI."
