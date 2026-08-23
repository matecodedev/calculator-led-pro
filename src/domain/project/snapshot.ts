/**
 * The saved form of one event: its screens, and the venue feed they all hang
 * off. This is the document model — what gets written to storage and read back,
 * so it has to survive a browser restart and a future version of the app.
 *
 * An event holds several screens because a show does: a main, two laterals, a
 * pair of totems. They share a name and a supply and nothing else — each one has
 * its own cabinet, its own size and its own routing.
 */

import type { Cabinet, Processor } from '../catalog';
import { CONTENT_LEVELS, type ContentLevel } from '../electrical/load';
import type { MountMode } from '../rigging/load';
import type { CableLayer } from '../routing/palette';
import {
  MAINS_POLICIES,
  START_CORNERS,
  type GridPosition,
  type MainsPolicy,
  type RoutingPriority,
  type StartCorner,
} from '../routing/serpentine';

export const SNAPSHOT_VERSION = 3;

/**
 * Version 1 had no mains-voltage field because the app hardcoded 220 V. A
 * migrated snapshot has to keep that value: anyone's saved electrical plan was
 * computed at 220 V, and quietly restating it at a different voltage would
 * change every amperage in a plan they already trusted.
 */
export const LEGACY_LINE_VOLTAGE = 220;

export type CalcMode = 'dimensions' | 'count';
export type RoutingMode = 'auto' | 'manual';

/** One screen in an event: everything a technician typed for that surface. */
export interface ScreenSnapshot {
  id: string;
  name: string;
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
  /**
   * How hard the screen is driven. Circuits are never sized from this; it
   * answers what to ask the venue for, not what breaker to fit.
   */
  operating: { brightness: number; content: ContentLevel };
  /**
   * How the screen hangs or stands. Points and capacity stay null until the
   * technician declares them: the app reports the load either way and refuses
   * to invent a rig it was not told about.
   */
  rigging: { mount: MountMode; points: number | null; pointCapacityKg: number | null };
  /**
   * Where the screen sits relative to its two sources, which is what turns a
   * cable count into cable metres.
   *
   * Data and power are measured separately because they rarely come from the
   * same place: the distro usually sits behind the screen while the scaler
   * lives at the technical position across the room. One distance describing
   * both gets one of them wrong every time.
   *
   * Null until declared — a main of unknown length is not a main of zero.
   */
  install: {
    trimHeightM: number;
    distanceToDataM: number | null;
    distanceToPowerM: number | null;
  };
  routing: {
    layer: CableLayer;
    priority: RoutingPriority;
    start: StartCorner;
    mains: MainsPolicy;
    mode: RoutingMode;
    manualData: GridPosition[][];
    manualPower: GridPosition[][];
  };
}

export interface EventSnapshot {
  version: typeof SNAPSHOT_VERSION;
  savedAt: string;
  eventName: string;
  /**
   * What the venue actually gives the whole show, in amps. Null means nobody has
   * declared it: the app still totals the draw, it just cannot say whether the
   * total fits, and it does not invent a figure to pretend otherwise.
   */
  mainsCapacityAmps: number | null;
  screens: ScreenSnapshot[];
  activeScreenId: string;
}

/** A fresh id for a screen the technician just added. */
export function newScreenId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ?? `screen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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
 * One screen's worth of fields. `legacyVoltage` is on for a version 1 document,
 * where the voltage field did not exist yet.
 */
function parseScreen(
  value: unknown,
  {
    fallbackId,
    fallbackName,
    legacyVoltage,
  }: {
    fallbackId: string;
    fallbackName: string;
    legacyVoltage: boolean;
  },
): ScreenSnapshot | null {
  if (!isRecord(value)) return null;

  const { target, cabinet, processor, supply, routing } = value;
  if (!isRecord(target) || !isRecord(cabinet)) return null;
  if (!isRecord(processor) || !isRecord(supply) || !isRecord(routing)) return null;

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

  const voltage =
    legacyVoltage && supply.voltage === undefined ? LEGACY_LINE_VOLTAGE : supply.voltage;
  if (!isFiniteNumber(voltage) || voltage <= 0) return null;

  if (!isOneOf(routing.layer, ['data', 'power'] as const)) return null;
  if (!isOneOf(routing.priority, ['vertical', 'horizontal'] as const)) return null;
  if (!isOneOf(routing.start, START_CORNERS)) return null;
  if (!isOneOf(routing.mode, ['auto', 'manual'] as const)) return null;

  // Snapshots written before mains were a choice carry no field. They default
  // to the new behaviour rather than the old one: a run starting halfway up the
  // screen was a defect in the slicing, never something a technician asked for,
  // and auto routing is derived, so nothing hand-drawn changes underneath them.
  const mains = isOneOf(routing.mains, MAINS_POLICIES) ? routing.mains : 'start-edge';

  // Documents written before brightness was a setting were all implicitly run
  // at full brightness on typical content, which is exactly what the catalog's
  // average figure describes. Nothing they already trusted changes.
  const operating = isRecord(value.operating) ? value.operating : {};
  const brightness =
    isFiniteNumber(operating.brightness) && operating.brightness > 0 && operating.brightness <= 1
      ? operating.brightness
      : 1;
  const content = isOneOf(operating.content, CONTENT_LEVELS) ? operating.content : 'video';

  // Documents written before rigging existed describe a screen, not a rig.
  const riggingRaw = isRecord(value.rigging) ? value.rigging : {};
  const mount = isOneOf(riggingRaw.mount, ['flown', 'stacked'] as const)
    ? riggingRaw.mount
    : 'flown';
  const points =
    isFiniteNumber(riggingRaw.points) &&
    Number.isInteger(riggingRaw.points) &&
    riggingRaw.points > 0
      ? riggingRaw.points
      : null;
  const pointCapacityKg =
    isFiniteNumber(riggingRaw.pointCapacityKg) && riggingRaw.pointCapacityKg > 0
      ? riggingRaw.pointCapacityKg
      : null;

  const installRaw = isRecord(value.install) ? value.install : {};
  const trimHeightM =
    isFiniteNumber(installRaw.trimHeightM) && installRaw.trimHeightM >= 0
      ? installRaw.trimHeightM
      : 0;
  const readDistance = (value: unknown, fallback: unknown) => {
    const chosen = isFiniteNumber(value) ? value : fallback;
    return isFiniteNumber(chosen) && chosen >= 0 ? chosen : null;
  };
  // Documents written while the two sources shared one field keep that figure
  // for both: it was measured to somewhere real, just not to two places.
  const legacyDistance = installRaw.distanceToSourceM;
  const distanceToDataM = readDistance(installRaw.distanceToDataM, legacyDistance);
  const distanceToPowerM = readDistance(installRaw.distanceToPowerM, legacyDistance);

  const manualData = parseRuns(routing.manualData);
  const manualPower = parseRuns(routing.manualPower);
  if (!manualData || !manualPower) return null;

  return {
    id: typeof value.id === 'string' && value.id ? value.id : fallbackId,
    name: typeof value.name === 'string' ? value.name : fallbackName,
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
    operating: { brightness, content },
    rigging: { mount, points, pointCapacityKg },
    install: { trimHeightM, distanceToDataM, distanceToPowerM },
    routing: {
      layer: routing.layer,
      priority: routing.priority,
      start: routing.start,
      mains,
      mode: routing.mode,
      manualData,
      manualPower,
    },
  };
}

/**
 * Reads untrusted JSON — anything could be in storage, including a snapshot from
 * a future version or a half-written record. Returns null rather than throwing,
 * so a bad save can never stop the app from starting.
 */
export function parseSnapshot(value: unknown): EventSnapshot | null {
  if (!isRecord(value)) return null;

  const savedAt = typeof value.savedAt === 'string' ? value.savedAt : new Date(0).toISOString();

  // Versions 1 and 2 held a single screen at the top level, with the event name
  // buried in it. They become an event of one screen; no plan changes, the
  // document just grows a container it did not have.
  if (value.version === 1 || value.version === 2) {
    const identity = value.identity;
    if (!isRecord(identity)) return null;
    if (typeof identity.eventName !== 'string' || typeof identity.screenName !== 'string') {
      return null;
    }

    const screen = parseScreen(value, {
      fallbackId: 'screen-1',
      fallbackName: identity.screenName,
      legacyVoltage: value.version === 1,
    });
    if (!screen) return null;

    return {
      version: SNAPSHOT_VERSION,
      savedAt,
      eventName: identity.eventName,
      // Nobody declared a venue feed before this version existed, and guessing
      // one would put a capacity figure into a plan that never had one.
      mainsCapacityAmps: null,
      screens: [{ ...screen, name: identity.screenName }],
      activeScreenId: screen.id,
    };
  }

  if (value.version !== SNAPSHOT_VERSION) return null;
  if (typeof value.eventName !== 'string') return null;
  if (!Array.isArray(value.screens) || value.screens.length === 0) return null;

  const screens: ScreenSnapshot[] = [];
  for (const [index, raw] of value.screens.entries()) {
    const screen = parseScreen(raw, {
      fallbackId: `screen-${index + 1}`,
      fallbackName: `Screen ${index + 1}`,
      legacyVoltage: false,
    });
    if (!screen) return null;
    screens.push(screen);
  }

  // Two screens sharing an id would make the switcher ambiguous and the PDF
  // wrong, so a document that carries one is not readable.
  if (new Set(screens.map((s) => s.id)).size !== screens.length) return null;

  const capacity = value.mainsCapacityAmps;
  if (capacity !== null && capacity !== undefined && !isFiniteNumber(capacity)) return null;

  const activeScreenId =
    typeof value.activeScreenId === 'string' && screens.some((s) => s.id === value.activeScreenId)
      ? value.activeScreenId
      : screens[0].id;

  return {
    version: SNAPSHOT_VERSION,
    savedAt,
    eventName: value.eventName,
    mainsCapacityAmps: capacity ?? null,
    screens,
    activeScreenId,
  };
}

/** A readable default name when the technician hasn't named the event. */
export function describeSnapshot({ eventName, screens }: EventSnapshot): string {
  if (eventName) return eventName;
  const named = screens.map((s) => s.name).filter(Boolean);
  return named[0] ?? 'Evento sin nombre';
}
