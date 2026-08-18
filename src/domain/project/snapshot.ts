/**
 * The saved form of one screen: everything a technician typed, plus the routing
 * they drew. This is the document model — what gets written to storage and read
 * back, so it has to survive a browser restart and a future version of the app.
 */

import type { Cabinet, Processor } from '../catalog';
import type { CableLayer } from '../routing/palette';
import {
  START_CORNERS,
  type GridPosition,
  type RoutingPriority,
  type StartCorner,
} from '../routing/serpentine';

export const SNAPSHOT_VERSION = 2;

/**
 * Version 1 had no mains-voltage field because the app hardcoded 220 V. A
 * migrated snapshot has to keep that value: anyone's saved electrical plan was
 * computed at 220 V, and quietly restating it at a different voltage would
 * change every amperage in a plan they already trusted.
 */
export const LEGACY_LINE_VOLTAGE = 220;

export type CalcMode = 'dimensions' | 'count';
export type RoutingMode = 'auto' | 'manual';

export interface ProjectSnapshot {
  version: typeof SNAPSHOT_VERSION;
  savedAt: string;
  identity: { eventName: string; screenName: string };
  target: {
    calcMode: CalcMode;
    targetWidthM: number;
    targetHeightM: number;
    cols: number;
    rows: number;
  };
  cabinet: { selectedId: string; isCustom: boolean; custom: Cabinet };
  processor: { selectedId: string; isCustom: boolean; custom: Processor };
  supply: {
    /** Mains voltage, in volts. Every amperage in the app derives from it. */
    voltage: number;
    pduCapacityAmps: number;
    breakerAmps: number;
    cableLoopAmps: number;
  };
  routing: {
    layer: CableLayer;
    priority: RoutingPriority;
    start: StartCorner;
    mode: RoutingMode;
    manualData: GridPosition[][];
    manualPower: GridPosition[][];
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isOneOf = <T extends string>(value: unknown, allowed: readonly T[]): value is T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value);

function parseRuns(value: unknown): GridPosition[][] | null {
  if (!Array.isArray(value)) return null;

  const runs: GridPosition[][] = [];
  for (const run of value) {
    if (!Array.isArray(run)) return null;
    const cells: GridPosition[] = [];
    for (const cell of run) {
      if (!isRecord(cell) || !isFiniteNumber(cell.x) || !isFiniteNumber(cell.y)) return null;
      cells.push({ x: cell.x, y: cell.y });
    }
    runs.push(cells);
  }
  return runs;
}

function parseCabinet(value: unknown): Cabinet | null {
  if (!isRecord(value)) return null;
  const { id, brand, model, pitch, width, height, resX, resY, maxPower, avgPower, weight } = value;
  if (typeof id !== 'string' || typeof brand !== 'string' || typeof model !== 'string') return null;
  const numbers = [pitch, width, height, resX, resY, maxPower, avgPower, weight];
  if (!numbers.every(isFiniteNumber)) return null;

  return {
    id,
    brand,
    model,
    pitch,
    width,
    height,
    resX,
    resY,
    maxPower,
    avgPower,
    weight,
  } as Cabinet;
}

function parseProcessor(value: unknown): Processor | null {
  if (!isRecord(value)) return null;
  const { id, brand, model, dataPorts, maxPixelsPerPort } = value;
  if (typeof id !== 'string' || typeof brand !== 'string' || typeof model !== 'string') return null;
  if (!isFiniteNumber(dataPorts) || !isFiniteNumber(maxPixelsPerPort)) return null;

  return { id, brand, model, dataPorts, maxPixelsPerPort };
}

/**
 * Reads untrusted JSON — anything could be in storage, including a snapshot from
 * a future version or a half-written record. Returns null rather than throwing,
 * so a bad save can never stop the app from starting.
 */
export function parseSnapshot(value: unknown): ProjectSnapshot | null {
  if (!isRecord(value)) return null;
  // Version 1 is readable: it is this shape minus the mains voltage.
  const isLegacy = value.version === 1;
  if (!isLegacy && value.version !== SNAPSHOT_VERSION) return null;

  const { identity, target, cabinet, processor, supply, routing } = value;
  if (!isRecord(identity) || !isRecord(target) || !isRecord(cabinet)) return null;
  if (!isRecord(processor) || !isRecord(supply) || !isRecord(routing)) return null;

  if (typeof identity.eventName !== 'string' || typeof identity.screenName !== 'string')
    return null;

  const { calcMode, targetWidthM, targetHeightM, cols, rows } = target;
  if (!isOneOf(calcMode, ['dimensions', 'count'] as const)) return null;
  if (!isFiniteNumber(targetWidthM) || !isFiniteNumber(targetHeightM)) return null;
  if (!isFiniteNumber(cols) || !isFiniteNumber(rows)) return null;

  const customCabinet = parseCabinet(cabinet.custom);
  const customProcessor = parseProcessor(processor.custom);
  if (!customCabinet || !customProcessor) return null;
  if (typeof cabinet.selectedId !== 'string' || typeof cabinet.isCustom !== 'boolean') return null;
  if (typeof processor.selectedId !== 'string' || typeof processor.isCustom !== 'boolean') {
    return null;
  }

  const { pduCapacityAmps, breakerAmps, cableLoopAmps } = supply;
  if (!isFiniteNumber(pduCapacityAmps) || !isFiniteNumber(breakerAmps)) return null;
  if (!isFiniteNumber(cableLoopAmps)) return null;

  const voltage = isLegacy && supply.voltage === undefined ? LEGACY_LINE_VOLTAGE : supply.voltage;
  if (!isFiniteNumber(voltage) || voltage <= 0) return null;

  if (!isOneOf(routing.layer, ['data', 'power'] as const)) return null;
  if (!isOneOf(routing.priority, ['vertical', 'horizontal'] as const)) return null;
  if (!isOneOf(routing.start, START_CORNERS)) return null;
  if (!isOneOf(routing.mode, ['auto', 'manual'] as const)) return null;

  const manualData = parseRuns(routing.manualData);
  const manualPower = parseRuns(routing.manualPower);
  if (!manualData || !manualPower) return null;

  return {
    version: SNAPSHOT_VERSION,
    savedAt: typeof value.savedAt === 'string' ? value.savedAt : new Date(0).toISOString(),
    identity: { eventName: identity.eventName, screenName: identity.screenName },
    target: { calcMode, targetWidthM, targetHeightM, cols, rows },
    cabinet: {
      selectedId: cabinet.selectedId,
      isCustom: cabinet.isCustom,
      custom: customCabinet,
    },
    processor: {
      selectedId: processor.selectedId,
      isCustom: processor.isCustom,
      custom: customProcessor,
    },
    supply: { voltage, pduCapacityAmps, breakerAmps, cableLoopAmps },
    routing: {
      layer: routing.layer,
      priority: routing.priority,
      start: routing.start,
      mode: routing.mode,
      manualData,
      manualPower,
    },
  };
}

/** A readable default name when the technician hasn't named the screen. */
export function describeSnapshot({ identity }: ProjectSnapshot): string {
  return [identity.eventName, identity.screenName].filter(Boolean).join(' — ') || 'Untitled screen';
}
