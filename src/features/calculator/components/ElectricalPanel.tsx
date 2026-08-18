import type { ProjectCalculation } from '../../../domain/calculate';
import Field from '../../../shared/ui/Field';
import SectionHeading from '../../../shared/ui/SectionHeading';
import StatTile from '../../../shared/ui/StatTile';
import { selectControlClass } from '../../../shared/ui/controls';
import type { SupplyControls } from '../useProjectDraft';
import AwaitingInput from './AwaitingInput';

/**
 * Mains voltage. Every amperage in the app derives from this, so it is the first
 * field in the panel: a plan computed at the wrong voltage is wrong everywhere.
 */
const VOLTAGE_OPTIONS = [
  { volts: 100, label: '100 V (Japan)' },
  { volts: 110, label: '110 V' },
  { volts: 120, label: '120 V (North America)' },
  { volts: 208, label: '208 V (US three-phase)' },
  { volts: 220, label: '220 V (Argentina, Chile)' },
  { volts: 230, label: '230 V (Europe, UK)' },
  { volts: 240, label: '240 V (Australia)' },
];

/** Total amps available, summed across phases. */
const PDU_OPTIONS = [
  { amps: 16, label: 'Single-phase 16A' },
  { amps: 32, label: 'Single-phase 32A' },
  { amps: 63, label: 'Single-phase 63A' },
  { amps: 96, label: 'Three-phase 32A (3×32A) — typical' },
  { amps: 189, label: 'Three-phase 63A (3×63A)' },
  { amps: 375, label: 'Three-phase 125A (3×125A)' },
];

const BREAKER_OPTIONS = [10, 16, 20, 32];

const POWERCON_OPTIONS = [
  { amps: 10, label: '10A (safe limit)' },
  { amps: 16, label: '16A (True1 / HQ)' },
  { amps: 20, label: '20A (direct / heavy)' },
];

interface ElectricalPanelProps {
  supply: SupplyControls;
  results: ProjectCalculation | null;
}

export default function ElectricalPanel({ supply, results }: ElectricalPanelProps) {
  const overCapacity = results !== null && results.maxAmps > supply.pduCapacityAmps;
  const headroomPercent = results
    ? Math.round((1 - results.maxAmps / supply.pduCapacityAmps) * 100)
    : 0;

  return (
    <div className="p-6 bg-[#111]">
      <SectionHeading accent="red">Electrical Infrastructure</SectionHeading>

      <div className="space-y-4">
        <Field label="Mains Voltage">
          {(id) => (
            <select
              id={id}
              value={supply.voltage}
              onChange={(e) => supply.setVoltage(Number(e.target.value))}
              className={`${selectControlClass('red')} text-xs`}
            >
              {VOLTAGE_OPTIONS.map(({ volts, label }) => (
                <option key={volts} value={volts}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Supply / Main PDU">
            {(id) => (
              <select
                id={id}
                value={supply.pduCapacityAmps}
                onChange={(e) => supply.setPduCapacityAmps(Number(e.target.value))}
                className={`${selectControlClass('red')} text-xs`}
              >
                {PDU_OPTIONS.map(({ amps, label }) => (
                  <option key={amps} value={amps}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Breaker limit">
            {(id) => (
              <select
                id={id}
                value={supply.breakerAmps}
                onChange={(e) => supply.setBreakerAmps(Number(e.target.value))}
                className={`${selectControlClass('red')} text-xs`}
              >
                {BREAKER_OPTIONS.map((amps) => (
                  <option key={amps} value={amps}>
                    {amps}A circuit
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="PowerCON max load">
            {(id) => (
              <select
                id={id}
                value={supply.cableLoopAmps}
                onChange={(e) => supply.setCableLoopAmps(Number(e.target.value))}
                className={`${selectControlClass('red')} text-xs`}
              >
                {POWERCON_OPTIONS.map(({ amps, label }) => (
                  <option key={amps} value={amps}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>

        {results ? (
          <div className="grid grid-cols-2 gap-4 mt-2">
            <StatTile
              label="Main Power Cables Req."
              value={results.powerCablesNeeded}
              tone="power"
              className="bg-black border-[#333]"
              footnote={
                <span className="flex justify-between gap-2">
                  <span>Max {results.cabinetsPerPowerCable} cabs/cable</span>
                  <span>
                    {results.ampsPerLine.toFixed(1)} A usable ({supply.breakerAmps} A × 80%)
                  </span>
                </span>
              }
            />
            <StatTile
              label="Total Load / Peak Amp"
              tone={overCapacity ? 'alert' : 'safe'}
              className={`bg-black ${overCapacity ? 'border-[#FF4444]' : 'border-[#2F5D1F]'}`}
              value={
                <>
                  {results.maxAmps.toFixed(1)} A
                  <span className="text-xs text-neutral-400 ml-1">
                    / {supply.pduCapacityAmps} A @ {supply.voltage} V
                  </span>
                </>
              }
              footnote={
                <>
                  <span>Max power: {(results.maxPowerW / 1000).toFixed(1)} kW</span>
                  {overCapacity ? (
                    <span className="block text-[#FF4444] font-bold uppercase mt-2 border-t border-[#FF4444] pt-2">
                      Over capacity by {(results.maxAmps - supply.pduCapacityAmps).toFixed(1)} A
                    </span>
                  ) : (
                    <span className="block text-[#CCFF00] font-bold uppercase mt-2 border-t border-[#2F5D1F] pt-2">
                      Within capacity · {headroomPercent}% headroom
                    </span>
                  )}
                </>
              }
            />
          </div>
        ) : (
          <AwaitingInput />
        )}
      </div>
    </div>
  );
}
