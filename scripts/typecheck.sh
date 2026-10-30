#!/usr/bin/env bash
# Type-check gate.
#
# Fails on any TypeScript error in project code. Errors reported inside the
# third-party Astal GJS package (/usr/share/astal/gjs) are the documented
# baseline — see docs/development.md ("Type checking") — and do not fail the
# gate, so the gate stays robust against astal version drift on any machine.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

output="$(npx tsc --noEmit --pretty false 2>&1 || true)"

project_errors="$(printf '%s\n' "$output" | grep 'error TS' | grep -v '/usr/share/astal/gjs/' || true)"

if [ -n "$project_errors" ]; then
    printf '%s\n' "$project_errors"
    echo "typecheck: project type errors found (third-party astal errors are tolerated, see docs/development.md)" >&2
    exit 1
fi

echo "typecheck: clean (third-party astal baseline errors, if any, are tolerated)"
