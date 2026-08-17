/**
 * Cable routing over a cabinet grid.
 *
 * A run of cabinets is daisy-chained from one port, so the route has to walk
 * neighbour to neighbour: a serpentine. This module is the single source for
 * that walk — the on-screen schematic and the exported PDF both read from here.
 */

export interface GridPosition {
  readonly x: number;
  readonly y: number;
}

export type RoutingPriority = 'vertical' | 'horizontal';

export const START_CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;

export type StartCorner = (typeof START_CORNERS)[number];

export interface GridLayout {
  cols: number;
  rows: number;
  priority: RoutingPriority;
  start: StartCorner;
}

export interface RoutePlan extends GridLayout {
  /** Maximum cabinets one cable may carry. */
  capacity: number;
}

function requireGridSize(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a whole number of cabinets, got ${value}`);
  }
}

/**
 * The order a single cable would visit every cabinet in the grid, snaking so
 * that consecutive cabinets are always physically adjacent.
 */
export function serpentineSequence({ cols, rows, priority, start }: GridLayout): GridPosition[] {
  requireGridSize(cols, 'cols');
  requireGridSize(rows, 'rows');

  const fromRight = start.includes('right');
  const fromBottom = start.includes('bottom');
  const sequence: GridPosition[] = [];

  if (priority === 'vertical') {
    const firstX = fromRight ? cols - 1 : 0;
    const stepX = fromRight ? -1 : 1;

    for (let c = 0; c < cols; c++) {
      const goingWithStart = c % 2 === 0;
      const firstY = goingWithStart ? (fromBottom ? rows - 1 : 0) : fromBottom ? 0 : rows - 1;
      const stepY = goingWithStart === fromBottom ? -1 : 1;

      for (let r = 0; r < rows; r++) {
        sequence.push({ x: firstX + c * stepX, y: firstY + r * stepY });
      }
    }
    return sequence;
  }

  const firstY = fromBottom ? rows - 1 : 0;
  const stepY = fromBottom ? -1 : 1;

  for (let r = 0; r < rows; r++) {
    const goingWithStart = r % 2 === 0;
    const firstX = goingWithStart ? (fromRight ? cols - 1 : 0) : fromRight ? 0 : cols - 1;
    const stepX = goingWithStart === fromRight ? -1 : 1;

    for (let c = 0; c < cols; c++) {
      sequence.push({ x: firstX + c * stepX, y: firstY + r * stepY });
    }
  }
  return sequence;
}

/**
 * Split a sequence across as few cables as capacity allows, then even the runs
 * out. Forty cabinets at eleven per cable become four runs of ten rather than
 * three of eleven and a stub of seven — an even load is easier to build and
 * leaves headroom on every line.
 */
export function balanceIntoRuns(sequence: GridPosition[], capacity: number): GridPosition[][] {
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new RangeError(`capacity must be at least one cabinet, got ${capacity}`);
  }
  if (sequence.length === 0) return [];

  const runCount = Math.ceil(sequence.length / capacity);
  const baseLength = Math.floor(sequence.length / runCount);
  const remainder = sequence.length % runCount;

  const runs: GridPosition[][] = [];
  let cursor = 0;
  for (let i = 0; i < runCount; i++) {
    const length = baseLength + (i < remainder ? 1 : 0);
    runs.push(sequence.slice(cursor, cursor + length));
    cursor += length;
  }
  return runs;
}

/** The cable runs for a grid: the serpentine walk, split by capacity. */
export function planRoutes({ capacity, ...layout }: RoutePlan): GridPosition[][] {
  return balanceIntoRuns(serpentineSequence(layout), capacity);
}
