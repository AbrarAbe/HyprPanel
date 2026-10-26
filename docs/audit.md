# Audit: Improvement Opportunities

This audit summarizes the most useful improvements for a maintainer reviving HyprPanel. Items are ordered by expected impact, not by difficulty.

## 1. Build and developer enablement

### 1.1 GIR type declarations are missing

Severity: High

`npx tsc --noEmit` fails to resolve `gi://...` modules. This prevents type checking from being used as a quality gate and makes large refactors risky.

Recommended action:

- Add a documented, pinned installation method for GIR declarations.
- Add type resolution to `tsconfig.json`.
- Gate pull requests on `tsc --noEmit` once the baseline is clean.

### 1.2 Dependency installation is not reproducible

Severity: High

`astal` is referenced through an absolute filesystem path. The build only succeeds if local package installation matches the original machine layout.

Recommended action:

- Document the environment bootstrap process.
- Prefer package-level type shims or environment overrides over hardcoded absolute paths.
- Consider shipping a bootstrap script.

### 1.3 No automated tests

Severity: High

The repository has no `test` script and no test files. Services and helpers contain enough branching logic to justify unit tests.

Recommended action:

- Add tests for pure helpers first.
- Add focused tests for configuration option loading and command construction.
- Add smoke tests for the Meson bundle command.

## 2. Code size and maintainability

### 2.1 Large files need decomposition

Severity: Medium

Several files are difficult to review and modify:

- `src/services/network/wifi.ts`
- `src/components/bar/settings/config.tsx`
- `src/components/bar/modules/kblayout/helpers/layouts.ts`
- `src/services/matugen/variations.ts`
- `src/services/media/index.ts`

Recommended action:

- Split behavior by concern rather than by incidental helper.
- Keep UI component files focused on rendering.
- Extract network and media state machines into smaller service modules.

### 2.2 Dead code and unused exports

Severity: Medium

Knip reports 14 unused files and unused exports. Some reports are false positives because GJS imports use the `gi://` scheme.

Recommended action:

- Delete clearly unused helpers and wrappers after checking git history.
- Keep Knip enabled as an advisory check.
- Add Knip configuration ignores for known GJS false positives rather than disabling the tool entirely.

### 2.3 Outdated tooling

Severity: Medium

Development dependencies are pinned to superseded versions. ESLint and TypeScript conventions have moved toward flat configuration and newer defaults.

Recommended action:

- Upgrade ESLint to the latest compatible version and migrate to flat config.
- Upgrade TypeScript and Node types together.
- Keep changes isolated so lint noise does not obscure runtime fixes.

## 3. Security and robustness

### 3.1 Shell command construction

Severity: High

Several helpers build commands with string interpolation. This can break commands or introduce injection risk when values contain whitespace, quotes, or shell metacharacters.

Recommended action:

- Validate all command inputs.
- Prefer argument arrays.
- Add tests around command construction.

### 3.2 Notification command fragility

Severity: Medium

`notify-send` command strings are assembled with weak handling for spaces, quotes, and special characters.

Recommended action:

- Quote and escape values consistently.
- Consider a D-Bus notification API instead of shell execution.

### 3.3 Optional external binaries

Severity: Low

Modules assume the availability of optional binaries even though checks may be inconsistent.

Recommended action:

- Make module loading degrade gracefully.
- Show clear settings UI messaging when a dependency is absent.

## 4. Runtime performance

### 4.1 Frequent polling and state updates

Severity: Medium

The panel polls CPU, RAM, storage, network, temperature, and GPU metrics. Frequent polling can drive unnecessary rerenders.

Recommended action:

- Review polling intervals and make them configurable.
- Pause polling for hidden menus and inactive monitors.
- Avoid polling through UI component callbacks when a shared service timer can own the schedule.

### 4.2 Large menu state

Severity: Medium

Menus such as network, audio, and media combine rendering and service polling. Large state updates can cause jank.

Recommended action:

- Split state updates from rendering.
- Memoize expensive views.
- Defer non-visible tabs.

## 5. Platform and compatibility risks

### 5.1 GTK 3 and AGS coupling

Severity: High

HyprPanel uses GTK 3 through AGS. The successor project moved to GTK 4 and Rust. Long-term viability depends on Linux/GTK 3 availability and Astal maintenance.

Recommended action:

- Keep GTK 3 support as the short-term goal.
- Document minimal GTK/AGS version requirements.
- Plan an evaluation of Astal GTK 4 only after core fixes are complete.

### 5.2 Absolute local dependency path

Severity: High

The Astal dependency path assumes `/usr/share/astal/gjs`. Builds on other systems will fail unless that path is present.

Recommended action:

- Make runtime dependency paths configurable.
- Document distro-specific paths.

## 6. Suggested roadmap

### Phase 1: Restore developer baseline

1. Make `tsc` run successfully.
2. Document build and dependency bootstrap.
3. Add a test runner and a small set of helper tests.
4. Refresh development dependencies after baseline is green.

### Phase 2: Safety and maintainability

1. Harden command construction.
2. Split the largest service and UI files.
3. Remove dead code.
4. Establish CI lint/type/build gates.

### Phase 3: User-visible quality

1. Improve polling efficiency.
2. Add clear missing-dependency messaging.
3. Add localization and accessibility checks.
4. Modernize tooling and packaging.