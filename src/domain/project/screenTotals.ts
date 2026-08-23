/**
 * One screen's finished figures, worked out from its saved form.
 *
 * The event summary needs totals for every screen, and only one of them is open
 * in the editor at a time. Deriving them all from the saved shape means the
 * screen being edited and the five that are not go through exactly the same
 * arithmetic — the alternative is a second code path for the active screen,
 * which is how a total ends up disagreeing with the screen it came from.
 */

import { calculateProject, validateProject, type ProjectInput } from '../calculate';
import { cabinets, processors, type Cabinet, type Processor } from '../catalog';
import { routingDemand } from '../routing/demand';
import { planRoutes } from '../routing/serpentine';
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
 * Null when the screen does not describe something calculable — a half-typed
 * cabinet, an impossible grid. The caller shows it as pending rather than
 * counting a guess into the event total.
 */
export function screenTotals(screen: ScreenSnapshot): ScreenTotals | null {
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

  const demand = routingDemand({
    dataRuns: routesFor('data'),
    powerRuns: routesFor('power'),
    dataPortsPerProcessor: input.processor.dataPorts,
  });

  return {
    id: screen.id,
    name: screen.name,
    cols: calc.cols,
    rows: calc.rows,
    totalCabinets: calc.totalCabinets,
    weightKg: calc.weightTotal,
    maxPowerW: calc.maxPowerW,
    maxAmps: calc.maxAmps,
    dataCables: demand.dataCables,
    powerCables: demand.powerCables,
    processors: demand.processorsNeeded,
  };
}
