import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

// commandRunner.ts imports GLib and execAsync from 'astal', whose index.ts
// bare-imports sibling .ts files that Node ESM cannot resolve. Mock 'astal'
// before importing the module under test, following the pattern used by
// tests/lib/path/helpers.test.ts.
let spawnSyncResult: [boolean, Uint8Array | null, Uint8Array | null, number] = [
    true,
    new TextEncoder().encode('stdout'),
    null,
    0,
];
let execAsyncResult = 'stdout\n';
let execAsyncShouldReject = false;

mock.module('astal', {
    namedExports: {
        execAsync: async (_args: string[]) => {
            if (execAsyncShouldReject) {
                throw new Error('non-zero exit');
            }
            return execAsyncResult;
        },
        GLib: {
            spawn_sync: (_args: unknown[]) => spawnSyncResult,
            SpawnFlags: { SEARCH_PATH: 0 },
        },
    },
});

const { CommandRunner } = await import('../../../src/core/system/commandRunner.ts');

describe('CommandRunner.validateIdentifier', () => {
    it('accepts ordinary binary and service names', () => {
        assert.equal(CommandRunner.validateIdentifier('which'), true);
        assert.equal(CommandRunner.validateIdentifier('notify-send'), true);
        assert.equal(CommandRunner.validateIdentifier('systemctl'), true);
        assert.equal(CommandRunner.validateIdentifier('pkg-config'), true);
        assert.equal(CommandRunner.validateIdentifier('my_service'), true);
        assert.equal(CommandRunner.validateIdentifier('v1.2'), true);
        assert.equal(CommandRunner.validateIdentifier('nvidia:0'), true);
    });

    it('rejects shell metacharacters', () => {
        assert.equal(CommandRunner.validateIdentifier('bin; rm -rf /'), false);
        assert.equal(CommandRunner.validateIdentifier('bin | cat'), false);
        assert.equal(CommandRunner.validateIdentifier('bin && echo x'), false);
        assert.equal(CommandRunner.validateIdentifier('bin > /tmp/x'), false);
    });

    it('rejects command substitution and backticks', () => {
        assert.equal(CommandRunner.validateIdentifier('bin $(cmd)'), false);
        assert.equal(CommandRunner.validateIdentifier('bin `cmd`'), false);
        assert.equal(CommandRunner.validateIdentifier('bin$(cmd)'), false);
    });

    it('rejects whitespace and path traversal', () => {
        assert.equal(CommandRunner.validateIdentifier('bin with spaces'), false);
        assert.equal(CommandRunner.validateIdentifier('../etc/passwd'), false);
        assert.equal(CommandRunner.validateIdentifier('bin&'), false);
        assert.equal(CommandRunner.validateIdentifier(''), false);
    });
});

describe('CommandRunner.runSync', () => {
    it('maps a successful spawn to exit code 0 and captured stdout', () => {
        spawnSyncResult = [
            true,
            new TextEncoder().encode('  /usr/bin/bash  '),
            null,
            0,
        ];

        const result = CommandRunner.runSync(['which', 'bash']);

        assert.equal(result.exitCode, 0);
        assert.equal(result.stdout, '/usr/bin/bash');
        assert.equal(result.stderr, '');
    });

    it('reports a non-zero exit status without throwing', () => {
        spawnSyncResult = [true, null, null, 1];

        const result = CommandRunner.runSync(['which', '__nonexistent__']);

        assert.notEqual(result.exitCode, 0);
        assert.equal(result.stdout, '');
    });

    it('reports a spawn failure as exit code 1', () => {
        spawnSyncResult = [false, null, null, 127];

        const result = CommandRunner.runSync(['__nonexistent_program__']);

        assert.equal(result.exitCode, 1);
        assert.equal(result.stderr, 'failed to spawn process');
    });

    it('captures stderr', () => {
        spawnSyncResult = [
            true,
            null,
            new TextEncoder().encode('error-message'),
            0,
        ];

        const result = CommandRunner.runSync(['sh', '-c', 'echo x >&2']);

        assert.equal(result.exitCode, 0);
        assert.equal(result.stderr, 'error-message');
    });
});

describe('CommandRunner.run', () => {
    it('maps a successful exec to exit code 0 and captured stdout', async () => {
        execAsyncResult = 'hello world\n';
        execAsyncShouldReject = false;

        const result = await CommandRunner.run(['echo', 'hello world']);

        assert.equal(result.exitCode, 0);
        assert.equal(result.stdout, 'hello world');
        assert.equal(result.stderr, '');
    });

    it('reports a non-zero exit without throwing', async () => {
        execAsyncShouldReject = true;

        const result = await CommandRunner.run(['false']);

        assert.notEqual(result.exitCode, 0);
        await assert.doesNotReject(() => CommandRunner.run(['false']));
    });

    it('maps a spawn rejection to exit code 1 and an error message', async () => {
        execAsyncShouldReject = true;

        const result = await CommandRunner.run(['__nonexistent_program__']);

        assert.equal(result.exitCode, 1);
        assert.equal(result.stdout, '');
        assert.equal(result.stderr, 'non-zero exit');
    });
});
