/**
 * Cable colours.
 *
 * On a routing plan the colour *is* the cable's identifier, so the schematic on
 * screen and the schematic in the exported PDF have to agree. Both read these
 * arrays; neither keeps its own copy.
 */

export const DATA_CABLE_COLORS = [
  '#CCFF00',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#f97316',
  '#3b82f6',
  '#8b5cf6',
  '#d946ef',
  '#ec4899',
] as const;

export const POWER_CABLE_COLORS = ['#FF4444', '#f97316', '#f59e0b', '#eab308', '#dc2626'] as const;

/** Marks a run that carries more cabinets than its cable is rated for. */
export const OVER_CAPACITY_COLOR = '#ef4444';

export type CableLayer = 'data' | 'power';

export function cableColors(layer: CableLayer): readonly string[] {
  return layer === 'data' ? DATA_CABLE_COLORS : POWER_CABLE_COLORS;
}

/** The colour for run `index`, cycling once the palette runs out. */
export function cableColor(layer: CableLayer, index: number): string {
  const colors = cableColors(layer);
  return colors[index % colors.length];
}
