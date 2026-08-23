/**
 * What a whole show adds up to.
 *
 * Every screen already checks itself against its own PDU, and every screen can
 * pass that check while the event as a whole does not: four surfaces that each
 * fit a 96 A distro still need 174 A from the venue. Nothing in the app used to
 * add them up, so that shortfall was discovered on site.
 *
 * Pure and screen-shaped on purpose — it takes totals, not projects, so it never
 * has to know how a cabinet is specified or how a cable is routed.
 */

/** One screen's finished figures, as the calculator produced them. */
export interface ScreenTotals {
  id: string;
  name: string;
  cols: number;
  rows: number;
  totalCabinets: number;
  weightKg: number;
  maxPowerW: number;
  maxAmps: number;
  dataCables: number;
  powerCables: number;
  processors: number;
}

export interface EventSummaryInput {
  screens: ScreenTotals[];
  /** The venue feed, in amps. Null when nobody has declared one. */
  capacityAmps: number | null;
}

export interface EventSummary {
  screens: ScreenTotals[];
  totalCabinets: number;
  totalWeightKg: number;
  totalMaxPowerW: number;
  totalMaxAmps: number;
  totalDataCables: number;
  totalPowerCables: number;
  totalProcessors: number;
  capacityAmps: number | null;
  /** True only when a feed was declared and the show meets or exceeds it. */
  overCapacity: boolean;
  /** Percent of the declared feed still free, or null when none was declared. */
  headroomPercent: number | null;
}

const sum = (screens: ScreenTotals[], pick: (s: ScreenTotals) => number): number =>
  screens.reduce((total, screen) => total + pick(screen), 0);

export function summariseEvent({ screens, capacityAmps }: EventSummaryInput): EventSummary {
  if (capacityAmps !== null && (!Number.isFinite(capacityAmps) || capacityAmps <= 0)) {
    throw new RangeError(`the venue feed must be a positive current, got ${capacityAmps}`);
  }

  const totalMaxAmps = sum(screens, (s) => s.maxAmps);

  // Meeting the number exactly counts as over: a breaker is rated for continuous
  // load below its figure, not at it, and inrush arrives on top.
  const overCapacity = capacityAmps !== null && totalMaxAmps >= capacityAmps;
  const headroomPercent =
    capacityAmps === null
      ? null
      : Math.max(0, ((capacityAmps - totalMaxAmps) / capacityAmps) * 100);

  return {
    screens,
    totalCabinets: sum(screens, (s) => s.totalCabinets),
    totalWeightKg: sum(screens, (s) => s.weightKg),
    totalMaxPowerW: sum(screens, (s) => s.maxPowerW),
    totalMaxAmps,
    totalDataCables: sum(screens, (s) => s.dataCables),
    totalPowerCables: sum(screens, (s) => s.powerCables),
    totalProcessors: sum(screens, (s) => s.processors),
    capacityAmps,
    overCapacity,
    headroomPercent,
  };
}
