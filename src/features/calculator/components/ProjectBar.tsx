import { FolderOpen, Save, Trash2 } from 'lucide-react';

import type { SavedProject } from '../../../infrastructure/storage/projectStore';
import Field from '../../../shared/ui/Field';
import { buttonFocusClass, selectControlClass } from '../../../shared/ui/controls';

interface ProjectBarProps {
  projects: SavedProject[];
  /** The saved project currently open, if this screen came from one. */
  openProjectId: string | null;
  /** Name the current screen would be saved under; empty when unnamed. */
  saveName: string;
  savedAt: Date | null;
  storageAvailable: boolean;
  onOpen: (id: string) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
}

const actionClass = `flex items-center gap-2 px-3 py-2 min-h-11 text-[11px] font-bold uppercase tracking-wider rounded-sm border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${buttonFocusClass}`;

export default function ProjectBar({
  projects,
  openProjectId,
  saveName,
  savedAt,
  storageAvailable,
  onOpen,
  onSave,
  onDelete,
}: ProjectBarProps) {
  return (
    <div className="px-4 py-3 bg-[#0F0F0F] border-b border-[#333] flex flex-wrap items-end gap-3">
      <Field label="Eventos guardados" className="min-w-[14rem] flex-1 sm:flex-none">
        {(id) => (
          <select
            id={id}
            value={openProjectId ?? ''}
            onChange={(e) => e.target.value && onOpen(e.target.value)}
            disabled={projects.length === 0}
            className={`${selectControlClass('lime')} text-xs disabled:opacity-40`}
          >
            <option value="">
              {projects.length === 0 ? 'Todavía no guardaste nada' : 'Abrir un evento guardado…'}
            </option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        )}
      </Field>

      <button
        type="button"
        onClick={onSave}
        disabled={!saveName || !storageAvailable}
        title={
          saveName
            ? `Guardar como "${saveName}"`
            : 'Primero hay que nombrar el evento o la pantalla'
        }
        className={`${actionClass} bg-[#CCFF00] text-black border-transparent hover:bg-[#aacc00]`}
      >
        <Save className="w-3.5 h-3.5" aria-hidden="true" />
        {openProjectId ? 'Actualizar evento' : 'Guardar evento'}
      </button>

      <button
        type="button"
        onClick={() => openProjectId && onDelete(openProjectId)}
        disabled={!openProjectId}
        className={`${actionClass} bg-[#1A1A1A] text-red-400 border-[#444] hover:text-red-300`}
      >
        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        Eliminar
      </button>

      <p
        className="text-[11px] text-neutral-400 ml-auto flex items-center gap-2"
        aria-live="polite"
      >
        {!storageAvailable ? (
          <span className="text-[#FF9F91]">
            This browser is blocking storage — your work will not be kept.
          </span>
        ) : (
          <>
            <FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />
            {savedAt
              ? `Guardado ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Se guarda solo mientras trabajás'}
          </>
        )}
      </p>
    </div>
  );
}
