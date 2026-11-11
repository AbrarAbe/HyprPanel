import type { AstalIO, Binding } from 'astal';
import { interval, Variable } from 'astal';
import type { BarModule } from '../options/types';
import { getLayoutItems } from '../bar/helpers.ts';

/**
 * A class that manages the polling lifecycle, including interval management and execution state.
 */
export class Poller {
    private _intervalInstance: AstalIO.Time | null = null;
    private _deriveSubscription: { drop: () => void } | null = null;
    private _layoutsSubscription: (() => void) | null = null;
    private _isExecuting: boolean = false;
    private _pollingFunction: () => Promise<void>;

    private readonly _pollingInterval: Binding<number>;
    private readonly _trackers: Binding<unknown>[];
    private readonly _layouts: Binding<unknown>;

    /**
     * Creates an instance of Poller.
     * @param pollingInterval - The interval at which polling occurs.
     * @param trackers - An array of trackers to monitor.
     * @param pollingFunction - The function to execute during each poll.
     * @param layouts - The bar layouts binding, used to determine which modules are active.
     */
    constructor(
        pollingInterval: Binding<number>,
        trackers: Binding<unknown>[],
        pollingFunction: () => Promise<void>,
        layouts: Binding<unknown>,
    ) {
        this._pollingInterval = pollingInterval;
        this._trackers = trackers;
        this._pollingFunction = pollingFunction;
        this._layouts = layouts;
    }

    /**
     * Starts the polling process by setting up the interval.
     *
     * Idempotent: calling start() multiple times does not create multiple
     * intervals. Any existing derive subscription is disconnected first.
     */
    public start(): void {
        this._disconnectDerive();

        this._deriveSubscription = Variable.derive(
            [this._pollingInterval, ...this._trackers],
            (intervalMs: number) => {
                this._executePolling(intervalMs);
            },
        );
    }

    /**
     * Stops the polling process and cleans up resources.
     *
     * Disconnects the Variable.derive subscription and cancels the interval.
     */
    public stop(): void {
        this._disconnectDerive();

        if (this._intervalInstance !== null) {
            this._intervalInstance.cancel();
            this._intervalInstance = null;
        }
    }

    /**
     * Initializes the polling based on module usage.
     *
     * If no module is provided then we can safely assume that we want
     * to always run the polling interval.
     *
     * @param moduleName - The name of the module to initialize.
     */
    public initialize(moduleName?: BarModule): void {
        // Disconnect any existing layouts subscription to ensure idempotency
        this._layoutsSubscription?.();
        this._layoutsSubscription = null;

        if (moduleName === undefined) {
            return this.start();
        }

        const layoutsValue = this._layouts.get() as Record<
            string,
            { left: string[]; middle: string[]; right: string[] }
        >;
        const usedModules: string[] = [];
        Object.keys(layoutsValue).forEach((monitor) => {
            const layout = layoutsValue[monitor];
            usedModules.push(...(layout.left ?? []), ...(layout.middle ?? []), ...(layout.right ?? []));
        });

        if (usedModules.includes(moduleName)) {
            this.start();
        } else {
            this.stop();
        }

        this._layoutsSubscription = this._layouts.subscribe(() => {
            const layoutsValue = this._layouts.get() as Record<
                string,
                { left: string[]; middle: string[]; right: string[] }
            >;
            const usedModules: string[] = [];
            Object.keys(layoutsValue).forEach((monitor) => {
                const layout = layoutsValue[monitor];
                usedModules.push(...(layout.left ?? []), ...(layout.middle ?? []), ...(layout.right ?? []));
            });

            if (usedModules.includes(moduleName)) {
                this.start();
            } else {
                this.stop();
            }
        });
    }

    /**
     * Disconnects the Variable.derive subscription.
     */
    private _disconnectDerive(): void {
        this._deriveSubscription?.drop();
        this._deriveSubscription = null;
    }

    /**
     * Executes the polling function at the specified interval.
     *
     * @param intervalMs - The polling interval in milliseconds.
     */
    private _executePolling(intervalMs: number): void {
        if (this._intervalInstance !== null) {
            this._intervalInstance.cancel();
        }

        if (intervalMs === 0) {
            this._executeSinglePoll();
            return;
        }

        this._intervalInstance = interval(intervalMs, () => this._executePollingCycle());
    }

    /**
     * Executes a single polling operation synchronously.
     */
    private _executeSinglePoll(): void {
        try {
            this._pollingFunction();
        } catch (error) {
            console.error('Error during polling execution:', error);
        }
    }

    /**
     * Executes an asynchronous polling cycle with execution guard.
     * Ensures only one polling cycle runs at a time using the isExecuting flag.
     */
    private async _executePollingCycle(): Promise<void> {
        if (this._isExecuting) {
            return;
        }

        this._isExecuting = true;

        try {
            await this._pollingFunction();
        } catch (error) {
            console.error('Error during polling execution:', error);
        } finally {
            this._isExecuting = false;
        }
    }
}
