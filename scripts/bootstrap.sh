#!/usr/bin/env bash
# Bootstrap a fresh HyprPanel checkout for development.
#
# Idempotent: safe to run repeatedly. Installs Node dependencies,
# registers the external/ags-types submodule, and copies the GIR type
# declarations into the gitignored @girs/ directory where the TypeScript
# compiler can find them.
#
# Usage: npm run bootstrap [-- --skip-build-tools]
# --skip-build-tools skips the meson/ninja/ags/gjs prerequisite checks for
# workflows that only need Node-side quality gates (lint, typecheck, tests).

set -euo pipefail

skip_build_tools=false
for arg in "$@"; do
    case "$arg" in
    --skip-build-tools) skip_build_tools=true ;;
    *) fail "Unknown option: $arg" ;;
    esac
done

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

# Location of the installed Astal GJS package; package.json's 'astal'
# dependency points here by default. Override for non-standard layouts.
ASTAL_DIR="${ASTAL_DIR:-/usr/share/astal/gjs}"

log() {
    printf '\033[1;34m[bootstrap]\033[0m %s\n' "$1"
}

fail() {
    printf '\033[1;31m[bootstrap] ERROR:\033[0m %s\n' "$1" >&2
    exit 1
}

# --- 1. Check build prerequisites -----------------------------------------
log "Checking build prerequisites..."

for bin in node npm git; do
    command -v "$bin" >/dev/null 2>&1 || fail "'$bin' not found in PATH. Install it and re-run."
done

if [ "$skip_build_tools" = false ]; then
    for bin in meson ninja ags gjs; do
        command -v "$bin" >/dev/null 2>&1 || fail "'$bin' not found in PATH. Install it and re-run (or use --skip-build-tools for Node-only setup)."
    done
fi

# --- 2. Register the ags-types submodule ----------------------------------
# .gitmodules declares external/ags-types, which provides the @girs type
# declarations used for type checking. It is not initialized on clone.
log "Initializing external/ags-types submodule..."
git submodule update --init --recursive
[ -d external/ags-types/@girs ] || fail "Submodule contents missing: external/ags-types/@girs not found."

# --- 2b. Ensure the astal package manifest ---------------------------------
# Some Astal GJS checkouts (e.g. the astalgjs repo used by CI) ship the TS
# sources without a package.json. Provide the manifest when it is missing so
# npm and tsc can resolve the 'astal' dependency.
if [ -d "$ASTAL_DIR" ] && [ ! -f "$ASTAL_DIR/package.json" ]; then
    log "Writing the astal package manifest into $ASTAL_DIR..."
    cp scripts/astal-gjs-package.json "$ASTAL_DIR/package.json" 2>/dev/null ||
        sudo cp scripts/astal-gjs-package.json "$ASTAL_DIR/package.json"
fi

# --- 3. Install Node dependencies -----------------------------------------
# package.json points the 'astal' dependency at the system Astal package.
log "Installing Node dependencies..."
npm install

# Some npm versions skip absolute-path file dependencies without an error;
# make sure the astal package is linked into node_modules either way.
if [ ! -e node_modules/astal/package.json ] && [ -f "$ASTAL_DIR/package.json" ]; then
    log "Linking the Astal GJS package into node_modules..."
    ln -s "$ASTAL_DIR" node_modules/astal
fi

# --- 4. Verify the astal dependency path ----------------------------------
# The 'astal' entry in package.json must resolve to a directory containing
# package.json. Verify it exists so failures surface here with a clear
# message instead of as cryptic bundler errors later.
log "Verifying the astal dependency..."
if [ ! -f node_modules/astal/package.json ]; then
    fail "node_modules/astal is missing. package.json expects the Astal GJS package at $ASTAL_DIR.
If Astal is installed elsewhere on your system, adjust the 'astal' path in package.json (or set ASTAL_DIR), then re-run."
fi

# --- 5. Copy GIR type declarations ------------------------------------------
# @girs/ is gitignored; the declarations are generated content copied from
# the submodule. The TypeScript configuration reads them from this location.
log "Copying GIR type declarations into @girs/..."
rm -rf @girs
mkdir -p @girs
cp -R external/ags-types/@girs/* @girs/
# Apply overrides on top: the submodule's vendored declarations predate the
# installed Astal/Pango runtime (stale AstalIO/AstalTray/AstalWp, Pango's
# WrapMode enum missing NONE), and GtkSource 3.0 is missing entirely.
# See types/gir-overrides/ — each file documents its provenance.
cp types/gir-overrides/*.d.ts @girs/

log "Bootstrap complete. Next steps:"
log "  meson setup build      # first time only"
log "  meson compile -C build"
log "  npm run lint           # static checks"
log "  npx tsc --noEmit       # type check (see docs/development.md)"
