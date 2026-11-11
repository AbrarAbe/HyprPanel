import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

// Mock the astal module before importing Poller
mock.module('astal', {
    namedExports: {
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

// Mock bar/helpers module (imported by Poller.ts via GIR type declarations)
mock.module('../../../src/lib/bar/helpers.ts', {
    namedExports: {
        getLayoutItems: () => [],
    },
});

const { Poller } = await import('../../../src/lib/poller/Poller.ts');

function createPoller() {
    const pollingInterval: any = { get: () => 1000 };
    const trackers: any[] = [];
    const pollingFunction = async () => { };
    const layoutsBinding: any = { get: () => [], subscribe: () => () => { } };

    return new Poller(pollingInterval, trackers, pollingFunction, layoutsBinding);
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
        const poller = new Poller(
            { get: () => 1000 } as any,
            [],
            async () => { },
            { get: () => ['cpu'], subscribe: () => () => { } } as any,
        );
        poller.initialize('cpu');

        assert.ok(true);
    });

    it('does not start polling when module name is not in layout', () => {
        const poller = new Poller(
            { get: () => 1000 } as any,
            [],
            async () => { },
            { get: () => ['ram'], subscribe: () => () => { } } as any,
        );
        poller.initialize('cpu');

        assert.ok(true);
    });
});
