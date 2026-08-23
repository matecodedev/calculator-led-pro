/** Electrical load and power distribution for a cabinet array. */

/**
 * A screen is a continuous load, so a breaker is only planned to 80% of its
 * rating. The cable's own connector rating still applies on top of that.
 */
export const BREAKER_DERATING = 0.8;

export interface CircuitLimits {
  /** Rating of the breaker feeding one line, in amps. */
  breakerAmps: number;
  /** Rating of the connector/cable loop, in amps. */
  cableLoopAmps: number;
}

export interface ElectricalInput extends CircuitLimits {
  totalCabinets: number;
  cabinetMaxPowerW: number;
  cabinetAvgPowerW: number;
  voltage: number;
}

export interface ElectricalLoad {
  maxPowerW: number;
  avgPowerW: number;
  maxAmps: number;
  ampsPerLine: number;
  cabinetsPerPowerCable: number;
}

function requirePositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be greater than zero, got ${value}`);
  }
}

/** The real current ceiling for one line: the stricter of breaker and cable. */
export function effectiveAmpsPerLine({ breakerAmps, cableLoopAmps }: CircuitLimits): number {
  requirePositive(breakerAmps, 'breakerAmps');
  requirePositive(cableLoopAmps, 'cableLoopAmps');

  return Math.min(breakerAmps * BREAKER_DERATING, cableLoopAmps);
}

/**
 * How many cabinets one power circuit can carry at their peak draw. Always at
 * least one: a panel that outdraws a whole circuit still needs its own cable.
 */
export function cabinetsPerPowerCircuit({
  voltage,
  ampsPerLine,
  cabinetMaxPowerW,
}: {
  voltage: number;
  ampsPerLine: number;
  cabinetMaxPowerW: number;
}): number {
  requirePositive(voltage, 'voltage');
  requirePositive(ampsPerLine, 'ampsPerLine');
  requirePositive(cabinetMaxPowerW, 'cabinetMaxPowerW');

  return Math.max(1, Math.floor((voltage * ampsPerLine) / cabinetMaxPowerW));
}

export function calculateElectricalLoad(input: ElectricalInput): ElectricalLoad {
  const { totalCabinets, cabinetMaxPowerW, cabinetAvgPowerW, voltage } = input;

  if (!Number.isInteger(totalCabinets) || totalCabinets < 0) {
    throw new RangeError(`totalCabinets must be zero or more, got ${totalCabinets}`);
  }
  requirePositive(voltage, 'voltage');
  requirePositive(cabinetMaxPowerW, 'cabinetMaxPowerW');
  requirePositive(cabinetAvgPowerW, 'cabinetAvgPowerW');

  const ampsPerLine = effectiveAmpsPerLine(input);
  const cabinetsPerPowerCable = cabinetsPerPowerCircuit({
    voltage,
    ampsPerLine,
    cabinetMaxPowerW,
  });
  const maxPowerW = totalCabinets * cabinetMaxPowerW;

  return {
    maxPowerW,
    avgPowerW: totalCabinets * cabinetAvgPowerW,
    maxAmps: maxPowerW / voltage,
    ampsPerLine,
    cabinetsPerPowerCable,
  };
}
