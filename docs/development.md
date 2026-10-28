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
npm run typecheck   # or: npx tsc --noEmit
```

Type checking works against the GIR declarations in `@girs/` (created by
`npm run bootstrap`). `npm run typecheck` runs `scripts/typecheck.sh`, which
fails on any type error in project code but tolerates errors reported inside
the third-party Astal GJS package (`/usr/share/astal/gjs`) — that package's
internal errors are the documented baseline (one at the time of writing: the
`binding.ts(121)` disconnect overload, present with both old and regenerated
AstalIO declarations) and unfixable in this repository. To see the raw
compiler output at any time, run `npx tsc --noEmit` directly.

### GIR declaration overrides

The `external/ags-types` submodule's vendored declarations predate the
installed Astal/Pango runtime, and `@girs/` is regenerated content. To keep
fixes reproducible, corrected declarations live in the repo under
`types/gir-overrides/` and `scripts/bootstrap.sh` copies them over `@girs/`
after the submodule checkout:

- `astalio-0.1.d.ts`, `astaltray-0.1.d.ts`, `astalwp-0.1.d.ts` — regenerated
  from the installed GIRs with `ts-for-gir@5.5.0` (`--promisify false`).
- `pango-1.0.d.ts` — regenerated the same way; the vendored copy's `WrapMode`
  enum was missing `NONE` and had shifted numeric values.
- `gtksource-3.0.d.ts` — hand-maintained subset of the gtksourceview3 API the
  panel uses; the vendored set only covers GtkSource 4.0/5.0.
- `types/gobject-signal-helpers.d.ts` — module augmentation providing the
  `SignalCallback`/`GjsParameters` helpers the regenerated files expect but
  the vendored GObject declaration lacks.

To regenerate an override after a runtime upgrade (adjust the module list as
needed):

```sh
npx --yes @ts-for-gir/cli generate AstalIO-0.1 AstalTray-0.1 AstalWp-0.1 Pango-1.0 \
    --outdir @girs --ignoreVersionConflicts --promisify false
cp @girs/{astalio-0.1,astaltray-0.1,astalwp-0.1,pango-1.0}.d.ts types/gir-overrides/
```

## Testing

```sh
npm test                                             # full suite
node --test --experimental-test-module-mocks tests/lib/string/formatters.test.ts   # single file
```

The suite uses Node's built-in `node:test` runner with native TypeScript type
stripping — **no test dependencies are installed**. Tests live under `tests/`,
mirroring the `src/` layout, and import sources with explicit `.ts` extensions
(Node ESM does not resolve extensionless or directory-index imports).

Notes:

- Files under test must use erasable-only TypeScript (no enums) and must not
  transitively import `gi://` or `astal` modules. Type-only imports must be
  written as `import type` so they are erased under Node's type stripping.
- `tests/lib/path/helpers.test.ts` mocks the `astal` module via
  `mock.module` (hence the `--experimental-test-module-mocks` flag) to supply
  a deterministic `GLib.get_home_dir`.
- `src/lib/units/time` is not covered: it is a module-level polling side
  effect (`Variable.poll`) that requires the GJS runtime, not a conversion
  helper.

## Linting and formatting

```sh
npm run lint
npm run lint:fix
npm run format
```

## Continuous integration

Pull requests to `master` run `.github/workflows/ci.yml`: the
`ags-types` submodule is checked out, the Astal GJS package is cloned to
`/usr/share/astal` (required by the `astal` file dependency), and then
`npm run bootstrap`, `npm run lint`, `npm run typecheck`, and `npm test` run
in order on Node 26. The AGS bundle is intentionally not built in CI —
`meson compile -C build` remains a local gate.

## Dead-code review

```sh
npm run knip
```

Review Knip output before deleting files. Some reported unused dependencies are likely false positives because GJS imports such as `gi://...` are not declared in `package.json`.

## Known gaps

- One third-party type-check baseline error in the system astal package (see
  Type checking above).
- The README wiki links may be stale.
- `npm audit` currently reports 10 vulnerabilities in development dependencies.