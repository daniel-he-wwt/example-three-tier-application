#!/usr/bin/env bash
# find-todos.sh — list outstanding TODO/FIXME/HACK/XXX markers in the codebase.
#
# Usage:
#   scripts/find-todos.sh [path]
#
# If no path is given, the whole repository (from its root) is scanned.
# Common noise directories/files (node_modules, .git, build output, lock
# files, this script and the docs that reference it, etc.) are excluded
# automatically. Matching is case-sensitive and word-bounded so things like
# the "todo" app name or "colinhacks" don't show up as false positives.

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
search_path="${1:-$repo_root}"

pattern='\b(TODO|FIXME|HACK|XXX)\b'

exclude_dirs=(.git node_modules dist build .next out .turbo coverage)
exclude_files=(
  'package-lock.json'
  'yarn.lock'
  'pnpm-lock.yaml'
  'find-todos.sh'
  'agents.md'
  'todos.md'
)

if command -v rg >/dev/null 2>&1; then
  exclude_args=()
  for dir in "${exclude_dirs[@]}"; do
    exclude_args+=(--glob "!${dir}")
  done
  for file in "${exclude_files[@]}"; do
    exclude_args+=(--glob "!${file}")
  done
  matches="$(rg -n --no-heading -e "$pattern" "${exclude_args[@]}" "$search_path" || true)"
else
  exclude_args=()
  for dir in "${exclude_dirs[@]}"; do
    exclude_args+=(--exclude-dir="$dir")
  done
  for file in "${exclude_files[@]}"; do
    exclude_args+=(--exclude="$file")
  done
  matches="$(grep -rn -I -E "$pattern" "${exclude_args[@]}" "$search_path" 2>/dev/null || true)"
fi

if [ -z "$matches" ]; then
  echo "No outstanding TODO/FIXME/HACK/XXX markers found in: $search_path"
  exit 0
fi

echo "$matches"
echo
count="$(printf '%s\n' "$matches" | wc -l | tr -d ' ')"
echo "Total outstanding items: $count"
