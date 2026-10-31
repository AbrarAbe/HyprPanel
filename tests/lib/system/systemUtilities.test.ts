import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

// SystemUtilities imports 'astal' at load time (osInfo calls GLib.get_os_info;
// bash/sh/_notify use execAsync). Mock it before importing SystemUtilities.
mock.module('astal', {
    namedExports: {
        execAsync: async () => '',
        GLib: { get_os_info: () => 'mock-distro' },
    },
});

// Controllable CommandRunner mock
let runSyncResults: Record<string, { exitCode: number; stdout: string; stderr: string }> = {};
let runCalls: string[][] = [];

mock.module('../../../src/core/system/commandRunner.ts', {
    namedExports: {
        CommandRunner: {
            validateIdentifier: (value: string) => /^[A-Za-z0-9._:-]+$/.test(value),
            runSync: (_args: string[]) => {
                const key = _args.join(' ');
                return runSyncResults[key] ?? { exitCode: 127, stdout: '', stderr: 'not found' };
            },
            run: async (_args: string[]) => {
                runCalls.push([..._args]);
            },
        },
    },
});

const { SystemUtilities } = await import('../../../src/core/system/SystemUtilities.ts');

function resetMocks(): void {
    runSyncResults = {};
    runCalls = [];
}

describe('SystemUtilities.checkDependencies', () => {
    it('returns true when all binaries are found', () => {
        resetMocks();
        runSyncResults['which bash'] = { exitCode: 0, stdout: '/usr/bin/bash', stderr: '' };
        runSyncResults['which grep'] = { exitCode: 0, stdout: '/usr/bin/grep', stderr: '' };

        assert.equal(SystemUtilities.checkDependencies('bash', 'grep'), true);
    });

    it('returns false when a binary is missing', () => {
        resetMocks();
        runSyncResults['which bash'] = { exitCode: 0, stdout: '/usr/bin/bash', stderr: '' };
        runSyncResults['which nonexistent-bin'] = { exitCode: 1, stdout: '', stderr: '' };

        assert.equal(SystemUtilities.checkDependencies('bash', 'nonexistent-bin'), false);
    });

    it('treats identifiers with shell metacharacters as missing', () => {
        resetMocks();
        assert.equal(SystemUtilities.checkDependencies('bash; rm -rf /'), false);
        assert.equal(SystemUtilities.checkDependencies('bash $(cmd)'), false);
        assert.equal(SystemUtilities.checkDependencies('bash | cat'), false);
    });
});

describe('SystemUtilities.checkExecutable', () => {
    it('returns true when any executable is found', () => {
        resetMocks();
        runSyncResults['which nonexistent-bin'] = { exitCode: 1, stdout: '', stderr: '' };
        runSyncResults['which bash'] = { exitCode: 0, stdout: '/usr/bin/bash', stderr: '' };

        assert.equal(SystemUtilities.checkExecutable(['nonexistent-bin', 'bash']), true);
    });

    it('returns false when no executable is found', () => {
        resetMocks();
        runSyncResults['which nonexistent-bin'] = { exitCode: 1, stdout: '', stderr: '' };

        assert.equal(SystemUtilities.checkExecutable(['nonexistent-bin']), false);
    });

    it('skips identifiers with shell metacharacters', () => {
        resetMocks();
        runSyncResults['which bash'] = { exitCode: 0, stdout: '/usr/bin/bash', stderr: '' };

        // The first entry is invalid and skipped; the second is found.
        assert.equal(SystemUtilities.checkExecutable(['bad;exe', 'bash']), true);
    });
});

describe('SystemUtilities.checkLibrary', () => {
    it('returns true when the library appears in ldconfig output', () => {
        resetMocks();
        runSyncResults['ldconfig -p'] = {
            exitCode: 0,
            stdout: 'libssl.so.3 (libc6,x86-64) => /lib/x86_64-linux-gnu/libssl.so.3\n',
            stderr: '',
        };

        assert.equal(SystemUtilities.checkLibrary(['libssl.so.3']), true);
    });

    it('returns false when the library is not in ldconfig output', () => {
        resetMocks();
        runSyncResults['ldconfig -p'] = {
            exitCode: 0,
            stdout: 'libother.so.1 (libc6,x86-64) => /lib/x86_64-linux-gnu/libother.so.1\n',
            stderr: '',
        };

        assert.equal(SystemUtilities.checkLibrary(['libssl.so.3']), false);
    });

    it('returns false when ldconfig fails', () => {
        resetMocks();
        runSyncResults['ldconfig -p'] = { exitCode: 1, stdout: '', stderr: 'ldconfig: command not found' };

        assert.equal(SystemUtilities.checkLibrary(['libssl.so.3']), false);
    });

    it('skips identifiers with shell metacharacters', () => {
        resetMocks();
        runSyncResults['ldconfig -p'] = {
            exitCode: 0,
            stdout: 'libssl.so.3\n',
            stderr: '',
        };

        // Only the invalid entry is supplied; nothing valid to match.
        assert.equal(SystemUtilities.checkLibrary(['bad;lib']), false);
    });
});

describe('SystemUtilities.checkServiceStatus', () => {
    it('returns ACTIVE when the service is active', () => {
        resetMocks();
        runSyncResults['systemctl is-active sshd'] = { exitCode: 0, stdout: 'active', stderr: '' };

        assert.equal(SystemUtilities.checkServiceStatus(['sshd']), 'ACTIVE');
    });

    it('returns INSTALLED when the service is inactive but enabled', () => {
        resetMocks();
        runSyncResults['systemctl is-active sshd'] = { exitCode: 0, stdout: 'inactive', stderr: '' };
        runSyncResults['systemctl is-enabled sshd'] = { exitCode: 0, stdout: 'enabled', stderr: '' };

        assert.equal(SystemUtilities.checkServiceStatus(['sshd']), 'INSTALLED');
    });

    it('returns MISSING when the service is not found', () => {
        resetMocks();
        runSyncResults['systemctl is-active nonexistent.service'] = { exitCode: 1, stdout: '', stderr: '' };

        assert.equal(SystemUtilities.checkServiceStatus(['nonexistent.service']), 'MISSING');
    });

    it('skips identifiers with shell metacharacters', () => {
        resetMocks();
        runSyncResults['systemctl is-active sshd'] = { exitCode: 0, stdout: 'active', stderr: '' };

        assert.equal(SystemUtilities.checkServiceStatus(['bad;svc', 'sshd']), 'ACTIVE');
    });
});

describe('SystemUtilities.notify', () => {
    it('passes summary and body as separate arguments', async () => {
        resetMocks();
        await SystemUtilities.notify({ summary: 'Test summary', body: 'Test body' });

        assert.equal(runCalls.length, 1);
        const args = runCalls[0];
        assert.equal(args[0], 'notify-send');
        assert.equal(args[1], 'Test summary');
        assert.equal(args[2], 'Test body');
    });

    it('includes optional flags in the correct order', async () => {
        resetMocks();
        await SystemUtilities.notify({
            summary: 'Summary',
            body: 'Body',
            appName: 'MyApp',
            urgency: 'critical',
            transient: true,
        });

        assert.equal(runCalls.length, 1);
        const args = runCalls[0];
        assert.deepEqual(args, [
            'notify-send',
            '-a', 'MyApp',
            '-u', 'critical',
            '-e',
            'Summary',
            'Body',
        ]);
    });

    it('omits flags that are not provided', async () => {
        resetMocks();
        await SystemUtilities.notify({ summary: 'Summary only' });

        assert.equal(runCalls.length, 1);
        const args = runCalls[0];
        assert.deepEqual(args, ['notify-send', 'Summary only']);
    });
});
