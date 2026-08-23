/**
 * What the drawn plan actually costs in cables and processors.
 *
 * This used to be `Math.ceil(totalCabinets / capacity)`, computed beside the
 * routing rather than from it. That division assumes a cable can be cut
 * anywhere, and a cable cannot: a run takes whole columns so its main reaches
 * the floor, which regularly needs one more cable than the arithmetic minimum.
 * The report was printing "3 main data cables" over a schematic that drew four.
 *
 * The crew loads what the drawing shows, so the drawing is the number that
 * ships. Counting the runs is the only way the two cannot disagree.
 */

import type { GridPosition } from './serpentine';

export interface RoutingDemand {
  dataCables: number;
  powerCables: number;
  processorsNeeded: number;
}

export interface RoutingDemandInput {
  dataRuns: GridPosition[][];
  powerRuns: GridPosition[][];
  /** Data ports on one sending box. */
  dataPortsPerProcessor: number;
}

/** A half-drawn manual plan carries a trailing empty run; it is not a cable. */
const countCables = (runs: GridPosition[][]): number =>
  runs.reduce((total, run) => total + (run.length > 0 ? 1 : 0), 0);

export function routingDemand({
  dataRuns,
  powerRuns,
  dataPortsPerProcessor,
}: RoutingDemandInput): RoutingDemand {
  if (!Number.isInteger(dataPortsPerProcessor) || dataPortsPerProcessor < 1) {
    throw new RangeError(
      `a processor must have at least one data port, got ${dataPortsPerProcessor}`,
    );
  }

  const dataCables = countCables(dataRuns);

  return {
    dataCables,
    powerCables: countCables(powerRuns),
    processorsNeeded: Math.ceil(dataCables / dataPortsPerProcessor),
  };
}
