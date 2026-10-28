import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LengthConverter } from '../../../src/lib/units/length/index.ts';

const approx = (actual: number, expected: number, epsilon = 1e-9): void => {
    assert.ok(
        Math.abs(actual - expected) < epsilon,
        `expected ${actual} to be within ${epsilon} of ${expected}`,
    );
};

describe('LengthConverter', () => {
    it('converts kilometers to meters', () => {
        assert.equal(LengthConverter.fromKm(1).toMeters(), 1000);
    });

    it('converts centimeters to meters', () => {
        assert.equal(LengthConverter.fromCm(100).toMeters(), 1);
    });

    it('converts meters to kilometers', () => {
        approx(LengthConverter.fromMeters(1500).toKm(), 1.5);
    });

    it('converts miles to kilometers', () => {
        approx(LengthConverter.fromMiles(1).toKm(), 1.609344);
    });

    it('converts inches to feet', () => {
        approx(LengthConverter.fromInches(12).toFeet(), 1);
    });

    it('round-trips through the same unit', () => {
        approx(LengthConverter.fromMm(1234.5).toMm(), 1234.5);
        approx(LengthConverter.fromMiles(2.7).toMiles(), 2.7);
    });

    it('formats with default precision per unit', () => {
        assert.equal(LengthConverter.fromCm(150).formatMeters(), '1.50 m');
        assert.equal(LengthConverter.fromKm(1).formatKm(), '1.0 km');
    });

    it('formats millimeters with a unit suffix', () => {
        assert.equal(LengthConverter.fromMeters(2).formatMm(0), '2000 mm');
    });

    it('formats miles with a unit suffix', () => {
        assert.equal(LengthConverter.fromKm(1.609344).formatMiles(1), '1.0 mi');
    });
});
