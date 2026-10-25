# Security

HyprPanel is a desktop shell, so it runs with the user’s privileges. It should avoid building shell commands from untrusted data and should validate external input before using it.

## Findings

- `SystemUtilities.checkDependencies` interpolates user-provided binary names into `which ${bin}`.
- `SystemUtilities.checkLibrary` interpolates library names into a `grep` command.
- `SystemUtilities.checkServiceStatus` interpolates service names into `systemctl` commands.
- `SystemUtilities.bash` executes arbitrary command strings. This is expected for internal helpers, but every caller should use fixed command templates and validate arguments.
- Notifications are assembled by string interpolation into `notify-send` command arguments. Summary or body text containing quotes or shell metacharacters can break command construction.
- External module polling invokes tools such as `gpustat`, `amdgpu_top`, `brightnessctl`, and `matugen`. Ensure these paths come from trusted installations and fixed argument lists.

## Recommendations

1. Avoid interpolating dynamic values directly into shell commands.
2. Prefer argument arrays and fixed entry points when calling external binaries.
3. Add input validation for service names, binary names, and filesystem paths.
4. Escape or reject notification strings that contain shell metacharacters.
5. Mark optional command runners as security-sensitive in code review.
6. Document which external commands HyprPanel executes.