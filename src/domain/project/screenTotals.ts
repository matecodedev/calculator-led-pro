/**
 * One screen's finished figures, worked out from its saved form.
 *
 * The event summary needs totals for every screen, and only one of them is open
 * in the editor at a time. Deriving them all from the saved shape means the
 * screen being edited and the five that are not go through exactly the same
 * arithmetic — the alternative is a second code path for the active screen,
 * which is how a total ends up disagreeing with the screen it came from.
 */

import {
  calculateProject,
  validateProject,
  type ProjectCalculation,
  type ProjectInput,
} from '../calculate';
import { cabinets, processors, type Cabinet, type Processor } from '../catalog';
import { riggingLoad, type RiggingLoad } from '../rigging/load';
import { cableSchedule, type CableSchedule } from '../routing/schedule';
import { routingDemand, type RoutingDemand } from '../routing/demand';
import { planRoutes, type GridPosition } from '../routing/serpentine';
import type { ScreenTotals } from './eventSummary';
import type { ScreenSnapshot } from './snapshot';

const resolveCabinet = ({ isCustom, selectedId, custom }: ScreenSnapshot['cabinet']): Cabinet =>
  isCustom ? custom : (cabinets.find((c) => c.id === selectedId) ?? cabinets[0]);

const resolveProcessor = ({
  isCustom,
  selectedId,
  custom,
}: ScreenSnapshot['processor']): Processor =>
  isCustom ? custom : (processors.find((p) => p.id === selectedId) ?? processors[0]);

/** The `ProjectInput` a saved screen describes. */
export function screenInput(screen: ScreenSnapshot): ProjectInput {
  const { target, supply } = screen;

  return {
    target:
      target.calcMode === 'dimensions'
        ? { mode: 'dimensions', widthM: target.targetWidthM, heightM: target.targetHeightM }
        : { mode: 'count', cols: target.cols, rows: target.rows },
    cabinet: resolveCabinet(screen.cabinet),
    processor: resolveProcessor(screen.processor),
    voltage: supply.voltage,
    breakerAmps: supply.breakerAmps,
    cableLoopAmps: supply.cableLoopAmps,
    brightness: screen.operating.brightness,
    content: screen.operating.content,
  };
}

/**
 * Everything the report needs about one screen, worked out once.
 *
 * The event summary wants totals and the PDF wants the drawing as well, and
 * both have to be the same plan — deriving them separately is how a table comes
 * to disagree with the schematic printed under it.
 */
export interface ScreenPlan {
  screen: ScreenSnapshot;
  input: ProjectInput;
  calc: ProjectCalculation;
  dataRoutes: GridPosition[][];
  powerRoutes: GridPosition[][];
  demand: RoutingDemand;
  rigging: RiggingLoad;
  cables: { data: CableSchedule; power: CableSchedule };
  totals: ScreenTotals;
}

/**
 * Null when the screen does not describe something calculable — a half-typed
 * cabinet, an impossible grid. The caller shows it as pending rather than
 * counting a guess into the event total.
 */
export function screenPlan(screen: ScreenSnapshot): ScreenPlan | null {
  const input = screenInput(screen);
  if (validateProject(input).length > 0) return null;

  const calc = calculateProject(input);
  const { routing } = screen;

  const grid = {
    cols: calc.cols,
    rows: calc.rows,
    priority: routing.priority,
    start: routing.start,
    mains: routing.mains,
  };
  const routesFor = (layer: 'data' | 'power') => {
    if (routing.mode === 'auto') {
      const capacity = layer === 'data' ? calc.cabinetsPerDataPort : calc.cabinetsPerPowerCable;
      return planRoutes({ ...grid, capacity });
    }
    return (layer === 'data' ? routing.manualData : routing.manualPower).filter(
      (run) => run.length > 0,
    );
  };

  // Fifteen percent for dressing and ties; the panel states it on screen.
  const SLACK = 0.15;
  const scheduleFor = (routes: GridPosition[][], distanceM: number | null) =>
    cableSchedule({
      runs: routes,
      cabinetWidthMm: input.cabinet.width,
      cabinetHeightMm: input.cabinet.height,
      rows: calc.rows,
      trimHeightM: screen.install.trimHeightM,
      distanceToSourceM: distanceM ?? 0,
      slack: SLACK,
    });

  const dataRoutes = routesFor('data');
  const powerRoutes = routesFor('power');
  const demand = routingDemand({
    dataRuns: dataRoutes,
    powerRuns: powerRoutes,
    dataPortsPerProcessor: input.processor.dataPorts,
  });

  return {
    screen,
    input,
    calc,
    cables: {
      data: scheduleFor(dataRoutes, screen.install.distanceToDataM),
      power: scheduleFor(powerRoutes, screen.install.distanceToPowerM),
    },
    rigging: riggingLoad({
      mount: screen.rigging.mount,
      cols: calc.cols,
      rows: calc.rows,
      cabinetWeightKg: input.cabinet.weight,
      points: screen.rigging.points,
      pointCapacityKg: screen.rigging.pointCapacityKg,
    }),
    dataRoutes,
    powerRoutes,
    demand,
    totals: {
      id: screen.id,
      name: screen.name,
      cols: calc.cols,
      rows: calc.rows,
      totalCabinets: calc.totalCabinets,
      weightKg: calc.weightTotal,
      maxPowerW: calc.maxPowerW,
      maxAmps: calc.maxAmps,
      expectedPowerW: calc.expectedPowerW,
      expectedAmps: calc.expectedAmps,
      dataCables: demand.dataCables,
      powerCables: demand.powerCables,
      processors: demand.processorsNeeded,
    },
  };
}

/** Just the figures, for the event summary. */
export function screenTotals(screen: ScreenSnapshot): ScreenTotals | null {
  return screenPlan(screen)?.totals ?? null;
}
