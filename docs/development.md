# Build and Development

## From a fresh clone to a running panel

A single command installs Node dependencies, registers the `external/ags-types`
submodule, and copies the GIR type declarations into the gitignored `@girs/`
directory:

```sh
cd /path/to/HyprPanel
npm run bootstrap
meson setup build
meson compile -C build
```

To install system-wide:

```sh
sudo meson install -C build
```

The bootstrap script is idempotent — run it again any time the submodule or
Node dependencies feel stale. It checks for `meson`, `ninja`, `ags`, `gjs`,
and `git` up front and fails with a clear message if one is missing.

## Prerequisites

Install the runtime and build dependencies described in the README. At minimum, the build needs:

- `meson`
- `ninja`
- `ags`
- `gjs`
- Node.js and npm
- The Astal GJS package at `/usr/share/astal/gjs` (see [Dependencies](dependencies.md))

## Build from source

```sh
cd /path/to/HyprPanel
npm run bootstrap
meson setup build
meson compile -C build
```

If `node_modules/astal` is missing after bootstrap, the Astal GJS package is
not installed where `package.json` expects it — see
[Dependencies](dependencies.md) for the path requirement.

To install system-wide:

```sh
sudo meson install -C build
```

## Type checking

```sh
npx tsc --noEmit
```

This currently fails because GIR type declarations are missing. Add or configure `@girs` types before relying on `tsc` in CI.

## Linting and formatting

```sh
npm run lint
npm run lint:fix
npm run format
```

## Dead-code review

```sh
npm run knip
```

Review Knip output before deleting files. Some reported unused dependencies are likely false positives because GJS imports such as `gi://...` are not declared in `package.json`.

## Known gaps

- No automated tests.
- No CI configuration is checked in for type checking or tests.
- The README wiki links may be stale.
- `npm audit` currently reports 10 vulnerabilities in development dependencies.