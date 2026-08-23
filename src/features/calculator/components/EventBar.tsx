import { Copy, Layers, Plus, Trash2 } from 'lucide-react';

import type { EventSummary } from '../../../domain/project/eventSummary';
import type { ScreenSnapshot } from '../../../domain/project/snapshot';
import Field from '../../../shared/ui/Field';
import {
  buttonFocusClass,
  selectControlClass,
  textControlClass,
} from '../../../shared/ui/controls';

interface EventBarProps {
  eventName: string;
  onEventNameChange: (name: string) => void;
  mainsCapacityAmps: number | null;
  onMainsCapacityChange: (amps: number | null) => void;
  screens: ScreenSnapshot[];
  activeScreenId: string;
  summary: EventSummary;
  onSelectScreen: (id: string) => void;
  onAddScreen: () => void;
  onDuplicateScreen: () => void;
  onDeleteScreen: () => void;
}

const actionClass = `flex items-center gap-2 px-3 py-2 min-h-11 text-[11px] font-bold uppercase tracking-wider rounded-sm border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${buttonFocusClass}`;

/** "Main Stage" or, before it is named, its position in the event. */
const screenLabel = (screen: ScreenSnapshot, index: number) =>
  screen.name.trim() || `Pantalla ${index + 1}`;

export default function EventBar({
  eventName,
  onEventNameChange,
  mainsCapacityAmps,
  onMainsCapacityChange,
  screens,
  activeScreenId,
  summary,
  onSelectScreen,
  onAddScreen,
  onDuplicateScreen,
  onDeleteScreen,
}: EventBarProps) {
  const { totalMaxAmps, capacityAmps, overCapacity, headroomPercent } = summary;

  return (
    <section className="bg-[#161616] border-b border-[#333]">
      <div className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4">
        <Field label="Nombre del evento" className="flex-1">
          {(id) => (
            <input
              id={id}
              type="text"
              name="event-name"
              autoComplete="off"
              placeholder="ej. Lollapalooza 2026"
              value={eventName}
              onChange={(e) => onEventNameChange(e.target.value)}
              className={textControlClass}
            />
          )}
        </Field>

        <Field label="Acometida del venue (A)" className="sm:w-48">
          {(id) => (
            <input
              id={id}
              type="number"
              min="1"
              inputMode="numeric"
              name="venue-feed"
              autoComplete="off"
              placeholder="Sin declarar"
              value={mainsCapacityAmps ?? ''}
              onChange={(e) => {
                const next = Number(e.target.value);
                onMainsCapacityChange(e.target.value === '' || next <= 0 ? null : next);
              }}
              className={textControlClass}
            />
          )}
        </Field>
      </div>

      {/*
       * Every screen checks itself against its own PDU, and every one of them can
       * pass while the show does not. This is the only place that adds them up.
       */}
      <div className="px-4 sm:px-6 pb-4">
        <div
          className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 border p-3 font-mono text-[11px] uppercase ${
            overCapacity ? 'border-[#FF4444] bg-[#2A1313]' : 'border-[#333] bg-[#0F0F0F]'
          }`}
        >
          <span className="text-neutral-400">Todo el evento</span>
          <span className={`font-bold ${overCapacity ? 'text-[#FF4444]' : 'text-[#CCFF00]'}`}>
            {totalMaxAmps.toFixed(1)} A
          </span>
          {capacityAmps === null ? (
            <span className="text-neutral-500">Declarar la acometida para saber si entra</span>
          ) : (
            <span className={overCapacity ? 'text-[#FF4444]' : 'text-neutral-400'}>
              de {capacityAmps} A
              {overCapacity
                ? ' · se pasa de la acometida'
                : ` · ${(headroomPercent ?? 0).toFixed(0)}% de margen`}
            </span>
          )}
          <span className="text-neutral-500">
            {summary.totalCabinets} gab · {summary.totalWeightKg.toLocaleString()} kg ·{' '}
            {summary.totalPowerCables} power · {summary.totalDataCables} data
          </span>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-4 flex flex-wrap items-end gap-3">
        <Field label="Pantalla" className="min-w-[12rem] flex-1 sm:flex-none">
          {(id) => (
            <select
              id={id}
              value={activeScreenId}
              onChange={(e) => onSelectScreen(e.target.value)}
              className={`${selectControlClass('lime')} text-xs`}
            >
              {screens.map((screen, index) => (
                <option key={screen.id} value={screen.id}>
                  {screenLabel(screen, index)}
                </option>
              ))}
            </select>
          )}
        </Field>

        <button
          type="button"
          onClick={onAddScreen}
          className={`${actionClass} bg-[#1A1A1A] text-neutral-200 hover:text-white border-[#444]`}
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          Nueva pantalla
        </button>

        <button
          type="button"
          onClick={onDuplicateScreen}
          title="Copia gabinete, alimentación y ruteo de esta pantalla en una nueva"
          className={`${actionClass} bg-[#1A1A1A] text-neutral-200 hover:text-white border-[#444]`}
        >
          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
          Duplicar
        </button>

        <button
          type="button"
          onClick={onDeleteScreen}
          disabled={screens.length <= 1}
          title={
            screens.length <= 1
              ? 'Un evento conserva al menos una pantalla'
              : 'Quitar esta pantalla del evento'
          }
          className={`${actionClass} bg-[#1A1A1A] text-[#FF4444] hover:text-[#ff6b6b] border-[#442222]`}
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          Quitar
        </button>

        <span className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-neutral-500 ml-auto">
          <Layers className="w-3.5 h-3.5" aria-hidden="true" />
          {screens.length} {screens.length === 1 ? 'pantalla' : 'pantallas'}
        </span>
      </div>
    </section>
  );
}
