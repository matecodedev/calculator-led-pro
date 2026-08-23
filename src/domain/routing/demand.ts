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
  totalPixels: number;
  /**
   * What the whole controller carries, which is not its ports multiplied by
   * what a port carries. An MCTRL4K has sixteen gigabit ports moving 650 k
   * pixels each — 10.4 M — and drives 8.8 M. Counting ports alone says one box
   * is enough for a screen it cannot drive.
   */
  maxPixelsPerProcessor: number;
}

/** A half-drawn manual plan carries a trailing empty run; it is not a cable. */
const countCables = (runs: GridPosition[][]): number =>
  runs.reduce((total, run) => total + (run.length > 0 ? 1 : 0), 0);

export function routingDemand({
  dataRuns,
  powerRuns,
  dataPortsPerProcessor,
  totalPixels,
  maxPixelsPerProcessor,
}: RoutingDemandInput): RoutingDemand {
  if (!Number.isInteger(dataPortsPerProcessor) || dataPortsPerProcessor < 1) {
    throw new RangeError(
      `a processor must have at least one data port, got ${dataPortsPerProcessor}`,
    );
  }
  if (!Number.isFinite(maxPixelsPerProcessor) || maxPixelsPerProcessor <= 0) {
    throw new RangeError(`a processor must carry some pixels, got ${maxPixelsPerProcessor}`);
  }

  const dataCables = countCables(dataRuns);

  return {
    dataCables,
    powerCables: countCables(powerRuns),
    // Whichever ceiling bites first: the ports to plug into, or the pixels the
    // box can push.
    processorsNeeded: Math.max(
      Math.ceil(dataCables / dataPortsPerProcessor),
      Math.ceil(totalPixels / maxPixelsPerProcessor),
    ),
  };
}
