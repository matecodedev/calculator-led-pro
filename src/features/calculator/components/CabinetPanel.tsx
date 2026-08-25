import { Pencil, Settings2 } from 'lucide-react';

import { cabinets, type Cabinet } from '../../../domain/catalog';
import type { NumericMode } from '../../../shared/number/decimalInput';
import Field from '../../../shared/ui/Field';
import NumberInput from '../../../shared/ui/NumberInput';
import SectionHeading from '../../../shared/ui/SectionHeading';
import SegmentedControl from '../../../shared/ui/SegmentedControl';
import {
  buttonFocusClass,
  compactControlClass,
  selectControlClass,
  textControlClass,
} from '../../../shared/ui/controls';
import type { CabinetChoice, TargetControls } from '../useProjectDraft';

/** The editable fields of a custom cabinet, in the order a spec sheet lists them. */
/**
 * Every number the app calculates with.
 *
 * Weight and average power were missing, so a technician could describe their
 * own cabinet and still have the rigging divide by a default weight they never
 * chose and the expected draw use an average they never saw.
 */
const CUSTOM_FIELDS = [
  { key: 'width', label: 'Ancho (mm)', mode: 'decimal' },
  { key: 'height', label: 'Alto (mm)', mode: 'decimal' },
  { key: 'resX', label: 'Res X (px)', mode: 'integer' },
  { key: 'resY', label: 'Res Y (px)', mode: 'integer' },
  // A pitch is 2.6 or 3.9 far more often than it is a whole millimetre.
  { key: 'pitch', label: 'Pitch (mm)', mode: 'decimal' },
  { key: 'maxPower', label: 'Potencia máx. (W)', mode: 'decimal' },
  { key: 'avgPower', label: 'Potencia media (W)', mode: 'decimal' },
  { key: 'weight', label: 'Peso (kg)', mode: 'decimal' },
] as const satisfies readonly { key: keyof Cabinet; label: string; mode: NumericMode }[];

interface CabinetPanelProps {
  choice: CabinetChoice;
  target: TargetControls;
}

export default function CabinetPanel({ choice, target }: CabinetPanelProps) {
  const { cabinet, selectedId, isCustom, custom, select, updateCustom, editSelected } = choice;

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

        {!isCustom && (
          <div className="flex flex-wrap items-center gap-3 -mt-1">
            <button
              type="button"
              onClick={editSelected}
              className={`flex items-center gap-2 px-3 py-2 min-h-11 text-[11px] font-bold uppercase tracking-wider rounded-sm border border-[#444] text-neutral-300 hover:text-white transition-colors ${buttonFocusClass}`}
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              Editar estos datos
            </button>
            <span className="text-[11px] text-neutral-500">
              {cabinet.spec
                ? `Ficha: ${cabinet.spec.source} · ${cabinet.spec.checkedOn}`
                : 'Datos sin verificar contra hoja del fabricante'}
            </span>
          </div>
        )}

        {isCustom && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#161616] p-3 border border-[#333]">
            {CUSTOM_FIELDS.map(({ key, label, mode }) => (
              <Field key={key} label={label}>
                {(id) => (
                  <NumberInput
                    id={id}
                    mode={mode}
                    value={custom[key]}
                    onChange={(next) => updateCustom({ ...custom, [key]: next ?? 0 })}
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
                <NumberInput
                  id={id}
                  value={target.targetWidthM}
                  onChange={(next) => target.setTargetWidthM(next ?? 0)}
                  placeholder="ej. 4,5"
                  className={textControlClass}
                />
              )}
            </Field>
            <Field label="Alto (m)">
              {(id) => (
                <NumberInput
                  id={id}
                  value={target.targetHeightM}
                  onChange={(next) => target.setTargetHeightM(next ?? 0)}
                  placeholder="ej. 2,5"
                  className={textControlClass}
                />
              )}
            </Field>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Columnas (horizontal)">
              {(id) => (
                <NumberInput
                  id={id}
                  mode="integer"
                  value={target.cols}
                  onChange={(next) => target.setCols(next ?? 0)}
                  className={textControlClass}
                />
              )}
            </Field>
            <Field label="Filas (vertical)">
              {(id) => (
                <NumberInput
                  id={id}
                  mode="integer"
                  value={target.rows}
                  onChange={(next) => target.setRows(next ?? 0)}
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
