import { Cable } from 'lucide-react';

import { cableSchedule } from '../../../domain/routing/schedule';
import type { GridPosition } from '../../../domain/routing/serpentine';
import Field from '../../../shared/ui/Field';
import SectionHeading from '../../../shared/ui/SectionHeading';
import { textControlClass } from '../../../shared/ui/controls';
import type { InstallControls } from '../useProjectDraft';

/**
 * Dressing, ties and the fact that a cable never runs in a straight line.
 * Fifteen percent is the rule of thumb; it is stated on screen rather than
 * folded silently into a number.
 */
export const SLACK = 0.15;

interface CableSchedulePanelProps {
  install: InstallControls;
  dataRuns: GridPosition[][];
  powerRuns: GridPosition[][];
  rows: number;
  cabinetWidthMm: number;
  cabinetHeightMm: number;
}

const drawn = (runs: GridPosition[][]) => runs.filter((run) => run.length > 0);

export default function CableSchedulePanel({
  install,
  dataRuns,
  powerRuns,
  rows,
  cabinetWidthMm,
  cabinetHeightMm,
}: CableSchedulePanelProps) {
  const declared = install.distanceToSourceM !== null;

  const scheduleFor = (runs: GridPosition[][]) =>
    cableSchedule({
      runs,
      cabinetWidthMm,
      cabinetHeightMm,
      rows,
      trimHeightM: install.trimHeightM,
      distanceToSourceM: install.distanceToSourceM ?? 0,
      slack: SLACK,
    });

  const layers = [
    { name: 'Data', schedule: scheduleFor(dataRuns), runs: drawn(dataRuns) },
    { name: 'Power', schedule: scheduleFor(powerRuns), runs: drawn(powerRuns) },
  ];

  return (
    <div className="bg-[#111] p-6 border-t border-[#333]">
      <SectionHeading icon={<Cable className="w-4 h-4" />} accent="blue">
        Planilla de cables
      </SectionHeading>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="Altura del borde inferior (m)">
          {(id) => (
            <input
              id={id}
              type="number"
              min="0"
              step="0.1"
              inputMode="decimal"
              value={install.trimHeightM}
              onChange={(e) => install.setTrimHeightM(Math.max(0, Number(e.target.value) || 0))}
              className={textControlClass}
            />
          )}
        </Field>

        <Field label="Distancia al rack (m)">
          {(id) => (
            <input
              id={id}
              type="number"
              min="0"
              step="0.5"
              inputMode="decimal"
              placeholder="Sin declarar"
              value={install.distanceToSourceM ?? ''}
              onChange={(e) => {
                const next = Number(e.target.value);
                install.setDistanceToSourceM(e.target.value === '' || next < 0 ? null : next);
              }}
              className={textControlClass}
            />
          )}
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {layers.map(({ name, schedule, runs }) => (
          <div key={name} className="border border-[#333] bg-[#0F0F0F] p-3 font-mono text-[11px]">
            <div className="uppercase font-bold text-[#CCFF00] mb-2">{name}</div>

            <div className="flex justify-between text-neutral-300">
              <span className="uppercase text-neutral-400">Mains</span>
              <span>{runs.length}</span>
            </div>
            <div className="flex justify-between text-neutral-300">
              <span className="uppercase text-neutral-400">Jumpers entre gabinetes</span>
              <span>{schedule.totalJumpers}</span>
            </div>

            {declared ? (
              <div className="mt-2 border-t border-[#333] pt-2 space-y-1">
                {schedule.mainsByLength.length === 0 ? (
                  <span className="text-neutral-500 normal-case">Nada dibujado en esta capa</span>
                ) : (
                  schedule.mainsByLength.map(({ lengthM, count }) => (
                    <div key={lengthM} className="flex justify-between text-neutral-200">
                      <span className="uppercase text-neutral-400">Cable de {lengthM} m</span>
                      <span>× {count}</span>
                    </div>
                  ))
                )}
                {schedule.beyondLongestCable && (
                  <p className="text-[#FF4444] font-bold uppercase pt-1">
                    Un main pasa el cable más largo que existe
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 border-t border-[#333] pt-2 text-neutral-500 normal-case">
                Declarar la distancia al rack para saber de qué largo pedirlos.
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-neutral-500">
        Cada main se mide desde el rack hasta el primer gabinete de su línea: la distancia por piso,
        más la altura del borde inferior, más lo que ese cable trepa. Se le suma{' '}
        {Math.round(SLACK * 100)}% de holgura y se redondea al cable comercial que sigue.
      </p>
    </div>
  );
}
