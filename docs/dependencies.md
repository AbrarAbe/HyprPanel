# Dependencies

## Runtime

HyprPanel depends on the AGS runtime and GObject introspection packages. The critical chain is:

- AGS/gjs for shell execution
- Astal modules for GTK 3 integration
- NetworkManager, WirePlumber, Upower, and other desktop services
- Optional binaries for modules such as `brightnessctl`, `btop`, `gpustat`, `swww`, and `matugen`

## Node packages

The only runtime Node dependency is `astal`, and it is referenced by an absolute
target: `package.json` points it at `/usr/share/astal/gjs`, the location the
Astal GJS package occupies on Arch and most distributions that package it.

**Environment requirement:** the directory `/usr/share/astal/gjs` must contain
the Astal GJS package (its `package.json`, `gtk3/`, etc.) before `npm install`
runs. `npm run bootstrap` verifies this and fails with a clear message if the
path does not resolve.

**If Astal is installed elsewhere on your system**, edit the `astal` entry in
`package.json` to point at your Astal GJS directory before installing — for
example, a custom prefix install might live at
`/usr/local/share/astal/gjs`. Do not commit that local edit unless the new
path is correct for everyone building the project.

## Audit findings

- npm dependency versions are old enough that modern lint and TypeScript tooling may be easier to run if upgraded.
- `@types/node`, TypeScript, ESLint, and Prettier are pinned to versions superseded by newer releases.
- `eslint-plugin-import` and `tsconfig-paths` are reported as unused dev dependencies. Verify this before removing them because Knip may not understand all AGS build assumptions.
- `package-lock.json` is present, but the project does not expose `npm test`.
- The Astal dependency is an absolute filesystem path pointing at
  `/usr/share/astal/gjs`. This is an environment requirement (documented
  above); adjust it locally if your distribution installs Astal elsewhere.
- The `external/ags-types` submodule and the `@girs/` copy step are wired into
  `npm run bootstrap`; there is no separate manual setup for type declarations.
- GIR declarations are not included in the repository’s declared dependency graph. This is the root cause of most `tsc` module resolution errors.

## Recommendations

1. Keep the documented Astal path requirement in `package.json` and verify it in
   `scripts/bootstrap.sh` (done).
2. Track dependency freshness quarterly.
3. Separate development-only audit failures from runtime release blockers.