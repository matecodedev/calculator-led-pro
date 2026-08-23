import { describe, expect, it } from 'vitest';
import {
  BREAKER_DERATING,
  cabinetsPerPowerCircuit,
  calculateElectricalLoad,
  effectiveAmpsPerLine,
  expectedPowerW,
  type ContentLevel,
} from './load';

describe('effectiveAmpsPerLine', () => {
  it('derates the breaker to 80% for a continuous load', () => {
    expect(BREAKER_DERATING).toBe(0.8);
    expect(effectiveAmpsPerLine({ breakerAmps: 16, cableLoopAmps: 32 })).toBeCloseTo(12.8);
  });

  it('falls back to the cable rating when the breaker allows more than the cable', () => {
    // A 32 A breaker derates to 25.6 A, but a 16 A powerCON is still the real ceiling.
    expect(effectiveAmpsPerLine({ breakerAmps: 32, cableLoopAmps: 16 })).toBe(16);
  });

  it.each([
    [{ breakerAmps: 0, cableLoopAmps: 16 }],
    [{ breakerAmps: 16, cableLoopAmps: 0 }],
    [{ breakerAmps: -16, cableLoopAmps: 16 }],
  ])('rejects a non-positive rating (%o)', (input) => {
    expect(() => effectiveAmpsPerLine(input)).toThrow(RangeError);
  });
});

describe('cabinetsPerPowerCircuit', () => {
  it('fits whole cabinets into the circuit budget', () => {
    // 220 V x 12.8 A = 2816 W, at 260 W per cabinet -> 10 cabinets.
    expect(
      cabinetsPerPowerCircuit({ voltage: 220, ampsPerLine: 12.8, cabinetMaxPowerW: 260 }),
    ).toBe(10);
  });

  it('never rounds up past the budget', () => {
    // 2816 W / 280 W = 10.05 -> 10, not 11.
    expect(
      cabinetsPerPowerCircuit({ voltage: 220, ampsPerLine: 12.8, cabinetMaxPowerW: 280 }),
    ).toBe(10);
  });

  it('always reports at least one cabinet, even for a panel that outdraws the circuit', () => {
    expect(
      cabinetsPerPowerCircuit({ voltage: 220, ampsPerLine: 12.8, cabinetMaxPowerW: 4000 }),
    ).toBe(1);
  });

  it('rejects a cabinet that draws no power', () => {
    expect(() =>
      cabinetsPerPowerCircuit({ voltage: 220, ampsPerLine: 12.8, cabinetMaxPowerW: 0 }),
    ).toThrow(RangeError);
  });
});

describe('calculateElectricalLoad', () => {
  const input = {
    totalCabinets: 40,
    cabinetMaxPowerW: 160,
    cabinetAvgPowerW: 53,
    voltage: 220,
    breakerAmps: 16,
    cableLoopAmps: 16,
    brightness: 1,
    content: 'video' as ContentLevel,
  };

  it('sums peak and average draw across the array', () => {
    const load = calculateElectricalLoad(input);

    expect(load.maxPowerW).toBe(6400);
    expect(load.avgPowerW).toBe(2120);
  });

  it('converts peak power to current at the supply voltage', () => {
    expect(calculateElectricalLoad(input).maxAmps).toBeCloseTo(29.09, 2);
  });

  it('reports how many cabinets one circuit carries', () => {
    // 220 V x 12.8 A = 2816 W -> 17 cabinets per circuit. How many cables that
    // takes is the routing's answer, not this one: see `routing/demand.ts`.
    const load = calculateElectricalLoad(input);

    expect(load.cabinetsPerPowerCable).toBe(17);
    expect(load).not.toHaveProperty('powerCablesNeeded');
  });

  it('needs no cables for an empty array', () => {
    const load = calculateElectricalLoad({ ...input, totalCabinets: 0 });

    expect(load.maxPowerW).toBe(0);
  });

  it('rejects a negative cabinet count', () => {
    expect(() => calculateElectricalLoad({ ...input, totalCabinets: -1 })).toThrow(RangeError);
  });

  it('never reports Infinity when the cabinet draws no power', () => {
    expect(() => calculateElectricalLoad({ ...input, cabinetMaxPowerW: 0 })).toThrow(RangeError);
  });
});

describe('expectedPowerW', () => {
  const cabinet = { cabinetMaxPowerW: 160, cabinetAvgPowerW: 53 };

  it('uses the manufacturer typical figure for video at full brightness', () => {
    // The catalog's avgPower is exactly what "typical content, full brightness"
    // means, so this case is the one number in the model nobody invented.
    expect(
      expectedPowerW({ totalCabinets: 40, ...cabinet, brightness: 1, content: 'video' }),
    ).toBeCloseTo(40 * 53, 5);
  });

  it('scales linearly with brightness', () => {
    const half = expectedPowerW({
      totalCabinets: 40,
      ...cabinet,
      brightness: 0.5,
      content: 'video',
    });

    expect(half).toBeCloseTo(40 * 53 * 0.5, 5);
  });

  it('charges full peak for an all-white screen', () => {
    expect(expectedPowerW({ totalCabinets: 40, ...cabinet, brightness: 1, content: 'white' })).toBe(
      40 * 160,
    );
  });

  it('puts bright graphics between typical video and white', () => {
    const at = (content: ContentLevel) =>
      expectedPowerW({ totalCabinets: 40, ...cabinet, brightness: 1, content });

    expect(at('dark')).toBeLessThan(at('video'));
    expect(at('video')).toBeLessThan(at('bright'));
    expect(at('bright')).toBeLessThan(at('white'));
  });

  it('never exceeds what the panels can physically draw', () => {
    // 1.8x the typical figure would pass the peak on a cabinet whose average is
    // more than half its maximum, and no content can draw more than all-white.
    const dense = { cabinetMaxPowerW: 100, cabinetAvgPowerW: 90 };

    expect(expectedPowerW({ totalCabinets: 10, ...dense, brightness: 1, content: 'bright' })).toBe(
      10 * 100,
    );
  });

  it('costs nothing for an empty array', () => {
    expect(expectedPowerW({ totalCabinets: 0, ...cabinet, brightness: 1, content: 'video' })).toBe(
      0,
    );
  });

  it.each([0, -0.5, 1.5])('rejects a brightness of %s', (brightness) => {
    expect(() =>
      expectedPowerW({ totalCabinets: 40, ...cabinet, brightness, content: 'video' }),
    ).toThrow(RangeError);
  });
});
