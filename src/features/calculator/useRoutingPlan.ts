import { useState } from 'react';

import type { ProjectCalculation } from '../../domain/calculate';
import type { ProjectSnapshot } from '../../domain/project/snapshot';
import { clampRoutesToGrid } from '../../domain/routing/clamp';
import type { CableLayer } from '../../domain/routing/palette';
import {
  planRoutes,
  type GridPosition,
  type MainsPolicy,
  type RoutingPriority,
  type StartCorner,
} from '../../domain/routing/serpentine';

export type RoutingMode = 'auto' | 'manual';

/** How many previously-drawn grids keep their routing. */
const HISTORY_LIMIT = 8;

interface DrawnRoutes {
  data: GridPosition[][];
  power: GridPosition[][];
}

/**
 * What the last resize did to the hand-drawn routing.
 *
 * Both cases are worth saying out loud. Losing cabinets without a word is how
 * forty taps disappear; getting them back without a word leaves the technician
 * unsure whether the app recovered or they are looking at a fresh grid.
 */
export type ResizeNotice =
  | { kind: 'dropped'; count: number; restoreGrid: string }
  | { kind: 'restored'; count: number }
  | null;

const countCabinets = (routes: DrawnRoutes): number =>
  [...routes.data, ...routes.power].reduce((total, run) => total + run.length, 0);

/**
 * How the cables run over the grid.
 *
 * This used to be nine pieces of state drilled through eighteen props, lifted
 * into the calculator only so the PDF export could read them. Now the state and
 * the routes it produces travel together as one object.
 */
export function useRoutingPlan(
  results: ProjectCalculation | null,
  initial?: ProjectSnapshot | null,
) {
  const [layer, setLayer] = useState<CableLayer>(initial?.routing.layer ?? 'data');
  const [priority, setPriority] = useState<RoutingPriority>(
    initial?.routing.priority ?? 'vertical',
  );
  const [start, setStart] = useState<StartCorner>(initial?.routing.start ?? 'bottom-left');
  const [mains, setMains] = useState<MainsPolicy>(initial?.routing.mains ?? 'start-edge');
  const [mode, setMode] = useState<RoutingMode>(initial?.routing.mode ?? 'auto');
  const [manualData, setManualData] = useState<GridPosition[][]>(
    initial?.routing.manualData ?? [[]],
  );
  const [manualPower, setManualPower] = useState<GridPosition[][]>(
    initial?.routing.manualPower ?? [[]],
  );

  // Hand-drawn routes hold cell coordinates, so they only mean anything on the
  // grid they were drawn on. That grid comes from `results`, which in
  // 'dimensions' mode also moves with the target size and the chosen cabinet.
  //
  // Resizing used to discard the whole drawing. Then it kept a single previous
  // grid, which was worse in one specific way: the first resize showed a
  // recovery promise, so the second one broke a promise the technician had
  // already learned to trust. "Make it 9x5, no 9x4, no back to 8x5" is one
  // conversation with a lighting designer, so every grid drawn on is
  // remembered, not just the last one left.
  const gridSignature = results ? `${results.cols}x${results.rows}` : 'none';
  const [drawnOn, setDrawnOn] = useState(gridSignature);
  const [history, setHistory] = useState<ReadonlyMap<string, DrawnRoutes>>(new Map());
  const [notice, setNotice] = useState<ResizeNotice>(null);

  if (results && drawnOn !== gridSignature) {
    const outgoing: DrawnRoutes = { data: manualData, power: manualPower };
    const outgoingCount = countCabinets(outgoing);

    // Re-inserting moves the grid to the end, so eviction drops whichever grid
    // has gone longest without being drawn on.
    const nextHistory = new Map(history);
    nextHistory.delete(drawnOn);
    if (outgoingCount > 0) nextHistory.set(drawnOn, outgoing);
    while (nextHistory.size > HISTORY_LIMIT) {
      const oldest = nextHistory.keys().next().value;
      if (oldest === undefined) break;
      nextHistory.delete(oldest);
    }

    const remembered = nextHistory.get(gridSignature);
    if (remembered) {
      const restored = countCabinets(remembered);
      setManualData(remembered.data);
      setManualPower(remembered.power);
      setNotice(restored > outgoingCount ? { kind: 'restored', count: restored } : null);
    } else {
      const grid = { cols: results.cols, rows: results.rows };
      const nextData = clampRoutesToGrid(manualData, grid);
      const nextPower = clampRoutesToGrid(manualPower, grid);
      const lost = nextData.dropped + nextPower.dropped;

      setManualData(nextData.runs.length > 0 ? nextData.runs : [[]]);
      setManualPower(nextPower.runs.length > 0 ? nextPower.runs : [[]]);
      setNotice(lost > 0 ? { kind: 'dropped', count: lost, restoreGrid: drawnOn } : null);
    }

    setHistory(nextHistory);
    setDrawnOn(gridSignature);
  }

  /** The automatic serpentine for a given cable capacity. */
  const autoRoutesFor = (capacity: number): GridPosition[][] =>
    results
      ? planRoutes({ cols: results.cols, rows: results.rows, priority, start, mains, capacity })
      : [];

  /** What the schematic and the PDF should actually draw for one layer. */
  const routesFor = (which: CableLayer): GridPosition[][] => {
    if (!results) return [];
    const capacity = which === 'data' ? results.cabinetsPerDataPort : results.cabinetsPerPowerCable;
    if (mode === 'auto') return autoRoutesFor(capacity);
    return (which === 'data' ? manualData : manualPower).filter((run) => run.length > 0);
  };

  return {
    layer,
    setLayer,
    priority,
    setPriority,
    start,
    setStart,
    mains,
    setMains,
    mode,
    setMode,
    manualData,
    manualPower,
    setManualRoutes: layer === 'data' ? setManualData : setManualPower,
    autoRoutesFor,
    routesFor,
    /** What the most recent resize did to the drawing, if anything. */
    resizeNotice: notice,
    dismissResizeNotice: () => setNotice(null),
    /** This hook's share of the saved document. */
    snapshotSlice: { layer, priority, start, mains, mode, manualData, manualPower },
    /** Replaces both layers with the generated serpentine. */
    fillFromAuto: (dataCapacity: number, powerCapacity: number) => {
      setManualData(autoRoutesFor(dataCapacity));
      setManualPower(autoRoutesFor(powerCapacity));
    },
  };
}

export type RoutingPlan = ReturnType<typeof useRoutingPlan>;
