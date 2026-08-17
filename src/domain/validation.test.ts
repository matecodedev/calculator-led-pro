import { describe, expect, it } from 'vitest';
import type { Cabinet, Processor } from './catalog';
import { validateCabinet, validateProcessor, validateTarget } from './validation';

const cabinet: Cabinet = {
  id: 'test',
  brand: 'Test',
  model: 'Panel',
  pitch: 2.97,
  width: 500,
  height: 500,
  resX: 168,
  resY: 168,
  maxPower: 160,
  avgPower: 53,
  weight: 8.5,
};

const processor: Processor = {
  id: 'test-p',
  brand: 'Test',
  model: 'Sender',
  dataPorts: 10,
  maxPixelsPerPort: 650_000,
};

describe('validateCabinet', () => {
  it('accepts a complete cabinet', () => {
    expect(validateCabinet(cabinet)).toEqual([]);
  });

  it.each([
    ['width', 'Width'],
    ['height', 'Height'],
    ['resX', 'Horizontal resolution'],
    ['resY', 'Vertical resolution'],
    ['maxPower', 'Max power'],
    ['pitch', 'Pixel pitch'],
    ['weight', 'Weight'],
  ] as const)('reports %s when it is zero', (field, label) => {
    const issues = validateCabinet({ ...cabinet, [field]: 0 });

    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe(field);
    expect(issues[0].message).toContain(label);
  });

  it('reports a negative value', () => {
    expect(validateCabinet({ ...cabinet, width: -500 })).toHaveLength(1);
  });

  it('reports a cleared field, which arrives as NaN', () => {
    expect(validateCabinet({ ...cabinet, resX: Number.NaN })).toHaveLength(1);
  });

  it('collects every problem rather than stopping at the first', () => {
    expect(validateCabinet({ ...cabinet, width: 0, resX: 0, maxPower: 0 })).toHaveLength(3);
  });
});

describe('validateProcessor', () => {
  it('accepts a complete processor', () => {
    expect(validateProcessor(processor)).toEqual([]);
  });

  it('reports a processor with no output ports', () => {
    const issues = validateProcessor({ ...processor, dataPorts: 0 });

    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe('dataPorts');
  });

  it('reports a processor with no pixel budget per port', () => {
    expect(validateProcessor({ ...processor, maxPixelsPerPort: 0 })).toHaveLength(1);
  });

  it('reports a fractional port count', () => {
    expect(validateProcessor({ ...processor, dataPorts: 2.5 })).toHaveLength(1);
  });
});

describe('validateTarget', () => {
  it('accepts a screen stated in metres', () => {
    expect(validateTarget({ mode: 'dimensions', widthM: 4, heightM: 2.5 })).toEqual([]);
  });

  it('accepts a screen stated in panels', () => {
    expect(validateTarget({ mode: 'count', cols: 8, rows: 5 })).toEqual([]);
  });

  it('reports a zero dimension', () => {
    expect(validateTarget({ mode: 'dimensions', widthM: 0, heightM: 2.5 })).toHaveLength(1);
  });

  it('reports a fractional panel count', () => {
    expect(validateTarget({ mode: 'count', cols: 8.5, rows: 5 })).toHaveLength(1);
  });

  it('reports a grid larger than the app will render', () => {
    const issues = validateTarget({ mode: 'count', cols: 400, rows: 400 });

    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/cabinets/i);
  });
});
