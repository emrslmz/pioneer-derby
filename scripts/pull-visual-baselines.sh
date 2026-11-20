#!/usr/bin/env bash
# Pulls the Linux visual baselines produced by a failed "Visual tests" CI job into
# tests/visual/__snapshots__/, after checking every screenshot was identical across retries.
#
#   npm run visual:pull -- <run-id>      (run id from the PR's failed CI run)
set -euo pipefail

run_id="${1:?usage: npm run visual:pull -- <run-id>}"
repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

gh run download "$run_id" --repo "$repo" --name visual-baselines --dir "$tmp"
target="tests/visual/__snapshots__"
copied=0

# New baselines (no previous file): Playwright wrote them straight into __snapshots__.
if compgen -G "$tmp/tests/visual/__snapshots__/*-linux.png" > /dev/null; then
  for file in "$tmp"/tests/visual/__snapshots__/*-linux.png; do
    name="$(basename "$file")"
    [[ -f "$target/$name" ]] || { cp "$file" "$target/$name"; copied=$((copied + 1)); }
  done
fi

# Changed baselines: Playwright left "<name>-actual.png" per attempt in test-results.
while IFS= read -r actual; do
  dir="$(dirname "$actual")"
  name="$(basename "$actual" -actual.png)"
  for retry in "$dir"-retry*; do
    [[ -f "$retry/$name-actual.png" ]] || continue
    if ! cmp -s "$actual" "$retry/$name-actual.png"; then
      echo "✗ $name differs between attempts — fix the flakiness before updating baselines." >&2
      exit 1
    fi
  done
  cp "$actual" "$target/$name-linux.png"
  copied=$((copied + 1))
done < <(find "$tmp/test-results" -name '*-actual.png' -not -path '*-retry*' 2>/dev/null)

echo "✓ $copied baseline(s) updated in $target — review them with git diff, then commit."
