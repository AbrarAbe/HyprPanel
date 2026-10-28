import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

// path/helpers.ts imports GLib from 'astal', which only resolves inside the
// GJS runtime. Mock the module before importing the helper so the tests run
// under plain Node with a deterministic home directory.
mock.module('astal', {
    namedExports: {
        GLib: { get_home_dir: () => '/home/tester' },
    },
});

const { normalizeToAbsolutePath, getHomeDir, joinPath } = await import('../../../src/lib/path/helpers.ts');

describe('normalizeToAbsolutePath', () => {
    it('expands a leading tilde to the home directory', () => {
        assert.equal(normalizeToAbsolutePath('~/Documents'), '/home/tester/Documents');
    });

    it('expands a bare tilde', () => {
        assert.equal(normalizeToAbsolutePath('~'), '/home/tester');
    });

    it('leaves absolute paths untouched', () => {
        assert.equal(normalizeToAbsolutePath('/usr/share/hyprpanel'), '/usr/share/hyprpanel');
    });

    it('leaves relative paths untouched', () => {
        assert.equal(normalizeToAbsolutePath('assets/themes.json'), 'assets/themes.json');
    });

    it('does not expand a tilde that is not the first character', () => {
        assert.equal(normalizeToAbsolutePath('foo~bar'), 'foo~bar');
    });
});

describe('getHomeDir', () => {
    it('returns the home directory', () => {
        assert.equal(getHomeDir(), '/home/tester');
    });
});

describe('joinPath', () => {
    it('joins segments with a single slash', () => {
        assert.equal(joinPath('/usr', 'share', 'hyprpanel'), '/usr/share/hyprpanel');
    });

    it('collapses duplicate slashes', () => {
        assert.equal(joinPath('/usr//share', '/hyprpanel'), '/usr/share/hyprpanel');
    });

    it('handles empty segments', () => {
        // Actual contract: a trailing empty segment yields a trailing slash.
        assert.equal(joinPath('', '/usr', ''), '/usr/');
    });
});
