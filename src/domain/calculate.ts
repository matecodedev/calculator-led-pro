/**
 * One screen, fully planned: geometry, electrical load and data distribution.
 *
 * This is what the UI calls. Everything here is pure — no React, no DOM — so
 * the PDF report and the on-screen panels compute from the same numbers.
 */

import type { Cabinet, Processor } from './catalog';
import { calculateElectricalLoad, type ElectricalLoad } from './electrical/load';
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

export interface ProjectInput {
  target: TargetScreen;
  cabinet: Cabinet;
  processor: Processor;
  /** Supply voltage, in volts. */
  voltage: number;
  breakerAmps: number;
  cableLoopAmps: number;
}

export interface ProjectCalculation extends ArrayGeometry, ElectricalLoad {
  /** Cabinets one processor port can drive. */
  cabinetsPerDataPort: number;
  dataCablesNeeded: number;
  processorsNeeded: number;
}

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
}: ProjectInput): ProjectCalculation {
  const geometry = calculateArrayGeometry({ ...resolveGrid(target, cabinet), cabinet });

  const electrical = calculateElectricalLoad({
    totalCabinets: geometry.totalCabinets,
    cabinetMaxPowerW: cabinet.maxPower,
    cabinetAvgPowerW: cabinet.avgPower,
    voltage,
    breakerAmps,
    cableLoopAmps,
  });

  const cabinetsPerDataPort = portCapacity({
    maxPixelsPerPort: processor.maxPixelsPerPort,
    cabinet,
  });
  const dataCablesNeeded = Math.ceil(geometry.totalCabinets / cabinetsPerDataPort);

  return {
    ...geometry,
    ...electrical,
    cabinetsPerDataPort,
    dataCablesNeeded,
    processorsNeeded: Math.ceil(dataCablesNeeded / processor.dataPorts),
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
