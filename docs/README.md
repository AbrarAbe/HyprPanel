# HyprPanel documentation

This directory is the maintainer-facing documentation for the HyprPanel codebase. The project is archived, but this documentation exists to make revival, maintenance, and incremental improvement easier.

## Files

- [Audit](audit.md): prioritized findings from a codebase audit.
- [Architecture](architecture.md): high-level structure and runtime flow.
- [Build and Development](development.md): how to build, lint, type-check, and run.
- [Dependencies](dependencies.md): dependency and platform expectations.
- [Security](security.md): security-sensitive areas and hardening guidance.

## Baseline status

Observed during the audit review:

- Meson build: succeeds once `npm install` has created the `astal` symlink.
- TypeScript (`tsc --noEmit`): fails to resolve `gi://...` modules because GIR type declarations are not installed or configured.
- ESLint: passes.
- Knip: reports 14 unused files, unused exports, and a number of false positives caused by `gi` imports.
- npm audit: 10 vulnerabilities, all in development dependencies.
- Unit tests: none in the repository.
- The panel has no localization support.