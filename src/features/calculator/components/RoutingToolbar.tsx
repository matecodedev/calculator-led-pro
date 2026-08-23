import { Network, Zap } from 'lucide-react';

import {
  START_CORNERS,
  type MainsPolicy,
  type RoutingPriority,
  type StartCorner,
} from '../../../domain/routing/serpentine';
import Field from '../../../shared/ui/Field';
import SegmentedControl from '../../../shared/ui/SegmentedControl';
import { buttonFocusClass, selectControlClass } from '../../../shared/ui/controls';
import type { RoutingPlan } from '../useRoutingPlan';

/** "bottom-left" -> "Bottom-Left" */
const cornerLabel = (corner: StartCorner) =>
  corner
    .split('-')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('-');

const actionClass = `border rounded-sm px-3 py-2 min-h-11 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${buttonFocusClass}`;

interface RoutingToolbarProps {
  plan: RoutingPlan;
  onAutoFill: () => void;
}

export default function RoutingToolbar({ plan, onAutoFill }: RoutingToolbarProps) {
  const editCurrentLayer = (
    edit: (runs: { x: number; y: number }[][]) => { x: number; y: number }[][],
  ) => plan.setManualRoutes((previous) => edit(previous));

  const undoLastCabinet = () =>
    editCurrentLayer((previous) => {
      const runs = [...previous];
      const last = runs.length - 1;
      if (last < 0) return previous;
      if (runs[last].length > 0) runs[last] = runs[last].slice(0, -1);
      else if (runs.length > 1) runs.pop();
      return runs;
    });

  const startNewRun = () =>
    editCurrentLayer((previous) => {
      const runs = [...previous];
      const last = runs.length - 1;
      if (last >= 0 && runs[last].length === 0) return previous;
      return [...runs, []];
    });

  return (
    <div className="flex flex-wrap gap-3 w-full sm:w-auto">
      <SegmentedControl
        label="Capa"
        value={plan.layer}
        onChange={plan.setLayer}
        accent={plan.layer === 'power' ? 'red' : 'lime'}
        segments={[
          {
            value: 'data',
            label: (
              <>
                <Network className="w-3 h-3" aria-hidden="true" /> Data
              </>
            ),
          },
          {
            value: 'power',
            label: (
              <>
                <Zap className="w-3 h-3" aria-hidden="true" /> Power
              </>
            ),
          },
        ]}
      />

      <SegmentedControl
        label="Modo"
        value={plan.mode}
        onChange={plan.setMode}
        variant="subtle"
        segments={[
          { value: 'auto', label: 'Auto' },
          { value: 'manual', label: 'Manual' },
        ]}
      />

      <Field label="Prioridad">
        {(id) => (
          <select
            id={id}
            value={plan.priority}
            onChange={(e) => plan.setPriority(e.target.value as RoutingPriority)}
            className={`${selectControlClass('lime')} text-[11px]`}
          >
            <option value="vertical">Serpentina vertical</option>
            <option value="horizontal">Serpentina horizontal</option>
          </select>
        )}
      </Field>

      <Field label="Esquina de arranque">
        {(id) => (
          <select
            id={id}
            value={plan.start}
            onChange={(e) => plan.setStart(e.target.value as StartCorner)}
            className={`${selectControlClass('lime')} text-[11px]`}
          >
            {START_CORNERS.map((corner) => (
              <option key={corner} value={corner}>
                {cornerLabel(corner)}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Mains">
        {(id) => (
          <select
            id={id}
            value={plan.mains}
            onChange={(e) => plan.setMains(e.target.value as MainsPolicy)}
            className={`${selectControlClass('lime')} text-[11px]`}
          >
            <option value="start-edge">Cada cable desde el borde</option>
            <option value="continuous">Una serpentina continua</option>
          </select>
        )}
      </Field>

      {plan.mode === 'manual' && (
        <div>
          <span className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
            Controles manuales
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onAutoFill}
              className={`${actionClass} bg-[#10b981] text-black hover:bg-[#34d399] border-[#059669]`}
              title="Genera la serpentina óptima para data y power"
            >
              Auto-Path
            </button>
            <button
              type="button"
              onClick={startNewRun}
              className={`${actionClass} bg-[#333] text-white hover:bg-[#444] border-[#555]`}
            >
              + Nueva línea
            </button>
            <button
              type="button"
              onClick={undoLastCabinet}
              className={`${actionClass} bg-[#1A1A1A] text-neutral-300 hover:text-white border-[#444]`}
            >
              Deshacer
            </button>
            <button
              type="button"
              onClick={() => plan.setManualRoutes([[]])}
              className={`${actionClass} bg-[#1A1A1A] text-red-400 hover:text-red-300 border-[#444]`}
            >
              Borrar todo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
