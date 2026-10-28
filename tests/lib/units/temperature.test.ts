import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TemperatureConverter } from '../../../src/lib/units/temperature/index.ts';

const approx = (actual: number, expected: number, epsilon = 1e-9): void => {
    assert.ok(
        Math.abs(actual - expected) < epsilon,
        `expected ${actual} to be within ${epsilon} of ${expected}`,
    );
};

describe('TemperatureConverter', () => {
    it('converts Celsius to Fahrenheit', () => {
        assert.equal(TemperatureConverter.fromCelsius(100).toFahrenheit(), 212);
    });

    it('converts Fahrenheit to Celsius', () => {
        assert.equal(TemperatureConverter.fromFahrenheit(32).toCelsius(), 0);
    });

    it('handles the Celsius/Fahrenheit crossover point', () => {
        assert.equal(TemperatureConverter.fromCelsius(-40).toFahrenheit(), -40);
    });

    it('converts Kelvin to Celsius', () => {
        approx(TemperatureConverter.fromKelvin(273.15).toCelsius(), 0);
    });

    it('converts Celsius to Kelvin', () => {
        approx(TemperatureConverter.fromCelsius(25).toKelvin(), 298.15);
    });

    it('respects the optional precision', () => {
        assert.equal(TemperatureConverter.fromFahrenheit(100).toCelsius(2), 37.78);
    });

    it('formats Celsius with a degree symbol', () => {
        assert.equal(TemperatureConverter.fromCelsius(21.5).formatCelsius(1), '21.5° C');
    });

    it('formats Fahrenheit with a degree symbol', () => {
        assert.equal(TemperatureConverter.fromCelsius(100).formatFahrenheit(0), '212° F');
    });

    it('formats Kelvin with a space before the symbol', () => {
        assert.equal(TemperatureConverter.fromCelsius(0).formatKelvin(0), '273 K');
    });
});
