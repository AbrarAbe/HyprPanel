import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isHexColor, isValidGjsColor } from '../../../src/lib/validation/colors.ts';

describe('isValidGjsColor', () => {
    it('accepts named colors case-insensitively', () => {
        assert.equal(isValidGjsColor('red'), true);
        assert.equal(isValidGjsColor('RED'), true);
        assert.equal(isValidGjsColor('Crimson'), true);
    });

    it('trims whitespace before matching named colors', () => {
        assert.equal(isValidGjsColor('  red  '), true);
    });

    it('accepts 3, 4, 6, and 8 digit hex colors', () => {
        assert.equal(isValidGjsColor('#f00'), true);
        assert.equal(isValidGjsColor('#f00f'), true);
        assert.equal(isValidGjsColor('#ff0000'), true);
        assert.equal(isValidGjsColor('#ff0000ff'), true);
    });

    it('rejects malformed hex colors', () => {
        assert.equal(isValidGjsColor('#ff'), false);
        assert.equal(isValidGjsColor('#ff000'), false);
        assert.equal(isValidGjsColor('ff0000'), false);
    });

    it('accepts 7-digit hex per its {6,8} digit contract', () => {
        // Known looseness: the regex allows 6-8 digits, so 7-digit hex (not
        // valid CSS) passes. Documented as-is; tightening is a behavior
        // change for a later task.
        assert.equal(isValidGjsColor('#ff0000f'), true);
    });

    it('accepts rgb() colors', () => {
        assert.equal(isValidGjsColor('rgb(255, 0, 0)'), true);
        assert.equal(isValidGjsColor('rgb(10%,20%,30%)'), true);
    });

    it('accepts rgba() colors with alpha 0, 1, or a fraction', () => {
        assert.equal(isValidGjsColor('rgba(255, 0, 0, 0.5)'), true);
        assert.equal(isValidGjsColor('rgba(255, 0, 0, 0)'), true);
        assert.equal(isValidGjsColor('rgba(255, 0, 0, 1)'), true);
    });

    it('rejects rgba() with an out-of-range alpha', () => {
        assert.equal(isValidGjsColor('rgba(255, 0, 0, 2)'), false);
        assert.equal(isValidGjsColor('rgba(255, 0, 0, -0.5)'), false);
    });

    it('rejects non-color strings', () => {
        assert.equal(isValidGjsColor('not-a-color'), false);
        assert.equal(isValidGjsColor(''), false);
    });
});

describe('isHexColor', () => {
    it('accepts 3-digit and 6-digit hex', () => {
        assert.equal(isHexColor('#abc'), true);
        assert.equal(isHexColor('#aabbcc'), true);
    });

    it('rejects 4-digit and 8-digit hex', () => {
        assert.equal(isHexColor('#abcd'), false);
        assert.equal(isHexColor('#aabbccdd'), false);
    });

    it('rejects non-strings', () => {
        assert.equal(isHexColor(0xff0000), false);
        assert.equal(isHexColor(null), false);
        assert.equal(isHexColor(undefined), false);
    });
});
