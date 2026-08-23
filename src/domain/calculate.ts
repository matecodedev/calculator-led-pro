/**
 * One screen, fully planned: geometry, electrical load and data distribution.
 *
 * This is what the UI calls. Everything here is pure — no React, no DOM — so
 * the PDF report and the on-screen panels compute from the same numbers.
 */

import type { Cabinet, Processor } from './catalog';
import { calculateElectricalLoad, type ContentLevel, type ElectricalLoad } from './electrical/load';
import {
  cabinetsPerDataPort as portCapacity,
  calculateArrayGeometry,
  gridForDimensions,
  type ArrayGeometry,
  type Grid,
} from './led-array/geometry';
import {
  MAX_CABINETS,
  validateCabinet,
  validateProcessor,
  validateTarget,
  type FieldIssue,
  type TargetScreen,
} from './validation';

export type { TargetScreen } from './validation';
export { CONTENT_LEVELS, type ContentLevel } from './electrical/load';

export interface ProjectInput {
  target: TargetScreen;
  cabinet: Cabinet;
  processor: Processor;
  /** Supply voltage, in volts. */
  voltage: number;
  breakerAmps: number;
  cableLoopAmps: number;
  /** Screen brightness as a fraction, above 0 and up to 1. */
  brightness: number;
  content: ContentLevel;
}

export interface ProjectCalculation extends ArrayGeometry, ElectricalLoad {
  /** Cabinets one processor port can drive. */
  cabinetsPerDataPort: number;
}

/*
 * `dataCablesNeeded` and `processorsNeeded` used to live here, divided out of
 * the cabinet count. See `routing/demand.ts`: how many cables a screen needs
 * depends on how the runs fall over the grid, which this calculation cannot
 * know, so it stopped guessing.
 */

function resolveGrid(target: TargetScreen, cabinet: Cabinet): Grid {
  if (target.mode === 'count') {
    return { cols: target.cols, rows: target.rows };
  }
  return gridForDimensions({
    targetWidthM: target.widthM,
    targetHeightM: target.heightM,
    cabinet,
  });
}

export function calculateProject({
  target,
  cabinet,
  processor,
  voltage,
  breakerAmps,
  cableLoopAmps,
  brightness,
  content,
}: ProjectInput): ProjectCalculation {
  const geometry = calculateArrayGeometry({ ...resolveGrid(target, cabinet), cabinet });

  const electrical = calculateElectricalLoad({
    totalCabinets: geometry.totalCabinets,
    cabinetMaxPowerW: cabinet.maxPower,
    cabinetAvgPowerW: cabinet.avgPower,
    voltage,
    breakerAmps,
    cableLoopAmps,
    brightness,
    content,
  });

  const cabinetsPerDataPort = portCapacity({
    maxPixelsPerPort: processor.maxPixelsPerPort,
    cabinet,
  });
  return {
    ...geometry,
    ...electrical,
    cabinetsPerDataPort,
  };
}

/**
 * Everything wrong with the project, so the UI can show it instead of letting
 * `calculateProject` throw on a half-typed form.
 */
export function validateProject({ target, cabinet, processor }: ProjectInput): FieldIssue[] {
  const issues = [
    ...validateTarget(target),
    ...validateCabinet(cabinet),
    ...validateProcessor(processor),
  ];
  if (issues.length > 0) return issues;

  // Only reachable once the cabinet is known good, so the grid can be resolved.
  const { cols, rows } = resolveGrid(target, cabinet);
  if (cols * rows > MAX_CABINETS) {
    return [
      {
        field: target.mode === 'count' ? 'cols' : 'widthM',
        message: `This app plans up to ${MAX_CABINETS.toLocaleString()} cabinets; that screen needs ${(cols * rows).toLocaleString()}.`,
      },
    ];
  }
  return [];
}
