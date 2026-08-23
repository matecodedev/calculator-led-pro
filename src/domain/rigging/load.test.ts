import { describe, expect, it } from 'vitest';

import { riggingLoad } from './load';

const flown = {
  mount: 'flown' as const,
  cols: 10,
  rows: 6,
  cabinetWeightKg: 8.5,
  points: 6,
  pointCapacityKg: null,
};

describe('riggingLoad, flown', () => {
  it('splits the screen across its points', () => {
    const load = riggingLoad(flown);

    expect(load.totalKg).toBe(510);
    expect(load.perPointKg).toBe(85);
  });

  it('reports the heaviest column, which is what a single point carries', () => {
    // Six cabinets stacked over one point is 51 kg on that pick, whatever the
    // average across the beam says.
    expect(riggingLoad(flown).heaviestColumnKg).toBe(51);
  });

  it('says nothing about capacity when nobody declared a point rating', () => {
    const load = riggingLoad(flown);

    expect(load.pointCapacityKg).toBeNull();
    expect(load.overCapacity).toBe(false);
    expect(load.headroomPercent).toBeNull();
  });

  it('flags a point asked for more than it is rated for', () => {
    const load = riggingLoad({ ...flown, points: 2, pointCapacityKg: 200 });

    expect(load.perPointKg).toBe(255);
    expect(load.overCapacity).toBe(true);
    expect(load.headroomPercent).toBe(0);
  });

  it('reports headroom against a rating the screen fits', () => {
    const load = riggingLoad({ ...flown, pointCapacityKg: 100 });

    expect(load.overCapacity).toBe(false);
    expect(load.headroomPercent).toBeCloseTo(15, 5);
  });

  it('warns when the points do not divide the columns evenly', () => {
    // Ten columns over four points is 2.5 columns a point: the picks do not
    // land on cabinet joints, so the even split is arithmetic, not rigging.
    expect(riggingLoad({ ...flown, points: 4 }).evenlyDivided).toBe(false);
    expect(riggingLoad({ ...flown, points: 5 }).evenlyDivided).toBe(true);
  });

  it('reports the load of a screen whose points are not decided yet', () => {
    // Null is "nobody has said", which is the state the app opens in. Zero is a
    // rig with no picks, which is not a rig. Only the second one is an error.
    const load = riggingLoad({ ...flown, points: null });

    expect(load.totalKg).toBe(510);
    expect(load.heaviestColumnKg).toBe(51);
    expect(load.perPointKg).toBeNull();
    expect(load.overCapacity).toBe(false);
  });

  it('cannot judge a point rating with no points to divide by', () => {
    const load = riggingLoad({ ...flown, points: null, pointCapacityKg: 100 });

    expect(load.overCapacity).toBe(false);
    expect(load.headroomPercent).toBeNull();
  });

  it.each([0, -2, 2.5])('rejects %s hanging points', (points) => {
    expect(() => riggingLoad({ ...flown, points })).toThrow(RangeError);
  });
});

describe('riggingLoad, ground stacked', () => {
  const stacked = {
    mount: 'stacked' as const,
    cols: 2,
    rows: 5,
    cabinetWeightKg: 8.5,
    points: null,
    pointCapacityKg: null,
  };

  it('puts the whole column on the base under it', () => {
    const load = riggingLoad(stacked);

    expect(load.totalKg).toBe(85);
    expect(load.heaviestColumnKg).toBe(42.5);
  });

  it('reports what the bottom cabinet carries, which is everything above it', () => {
    // Four cabinets rest on the fifth: that is the number a stacking limit is
    // written against, not the column total.
    expect(riggingLoad(stacked).onBottomCabinetKg).toBe(34);
  });

  it('asks nothing of hanging points', () => {
    const load = riggingLoad(stacked);

    expect(load.perPointKg).toBeNull();
    expect(load.evenlyDivided).toBe(true);
  });

  it('has nothing resting on the bottom cabinet of a single row', () => {
    expect(riggingLoad({ ...stacked, rows: 1 }).onBottomCabinetKg).toBe(0);
  });

  it('compares the bottom cabinet against a declared stacking limit', () => {
    const load = riggingLoad({ ...stacked, pointCapacityKg: 30 });

    expect(load.overCapacity).toBe(true);
  });

  it.each([0, -1, 1.5])('rejects a cabinet weighing %s kg', (cabinetWeightKg) => {
    expect(() => riggingLoad({ ...stacked, cabinetWeightKg })).not.toThrow(TypeError);
    if (cabinetWeightKg <= 0) {
      expect(() => riggingLoad({ ...stacked, cabinetWeightKg })).toThrow(RangeError);
    }
  });
});
