import { describe, expect, it } from 'vitest';

import { STANDARD_LENGTHS_M, cableSchedule } from './schedule';
import type { GridPosition } from './serpentine';

/** A run climbing one column from the bottom of a `rows`-tall grid. */
const column = (x: number, rows: number): GridPosition[] =>
  Array.from({ length: rows }, (_, i) => ({ x, y: rows - 1 - i }));

const base = {
  cabinetWidthMm: 500,
  cabinetHeightMm: 500,
  rows: 6,
  trimHeightM: 1.5,
  distanceToSourceM: 8,
  slack: 0.15,
};

describe('cableSchedule', () => {
  it('counts one main per run and a jumper between neighbours', () => {
    const schedule = cableSchedule({ ...base, runs: [column(0, 6), column(1, 6)] });

    expect(schedule.totalMains).toBe(2);
    // Six cabinets on a cable need five jumpers, not six.
    expect(schedule.totalJumpers).toBe(10);
  });

  it('measures a main from the source to the cabinet it feeds', () => {
    // 8 m across the floor + 1.5 m of trim + 0 m of climb, +15% slack = 10.9 m,
    // which only a 15 m cable covers.
    const [run] = cableSchedule({ ...base, runs: [column(0, 6)] }).runs;

    expect(run.rawLengthM).toBeCloseTo(10.925, 3);
    expect(run.mainLengthM).toBe(15);
  });

  it('adds the climb for a run that does not start on the bottom row', () => {
    // Stacked runs: the second one starts three cabinets up, so its main is
    // 1.5 m longer before slack.
    const high: GridPosition[] = [
      { x: 0, y: 2 },
      { x: 0, y: 1 },
      { x: 0, y: 0 },
    ];
    const [run] = cableSchedule({ ...base, runs: [high] }).runs;

    expect(run.climbM).toBeCloseTo(1.5, 5);
    expect(run.rawLengthM).toBeGreaterThan(10.925);
  });

  it('rounds every main up to a cable that exists', () => {
    for (const length of cableSchedule({ ...base, runs: [column(0, 6)] }).runs) {
      expect(STANDARD_LENGTHS_M).toContain(length.mainLengthM);
    }
  });

  it('never rounds a main down below what it has to reach', () => {
    const { runs } = cableSchedule({ ...base, runs: [column(0, 6)], distanceToSourceM: 30 });

    expect(runs[0].mainLengthM).toBeGreaterThanOrEqual(runs[0].rawLengthM);
  });

  it('packs the mains by length, so the list is what goes in the truck', () => {
    const schedule = cableSchedule({
      ...base,
      runs: [column(0, 6), column(1, 6), column(2, 6)],
    });

    expect(schedule.mainsByLength).toEqual([{ lengthM: 15, count: 3 }]);
  });

  it('groups mains of different lengths separately', () => {
    const short = cableSchedule({
      ...base,
      distanceToSourceM: 1,
      trimHeightM: 0.5,
      runs: [column(0, 6), [{ x: 1, y: 0 }]],
    });

    expect(short.mainsByLength.length).toBeGreaterThan(1);
    expect(short.mainsByLength.map((m) => m.lengthM)).toEqual(
      [...short.mainsByLength].map((m) => m.lengthM).sort((a, b) => a - b),
    );
  });

  it('warns when a run needs more cable than the longest one made', () => {
    const schedule = cableSchedule({ ...base, runs: [column(0, 6)], distanceToSourceM: 200 });

    expect(schedule.beyondLongestCable).toBe(true);
  });

  it('asks for nothing when nothing is drawn', () => {
    const schedule = cableSchedule({ ...base, runs: [] });

    expect(schedule.totalMains).toBe(0);
    expect(schedule.totalJumpers).toBe(0);
    expect(schedule.mainsByLength).toEqual([]);
  });

  it('ignores the empty run a half-drawn plan carries', () => {
    expect(cableSchedule({ ...base, runs: [[], column(0, 6)] }).totalMains).toBe(1);
  });

  it.each([-1, -0.5])('rejects a slack of %s', (slack) => {
    expect(() => cableSchedule({ ...base, runs: [column(0, 6)], slack })).toThrow(RangeError);
  });

  it.each([-1, -0.1])('rejects a trim height of %s m', (trimHeightM) => {
    expect(() => cableSchedule({ ...base, runs: [column(0, 6)], trimHeightM })).toThrow(RangeError);
  });
});
