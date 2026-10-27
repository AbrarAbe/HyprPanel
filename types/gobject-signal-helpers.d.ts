/**
 * Signal-typing helpers referenced by the regenerated Astal GIR declarations
 * (types/gir-overrides/astalio-0.1.d.ts, astaltray-0.1.d.ts, astalwp-0.1.d.ts)
 * but missing from the vendored, older-generation GObject 2.0 declaration in
 * the external/ags-types @girs set. Declared here via module augmentation so
 * those regenerated files resolve them.
 *
 * Definitions copied verbatim from ts-for-gir@5.5.0's gobject-2.0 output.
 */

declare module 'gi://GObject?version=2.0' {
    export namespace GObject {
        export type GjsParameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

        export type SignalCallback<Emitter, Fn> = Fn extends (...args: infer P) => infer R
            ? (source: Emitter, ...args: P) => R
            : never;
    }
}
