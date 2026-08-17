import { Cpu } from 'lucide-react';

import type { ProjectCalculation } from '../../../domain/calculate';
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
}

export default function ProcessingPanel({ choice, results }: ProcessingPanelProps) {
  const { processor, selectedId, isCustom, custom, select, updateCustom } = choice;
  const overCapacity = results !== null && results.dataCablesNeeded > processor.dataPorts;

  return (
    <div className="p-6 border-b border-[#333] bg-[#0F0F0F]">
      <SectionHeading icon={<Cpu className="w-4 h-4" />} accent="fuchsia">
        Processing &amp; Data Mapper
      </SectionHeading>

      <div className="space-y-4">
        <Field label="Processor / Sending Box">
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
              label="Main Data Cables Req."
              value={results.dataCablesNeeded}
              tone="data"
              footnote={`~${results.cabinetsPerDataPort} cab / cable`}
            />
            <StatTile
              label="Processors Needed"
              tone={overCapacity ? 'alert' : 'neutral'}
              className={`bg-[#161616] ${overCapacity ? 'border-[#FF4444]' : 'border-[#333]'}`}
              value={
                <>
                  {results.processorsNeeded}
                  <span className="text-xs ml-1 text-neutral-400">units</span>
                </>
              }
              footnote={
                overCapacity && (
                  <span className="text-[#FF4444] font-bold tracking-widest uppercase">
                    Capacity exceeded
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
