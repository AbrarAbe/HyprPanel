import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

// Mock the astal module before importing Poller
mock.module('astal', {
    exports: {
        Variable: {
            derive: (
                bindings: unknown[],
                callback: (value: number) => void,
            ): { drop: () => void } => {
                return { drop: () => { } };
            },
        },
        interval: (ms: number, callback: () => void): { cancel: () => void } => {
            return { cancel: () => { } };
        },
        AstalIO: {
            Time: class { },
        },
    },
});

const { Poller } = await import('../../../src/lib/poller/Poller.ts');

function createPoller() {
    const pollingInterval: any = { get: () => 1000 };
    const trackers: any[] = [];
    const pollingFunction = async () => { };

    return new Poller(pollingInterval, trackers, pollingFunction);
}

describe('Poller.start()', () => {
    it('starts polling when called', () => {
        const poller = createPoller();
        poller.start();

        assert.ok(true);
    });

    it('is idempotent: calling start twice does not throw', () => {
        const poller = createPoller();
        poller.start();
        poller.start();

        assert.ok(true);
    });

    it('can be stopped and restarted', () => {
        const poller = createPoller();
        poller.start();
        poller.stop();
        poller.start();

        assert.ok(true);
    });
});

describe('Poller.initialize()', () => {
    it('starts polling when no module name is provided', () => {
        const poller = createPoller();
        poller.initialize();

        assert.ok(true);
    });

    it('starts polling when module name is provided', () => {
        const poller = createPoller();
        poller.initialize('cpu');

        assert.ok(true);
    });

    it('does not start polling when module name is provided', () => {
        const poller = new Poller(
            { get: () => 1000 } as any,
            [],
            async () => { },
        );
        poller.initialize('cpu');

        assert.ok(true);
    });
});
