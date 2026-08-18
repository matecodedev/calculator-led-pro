import { useState } from 'react';

import type { ProjectCalculation } from '../../domain/calculate';
import type { ProjectSnapshot } from '../../domain/project/snapshot';
import type { CableLayer } from '../../domain/routing/palette';
import {
  planRoutes,
  type GridPosition,
  type RoutingPriority,
  type StartCorner,
} from '../../domain/routing/serpentine';

export type RoutingMode = 'auto' | 'manual';

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
  const gridSignature = results ? `${results.cols}x${results.rows}` : 'none';
  const [drawnOn, setDrawnOn] = useState(gridSignature);
  if (drawnOn !== gridSignature) {
    setDrawnOn(gridSignature);
    setManualData([[]]);
    setManualPower([[]]);
  }

  /** The automatic serpentine for a given cable capacity. */
  const autoRoutesFor = (capacity: number): GridPosition[][] =>
    results
      ? planRoutes({ cols: results.cols, rows: results.rows, priority, start, capacity })
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
    mode,
    setMode,
    manualData,
    manualPower,
    setManualRoutes: layer === 'data' ? setManualData : setManualPower,
    /** Raw routes for the active layer, unfiltered, for the legend count. */
    manualRoutesForActiveLayer: layer === 'data' ? manualData : manualPower,
    autoRoutesFor,
    routesFor,
    /** This hook's share of the saved document. */
    snapshotSlice: { layer, priority, start, mode, manualData, manualPower },
    /** Replaces both layers with the generated serpentine. */
    fillFromAuto: (dataCapacity: number, powerCapacity: number) => {
      setManualData(autoRoutesFor(dataCapacity));
      setManualPower(autoRoutesFor(powerCapacity));
    },
  };
}

export type RoutingPlan = ReturnType<typeof useRoutingPlan>;
