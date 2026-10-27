import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SpeedConverter } from '../../../src/lib/units/speed/index.ts';

const approx = (actual: number, expected: number, epsilon = 1e-3): void => {
    assert.ok(
        Math.abs(actual - expected) < epsilon,
        `expected ${actual} to be within ${epsilon} of ${expected}`,
    );
};

describe('SpeedConverter', () => {
    it('converts meters per second to kilometers per hour', () => {
        approx(SpeedConverter.fromMps(1).toKph(), 3.6, 1e-2);
    });

    it('converts kilometers per hour to meters per second', () => {
        approx(SpeedConverter.fromKph(100).toMps(), 27.7778);
    });

    it('converts knots to miles per hour', () => {
        approx(SpeedConverter.fromKnots(1).toMph(), 1.15078, 1e-3);
    });

    it('converts meters per second to knots', () => {
        approx(SpeedConverter.fromMps(10).toKnots(), 19.4384, 1e-2);
    });

    it('round-trips through the same unit', () => {
        approx(SpeedConverter.fromMps(7.25).toMps(), 7.25, 1e-9);
        approx(SpeedConverter.fromKph(88).toKph(), 88, 1e-9);
    });

    it('formats with unit labels', () => {
        assert.equal(SpeedConverter.fromKph(60).formatKph(), '60 km/h');
        assert.equal(SpeedConverter.fromMps(1).formatMps(1), '1.0 m/s');
        assert.equal(SpeedConverter.fromMps(1).formatMph(0), '2 mph');
        assert.equal(SpeedConverter.fromKnots(1).formatKnots(1), '1.0 kn');
    });
});
