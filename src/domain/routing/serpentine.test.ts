import { describe, expect, it } from 'vitest';
import {
  balanceIntoRuns,
  planRoutes,
  serpentineSequence,
  START_CORNERS,
  type GridPosition,
  type RoutingPriority,
  type StartCorner,
} from './serpentine';

const PRIORITIES: RoutingPriority[] = ['vertical', 'horizontal'];

/** "3,1" for the cell at column 3, row 1. */
const key = (p: GridPosition) => `${p.x},${p.y}`;

/** Every corner/priority combination, for exhaustive property checks. */
const everyLayout = (): { start: StartCorner; priority: RoutingPriority }[] =>
  START_CORNERS.flatMap((start) => PRIORITIES.map((priority) => ({ start, priority })));

describe('serpentineSequence', () => {
  it('walks a vertical snake up the first column and back down the second', () => {
    const sequence = serpentineSequence({
      cols: 2,
      rows: 3,
      priority: 'vertical',
      start: 'bottom-left',
    });

    expect(sequence).toEqual([
      { x: 0, y: 2 },
      { x: 0, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ]);
  });

  it('walks a horizontal snake along the bottom row and back along the one above', () => {
    const sequence = serpentineSequence({
      cols: 3,
      rows: 2,
      priority: 'horizontal',
      start: 'bottom-left',
    });

    expect(sequence).toEqual([
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 0 },
    ]);
  });

  it.each(everyLayout())(
    'starts in the requested corner ($start, $priority)',
    ({ start, priority }) => {
      const [first] = serpentineSequence({ cols: 4, rows: 3, priority, start });

      expect(first).toEqual({
        x: start.includes('right') ? 3 : 0,
        y: start.includes('bottom') ? 2 : 0,
      });
    },
  );

  it.each(everyLayout())(
    'visits every cabinet exactly once ($start, $priority)',
    ({ start, priority }) => {
      const sequence = serpentineSequence({ cols: 5, rows: 4, priority, start });

      expect(sequence).toHaveLength(20);
      expect(new Set(sequence.map(key)).size).toBe(20);
    },
  );

  it.each(everyLayout())('stays inside the grid ($start, $priority)', ({ start, priority }) => {
    const sequence = serpentineSequence({ cols: 5, rows: 4, priority, start });

    const outside = sequence.filter((p) => p.x < 0 || p.x > 4 || p.y < 0 || p.y > 3);
    expect(outside).toEqual([]);
  });

  it.each(everyLayout())(
    'never jumps: consecutive cabinets are always neighbours ($start, $priority)',
    ({ start, priority }) => {
      const sequence = serpentineSequence({ cols: 5, rows: 4, priority, start });

      const jumps = sequence.slice(1).filter((cell, i) => {
        const previous = sequence[i];
        return Math.abs(cell.x - previous.x) + Math.abs(cell.y - previous.y) !== 1;
      });
      expect(jumps).toEqual([]);
    },
  );

  it('handles a single cabinet', () => {
    expect(
      serpentineSequence({ cols: 1, rows: 1, priority: 'vertical', start: 'top-left' }),
    ).toEqual([{ x: 0, y: 0 }]);
  });

  it.each([
    ['zero columns', { cols: 0, rows: 4 }],
    ['zero rows', { cols: 4, rows: 0 }],
    ['negative columns', { cols: -2, rows: 4 }],
    ['a fractional grid', { cols: 2.5, rows: 4 }],
  ])('rejects %s instead of returning a broken sequence', (_label, grid) => {
    expect(() =>
      serpentineSequence({ ...grid, priority: 'vertical', start: 'bottom-left' }),
    ).toThrow(RangeError);
  });
});

describe('balanceIntoRuns', () => {
  const line = (length: number): GridPosition[] =>
    Array.from({ length }, (_, i) => ({ x: i, y: 0 }));

  it('spreads cabinets evenly rather than filling each run to capacity', () => {
    // 40 cabinets at 11 per run fits in 4 runs, so run four cables of 10 —
    // not three of 11 and one of 7.
    const runs = balanceIntoRuns(line(40), 11);

    expect(runs.map((r) => r.length)).toEqual([10, 10, 10, 10]);
  });

  it('gives the remainder to the earliest runs', () => {
    expect(balanceIntoRuns(line(10), 3).map((r) => r.length)).toEqual([3, 3, 2, 2]);
  });

  it('uses a single run when capacity covers everything', () => {
    expect(balanceIntoRuns(line(6), 10).map((r) => r.length)).toEqual([6]);
  });

  it('returns no runs for an empty sequence', () => {
    expect(balanceIntoRuns([], 4)).toEqual([]);
  });

  it.each([
    [40, 11],
    [10, 3],
    [7, 7],
    [1, 5],
    [99, 4],
  ])('never exceeds capacity (%i cabinets, %i per run)', (total, capacity) => {
    const runs = balanceIntoRuns(line(total), capacity);

    expect(Math.max(...runs.map((r) => r.length))).toBeLessThanOrEqual(capacity);
  });

  it.each([
    [40, 11],
    [10, 3],
    [99, 4],
  ])('keeps run lengths within one of each other (%i cabinets, %i per run)', (total, capacity) => {
    const lengths = balanceIntoRuns(line(total), capacity).map((r) => r.length);

    expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThanOrEqual(1);
  });

  it.each([
    [40, 11],
    [10, 3],
    [99, 4],
  ])('loses no cabinets and preserves order (%i cabinets, %i per run)', (total, capacity) => {
    const sequence = line(total);

    expect(balanceIntoRuns(sequence, capacity).flat()).toEqual(sequence);
  });

  it.each([0, -1])('rejects a capacity of %i', (capacity) => {
    expect(() => balanceIntoRuns(line(4), capacity)).toThrow(RangeError);
  });
});

describe('planRoutes', () => {
  it('covers the whole grid across its runs', () => {
    const runs = planRoutes({
      cols: 6,
      rows: 4,
      priority: 'vertical',
      start: 'bottom-left',
      capacity: 7,
    });

    expect(runs.flat()).toHaveLength(24);
    expect(new Set(runs.flat().map(key)).size).toBe(24);
    expect(Math.max(...runs.map((r) => r.length))).toBeLessThanOrEqual(7);
  });
});

describe('planRoutes with mains from the start edge', () => {
  /** The row a run must begin on for a given corner. */
  const startRow = (start: StartCorner, rows: number) => (start.includes('bottom') ? rows - 1 : 0);

  it('gives every run its own column rather than slicing one long snake', () => {
    // The old single-snake slice put run 2 in the middle of the screen and run
    // 3 at the very top: 7 + 7 + 6 over a 4x5 grid.
    const runs = planRoutes({
      cols: 4,
      rows: 5,
      priority: 'vertical',
      start: 'bottom-left',
      capacity: 7,
      mains: 'start-edge',
    });

    expect(runs.map((run) => run.length)).toEqual([5, 5, 5, 5]);
    expect(runs.map((run) => run[0])).toEqual([
      { x: 0, y: 4 },
      { x: 1, y: 4 },
      { x: 2, y: 4 },
      { x: 3, y: 4 },
    ]);
  });

  it('still packs whole columns into one run when the cable can carry them', () => {
    const runs = planRoutes({
      cols: 8,
      rows: 5,
      priority: 'vertical',
      start: 'bottom-left',
      capacity: 11,
      mains: 'start-edge',
    });

    expect(runs.map((run) => run.length)).toEqual([10, 10, 10, 10]);
    expect(runs.every((run) => run[0].y === 4)).toBe(true);
  });

  it('snakes back down the second column of a run so the next run starts low', () => {
    const [run] = planRoutes({
      cols: 2,
      rows: 3,
      priority: 'vertical',
      start: 'bottom-left',
      capacity: 6,
      mains: 'start-edge',
    });

    expect(run).toEqual([
      { x: 0, y: 2 },
      { x: 0, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ]);
  });

  it.each(START_CORNERS)('starts every run on the %s edge when a column fits a cable', (start) => {
    const rows = 5;
    const runs = planRoutes({
      cols: 7,
      rows,
      priority: 'vertical',
      start,
      capacity: 6,
      mains: 'start-edge',
    });

    expect(runs.every((run) => run[0].y === startRow(start, rows))).toBe(true);
  });

  it('stacks runs up the column when one column outgrows a single cable', () => {
    // 10 rows on a 9-cabinet cable. The second run cannot begin at the bottom:
    // the cabinets it serves are above. Its main is drawn to the floor instead.
    const runs = planRoutes({
      cols: 1,
      rows: 10,
      priority: 'vertical',
      start: 'bottom-left',
      capacity: 9,
      mains: 'start-edge',
    });

    expect(runs.map((run) => run.length)).toEqual([5, 5]);
    expect(runs[0][0]).toEqual({ x: 0, y: 9 });
    expect(runs[1][0]).toEqual({ x: 0, y: 4 });
  });

  it('groups whole rows when the priority is horizontal', () => {
    const runs = planRoutes({
      cols: 3,
      rows: 4,
      priority: 'horizontal',
      start: 'bottom-left',
      capacity: 6,
      mains: 'start-edge',
    });

    expect(runs.map((run) => run.length)).toEqual([6, 6]);
    expect(runs[0][0]).toEqual({ x: 0, y: 3 });
    expect(runs[1][0]).toEqual({ x: 0, y: 1 });
  });

  it.each(everyLayout())(
    'begins the first run in the requested corner (%o)',
    ({ start, priority }) => {
      // Ordering the lines by the wrong axis put a horizontal top-left plan at
      // the bottom-left corner, and only this combination exposed it.
      const [[first]] = planRoutes({
        cols: 4,
        rows: 4,
        priority,
        start,
        capacity: 4,
        mains: 'start-edge',
      });

      expect(first).toEqual({
        x: start.includes('right') ? 3 : 0,
        y: start.includes('bottom') ? 3 : 0,
      });
    },
  );

  it.each(everyLayout())('covers the grid exactly once (%o)', ({ start, priority }) => {
    const runs = planRoutes({
      cols: 7,
      rows: 5,
      priority,
      start,
      capacity: 8,
      mains: 'start-edge',
    });
    const cells = runs.flat();

    expect(cells).toHaveLength(35);
    expect(new Set(cells.map(key)).size).toBe(35);
    expect(Math.max(...runs.map((r) => r.length))).toBeLessThanOrEqual(8);
  });

  it.each(everyLayout())(
    'keeps every run walking neighbour to neighbour (%o)',
    ({ start, priority }) => {
      const runs = planRoutes({
        cols: 7,
        rows: 5,
        priority,
        start,
        capacity: 8,
        mains: 'start-edge',
      });

      for (const run of runs) {
        for (let i = 1; i < run.length; i++) {
          const step = Math.abs(run[i].x - run[i - 1].x) + Math.abs(run[i].y - run[i - 1].y);
          expect(step).toBe(1);
        }
      }
    },
  );

  it('leaves the continuous snake untouched', () => {
    const layout = {
      cols: 4,
      rows: 5,
      priority: 'vertical',
      start: 'bottom-left',
      capacity: 7,
    } as const;

    const continuous = planRoutes({ ...layout, mains: 'continuous' });

    expect(continuous).toEqual(balanceIntoRuns(serpentineSequence(layout), layout.capacity));
    expect(continuous.map((run) => run.length)).toEqual([7, 7, 6]);
    // The historical slice is exactly what the new default exists to replace.
    expect(continuous).not.toEqual(planRoutes(layout));
    expect(planRoutes(layout).every((run) => run[0].y === layout.rows - 1)).toBe(true);
  });
});
