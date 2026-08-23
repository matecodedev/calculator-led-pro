import { Settings2 } from 'lucide-react';

import { cabinets, type Cabinet } from '../../../domain/catalog';
import Field from '../../../shared/ui/Field';
import SectionHeading from '../../../shared/ui/SectionHeading';
import SegmentedControl from '../../../shared/ui/SegmentedControl';
import {
  compactControlClass,
  selectControlClass,
  textControlClass,
} from '../../../shared/ui/controls';
import type { CabinetChoice, TargetControls } from '../useProjectDraft';

/** The editable fields of a custom cabinet, in the order a spec sheet lists them. */
const CUSTOM_FIELDS = [
  { key: 'width', label: 'Ancho (mm)' },
  { key: 'height', label: 'Alto (mm)' },
  { key: 'resX', label: 'Res X (px)' },
  { key: 'resY', label: 'Res Y (px)' },
  { key: 'maxPower', label: 'Potencia máx. (W)' },
  { key: 'pitch', label: 'Pitch (mm)' },
] as const satisfies readonly { key: keyof Cabinet; label: string }[];

interface CabinetPanelProps {
  choice: CabinetChoice;
  target: TargetControls;
}

export default function CabinetPanel({ choice, target }: CabinetPanelProps) {
  const { cabinet, selectedId, isCustom, custom, select, updateCustom } = choice;

  return (
    <div className="p-6">
      <SectionHeading
        icon={<Settings2 className="w-4 h-4" />}
        className="mb-4 xl:mb-6 mt-2 xl:mt-0"
        note={
          <span className="text-[11px] font-mono uppercase text-neutral-400">
            Ref: {cabinet.model}
          </span>
        }
      >
        Medidas y gabinete
      </SectionHeading>

      <div className="space-y-4">
        <Field label="Gabinete / Panel">
          {(id) => (
            <select
              id={id}
              value={selectedId}
              onChange={(e) => select(e.target.value)}
              className={selectControlClass('lime')}
            >
              {cabinets.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brand} {c.model} ({c.pitch}mm)
                </option>
              ))}
              <option value="custom">-- Gabinete personalizado --</option>
            </select>
          )}
        </Field>

        {isCustom && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#161616] p-3 border border-[#333]">
            {CUSTOM_FIELDS.map(({ key, label }) => (
              <Field key={key} label={label}>
                {(id) => (
                  <input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={custom[key]}
                    onChange={(e) => updateCustom({ ...custom, [key]: Number(e.target.value) })}
                    className={compactControlClass}
                  />
                )}
              </Field>
            ))}
          </div>
        )}

        <SegmentedControl
          label="Modo de cálculo"
          value={target.calcMode}
          onChange={target.setCalcMode}
          segments={[
            { value: 'dimensions', label: 'Por metros' },
            { value: 'count', label: 'Por cantidad' },
          ]}
        />

        {target.calcMode === 'dimensions' ? (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ancho (m)">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  inputMode="decimal"
                  value={target.targetWidthM}
                  onChange={(e) => target.setTargetWidthM(Number(e.target.value))}
                  min={0.5}
                  step={0.5}
                  className={textControlClass}
                />
              )}
            </Field>
            <Field label="Alto (m)">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  inputMode="decimal"
                  value={target.targetHeightM}
                  onChange={(e) => target.setTargetHeightM(Number(e.target.value))}
                  min={0.5}
                  step={0.5}
                  className={textControlClass}
                />
              )}
            </Field>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Columnas (horizontal)">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  value={target.cols}
                  onChange={(e) => target.setCols(Number(e.target.value))}
                  min={1}
                  step={1}
                  className={textControlClass}
                />
              )}
            </Field>
            <Field label="Filas (vertical)">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  value={target.rows}
                  onChange={(e) => target.setRows(Number(e.target.value))}
                  min={1}
                  step={1}
                  className={textControlClass}
                />
              )}
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}
