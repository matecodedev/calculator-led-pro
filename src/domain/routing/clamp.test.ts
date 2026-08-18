import { describe, expect, it } from 'vitest';
import { clampRoutesToGrid } from './clamp';

describe('clampRoutesToGrid', () => {
  const runs = [
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ],
    [
      { x: 0, y: 3 },
      { x: 1, y: 3 },
    ],
  ];

  it('keeps every cabinet when the grid still contains them', () => {
    const result = clampRoutesToGrid(runs, { cols: 4, rows: 4 });

    expect(result.runs).toEqual(runs);
    expect(result.dropped).toBe(0);
  });

  it('drops only the cabinets that fell outside, keeping the rest of the run', () => {
    // Grid shrinks to 2 columns: x=2 no longer exists.
    const result = clampRoutesToGrid(runs, { cols: 2, rows: 4 });

    expect(result.runs[0]).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
    expect(result.dropped).toBe(1);
  });

  it('removes a run that lost all of its cabinets', () => {
    // Grid shrinks to 3 rows: the whole second run sat on y=3.
    const result = clampRoutesToGrid(runs, { cols: 4, rows: 3 });

    expect(result.runs).toEqual([runs[0]]);
    expect(result.dropped).toBe(2);
  });

  it('reports nothing to drop for an empty plan', () => {
    expect(clampRoutesToGrid([[]], { cols: 4, rows: 4 })).toEqual({ runs: [], dropped: 0 });
  });

  it('counts every dropped cabinet across every run', () => {
    const result = clampRoutesToGrid(runs, { cols: 1, rows: 1 });

    expect(result.dropped).toBe(4);
    expect(result.runs).toEqual([[{ x: 0, y: 0 }]]);
  });

  it('never invents a cabinet the grid does not have', () => {
    const { runs: kept } = clampRoutesToGrid(runs, { cols: 2, rows: 2 });
    const outside = kept.flat().filter((p) => p.x >= 2 || p.y >= 2);

    expect(outside).toEqual([]);
  });
});
