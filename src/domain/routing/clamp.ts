import type { GridPosition } from './serpentine';

export interface ClampResult {
  runs: GridPosition[][];
  /** How many hand-placed cabinets fell outside the new grid. */
  dropped: number;
}

/**
 * Fits hand-drawn cable runs onto a grid that has changed size.
 *
 * Resizing a screen used to discard every hand-drawn route outright. Keeping the
 * cabinets that still exist is almost always what the technician wanted: making
 * a screen one column wider should not cost them forty taps.
 */
export function clampRoutesToGrid(
  runs: GridPosition[][],
  { cols, rows }: { cols: number; rows: number },
): ClampResult {
  let dropped = 0;
  const kept: GridPosition[][] = [];

  for (const run of runs) {
    const survivors = run.filter((cell) => {
      const inside = cell.x >= 0 && cell.x < cols && cell.y >= 0 && cell.y < rows;
      if (!inside) dropped += 1;
      return inside;
    });
    if (survivors.length > 0) kept.push(survivors);
  }

  return { runs: kept, dropped };
}
