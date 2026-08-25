import { Eye } from 'lucide-react';

import { viewingAdvice, type ViewingAdvice } from '../../../domain/led-array/viewing';
import Field from '../../../shared/ui/Field';
import NumberInput from '../../../shared/ui/NumberInput';
import SectionHeading from '../../../shared/ui/SectionHeading';
import { textControlClass } from '../../../shared/ui/controls';
import type { InstallControls } from '../useProjectDraft';

interface ViewingPanelProps {
  install: InstallControls;
  pitchMm: number;
}

const m = (value: number) => `${value.toFixed(1)} m`;

/** What the panel concludes, once there is both a pitch and a declared seat. */
function verdictFor(advice: ViewingAdvice, closestViewerM: number | null, pitchMm: number) {
  return {
    'too-close': {
      tone: 'text-[#FF4444] border-[#FF4444]',
      title: 'La primera fila está muy cerca',
      body: `A ${m(closestViewerM ?? 0)} se van a ver los píxeles. Para este pitch la fila más cercana debería estar a ${m(advice.minimumDistanceM)} o más.`,
    },
    acceptable: {
      tone: 'text-[#CCFF00] border-[#2F5D1F]',
      title: 'El pitch le sirve a la sala',
      body: `La primera fila está fuera del mínimo y dentro de la distancia en la que el pitch todavía aporta. Recién a partir de ${m(advice.retinaDistanceM)} deja de notarse.`,
    },
    'finer-than-needed': {
      tone: 'text-amber-400 border-amber-500',
      title: 'Más fino de lo que la sala puede ver',
      body: `Desde ${m(closestViewerM ?? 0)} nadie distingue un píxel de ${pitchMm} mm. Un panel de hasta ${advice.coarsestUsefulPitchMm?.toFixed(1)} mm se vería igual desde todas las butacas y cuesta menos.`,
    },
  }[advice.verdict ?? 'acceptable'];
}

/**
 * Whether the pitch suits the room.
 *
 * The app could say what a screen does once the panel was chosen. It could not
 * help choose it, which is the decision that happens first and costs the most.
 */
export default function ViewingPanel({ install, pitchMm }: ViewingPanelProps) {
  // A cabinet being described has no pitch yet — the field is empty, or holds
  // the 0 an empty field stands for. There is nothing to advise from, and the
  // arithmetic refuses to run on it, so the panel waits instead of throwing:
  // one unfinished field must never take the whole calculator down.
  const advice =
    pitchMm > 0 ? viewingAdvice({ pitchMm, audienceDistanceM: install.closestViewerM }) : null;

  const verdict =
    advice && advice.verdict !== null ? verdictFor(advice, install.closestViewerM, pitchMm) : null;

  return (
    <div className="p-6 border-b border-[#333] bg-[#0F0F0F]">
      <SectionHeading icon={<Eye className="w-4 h-4" />} accent="blue">
        Pitch y distancia de visión
      </SectionHeading>

      <div className="space-y-4">
        <Field label="Butaca más cercana (m)">
          {(id) => (
            <NumberInput
              id={id}
              placeholder="Sin declarar"
              value={install.closestViewerM}
              onChange={(next) =>
                install.setClosestViewerM(next !== null && next > 0 ? next : null)
              }
              className={textControlClass}
            />
          )}
        </Field>

        <div className="border border-[#333] bg-black p-3 font-mono text-[11px] uppercase space-y-1">
          <div className="flex justify-between">
            <span className="text-neutral-400">Pitch</span>
            <span className="text-neutral-200">{advice ? `${pitchMm} mm` : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Mínimo de oficio</span>
            <span className="text-neutral-200">{advice ? m(advice.minimumDistanceM) : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Deja de notarse el píxel</span>
            <span className="text-neutral-200">{advice ? m(advice.retinaDistanceM) : '—'}</span>
          </div>
        </div>

        {advice === null ? (
          <p className="text-[11px] text-neutral-500">
            Declarar el pitch del gabinete para saber si le sirve a la sala.
          </p>
        ) : verdict === null ? (
          <p className="text-[11px] text-neutral-500">
            Declarar la butaca más cercana para saber si este pitch le sirve a la sala.
          </p>
        ) : (
          <div className={`border p-3 text-[11px] ${verdict.tone}`}>
            <p className="font-bold uppercase tracking-wide">{verdict.title}</p>
            <p className="mt-1 text-neutral-300 normal-case">{verdict.body}</p>
          </div>
        )}

        <p className="text-[11px] text-neutral-500">
          El mínimo es la regla de oficio: el pitch en milímetros leído como metros. La otra cifra
          es geometría — un ojo 20/20 resuelve cerca de un minuto de arco, así que dos píxeles se
          funden a 3,44 m por cada milímetro de pitch.
        </p>
      </div>
    </div>
  );
}
