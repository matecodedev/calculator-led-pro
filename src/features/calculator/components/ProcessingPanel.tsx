import { Cpu, Pencil } from 'lucide-react';

import type { ProjectCalculation } from '../../../domain/calculate';
import type { RoutingDemand } from '../../../domain/routing/demand';
import { processors } from '../../../domain/catalog';
import Field from '../../../shared/ui/Field';
import NumberInput from '../../../shared/ui/NumberInput';
import SectionHeading from '../../../shared/ui/SectionHeading';
import StatTile from '../../../shared/ui/StatTile';
import {
  buttonFocusClass,
  compactControlClass,
  selectControlClass,
} from '../../../shared/ui/controls';
import type { ProcessorChoice } from '../useProjectDraft';
import AwaitingInput from './AwaitingInput';

interface ProcessingPanelProps {
  choice: ProcessorChoice;
  results: ProjectCalculation | null;
  /** Counted off the drawn plan, so the tile and the schematic agree. */
  demand: RoutingDemand;
}

export default function ProcessingPanel({ choice, results, demand }: ProcessingPanelProps) {
  const { processor, selectedId, isCustom, custom, select, updateCustom, editSelected } = choice;
  const overCapacity = results !== null && demand.dataCables > processor.dataPorts;

  return (
    <div className="p-6 border-b border-[#333] bg-[#0F0F0F]">
      <SectionHeading icon={<Cpu className="w-4 h-4" />} accent="fuchsia">
        Procesamiento y mapeo de data
      </SectionHeading>

      <div className="space-y-4">
        <Field label="Procesador / Sending box">
          {(id) => (
            <select
              id={id}
              value={selectedId}
              onChange={(e) => select(e.target.value)}
              className={selectControlClass('fuchsia')}
            >
              {processors.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brand} {p.model} ({p.dataPorts} Ports)
                </option>
              ))}
              <option value="custom">-- Custom Processor --</option>
            </select>
          )}
        </Field>

        {!isCustom && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={editSelected}
              className={`flex items-center gap-2 px-3 py-2 min-h-11 text-[11px] font-bold uppercase tracking-wider rounded-sm border border-[#444] text-neutral-300 hover:text-white transition-colors ${buttonFocusClass}`}
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              Editar estos datos
            </button>
            <span className="text-[11px] text-neutral-500">
              {processor.spec
                ? `Ficha: ${processor.spec.source} · ${processor.spec.checkedOn}`
                : 'Datos sin verificar contra hoja del fabricante'}
            </span>
          </div>
        )}

        {isCustom && (
          <div className="grid grid-cols-2 gap-3 bg-[#161616] p-3 border border-[#333]">
            <Field label="Puertos de salida">
              {(id) => (
                <NumberInput
                  id={id}
                  mode="integer"
                  value={custom.dataPorts}
                  onChange={(next) => updateCustom({ ...custom, dataPorts: next ?? 0 })}
                  className={compactControlClass}
                />
              )}
            </Field>
            <Field label="Píxeles por puerto">
              {(id) => (
                <NumberInput
                  id={id}
                  mode="integer"
                  value={custom.maxPixelsPerPort}
                  onChange={(next) => updateCustom({ ...custom, maxPixelsPerPort: next ?? 0 })}
                  className={compactControlClass}
                />
              )}
            </Field>
            <Field label="Píxeles totales del equipo">
              {(id) => (
                <NumberInput
                  id={id}
                  mode="integer"
                  value={custom.maxPixelsTotal}
                  onChange={(next) => updateCustom({ ...custom, maxPixelsTotal: next ?? 0 })}
                  className={compactControlClass}
                />
              )}
            </Field>
            <Field label="Canvas máx. ancho (px)">
              {(id) => (
                <NumberInput
                  id={id}
                  mode="integer"
                  value={custom.maxCanvasWidth}
                  onChange={(next) => updateCustom({ ...custom, maxCanvasWidth: next ?? 0 })}
                  className={compactControlClass}
                />
              )}
            </Field>
            <Field label="Canvas máx. alto (px)">
              {(id) => (
                <NumberInput
                  id={id}
                  mode="integer"
                  value={custom.maxCanvasHeight}
                  onChange={(next) => updateCustom({ ...custom, maxCanvasHeight: next ?? 0 })}
                  className={compactControlClass}
                />
              )}
            </Field>
          </div>
        )}

        {results ? (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <StatTile
              label="Cables de data necesarios"
              value={demand.dataCables}
              tone="data"
              footnote={`~${results.cabinetsPerDataPort} gab / cable`}
            />
            <StatTile
              label="Procesadores necesarios"
              tone={overCapacity ? 'power' : 'neutral'}
              className={`bg-[#161616] ${overCapacity ? 'border-amber-500' : 'border-[#333]'}`}
              value={
                <>
                  {demand.processorsNeeded}
                  <span className="text-xs ml-1 text-neutral-400">unid.</span>
                </>
              }
              footnote={
                demand.processorLimit === 'canvas' ? (
                  <span className="text-amber-400 font-bold tracking-widest uppercase">
                    La pantalla excede el canvas del equipo · hay que repartirla
                  </span>
                ) : demand.processorLimit === 'pixels' ? (
                  <span className="text-amber-400 font-bold tracking-widest uppercase">
                    Excede los píxeles que mueve un equipo
                  </span>
                ) : (
                  overCapacity && (
                    <span className="text-amber-400 font-bold tracking-widest uppercase">
                      Falta{demand.processorsNeeded > 2 ? 'n' : ''} {demand.processorsNeeded - 1}{' '}
                      procesador
                      {demand.processorsNeeded > 2 ? 'es' : ''}
                    </span>
                  )
                )
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
