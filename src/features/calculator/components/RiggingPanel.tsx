import { Anchor } from 'lucide-react';

import type { ProjectCalculation } from '../../../domain/calculate';
import { riggingLoad } from '../../../domain/rigging/load';
import Field from '../../../shared/ui/Field';
import NumberInput from '../../../shared/ui/NumberInput';
import SectionHeading from '../../../shared/ui/SectionHeading';
import SegmentedControl from '../../../shared/ui/SegmentedControl';
import StatTile from '../../../shared/ui/StatTile';
import { textControlClass } from '../../../shared/ui/controls';
import type { CabinetChoice, RiggingControls } from '../useProjectDraft';
import AwaitingInput from './AwaitingInput';

interface RiggingPanelProps {
  rigging: RiggingControls;
  cabinet: CabinetChoice['cabinet'];
  results: ProjectCalculation | null;
}

const kg = (value: number) => `${value.toLocaleString('es-AR', { maximumFractionDigits: 1 })} kg`;

/**
 * Weight, and where it lands.
 *
 * Deliberately shaped like the electrical panel: the load is always shown, the
 * comparison only appears once the technician declares a rating, and the panel
 * says out loud that this is arithmetic and not a structural calculation.
 */
export default function RiggingPanel({ rigging, cabinet, results }: RiggingPanelProps) {
  const flown = rigging.mount === 'flown';
  const load = results
    ? riggingLoad({
        mount: rigging.mount,
        cols: results.cols,
        rows: results.rows,
        cabinetWeightKg: cabinet.weight,
        points: rigging.points,
        pointCapacityKg: rigging.pointCapacityKg,
      })
    : null;

  return (
    <div className="p-6 border-b border-[#333] bg-[#0F0F0F]">
      <SectionHeading icon={<Anchor className="w-4 h-4" />} accent="blue">
        Rigging y carga
      </SectionHeading>

      <div className="space-y-4">
        <SegmentedControl
          label="Montaje"
          value={rigging.mount}
          onChange={rigging.setMount}
          segments={[
            { value: 'flown', label: 'Colgada' },
            { value: 'stacked', label: 'Apilada' },
          ]}
        />

        <div className="grid grid-cols-2 gap-4">
          {flown && (
            <Field label="Puntos de izaje">
              {(id) => (
                <NumberInput
                  id={id}
                  mode="integer"
                  placeholder="Sin declarar"
                  value={rigging.points}
                  onChange={(next) => rigging.setPoints(next !== null && next >= 1 ? next : null)}
                  className={textControlClass}
                />
              )}
            </Field>
          )}

          <Field label={flown ? 'Carga por punto (kg)' : 'Límite del gabinete (kg)'}>
            {(id) => (
              <NumberInput
                id={id}
                placeholder="Sin declarar"
                value={rigging.pointCapacityKg}
                onChange={(next) =>
                  rigging.setPointCapacityKg(next !== null && next > 0 ? next : null)
                }
                className={textControlClass}
              />
            )}
          </Field>
        </div>

        {results && load ? (
          <>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <StatTile
                label="Peso total"
                value={kg(load.totalKg)}
                tone="neutral"
                className="bg-black border-[#333]"
                footnote={`${results.totalCabinets} gabinetes × ${cabinet.weight} kg`}
              />
              <StatTile
                label={flown ? 'Por punto de izaje' : 'Sobre el gabinete inferior'}
                tone={load.overCapacity ? 'alert' : 'safe'}
                className={`bg-black ${load.overCapacity ? 'border-[#FF4444]' : 'border-[#2F5D1F]'}`}
                value={
                  flown && load.perPointKg === null ? (
                    <span className="text-sm text-neutral-400">Declarar los puntos</span>
                  ) : (
                    kg(flown ? (load.perPointKg ?? 0) : load.onBottomCabinetKg)
                  )
                }
                footnote={
                  load.pointCapacityKg === null ? (
                    <span>Declarar el límite para saber si entra</span>
                  ) : load.overCapacity ? (
                    <span className="block text-[#FF4444] font-bold uppercase">
                      Se pasa del límite de {kg(load.pointCapacityKg)}
                    </span>
                  ) : (
                    <span className="block text-[#CCFF00] font-bold uppercase">
                      Dentro del límite · {(load.headroomPercent ?? 0).toFixed(0)}% de margen
                    </span>
                  )
                }
              />
            </div>

            <div className="border border-[#333] bg-[#0F0F0F] p-3 font-mono text-[11px] uppercase">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-neutral-400">Columna más cargada</span>
                <span className="font-bold text-[#7FD4E8]">{kg(load.heaviestColumnKg)}</span>
                <span className="text-neutral-500">
                  {results.rows} gabinetes de alto
                  {flown && rigging.points !== null && !load.evenlyDivided
                    ? ' · los puntos no caen en juntas'
                    : ''}
                </span>
              </div>
              {flown && rigging.points !== null && !load.evenlyDivided && (
                <p className="mt-2 border-t border-[#333] pt-2 text-amber-400 normal-case">
                  {results.cols} columnas entre {rigging.points} puntos no da un número entero: los
                  puntos caen entre gabinetes. El reparto de arriba es aritmético, no el de la
                  estructura real.
                </p>
              )}
              <p className="mt-2 border-t border-[#333] pt-2 text-neutral-500 normal-case">
                Esto es aritmética sobre el rig que declaraste. No dice si el truss, el motor o el
                bumper lo aguantan: eso es cálculo estructural y lo firma alguien habilitado.
              </p>
            </div>
          </>
        ) : (
          <AwaitingInput />
        )}
      </div>
    </div>
  );
}
