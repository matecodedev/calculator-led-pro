import { describe, expect, it } from 'vitest';
import { calculateArrayGeometry, cabinetsPerDataPort, gridForDimensions } from './geometry';

const cabinet = {
  width: 500,
  height: 500,
  resX: 168,
  resY: 168,
  weight: 8.5,
};

describe('gridForDimensions', () => {
  it('fills an exact target with no spare panels', () => {
    expect(gridForDimensions({ targetWidthM: 4, targetHeightM: 2.5, cabinet })).toEqual({
      cols: 8,
      rows: 5,
    });
  });

  it('rounds up: a partial panel still needs a whole panel', () => {
    expect(gridForDimensions({ targetWidthM: 4.1, targetHeightM: 2.5, cabinet })).toEqual({
      cols: 9,
      rows: 5,
    });
  });

  it('handles panels that are taller than they are wide', () => {
    const tall = { ...cabinet, height: 1000, resY: 336 };

    expect(gridForDimensions({ targetWidthM: 4, targetHeightM: 2.5, cabinet: tall })).toEqual({
      cols: 8,
      rows: 3,
    });
  });

  it('always returns at least one panel for a positive target', () => {
    expect(gridForDimensions({ targetWidthM: 0.1, targetHeightM: 0.1, cabinet })).toEqual({
      cols: 1,
      rows: 1,
    });
  });

  it.each([
    ['a zero target', { targetWidthM: 0, targetHeightM: 2.5 }],
    ['a negative target', { targetWidthM: -4, targetHeightM: 2.5 }],
  ])('rejects %s', (_label, target) => {
    expect(() => gridForDimensions({ ...target, cabinet })).toThrow(RangeError);
  });

  it('rejects a cabinet with no width', () => {
    expect(() =>
      gridForDimensions({ targetWidthM: 4, targetHeightM: 2.5, cabinet: { ...cabinet, width: 0 } }),
    ).toThrow(RangeError);
  });
});

describe('calculateArrayGeometry', () => {
  const geometry = calculateArrayGeometry({ cols: 8, rows: 5, cabinet });

  it('reports the physical size in metres', () => {
    expect(geometry.arrayWidthM).toBe(4);
    expect(geometry.arrayHeightM).toBe(2.5);
  });

  it('multiplies the per-cabinet resolution across the grid', () => {
    expect(geometry.resX).toBe(1344);
    expect(geometry.resY).toBe(840);
    expect(geometry.totalPixels).toBe(1_128_960);
  });

  it('totals cabinets and weight', () => {
    expect(geometry.totalCabinets).toBe(40);
    expect(geometry.weightTotal).toBe(340);
  });

  it('rejects a fractional grid', () => {
    expect(() => calculateArrayGeometry({ cols: 8.5, rows: 5, cabinet })).toThrow(RangeError);
  });
});

describe('cabinetsPerDataPort', () => {
  it('fits whole cabinets into the port pixel budget', () => {
    // 650 000 / (168 x 168 = 28 224) -> 23 cabinets.
    expect(cabinetsPerDataPort({ maxPixelsPerPort: 650_000, cabinet })).toBe(23);
  });

  it('reports at least one cabinet for a panel larger than the port budget', () => {
    expect(cabinetsPerDataPort({ maxPixelsPerPort: 10_000, cabinet })).toBe(1);
  });

  it('rejects a cabinet with no pixels instead of returning Infinity', () => {
    expect(() =>
      cabinetsPerDataPort({ maxPixelsPerPort: 650_000, cabinet: { ...cabinet, resX: 0 } }),
    ).toThrow(RangeError);
  });

  it('rejects a port with no pixel budget', () => {
    expect(() => cabinetsPerDataPort({ maxPixelsPerPort: 0, cabinet })).toThrow(RangeError);
  });
});
