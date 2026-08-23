import { Cpu } from 'lucide-react';

import type { ProjectCalculation } from '../../../domain/calculate';
import type { RoutingDemand } from '../../../domain/routing/demand';
import { processors } from '../../../domain/catalog';
import Field from '../../../shared/ui/Field';
import SectionHeading from '../../../shared/ui/SectionHeading';
import StatTile from '../../../shared/ui/StatTile';
import { compactControlClass, selectControlClass } from '../../../shared/ui/controls';
import type { ProcessorChoice } from '../useProjectDraft';
import AwaitingInput from './AwaitingInput';

interface ProcessingPanelProps {
  choice: ProcessorChoice;
  results: ProjectCalculation | null;
  /** Counted off the drawn plan, so the tile and the schematic agree. */
  demand: RoutingDemand;
}

export default function ProcessingPanel({ choice, results, demand }: ProcessingPanelProps) {
  const { processor, selectedId, isCustom, custom, select, updateCustom } = choice;
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

        {isCustom && (
          <div className="grid grid-cols-2 gap-3 bg-[#161616] p-3 border border-[#333]">
            <Field label="Output ports">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={custom.dataPorts}
                  onChange={(e) => updateCustom({ ...custom, dataPorts: Number(e.target.value) })}
                  className={compactControlClass}
                />
              )}
            </Field>
            <Field label="Max px / port">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={custom.maxPixelsPerPort}
                  onChange={(e) =>
                    updateCustom({ ...custom, maxPixelsPerPort: Number(e.target.value) })
                  }
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
                overCapacity && (
                  <span className="text-amber-400 font-bold tracking-widest uppercase">
                    Falta{demand.processorsNeeded > 2 ? 'n' : ''} {demand.processorsNeeded - 1}{' '}
                    procesador
                    {demand.processorsNeeded > 2 ? 'es' : ''}
                  </span>
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
