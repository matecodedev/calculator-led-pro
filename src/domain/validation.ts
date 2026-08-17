/**
 * Input validation at the edge of the domain.
 *
 * The calculators throw on impossible input, which is right for a bug but wrong
 * for a half-typed form: clearing a number field yields NaN, and a user is
 * mid-thought, not mistaken. These functions collect what is wrong so the UI can
 * say so — instead of rendering "Infinity" as a cabinet count.
 */

import type { Cabinet, Processor } from './catalog';

export interface FieldIssue {
  field: string;
  message: string;
}

/**
 * The grid is drawn one SVG node per cabinet, so an unbounded count freezes the
 * tab. No touring screen comes near this.
 */
export const MAX_CABINETS = 4000;

function checkPositive(
  value: number,
  field: string,
  label: string,
  unit: string,
): FieldIssue | null {
  if (!Number.isFinite(value) || value <= 0) {
    return { field, message: `${label} must be greater than zero ${unit}.` };
  }
  return null;
}

function checkWhole(value: number, field: string, label: string): FieldIssue | null {
  if (!Number.isInteger(value) || value <= 0) {
    return { field, message: `${label} must be a whole number greater than zero.` };
  }
  return null;
}

const collect = (...issues: (FieldIssue | null)[]): FieldIssue[] =>
  issues.filter((issue): issue is FieldIssue => issue !== null);

export function validateCabinet(cabinet: Cabinet): FieldIssue[] {
  return collect(
    checkPositive(cabinet.width, 'width', 'Width', 'in mm'),
    checkPositive(cabinet.height, 'height', 'Height', 'in mm'),
    checkPositive(cabinet.resX, 'resX', 'Horizontal resolution', 'in pixels'),
    checkPositive(cabinet.resY, 'resY', 'Vertical resolution', 'in pixels'),
    checkPositive(cabinet.maxPower, 'maxPower', 'Max power', 'in watts'),
    checkPositive(cabinet.pitch, 'pitch', 'Pixel pitch', 'in mm'),
    checkPositive(cabinet.weight, 'weight', 'Weight', 'in kg'),
  );
}

export function validateProcessor(processor: Processor): FieldIssue[] {
  return collect(
    checkWhole(processor.dataPorts, 'dataPorts', 'Output ports'),
    checkPositive(processor.maxPixelsPerPort, 'maxPixelsPerPort', 'Pixels per port', 'in pixels'),
  );
}

export type TargetScreen =
  | { mode: 'dimensions'; widthM: number; heightM: number }
  | { mode: 'count'; cols: number; rows: number };

export function validateTarget(target: TargetScreen): FieldIssue[] {
  if (target.mode === 'dimensions') {
    return collect(
      checkPositive(target.widthM, 'widthM', 'Screen width', 'in metres'),
      checkPositive(target.heightM, 'heightM', 'Screen height', 'in metres'),
    );
  }

  const issues = collect(
    checkWhole(target.cols, 'cols', 'Columns'),
    checkWhole(target.rows, 'rows', 'Rows'),
  );
  if (issues.length > 0) return issues;

  if (target.cols * target.rows > MAX_CABINETS) {
    return [
      {
        field: 'cols',
        message: `This app plans up to ${MAX_CABINETS.toLocaleString()} cabinets; that grid needs ${(target.cols * target.rows).toLocaleString()}.`,
      },
    ];
  }
  return [];
}
