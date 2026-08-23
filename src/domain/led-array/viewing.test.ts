import { describe, expect, it } from 'vitest';

import { ARCMINUTE_METRES_PER_MM, coarsestPitchForMm, viewingAdvice } from './viewing';

describe('viewingAdvice', () => {
  it('puts the retina distance at one arcminute of pitch', () => {
    // A 20/20 eye resolves about one arcminute, which works out to 3.44 m of
    // distance for every millimetre of pitch. This is geometry, not taste.
    const advice = viewingAdvice({ pitchMm: 2.9, audienceDistanceM: null });

    expect(ARCMINUTE_METRES_PER_MM).toBeCloseTo(3.438, 3);
    expect(advice.retinaDistanceM).toBeCloseTo(9.97, 2);
  });

  it('puts the trade minimum at the pitch read as metres', () => {
    expect(viewingAdvice({ pitchMm: 2.9, audienceDistanceM: null }).minimumDistanceM).toBe(2.9);
    expect(viewingAdvice({ pitchMm: 10, audienceDistanceM: null }).minimumDistanceM).toBe(10);
  });

  it('has no verdict until somebody says where the audience is', () => {
    expect(viewingAdvice({ pitchMm: 2.9, audienceDistanceM: null }).verdict).toBeNull();
  });

  it('calls a seat inside the minimum too close', () => {
    expect(viewingAdvice({ pitchMm: 2.9, audienceDistanceM: 2 }).verdict).toBe('too-close');
  });

  it('calls the range between the minimum and the retina distance acceptable', () => {
    expect(viewingAdvice({ pitchMm: 2.9, audienceDistanceM: 6 }).verdict).toBe('acceptable');
  });

  it('flags a screen finer than the room can see as money left on the floor', () => {
    // At 15 m nobody resolves a 2.9 mm pixel, so a coarser and cheaper panel
    // would look identical from every seat.
    const advice = viewingAdvice({ pitchMm: 2.9, audienceDistanceM: 15 });

    expect(advice.verdict).toBe('finer-than-needed');
    expect(advice.coarsestUsefulPitchMm).toBeCloseTo(4.36, 2);
  });

  it('does not suggest a coarser panel with nowhere to sit declared', () => {
    expect(
      viewingAdvice({ pitchMm: 2.9, audienceDistanceM: null }).coarsestUsefulPitchMm,
    ).toBeNull();
  });

  it.each([0, -1])('rejects a pitch of %s mm', (pitchMm) => {
    expect(() => viewingAdvice({ pitchMm, audienceDistanceM: 5 })).toThrow(RangeError);
  });

  it.each([0, -3])('rejects an audience %s m away', (audienceDistanceM) => {
    expect(() => viewingAdvice({ pitchMm: 2.9, audienceDistanceM })).toThrow(RangeError);
  });
});

describe('coarsestPitchForMm', () => {
  it('answers the question the other way round', () => {
    // "The front row is at 10 m — what pitch do I actually need?"
    expect(coarsestPitchForMm(10)).toBeCloseTo(2.91, 2);
  });

  it('grows with the distance', () => {
    expect(coarsestPitchForMm(20)).toBeGreaterThan(coarsestPitchForMm(10));
  });

  it.each([0, -5])('rejects a distance of %s m', (distanceM) => {
    expect(() => coarsestPitchForMm(distanceM)).toThrow(RangeError);
  });
});
