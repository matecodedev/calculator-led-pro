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
    return { field, message: `${label} tiene que ser mayor que cero ${unit}.` };
  }
  return null;
}

function checkWhole(value: number, field: string, label: string): FieldIssue | null {
  if (!Number.isInteger(value) || value <= 0) {
    return { field, message: `${label} tiene que ser un número entero mayor que cero.` };
  }
  return null;
}

const collect = (...issues: (FieldIssue | null)[]): FieldIssue[] =>
  issues.filter((issue): issue is FieldIssue => issue !== null);

export function validateCabinet(cabinet: Cabinet): FieldIssue[] {
  return collect(
    checkPositive(cabinet.width, 'width', 'El ancho del gabinete', 'en mm'),
    checkPositive(cabinet.height, 'height', 'El alto del gabinete', 'en mm'),
    checkPositive(cabinet.resX, 'resX', 'La resolución horizontal', 'en píxeles'),
    checkPositive(cabinet.resY, 'resY', 'La resolución vertical', 'en píxeles'),
    checkPositive(cabinet.maxPower, 'maxPower', 'La potencia máxima', 'en watts'),
    checkPositive(cabinet.pitch, 'pitch', 'El pitch', 'en mm'),
    checkPositive(cabinet.weight, 'weight', 'El peso', 'en kg'),
  );
}

export function validateProcessor(processor: Processor): FieldIssue[] {
  return collect(
    checkWhole(processor.dataPorts, 'dataPorts', 'La cantidad de puertos'),
    checkPositive(
      processor.maxPixelsPerPort,
      'maxPixelsPerPort',
      'Los píxeles por puerto',
      'en píxeles',
    ),
  );
}

export type TargetScreen =
  | { mode: 'dimensions'; widthM: number; heightM: number }
  | { mode: 'count'; cols: number; rows: number };

export function validateTarget(target: TargetScreen): FieldIssue[] {
  if (target.mode === 'dimensions') {
    return collect(
      checkPositive(target.widthM, 'widthM', 'El ancho de la pantalla', 'en metros'),
      checkPositive(target.heightM, 'heightM', 'El alto de la pantalla', 'en metros'),
    );
  }

  const issues = collect(
    checkWhole(target.cols, 'cols', 'La cantidad de columnas'),
    checkWhole(target.rows, 'rows', 'La cantidad de filas'),
  );
  if (issues.length > 0) return issues;

  if (target.cols * target.rows > MAX_CABINETS) {
    return [
      {
        field: 'cols',
        message: `Esta app planifica hasta ${MAX_CABINETS.toLocaleString()} gabinetes; esa grilla necesita ${(target.cols * target.rows).toLocaleString()}.`,
      },
    ];
  }
  return [];
}
