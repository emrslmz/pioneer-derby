#!/usr/bin/env bash
# Formats the file Claude just edited with Prettier (and ESLint --fix for code files).
# Silently does nothing until dependencies are installed (Phase 0).
set -u

file=$(jq -r '.tool_input.file_path // empty')
[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
bin="node_modules/.bin"

case "$file" in
  *.vue|*.ts|*.tsx|*.js|*.mjs|*.cjs|*.scss|*.css|*.json|*.md|*.html)
    [ -x "$bin/prettier" ] && "$bin/prettier" --write --log-level=silent "$file" >/dev/null 2>&1
    ;;
esac

case "$file" in
  *.vue|*.ts|*.tsx|*.js|*.mjs)
    [ -x "$bin/eslint" ] && "$bin/eslint" --fix --no-warn-ignored "$file" >/dev/null 2>&1
    ;;
esac

exit 0
