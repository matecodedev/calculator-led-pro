import { describe, expect, it } from 'vitest';

import { summariseEvent, type ScreenTotals } from './eventSummary';

const screen = (name: string, over: Partial<ScreenTotals> = {}): ScreenTotals => ({
  id: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  cols: 10,
  rows: 6,
  totalCabinets: 60,
  weightKg: 510,
  maxPowerW: 9600,
  maxAmps: 43.64,
  expectedPowerW: 3180,
  expectedAmps: 14.45,
  dataCables: 4,
  powerCables: 5,
  processors: 1,
  ...over,
});

describe('summariseEvent', () => {
  it('adds up what the whole show draws and carries', () => {
    const summary = summariseEvent({
      screens: [
        screen('Main'),
        screen('Lateral L', { totalCabinets: 24, weightKg: 204, maxAmps: 17.45, maxPowerW: 3840 }),
      ],
      capacityAmps: null,
    });

    expect(summary.totalCabinets).toBe(84);
    expect(summary.totalWeightKg).toBe(714);
    expect(summary.totalMaxAmps).toBeCloseTo(61.09, 2);
    expect(summary.totalMaxPowerW).toBe(13440);
  });

  it('totals the cables and processors across every screen', () => {
    const summary = summariseEvent({
      screens: [screen('Main'), screen('Totem', { dataCables: 1, powerCables: 2, processors: 1 })],
      capacityAmps: null,
    });

    expect(summary.totalDataCables).toBe(5);
    expect(summary.totalPowerCables).toBe(7);
    expect(summary.totalProcessors).toBe(2);
  });

  it('says nothing about capacity when nobody declared the venue feed', () => {
    const summary = summariseEvent({ screens: [screen('Main')], capacityAmps: null });

    expect(summary.capacityAmps).toBeNull();
    expect(summary.overCapacity).toBe(false);
    expect(summary.headroomPercent).toBeNull();
  });

  it('reports headroom against the declared feed', () => {
    // 43.64 A of a 96 A supply leaves 54% spare.
    const summary = summariseEvent({ screens: [screen('Main')], capacityAmps: 96 });

    expect(summary.overCapacity).toBe(false);
    expect(summary.headroomPercent).toBeCloseTo(54.5, 1);
  });

  it('flags the show that fits screen by screen and not all together', () => {
    // Each of these passes its own PDU. Four of them do not pass the venue feed,
    // and nothing in the app used to notice.
    const summary = summariseEvent({
      screens: [screen('Main'), screen('Lateral L'), screen('Lateral R'), screen('Totems')],
      capacityAmps: 96,
    });

    expect(summary.totalMaxAmps).toBeCloseTo(174.56, 2);
    expect(summary.overCapacity).toBe(true);
    expect(summary.headroomPercent).toBe(0);
  });

  it('treats drawing exactly the declared feed as over capacity', () => {
    // A feed run at 100% is a feed with no margin for inrush; the breaker is
    // rated for continuous load below its number, not at it.
    const summary = summariseEvent({
      screens: [screen('Main', { maxAmps: 96 })],
      capacityAmps: 96,
    });

    expect(summary.overCapacity).toBe(true);
    expect(summary.headroomPercent).toBe(0);
  });

  it('handles an event whose screens are not calculable yet', () => {
    const summary = summariseEvent({ screens: [], capacityAmps: 96 });

    expect(summary.totalCabinets).toBe(0);
    expect(summary.totalMaxAmps).toBe(0);
    expect(summary.overCapacity).toBe(false);
    expect(summary.headroomPercent).toBe(100);
  });

  it('keeps the per-screen rows in the order given, for the report', () => {
    const summary = summariseEvent({
      screens: [screen('Main'), screen('Lateral L'), screen('Totem')],
      capacityAmps: null,
    });

    expect(summary.screens.map((s) => s.name)).toEqual(['Main', 'Lateral L', 'Totem']);
  });

  it.each([0, -5])('rejects a declared feed of %i A', (capacity) => {
    expect(() => summariseEvent({ screens: [screen('Main')], capacityAmps: capacity })).toThrow(
      RangeError,
    );
  });
});
