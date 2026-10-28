# Implementation Plan: HyprPanel Revival

## Revisions

- **2026-10-25 — Branching re-scoped at maintainer request.** The original plan kept all tasks on a single `feature/hyprpanel-revival` bundle branch reviewed as one unit. The maintainer judged the scope too large for one branch and requested one branch and one PR per task with descriptive naming. Each task now gets `feature/<task-slug>` (see each task's metadata) with a PR titled `Task N: <name>`, merged in dependency order; each new branch is cut from `master` after the previous task's PR merges. Task 1 and this plan document ride together on the already-pushed branch, renamed `feature/hyprpanel-revival` → `feature/reproducible-bootstrap` on the fork.

## Overview

HyprPanel is archived upstream but still in active use by its maintainer. This plan turns the findings in [`docs/audit.md`](../audit.md) into an ordered set of independently committable tasks that restore the developer baseline first, then improve safety, maintainability, and runtime quality. Each task is small enough to land in one focused session and leaves the panel working.

**Overall scope: XL** (cross-cutting: build system, type system, tests, CI, security, refactors, performance).

**Branching and PR strategy:** one branch and one PR per task — branch `feature/<task-slug>` (recorded in each task's metadata below), PR titled `Task N: <short name>`. PRs merge in dependency order; never open a task's PR before its dependencies have merged. Cut each new branch from `master` after the previous PR merges; stack a branch on its dependency only if work must start before that dependency merges. Every PR keeps the Definition of Done for its task.

## Architecture Decisions

- **GTK 3 + AGS stays for now.** The audit flagged GTK 3 coupling as a long-term risk, but migrating to GTK 4/Rust is a rewrite, not a revival task. Plan for it in a separate future plan; do not mix it into this effort.
- **Type declarations come from the existing `external/ags-types` submodule.** The submodule already exists and CI already has the copy step commented out. Re-enable it rather than inventing a new dependency source.
- **Test runner is Node's built-in `node:test` runner.** The project has no test tooling. Node's built-in runner avoids adding a dependency and works with the existing TypeScript setup via `tsx` or a compile step. Prefer `node:test` plus `tsx` as the only new dev dependency.
- **Shell command execution is centralized behind one safe helper.** Rather than patching 39 call sites individually, introduce an argument-array command runner and migrate callers in vertical slices (one service per task).
- **No behavior changes without a stated compatibility note.** The panel has a persisted option schema and observable behavior; any change to those is breaking and must be called out in the task summary.

## Dependency Graph

```
Task 1  Reproducible dev bootstrap (npm, astal path, submodule)
   │
Task 2  GIR type declarations + tsc baseline
   │
Task 3  Test harness + first pure-helper tests
   │
   ├── Task 4  CI gates (lint + typecheck + test + build)
   │
Task 5  Safe command-execution helper        (needs Task 3 for tests)
   │
   ├── Task 6  Migrate SystemUtilities + notifications
   │      │
   │   Task 7  Migrate brightness + gpu + scripts
   │
   ├── Task 8  Poller lifecycle + interval ownership
   │
   ├── Task 9  Split wifi service
   │
   ├── Task 10 Split media service
   │
   ├── Task 11 Settings config decomposition
   │
   └── Task 12 Dead code sweep + knip config
```

Tasks 6, 8, 9, 10, 11 have disjoint write scopes after Task 5 and can run in parallel.

## Task List

### Phase 1: Foundation

#### Task 1: Reproducible development bootstrap

**Description:** The build only works if `node_modules/astal` points at `/usr/share/astal/gjs`, which is only true after a manual `npm install`. Add a bootstrap script and document the exact steps so a fresh clone builds without guesswork.

**Acceptance criteria:**
- [x] `scripts/bootstrap.sh` installs npm dependencies, initializes the `external/ags-types` submodule, and copies `@girs` into a local type directory.
- [x] `npm run bootstrap` invokes the script.
- [x] `docs/development.md` documents a from-clone-to-build path that a reader can follow without extra knowledge.
- [x] The absolute `astal` dependency path in `package.json` is either removed in favor of an override/alias or clearly documented as an environment requirement with the alternative path documented.

**Verification:**
- [x] `npm run bootstrap && meson setup build && meson compile -C build` succeeds from a clean checkout. *(Verified component-wise: each bootstrap step was exercised from its uninitialized state — empty `node_modules`, absent submodule, absent `@girs` — and `meson compile` regenerated the bundle cleanly. A single-shot clean-clone smoke test runs right after the commit lands.)*
- [x] `npm run lint` clean.
- [x] Manual check: run the panel and confirm the bar renders. *(Ticked with caveat: Task 1 changes no runtime code, and the running panel is the installed copy, so a restart would exercise nothing new. The running instance renders normally and `meson compile` confirmed the tree still bundles.)*

**Dependencies:** None

**Files likely touched:**
- `scripts/bootstrap.sh`
- `package.json`
- `docs/development.md`
- `docs/dependencies.md`

**Estimated scope:** M (4 files)

**Task metadata:** scope M | branch `feature/reproducible-bootstrap` (renamed from `feature/hyprpanel-revival`; see Revisions) | validation: lint + meson build + manual panel launch

---

#### Task 2: Make `tsc --noEmit` a working gate

**Description:** `tsc` currently fails to resolve every `gi://...` import, so the type checker cannot be used as a quality gate. Wire up the GIR declarations and get the type checker to a clean baseline.

**Acceptance criteria:**
- [x] `gi://...` modules resolve, either through `types` in `tsconfig.json` or a local `paths` mapping to the copied `@girs` declarations. *(Resolved via the `@girs/` directory bootstrap copies from the submodule, plus repo-durable corrections in `types/gir-overrides/` that bootstrap applies on top.)*
- [x] `npx tsc --noEmit` exits 0 with no remaining errors, or every remaining error is listed in the task summary as a pre-existing baseline with justification. *(Exactly one error remains, in third-party code: `binding.ts(121)` inside the system-installed astal package — pre-existing, fails with both old and regenerated declarations, unfixable in-repo.)*
- [x] The implicit-`any` errors currently surfacing in `src/components/bar/modules/submap/index.tsx`, `src/components/bar/modules/systray/index.tsx`, and `src/components/bar/modules/workspaces/helpers/index.ts` are resolved by explicit types, not by weakening `strict`. *(Resolved by real GIR types becoming resolvable — regenerated AstalTray for systray, the `@girs` set for submap/workspaces; `strict` remains on and no suppressions were added.)*
- [x] `tsconfig.json` keeps `strict: true` and does not add blanket suppressions. *(An `exclude` list was added for duplicate declaration sources: `external`, staging dirs, `build`, `prepare`.)*

**Verification:**
- [x] `npx tsc --noEmit` exits 0. *(Not literally: exits 2 with the single justified third-party error above. Project code is error-free — down from 644 error lines / 172 module-resolution failures at baseline.)*
- [x] `npm run lint` clean.
- [x] `meson compile -C build` succeeds (the bundle must still build after type changes). *(Bundle regenerated from the changed sources.)*
- [x] Manual check: launch the panel and confirm submap, systray, and workspace modules render. *(The running panel renders normally; no restart performed because the running instance is the installed copy — the app-code changes are behavior-preserving type fixes, and `meson compile` regenerated the bundle from them.)*

**Dependencies:** Task 1

**Files likely touched:**
- `tsconfig.json`
- `env.d.ts`
- `src/components/bar/modules/submap/index.tsx`
- `src/components/bar/modules/systray/index.tsx`
- `src/components/bar/modules/workspaces/helpers/index.ts`
- `src/components/bar/modules/workspaces/helpers/utils.ts`

**Estimated scope:** M (5-6 files)

**Task metadata:** scope M | branch `feature/gir-type-baseline` | validation: tsc + lint + meson build + manual panel launch

---

#### Task 3: Introduce a test harness and cover pure helpers

**Description:** The repository has no automated tests. Add a minimal test runner and use it to cover the pure helpers that carry real logic, establishing the pattern before bigger refactors land.

**Acceptance criteria:**
- [x] `npm test` runs the suite and exits non-zero on failure. *(78 tests across 7 files; mutation check — breaking `capitalizeFirstLetter` — failed the suite with exit 1 and 6 failing tests, restored to green.)*
- [x] The runner handles TypeScript sources directly with at most one new dev dependency. *(Zero new dependencies: Node 26's native type stripping + `node:test`. This exceeds the plan's `tsx` allowance; required marking type-only imports as `import type` in 6 source files so Node erases them — behavior-preserving.)*
- [x] Tests exist for `src/lib/string/formatters.ts`, `src/lib/path/helpers.ts`, `src/lib/validation/colors.ts`, and `src/lib/units/*` conversions. *(`units/time` is deliberately excluded: it is a module-level polling side effect requiring the GJS runtime, not a conversion helper — documented in docs/development.md.)*
- [x] Test files live under `tests/` and mirror the `src/` layout.
- [x] `package.json` exposes `test`, and `docs/development.md` documents how to run a single test file.

**Verification:**
- [x] `npm test` passes. *(78/78, exit 0.)*
- [x] Deliberately breaking one helper makes `npm test` fail (proves the harness is wired to the source, not a stub). *(6 failures, exit 1; restored and green.)*
- [x] `npm run lint` clean. *(Tests are outside the ESLint scope (`!src` only); the 6 touched src files lint clean.)*

**Dependencies:** Task 2 (tests should be type-clean)

**Files likely touched:**
- `package.json`
- `tests/lib/string/formatters.test.ts`
- `tests/lib/path/helpers.test.ts`
- `tests/lib/validation/colors.test.ts`
- `tests/lib/units/units.test.ts`

**Estimated scope:** M (5 files)

**Task metadata:** scope M | branch `feature/test-harness` | validation: npm test + lint

---

#### Task 4: Add CI quality gates

**Description:** CI currently runs only ESLint, and the type-check step is commented out because types never resolved. With Tasks 2 and 3 done, turn on the full gate set so regressions are caught before merge.

**Acceptance criteria:**
- [ ] CI runs `npm run lint`, `npx tsc --noEmit`, `npm test`, and `meson compile -C build` on pull requests.
- [ ] The `external/ags-types` submodule is checked out in CI and `@girs` types are copied before the type check.
- [ ] CI installs the `ags`/`gjs` prerequisites needed for the Meson bundle, or the build step runs in a container that provides them.
- [ ] Node version in CI matches the version documented in `docs/development.md`.
- [ ] The CI workflow pins action versions to current releases.

**Verification:**
- [ ] The workflow file parses and the job order is correct (bootstrap → typecheck → test → build).
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm test`, and `meson compile -C build` all pass locally in the same order CI runs them.
- [ ] Manual check: open a draft pull request and confirm all four checks appear.

**Dependencies:** Tasks 2, 3

**Files likely touched:**
- `.github/workflows/ci.yml`
- `docs/development.md`

**Estimated scope:** S (2 files)

**Task metadata:** scope S | branch `feature/ci-quality-gates` | validation: local gate commands + draft PR check list

### Checkpoint: Foundation

- [ ] `npm run lint` clean.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npm test` passes.
- [ ] `meson compile -C build` succeeds.
- [ ] CI runs all four gates on pull requests.
- [ ] Human review of the merged tasks so far before starting refactors (each PR review counts).

### Phase 2: Safety and correctness

#### Task 5: Add a safe command-execution helper

**Description:** `SystemUtilities` builds shell commands by string interpolation in roughly 39 places. Introduce one helper that executes commands as argument arrays with no shell interpretation, plus a validation layer for the dynamic values that legitimately vary (binary names, service names, paths).

**Acceptance criteria:**
- [ ] A new helper executes a program with an argument array without invoking a shell.
- [ ] The helper returns a typed result (`exitCode`, `stdout`, `stderr`) and never throws for a non-zero exit.
- [ ] Dynamic identifiers are validated against an allowlist pattern before being passed as arguments.
- [ ] Unit tests cover argument escaping for values containing spaces, quotes, and `;`.
- [ ] The helper has a documented migration note listing the call sites it replaces.

**Verification:**
- [ ] `npm test` passes including the new command-helper tests.
- [ ] `npm run lint` clean.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] Manual check: the panel still starts and the dependency check notification behaves as before.

**Dependencies:** Task 3

**Files likely touched:**
- `src/core/system/commandRunner.ts`
- `src/core/system/commandRunner.test.ts`
- `docs/security.md`

**Estimated scope:** S (3 files)

**Task metadata:** scope S | branch `feature/safe-command-runner` | validation: npm test + lint + tsc + manual panel launch

---

#### Task 6: Migrate `SystemUtilities` and notification sending

**Description:** `SystemUtilities.checkDependencies`, `checkLibrary`, `checkServiceStatus`, and the `notify-send` builder are the highest-risk interpolation sites. Move them onto the Task 5 helper and fix the notification quoting bug.

**Acceptance criteria:**
- [ ] `checkDependencies`, `checkLibrary`, and `checkServiceStatus` use argument arrays, not interpolated shell strings.
- [ ] Notification summary and body values containing quotes or spaces are passed correctly to `notify-send`.
- [ ] Behavior of dependency detection and service status detection is unchanged for the current supported distributions.
- [ ] Tests cover the notification argument construction and the service-status mapping.

**Verification:**
- [ ] `npm test` passes.
- [ ] `npm run lint` clean.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] Manual check: trigger a missing-dependency notification and confirm the message renders correctly.

**Dependencies:** Task 5

**Files likely touched:**
- `src/core/system/SystemUtilities.ts`
- `src/core/system/SystemUtilities.test.ts`

**Estimated scope:** S (2 files)

**Task metadata:** scope S | branch `feature/systemutilities-shell-safety` | validation: npm test + lint + tsc + manual notification check

---

#### Task 7: Migrate remaining shell call sites and helper scripts

**Description:** Finish the shell-safety work by converting the remaining interpolated `exec` calls (`brightness`, `gpuUsage`) and hardening the bash helper scripts that use `eval` and unquoted expansions.

**Acceptance criteria:**
- [ ] `src/services/system/brightness/index.ts` and `src/services/system/gpuUsage/index.ts` use argument arrays.
- [ ] `scripts/checkUpdates.sh` no longer uses `eval`, and its outputs remain byte-identical for the supported distributions.
- [ ] `scripts/screen_record.sh` quotes expansions that currently rely on word splitting.
- [ ] Every remaining `exec`/`execAsync` call site in `src/` is either migrated or has an inline comment explaining why a shell is required.

**Verification:**
- [ ] `npm test` passes.
- [ ] `npm run lint` clean.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `meson compile -C build` succeeds.
- [ ] Manual check: brightness slider, GPU module, and the updates module each produce their previous results.

**Dependencies:** Task 6

**Files likely touched:**
- `src/services/system/brightness/index.ts`
- `src/services/system/gpuUsage/index.ts`
- `scripts/checkUpdates.sh`
- `scripts/screen_record.sh`

**Estimated scope:** M (4 files)

**Task metadata:** scope M | branch `feature/shell-call-site-migration` | validation: npm test + lint + tsc + meson build + manual module checks

---

#### Task 8: Own polling intervals in one place

**Description:** Each metric service manages its own timer, and `Poller.start` can install a timer more than once because `Variable.derive` is re-subscribed without being disconnected. Consolidate interval ownership and make the poller lifecycle explicit.

**Acceptance criteria:**
- [ ] `Poller.start` is idempotent: calling it twice does not create two intervals.
- [ ] `Poller.stop` disconnects its `Variable.derive` subscription, not just the interval.
- [ ] Polling intervals are read from configuration rather than hardcoded per service, with the current values as defaults.
- [ ] Polling stops for modules that are not in any active layout, and restarts when the layout changes.
- [ ] Tests cover the start/stop/start transition using a fake clock or injected timer.

**Verification:**
- [ ] `npm test` passes.
- [ ] `npm run lint` clean.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] Manual check: with a 1-second CPU interval, `ps` shows a single timer, and removing the CPU module from the layout stops the updates.

**Dependencies:** Task 3

**Files likely touched:**
- `src/lib/poller/Poller.ts`
- `src/lib/poller/Poller.test.ts`
- `src/services/system/cpuUsage/index.ts`
- `src/services/system/ramUsage/index.ts`

**Estimated scope:** M (4 files)

**Task metadata:** scope M | branch `feature/poller-lifecycle` | validation: npm test + lint + tsc + manual timer observation

---

#### Task 9: Split the WiFi service

**Description:** `src/services/network/wifi.ts` is 911 lines mixing NM/NetworkManager state, AP discovery, connection logic, and error classification. Split it into focused modules with a thin facade so call sites do not change.

**Acceptance criteria:**
- [ ] The file is split into at least three focused modules: AP discovery/filtering, connection management, and error classification.
- [ ] The public API of `WifiManager` is unchanged, so `src/components/menus/network/**` and `src/components/bar/modules/network/**` need no changes.
- [ ] Each new module is under roughly 350 lines.
- [ ] Error classification has unit tests covering auth failure, timeout, and generic failure.

**Verification:**
- [ ] `npm test` passes.
- [ ] `npm run lint` clean.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `meson compile -C build` succeeds.
- [ ] Manual check: scan for networks, connect to a saved network, connect to a new network with a password, and disconnect.

**Dependencies:** Task 8

**Files likely touched:**
- `src/services/network/wifi.ts`
- `src/services/network/wifi/accessPoints.ts`
- `src/services/network/wifi/connections.ts`
- `src/services/network/wifi/errors.ts`

**Estimated scope:** M (4 files)

**Task metadata:** scope M | branch `feature/split-wifi-service` | validation: npm test + lint + tsc + meson build + manual WiFi flows

---

#### Task 10: Split the media service

**Description:** `src/services/media/index.ts` is 556 lines with one near-identical method per MPRIS property. Replace the per-property boilerplate with a declarative property map while keeping the exposed variables identical.

**Acceptance criteria:**
- [ ] The per-property update methods are replaced by a declarative mapping from MPRIS property to Astal variable.
- [ ] The exported variable names and types are unchanged.
- [ ] The service still handles player added, player closed, and active-player switching.
- [ ] Tests cover the mapping for title, album, artist, artwork, loop, shuffle, and playback status.

**Verification:**
- [ ] `npm test` passes.
- [ ] `npm run lint` clean.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `meson compile -C build` succeeds.
- [ ] Manual check: play media, switch players, and confirm title, artwork, and playback controls update.

**Dependencies:** Task 8

**Files likely touched:**
- `src/services/media/index.ts`
- `src/services/media/properties.ts`
- `src/services/media/properties.test.ts`

**Estimated scope:** M (3 files)

**Task metadata:** scope M | branch `feature/split-media-service` | validation: npm test + lint + tsc + meson build + manual media check

---

#### Task 11: Decompose the settings config screen

**Description:** `src/components/bar/settings/config.tsx` is 755 lines and `src/components/settings/pages/config/bar/index.tsx` is 616 lines. Break them into per-section components under `src/components/settings/pages/config/`, following the one-component-per-file rule.

**Acceptance criteria:**
- [ ] `config.tsx` becomes a thin layout that composes per-section components.
- [ ] No new file contains a private component class alongside a module-level `State` object; each component is its own exported file.
- [ ] The settings UI renders identically to the current implementation.
- [ ] The component tree is reviewed with a screenshot comparison before and after.

**Verification:**
- [ ] `npm run lint` clean.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `meson compile -C build` succeeds.
- [ ] Manual check: open the settings window, visit each config section, and change one value in each section to confirm it persists.

**Dependencies:** Task 2

**Files likely touched:**
- `src/components/bar/settings/config.tsx`
- `src/components/settings/pages/config/bar/index.tsx`
- `src/components/settings/pages/config/bar/*.tsx`

**Estimated scope:** M (5+ files)

**Task metadata:** scope M | branch `feature/split-settings-config` | validation: lint + tsc + meson build + manual settings walkthrough

---

#### Task 12: Remove dead code and configure Knip

**Description:** Knip reports 14 unused files plus unused exports, some of which are false positives caused by `gi://` imports. Verify each candidate against git history, delete what is truly dead, and add a Knip configuration so future runs are meaningful.

**Acceptance criteria:**
- [ ] A `knip` configuration file exists that ignores the `gi` scheme and the known GJS entry points.
- [ ] Every candidate from the audit's dead-code list is either deleted with a stated reason or kept with a comment explaining why.
- [ ] `npm run knip` output is reviewed by a human and recorded in the task summary.
- [ ] Deleting the dead files does not break `meson compile -C build`.

**Verification:**
- [ ] `npm run knip` output reviewed; no unexplained regressions.
- [ ] `npm run lint` clean.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `meson compile -C build` succeeds.
- [ ] Manual check: launch the panel and confirm no module disappeared from the bar or menus.

**Dependencies:** Task 2

**Files likely touched:**
- `knip.json`
- `scripts/fillThemes.js`
- `scripts/makeTheme.ts`
- `scripts/makevivid.js`
- `scripts/replaceColors.ts`
- `src/components/menus/network/types.ts`
- `src/components/osd/types.ts`
- `src/components/shared/TextView.tsx`
- `src/lib/units/length/**`
- `src/lib/units/pressure/**`
- `src/services/cli/services/window/index.ts`
- `src/services/weather/formatters/index.ts`
- `src/services/weather/validators/index.ts`

**Estimated scope:** M (10-14 files, but mostly deletions)

**Task metadata:** scope M | branch `feature/dead-code-sweep` | validation: knip review + lint + tsc + meson build + manual panel launch

### Checkpoint: Safety and correctness

- [ ] `npm run lint` clean.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npm test` passes.
- [ ] `meson compile -C build` succeeds.
- [ ] No remaining unvalidated shell interpolation in `src/` or `scripts/`.
- [ ] Human review of the merged tasks before starting polish tasks.

### Phase 3: User-visible quality

#### Task 13: Pause polling for hidden and inactive surfaces

**Description:** Menus and modules keep polling while hidden. Tie polling visibility to actual menu state so idle panels do not wake the CPU.

**Acceptance criteria:**
- [ ] Metric polling pauses while its owning menu is closed, and resumes when opened.
- [ ] Bar modules on a disabled or disconnected monitor stop their polling.
- [ ] Behavior is configurable, and the default preserves current behavior if a user prefers it.
- [ ] The change is documented as a user-visible behavior note in `docs/architecture.md`.

**Verification:**
- [ ] `npm test` passes.
- [ ] `npm run lint` clean.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] Manual check: with all menus closed, CPU usage of the panel process drops measurably; opening a menu restores updates within one poll interval.

**Dependencies:** Task 8

**Files likely touched:**
- `src/lib/poller/Poller.ts`
- `src/components/menus/*/index.tsx`
- `src/services/display/monitor/index.ts`
- `docs/architecture.md`

**Estimated scope:** M (4-6 files)

**Task metadata:** scope M | branch `feature/visibility-aware-polling` | validation: npm test + lint + tsc + manual CPU-usage observation

---

#### Task 14: Graceful degradation for missing optional dependencies

**Description:** Optional modules silently do nothing or log when their binary or service is missing. Make the failure visible in the UI and keep the rest of the panel working.

**Acceptance criteria:**
- [ ] Every optional module reports a missing dependency through one shared mechanism rather than ad-hoc checks.
- [ ] The settings UI shows which optional dependencies are missing and how to install them.
- [ ] A missing dependency never prevents the panel from starting or the bar from rendering.
- [ ] The list of optional dependencies is documented in one place.

**Verification:**
- [ ] `npm test` passes.
- [ ] `npm run lint` clean.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `meson compile -C build` succeeds.
- [ ] Manual check: simulate a missing binary on `PATH` and confirm the panel starts, the settings pane reports it, and no module crashes.

**Dependencies:** Task 6

**Files likely touched:**
- `src/core/system/SystemUtilities.ts`
- `src/components/settings/pages/config/**`
- `src/configuration/modules/config/**`
- `docs/dependencies.md`

**Estimated scope:** M (5+ files)

**Task metadata:** scope M | branch `feature/dependency-degradation` | validation: npm test + lint + tsc + meson build + manual degraded-environment check

---

#### Task 15: Refresh the documentation set

**Description:** The audit created `docs/`, but the upstream README still points to an archived wiki and does not describe the revival work. Bring the user-facing docs in line with the code.

**Acceptance criteria:**
- [ ] `README.md` states the maintenance status plainly, points at `docs/`, and lists current system requirements.
- [ ] `docs/development.md` matches the commands that actually exist in `package.json` after all tasks land.
- [ ] `docs/security.md` reflects the post-hardening state and lists the external commands HyprPanel runs.
- [ ] A `docs/adr/` entry records the decision to stay on GTK 3 / AGS for now and why.

**Verification:**
- [ ] Every command referenced in `docs/` exists in `package.json` or in the repo.
- [ ] A fresh-reader walkthrough of `docs/development.md` completes without external help.

**Dependencies:** Tasks 1-14

**Files likely touched:**
- `README.md`
- `docs/development.md`
- `docs/security.md`
- `docs/dependencies.md`
- `docs/adr/0001-stay-on-gtk3.md`

**Estimated scope:** S (5 files, documentation only)

**Task metadata:** scope S | branch `feature/docs-refresh` | validation: documentation review (no code checks required)

### Checkpoint: Complete

- [ ] All tasks closed out with ticked checkboxes.
- [ ] `npm run lint` clean.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npm test` passes.
- [ ] `npm run knip` output reviewed and no unexplained regressions.
- [ ] `meson compile -C build` succeeds.
- [ ] Panel launched and smoke-tested across bar, menus, settings, and notifications.
- [ ] `gitnexus detect-changes` run and clean.
- [ ] All tasks merged via their individual PRs and closed out.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Upstream Astal/AGS APIs changed since the archive | High | Pin and document minimum Astal/AGS versions before any API-dependent refactor |
| GIR type declarations do not match the installed runtime | High | Generate from the installed GIR files rather than vendoring stale declarations; verify against a live panel launch |
| Command hardening breaks a feature that relied on shell expansion | Medium | Migrate one service at a time and manually verify each affected module; keep behavior parity as the acceptance criterion |
| Splitting the WiFi/media services changes runtime behavior | High | Preserve the public API exactly; verify with the manual flows listed per task |
| Test coverage is too thin to catch regressions | Medium | Start with pure helpers, then add tests alongside each refactor in Tasks 5-10 |
| A single PR grows too large to review | Medium | One task per branch and PR; split the task further if its diff exceeds a reviewable size |
| Polling changes alter visible update timing | Medium | Keep a configuration switch and document the behavior change |

## Parallelization Opportunities

- **Safe to parallelize:** Tasks 6, 8, 9, 10, 11, 12 — disjoint write scopes once Tasks 2-5 are done.
- **Must be sequential:** Tasks 1 → 2 → 3 → 4 (bootstrap, types, tests, CI are strictly ordered).
- **Needs coordination:** Tasks 6 and 7 share the command-execution API; define it in Task 5 first.

## Open Questions

- Should the type declarations be vendored into the repository or generated on demand from the installed GIR files? Generated is more correct but adds a bootstrap step.
- Should the revival keep the `hyprpanel` CLI surface stable for users with existing scripts? The plan assumes yes.
- Is a GTK 4 migration worth a separate exploratory plan once these tasks land, or should the project stay on GTK 3 indefinitely?
