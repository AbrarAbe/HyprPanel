import { execAsync, GLib } from 'astal';

export interface CommandResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}

/**
 * Allowlist for dynamic command identifiers (binary, service, library names).
 * Only alphanumeric characters, dots, underscores, hyphens and colons are
 * permitted. Shell metacharacters, whitespace, command substitution and path
 * traversal are rejected, so a validated value can be passed safely as a
 * command argument without shell interpretation.
 */
const IDENTIFIER_ALLOWLIST = /^[A-Za-z0-9._:-]+$/;

/**
 * Safe command execution helper.
 *
 * Commands are executed with an argument array via Astal's `exec`/`execAsync`
 * (which dispatch to GLib's `execv`/`exec_asyncv`), never through a shell, so
 * arguments are passed verbatim and cannot be interpreted as shell syntax.
 *
 * Non-zero exit codes are reported in `CommandResult.exitCode`; the runner
 * never throws for a non-zero exit. It rejects only when the process cannot
 * be spawned at all.
 */
export class CommandRunner {
    /**
     * Validates a dynamic command identifier against the allowlist pattern.
     * Callers should validate dynamic values (binary names, service names,
     * library names) before passing them as arguments.
     *
     * @param value - The identifier to validate.
     * @returns True when the value matches the allowlist.
     */
    public static validateIdentifier(value: string): boolean {
        return IDENTIFIER_ALLOWLIST.test(value);
    }

    /**
     * Executes a program with an argument array — no shell interpretation.
     *
     * @param args - The program and its arguments, `args[0]` being the program.
     * @returns A promise resolving to the command result. On success
     *   `exitCode` is 0 and `stdout` holds the captured output. On non-zero
     *   exit `exitCode` reflects the failure and `stderr` holds the error
     *   message. Rejects only when the process cannot be spawned.
     */
    public static async run(args: string[]): Promise<CommandResult> {
        try {
            const stdout = await execAsync(args);
            return { exitCode: 0, stdout: stdout.trim(), stderr: '' };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { exitCode: 1, stdout: '', stderr: message };
        }
    }

    /**
     * Synchronous counterpart of {@link run}. Captures stdout, stderr and the
     * exit status even when the command exits non-zero.
     *
     * @param args - The program and its arguments, `args[0]` being the program.
     * @returns The command result. `ok === false` (process could not be
     *   spawned) is reported as `exitCode: 1`.
     */
    public static runSync(args: string[]): CommandResult {
        const decoder = new TextDecoder();
        const decode = (output: Uint8Array | null): string => (output ? decoder.decode(output).trim() : '');

        const [ok, stdout, stderr, exitStatus] = GLib.spawn_sync(
            null,
            args,
            null,
            GLib.SpawnFlags.SEARCH_PATH,
            null,
        );

        if (!ok) {
            return { exitCode: 1, stdout: '', stderr: 'failed to spawn process' };
        }

        return {
            exitCode: exitStatus,
            stdout: decode(stdout),
            stderr: decode(stderr),
        };
    }
}
