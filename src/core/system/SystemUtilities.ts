import { execAsync } from 'astal';
import icons from '../../lib/icons/icons.ts';
import { distroIcons } from './distroIcons.ts';
import { distro } from './osInfo.ts';
import { CommandRunner } from './commandRunner.ts';
import type { CommandResult, NotificationArgs, ServiceStatus } from './types.ts';

export class SystemUtilities {
    /*******************************************
     *                 Notify                  *
     *******************************************/
    /**
     * Sends a notification using the `notify-send` command.
     *
     * This function constructs a notification command based on the provided notification arguments and executes it asynchronously.
     * It logs an error if the notification fails to send.
     *
     * @param notifPayload The notification arguments containing summary, body, appName, iconName, urgency, timeout, category, transient, and id.
     */
    public static notify(notifPayload: NotificationArgs): void {
        SystemUtilities._notify(notifPayload);
    }

    /*******************************************
     *           Depndency Checking            *
     *******************************************/

    /**
     * Checks if all specified dependencies are available
     * @param bins - The list of binaries to check
     * @returns True if all dependencies are found, false otherwise
     */
    public static checkDependencies(...bins: string[]): boolean {
        const missing = bins.filter((bin) => {
            if (!CommandRunner.validateIdentifier(bin)) {
                return true;
            }

            const { exitCode } = CommandRunner.runSync(['which', bin]);
            return exitCode !== 0;
        });

        if (missing.length > 0) {
            console.warn(Error(`missing dependencies: ${missing.join(', ')}`));
            this._notify({
                summary: 'Dependencies not found!',
                body: `The following dependencies are missing: ${missing.join(', ')}`,
                iconName: icons.ui.warning,
            });
        }

        return missing.length === 0;
    }

    /**
     * Checks if any of the given executables is installed by using `which`.
     *
     * @description Iterates through a list of executables and returns true if any are found.
     *
     * @param executables - The list of executables to check.
     */
    public static checkExecutable(executables: string[]): boolean {
        for (const exe of executables) {
            if (!CommandRunner.validateIdentifier(exe)) {
                continue;
            }

            const { exitCode } = CommandRunner.runSync(['which', exe]);

            if (exitCode === 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * Checks if any of the given libraries is installed using `ldconfig`.
     *
     * @description Runs `ldconfig -p` once and checks each library name against its output,
     * avoiding shell interpolation entirely.
     *
     * @param libraries - The list of libraries to check.
     */
    public static checkLibrary(libraries: string[]): boolean {
        const { exitCode, stdout } = CommandRunner.runSync(['ldconfig', '-p']);

        if (exitCode !== 0) {
            return false;
        }

        for (const lib of libraries) {
            if (!CommandRunner.validateIdentifier(lib)) {
                continue;
            }

            if (stdout.includes(lib)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Checks the status of a service.
     *
     * @description Determines if a service is ACTIVE, INSTALLED (but not running), DISABLED, or MISSING.
     *
     * @param services - The list of services to check.
     */
    public static checkServiceStatus(services: string[]): ServiceStatus {
        for (const svc of services) {
            if (!CommandRunner.validateIdentifier(svc)) {
                continue;
            }

            const activeResult = CommandRunner.runSync(['systemctl', 'is-active', svc]);
            const activeStatus = activeResult.stdout;

            if (activeStatus === 'active') {
                return 'ACTIVE';
            }

            if (activeStatus === 'inactive' || activeStatus === 'failed') {
                const enabledResult = CommandRunner.runSync(['systemctl', 'is-enabled', svc]);
                const enabledStatus = enabledResult.stdout;

                if (
                    enabledResult !== undefined &&
                    (enabledStatus === 'enabled' || enabledStatus === 'static')
                ) {
                    return 'INSTALLED';
                } else if (enabledResult !== undefined && enabledStatus === 'disabled') {
                    return 'DISABLED';
                } else {
                    return 'MISSING';
                }
            }

            if (activeStatus === 'unknown' || activeResult.exitCode !== 0) {
                continue;
            }
        }

        return 'MISSING';
    }

    /*******************************************
     *            Command Execution            *
     *******************************************/

    /**
     * Executes a bash command asynchronously
     * @param strings - The command to execute as a template string or a regular string
     * @param values - Additional values to interpolate into the command
     * @returns A promise that resolves to the command output as a string
     */
    public static async bash(strings: TemplateStringsArray | string, ...values: unknown[]): Promise<string> {
        const stringsIsString = typeof strings === 'string';

        const cmd = stringsIsString
            ? strings
            : strings.flatMap((str, i) => str + `${values[i] ?? ''}`).join('');

        return execAsync(['bash', '-c', cmd]).catch((err) => {
            console.error(cmd, err);
            return '';
        });
    }

    /**
     * Executes a shell command asynchronously
     * @param cmd - The command to execute as a string or an array of strings
     * @returns A promise that resolves to the command output as a string
     */
    public static async sh(cmd: string | string[]): Promise<string> {
        return execAsync(cmd).catch((err) => {
            console.error(typeof cmd === 'string' ? cmd : cmd.join(' '), err);
            return '';
        });
    }

    /*******************************************
     *               System Info               *
     *******************************************/

    /**
     * Retrieves the icon for the current distribution
     * @returns The icon for the current distribution as a string
     */
    public static getDistroIcon(): string {
        const icon = distroIcons.find(([id]) => id === distro.id);
        return icon ? icon[1] : '';
    }

    /**
     * Spawns a command line synchronously and returns the exit code and output.
     *
     * @description Executes a command using the safe CommandRunner and extracts the exit code, stdout, and stderr.
     *
     * @param args - The program and its arguments.
     */
    public static runCommand(args: string[]): CommandResult {
        return CommandRunner.runSync(args);
    }

    /*******************************************
     *               Notify                  *
     *******************************************/

    private static _notify(notifPayload: NotificationArgs): void {
        const args: string[] = ['notify-send'];

        if (notifPayload.appName !== undefined) args.push('-a', notifPayload.appName);
        if (notifPayload.iconName !== undefined) args.push('-i', notifPayload.iconName);
        if (notifPayload.urgency !== undefined) args.push('-u', notifPayload.urgency);
        if (notifPayload.timeout !== undefined) args.push('-t', String(notifPayload.timeout));
        if (notifPayload.category !== undefined) args.push('-c', notifPayload.category);
        if (notifPayload.transient !== undefined) args.push('-e');
        if (notifPayload.id !== undefined) args.push('-r', String(notifPayload.id));

        args.push(notifPayload.summary ?? '');
        if (notifPayload.body !== undefined) args.push(notifPayload.body);

        CommandRunner.run(args).catch((err) => {
            console.error(`Failed to send notification: ${err.message}`);
        });
    }
}
