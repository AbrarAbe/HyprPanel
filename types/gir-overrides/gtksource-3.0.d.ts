/**
 * Hand-maintained type declarations for GtkSource 3.0 (gtksourceview3).
 *
 * The vendored @girs set (external/ags-types submodule) covers GtkSource
 * 4.0/5.0 but not 3.0, which HyprPanel uses. Regenerating 3.0 with a modern
 * ts-for-gir emits a strict `keyof SignalSignatures` connect style that
 * conflicts with the loose vendored Gtk 3.0 generation this project and the
 * astal 3.1.0 package are typed against, so this file declares only the
 * subset of the API the panel uses, following the vendored files' style.
 *
 * Keep in sync with actual usage: currently `src/components/shared/SourceView.tsx`
 * and `src/components/settings/shared/inputs/object/helpers/sourceViewSetup.ts`.
 */

declare module 'gi://GtkSource?version=3.0' {
    import type GObject from 'gi://GObject?version=2.0';
    import type Gtk from 'gi://Gtk?version=3.0';

    namespace GtkSource {
        export namespace SmartHomeEndType {
            export const $gtype: GObject.GType<SmartHomeEndType>;
        }

        enum SmartHomeEndType {
            /**
             * smart-home-end disabled.
             */
            DISABLED,
            /**
             * move to the first/last non-whitespace character on the first
             * press of the HOME/END keys and to the beginning/end of the line
             * on the second press.
             */
            BEFORE,
            /**
             * move to the beginning/end of the line on the first press of the
             * HOME/END keys and to the first/last non-whitespace character on
             * the second press.
             */
            AFTER,
            /**
             * always move to the first/last non-whitespace character when the
             * HOME/END keys are pressed.
             */
            ALWAYS,
        }

        module Buffer {
            // Constructor properties interface

            interface ConstructorProps extends Gtk.TextBuffer.ConstructorProps { }
        }

        class Buffer extends Gtk.TextBuffer {
            static $gtype: GObject.GType<Buffer>;

            constructor(properties?: Partial<Buffer.ConstructorProps>, ...args: any[]);

            // Methods

            set_language(language: Language | null): void;
            get_language(): Language | null;
            set_style_scheme(scheme: StyleScheme): void;
            get_style_scheme(): StyleScheme;
        }

        class Language extends GObject.Object {
            static $gtype: GObject.GType<Language>;

            // Methods

            get_id(): string;
            get_name(): string | null;
        }

        class LanguageManager extends GObject.Object {
            static $gtype: GObject.GType<LanguageManager>;

            // Constructors

            static get_default(): LanguageManager;

            // Methods

            get_language(id: string): Language | null;
            get_language_ids(): string[] | null;
        }

        class StyleScheme extends GObject.Object {
            static $gtype: GObject.GType<StyleScheme>;

            // Methods

            get_name(): string | null;
        }

        class StyleSchemeManager extends GObject.Object {
            static $gtype: GObject.GType<StyleSchemeManager>;

            // Constructors

            static get_default(): StyleSchemeManager;

            // Methods

            set_search_path(path: string[] | null): void;
            get_search_path(): string[] | null;
            get_scheme(scheme_id: string): StyleScheme | null;
        }

        module View {
            // Constructor properties interface

            interface ConstructorProps extends Gtk.TextView.ConstructorProps {
                show_line_numbers: boolean;
                showLineNumbers: boolean;
                highlight_current_line: boolean;
                highlightCurrentLine: boolean;
            }
        }

        class View extends Gtk.TextView {
            static $gtype: GObject.GType<View>;

            constructor(properties?: Partial<View.ConstructorProps>, ...args: any[]);

            // Methods

            set_tab_width(width: number): void;
            set_insert_spaces_instead_of_tabs(enable: boolean): void;
            set_auto_indent(enable: boolean): void;
            set_smart_backspace(enable: boolean): void;
            set_smart_home_end(smart_home_end: SmartHomeEndType): void;
        }

        /**
         * Name of the imported GIR library
         * `see` https://gitlab.gnome.org/GNOME/gjs/-/blob/master/gi/ns.cpp#L188
         */
        const __name__: string;
        /**
         * Version of the imported GIR library
         * `see` https://gitlab.gnome.org/GNOME/gjs/-/blob/master/gi/ns.cpp#L189
         */
        const __version__: string;
    }

    export default GtkSource;
}

declare module 'gi://GtkSource' {
    import GtkSource3 from 'gi://GtkSource?version=3.0';
    export default GtkSource3;
}
// END
