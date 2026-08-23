import { describe, expect, it } from 'vitest';

import {
  cableColor,
  cableColors,
  DATA_CABLE_COLORS,
  OVER_CAPACITY_COLOR,
  POWER_CABLE_COLORS,
  PRINT_DATA_CABLE_COLORS,
  PRINT_OVER_CAPACITY_COLOR,
  PRINT_POWER_CABLE_COLORS,
} from './palette';

const luminance = (hex: string) => {
  const channel = (from: number) => {
    const v = parseInt(hex.slice(from, from + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
};

const contrastOnWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05);

describe('cable palette', () => {
  it('keeps the fault colour out of both cable palettes', () => {
    // Red identifies an overloaded run and nothing else, so no cable may wear it.
    expect(DATA_CABLE_COLORS).not.toContain(OVER_CAPACITY_COLOR);
    expect(POWER_CABLE_COLORS).not.toContain(OVER_CAPACITY_COLOR);
    expect(PRINT_DATA_CABLE_COLORS).not.toContain(PRINT_OVER_CAPACITY_COLOR);
    expect(PRINT_POWER_CABLE_COLORS).not.toContain(PRINT_OVER_CAPACITY_COLOR);
  });

  it('has one printed colour for every screen colour', () => {
    // The third cable on screen has to be the third cable on the page.
    expect(PRINT_DATA_CABLE_COLORS).toHaveLength(DATA_CABLE_COLORS.length);
    expect(PRINT_POWER_CABLE_COLORS).toHaveLength(POWER_CABLE_COLORS.length);
  });

  it.each([
    ['data', PRINT_DATA_CABLE_COLORS],
    ['power', PRINT_POWER_CABLE_COLORS],
    ['fault', [PRINT_OVER_CAPACITY_COLOR]],
  ])('draws every %s colour dark enough to read on paper', (_label, colors) => {
    // 3:1 is the floor for a graphical mark; the screen lime is 1.2:1 on white,
    // which is why the printed report cannot reuse it.
    for (const hex of colors) expect(contrastOnWhite(hex)).toBeGreaterThanOrEqual(3);
  });

  it('cycles once a layer runs out of colours', () => {
    expect(cableColor('power', POWER_CABLE_COLORS.length)).toBe(POWER_CABLE_COLORS[0]);
    expect(cableColors('data')).toBe(DATA_CABLE_COLORS);
  });
});
