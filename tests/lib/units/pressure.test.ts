import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PressureConverter } from '../../../src/lib/units/pressure/index.ts';

const approx = (actual: number, expected: number, epsilon = 1e-9): void => {
    assert.ok(
        Math.abs(actual - expected) < epsilon,
        `expected ${actual} to be within ${epsilon} of ${expected}`,
    );
};

describe('PressureConverter', () => {
    it('converts hectopascals to pascals', () => {
        assert.equal(PressureConverter.fromHPa(1013.25).toPa(), 101325);
    });

    it('converts pascals to hectopascals', () => {
        assert.equal(PressureConverter.fromPa(101325).toHPa(), 1013.25);
    });

    it('treats millibar as equivalent to hectopascals', () => {
        approx(PressureConverter.fromPa(101325).toMb(), 1013.25);
    });

    it('converts psi to pascals', () => {
        approx(PressureConverter.fromPsi(1).toPa(), 6894.76);
    });

    it('converts inches of mercury to hectopascals', () => {
        approx(PressureConverter.fromInHg(1).toHPa(), 33.8639);
    });

    it('round-trips through the same unit', () => {
        approx(PressureConverter.fromPa(987.65).toPa(), 987.65);
        approx(PressureConverter.fromPsi(14.7).toPsi(), 14.7);
    });

    it('formats with unit suffixes', () => {
        assert.equal(PressureConverter.fromPa(101325).formatHPa(2), '1013.25 hPa');
        assert.equal(PressureConverter.fromHPa(1013.25).formatPa(0), '101325 Pa');
        assert.equal(PressureConverter.fromPa(101325).formatMb(0), '1013 mb');
        assert.equal(PressureConverter.fromPa(6894.76).formatPsi(1), '1.0 PSI');
        assert.equal(PressureConverter.fromPa(3386.39).formatInHg(2), '1.00 inHg');
    });
});
