#!/usr/bin/env bash
# Bootstrap a fresh HyprPanel checkout for development.
#
# Idempotent: safe to run repeatedly. Installs Node dependencies,
# registers the external/ags-types submodule, and copies the GIR type
# declarations into the gitignored @girs/ directory where the TypeScript
# compiler can find them.
#
# Usage: npm run bootstrap

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

log() {
    printf '\033[1;34m[bootstrap]\033[0m %s\n' "$1"
}

fail() {
    printf '\033[1;31m[bootstrap] ERROR:\033[0m %s\n' "$1" >&2
    exit 1
}

# --- 1. Check build prerequisites -----------------------------------------
log "Checking build prerequisites..."

for bin in node npm meson ninja ags gjs git; do
    command -v "$bin" >/dev/null 2>&1 || fail "'$bin' not found in PATH. Install it and re-run."
done

# --- 2. Register the ags-types submodule ----------------------------------
# .gitmodules declares external/ags-types, which provides the @girs type
# declarations used for type checking. It is not initialized on clone.
log "Initializing external/ags-types submodule..."
git submodule update --init --recursive
[ -d external/ags-types/@girs ] || fail "Submodule contents missing: external/ags-types/@girs not found."

# --- 3. Install Node dependencies -----------------------------------------
# package.json points the 'astal' dependency at the system Astal package.
log "Installing Node dependencies..."
npm install

# --- 4. Verify the astal dependency path ----------------------------------
# The 'astal' entry in package.json must resolve to a directory containing
# package.json. Verify it exists so failures surface here with a clear
# message instead of as cryptic bundler errors later.
log "Verifying the astal dependency..."
if [ ! -f node_modules/astal/package.json ]; then
    fail "node_modules/astal is missing. package.json expects the Astal GJS package at /usr/share/astal/gjs.
If Astal is installed elsewhere on your system, adjust the 'astal' path in package.json, then re-run."
fi

# --- 5. Copy GIR type declarations ------------------------------------------
# @girs/ is gitignored; the declarations are generated content copied from
# the submodule. The TypeScript configuration reads them from this location.
log "Copying GIR type declarations into @girs/..."
rm -rf @girs
mkdir -p @girs
cp -R external/ags-types/@girs/* @girs/

log "Bootstrap complete. Next steps:"
log "  meson setup build      # first time only"
log "  meson compile -C build"
log "  npm run lint           # static checks"
log "  npx tsc --noEmit       # type check (see docs/development.md)"
