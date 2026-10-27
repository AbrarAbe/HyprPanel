import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SizeConverter } from '../../../src/lib/units/size/index.ts';

describe('SizeConverter', () => {
    it('converts between binary byte units', () => {
        assert.equal(SizeConverter.fromGiB(1).toMiB(), 1024);
        assert.equal(SizeConverter.fromTiB(1).toGiB(), 1024);
        assert.equal(SizeConverter.fromKiB(2).toBytes(), 2048);
    });

    it('converts bytes upward with precision', () => {
        assert.equal(SizeConverter.fromBytes(1536).toKiB(1), 1.5);
        assert.equal(SizeConverter.fromBytes(1024 * 1024).toMiB(), 1);
    });

    it('picks the most appropriate unit automatically', () => {
        assert.deepEqual(SizeConverter.fromBytes(500).toAuto(), { value: 500, unit: 'bytes' });
        assert.deepEqual(SizeConverter.fromBytes(1024).toAuto(), { value: 1, unit: 'kibibytes' });
        assert.deepEqual(SizeConverter.fromBytes(1024 ** 2).toAuto(), { value: 1, unit: 'mebibytes' });
        assert.deepEqual(SizeConverter.fromBytes(1024 ** 3).toAuto(), { value: 1, unit: 'gibibytes' });
        assert.deepEqual(SizeConverter.fromBytes(1024 ** 4).toAuto(), { value: 1, unit: 'tebibytes' });
    });

    it('respects precision in automatic conversion', () => {
        assert.deepEqual(SizeConverter.fromBytes(1536).toAuto(1), { value: 1.5, unit: 'kibibytes' });
    });

    it('round-trips through the same unit', () => {
        assert.equal(SizeConverter.fromBytes(987654).toBytes(), 987654);
    });

    it('formats with binary unit suffixes', () => {
        assert.equal(SizeConverter.fromGiB(1).formatMiB(0), '1024 MiB');
        assert.equal(SizeConverter.fromBytes(512).formatBytes(), '512 B');
        assert.equal(SizeConverter.fromBytes(1024).formatKiB(2), '1.00 KiB');
    });
});
