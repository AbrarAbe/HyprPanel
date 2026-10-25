# Architecture

HyprPanel is an Aylur's GTK Shell (AGS) application written in TypeScript and bundled with Meson. The entry point is `app.ts`.

## Runtime flow

1. `app.ts` imports session/style setup, starts `App` with instance name `hyprpanel`, and delegates main initialization to `InitializationService`.
2. UI components live under `src/components`.
3. Services live under `src/services` and expose system integrations such as media, network, weather, workspaces, and system metrics.
4. `src/lib` contains shared helpers for options, HTTP, icons, validation, windowing, and events.
5. `src/configuration` defines option schemas and default values.
6. `src/style` contains SCSS themes compiled for the shell.

## Main areas

- `components/bar`: bar modules, layout, menus, and settings integration.
- `components/menus`: pop-up panels such as audio, Bluetooth, calendar, dashboard, media, network, notifications, and power.
- `components/settings`: the settings application UI.
- `components/notifications`: notification rendering.
- `services/cli`: command-line handlers used by the `hyprpanel` client.
- `services/display`: monitor and bar display coordination.
- `services/system`: low-level polling for CPU, RAM, storage, network, temperature, and GPU usage.
- `core/system/SystemUtilities.ts`: central shell command execution helper.

## Observations

- The codebase is large (about 536 TypeScript files and 34k lines under `src`).
- Several files are close to 1k lines, especially `services/network/wifi.ts` and `components/bar/settings/config.tsx`.
- Many modules are optional and depend on external binaries or services.
- There is no test directory, so regressions in helpers and services are difficult to catch.
- The shell mixes UI, service polling, and side effects in a single process, which makes performance issues hard to isolate.