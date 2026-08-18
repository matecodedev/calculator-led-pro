import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';

import {
  describeSnapshot,
  SNAPSHOT_VERSION,
  type ProjectSnapshot,
} from '../../domain/project/snapshot';
import { renderProjectReport, reportFilename } from '../../infrastructure/pdf/projectReport';
import {
  browserStore,
  deleteProject,
  listProjects,
  loadAutosave,
  saveAutosave,
  saveProject,
  type SavedProject,
} from '../../infrastructure/storage/projectStore';
import { downloadBlob } from '../../shared/download';
import { buttonFocusClass } from '../../shared/ui/controls';
import CabinetPanel from './components/CabinetPanel';
import ElectricalPanel from './components/ElectricalPanel';
import ProcessingPanel from './components/ProcessingPanel';
import ProjectAlerts from './components/ProjectAlerts';
import ProjectBar from './components/ProjectBar';
import ProjectIdentityPanel from './components/ProjectIdentityPanel';
import RoutingSchematic from './components/RoutingSchematic';
import TotalOutputPanel from './components/TotalOutputPanel';
import { useProjectDraft } from './useProjectDraft';
import { useRoutingPlan } from './useRoutingPlan';

/** How long to wait after the last edit before writing to storage. */
const AUTOSAVE_DELAY_MS = 500;

interface Session {
  /** Bumping this remounts the workspace, which reseeds every field. */
  generation: number;
  snapshot: ProjectSnapshot | null;
  openProjectId: string | null;
}

/**
 * Restores the last session on load, and swaps the whole workspace when a saved
 * screen is opened. Remounting on a key is React's own way to reset state — far
 * safer here than pushing twenty setters through the tree.
 */
export default function CalculatorScreen() {
  const [session, setSession] = useState<Session>(() => ({
    generation: 0,
    snapshot: loadAutosave(),
    openProjectId: null,
  }));

  return (
    <CalculatorWorkspace
      key={session.generation}
      initial={session.snapshot}
      openProjectId={session.openProjectId}
      onOpenProject={(project) =>
        setSession((previous) => ({
          generation: previous.generation + 1,
          snapshot: project.snapshot,
          openProjectId: project.id,
        }))
      }
      onProjectSaved={(id) => setSession((previous) => ({ ...previous, openProjectId: id }))}
      onProjectDeleted={() => setSession((previous) => ({ ...previous, openProjectId: null }))}
    />
  );
}

interface WorkspaceProps {
  initial: ProjectSnapshot | null;
  openProjectId: string | null;
  onOpenProject: (project: SavedProject) => void;
  onProjectSaved: (id: string) => void;
  onProjectDeleted: () => void;
}

function CalculatorWorkspace({
  initial,
  openProjectId,
  onOpenProject,
  onProjectSaved,
  onProjectDeleted,
}: WorkspaceProps) {
  const draft = useProjectDraft(initial);
  const plan = useRoutingPlan(draft.results, initial);
  const [exportError, setExportError] = useState<string | null>(null);
  const [projects, setProjects] = useState<SavedProject[]>(() => listProjects());
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const storageAvailable = browserStore() !== null;

  const { results, issues } = draft;

  // Serialising gives the effect a stable dependency; the object identity
  // changes on every render, the text only changes when the work does.
  const documentJson = useMemo(
    () => JSON.stringify({ ...draft.snapshotSlice, routing: plan.snapshotSlice }),
    [draft.snapshotSlice, plan.snapshotSlice],
  );

  const toSnapshot = (): ProjectSnapshot => ({
    version: SNAPSHOT_VERSION,
    savedAt: new Date().toISOString(),
    ...draft.snapshotSlice,
    routing: plan.snapshotSlice,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const stamped: ProjectSnapshot = {
        version: SNAPSHOT_VERSION,
        savedAt: new Date().toISOString(),
        ...(JSON.parse(documentJson) as Omit<ProjectSnapshot, 'version' | 'savedAt'>),
      };
      if (saveAutosave(stamped)) setSavedAt(new Date());
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [documentJson]);

  const saveName = describeSnapshot(toSnapshot());
  const isNamed = saveName !== 'Untitled screen';

  const handleSave = () => {
    const snapshot = toSnapshot();
    const next = saveProject(saveName, snapshot);
    setProjects(next);
    const saved = next.find((p) => p.name === saveName);
    if (saved) onProjectSaved(saved.id);
  };

  const handleDelete = (id: string) => {
    setProjects(deleteProject(id));
    onProjectDeleted();
  };

  const exportReport = async () => {
    if (!results) return;
    try {
      const blob = await renderProjectReport({
        eventName: draft.identity.eventName,
        screenName: draft.identity.screenName,
        cabinet: draft.cabinetChoice.cabinet,
        processor: draft.processorChoice.processor,
        calculation: results,
        voltage: draft.supply.voltage,
        pduCapacityAmps: draft.supply.pduCapacityAmps,
        breakerAmps: draft.supply.breakerAmps,
        cableLoopAmps: draft.supply.cableLoopAmps,
        dataRoutes: plan.routesFor('data'),
        powerRoutes: plan.routesFor('power'),
      });
      downloadBlob(blob, reportFilename(draft.identity));
      setExportError(null);
    } catch (error) {
      console.error('PDF export failed', error);
      setExportError('The PDF report could not be generated. Please try again.');
    }
  };

  const exportButtonClass =
    'flex items-center justify-center gap-2 bg-[#CCFF00] text-black font-bold uppercase tracking-wider ' +
    `rounded-sm transition-colors hover:bg-[#aacc00] disabled:opacity-40 disabled:cursor-not-allowed ${buttonFocusClass}`;

  return (
    <div className="animate-in fade-in duration-300">
      <div className="p-4 bg-[#111] border-b border-[#333] justify-between items-center sticky top-0 z-10 hidden sm:flex">
        <h1 className="text-xs font-bold tracking-widest uppercase text-white">
          Active Configuration Project
        </h1>
        <button
          type="button"
          onClick={() => void exportReport()}
          disabled={!results}
          className={`${exportButtonClass} px-4 py-2 text-[11px] shadow-lg`}
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          Export PDF Report
        </button>
      </div>
      <div className="p-4 bg-[#111] border-b border-[#333] sm:hidden">
        <button
          type="button"
          onClick={() => void exportReport()}
          disabled={!results}
          className={`${exportButtonClass} w-full px-4 py-3 text-[11px]`}
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Download PDF Export
        </button>
      </div>

      <ProjectBar
        projects={projects}
        openProjectId={openProjectId}
        saveName={isNamed ? saveName : ''}
        savedAt={savedAt}
        storageAvailable={storageAvailable}
        onOpen={(id) => {
          const project = projects.find((p) => p.id === id);
          if (project) onOpenProject(project);
        }}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <ProjectAlerts issues={issues} exportError={exportError} />

      <ProjectIdentityPanel {...draft.identity} />

      <section className="grid grid-cols-1 xl:grid-cols-2 border-b border-[#333]">
        <div className="border-b xl:border-b-0 xl:border-r border-[#333] flex flex-col">
          <CabinetPanel choice={draft.cabinetChoice} target={draft.target} />
          <TotalOutputPanel results={results} />
        </div>

        <div className="grid grid-rows-[auto_1fr]">
          <ProcessingPanel choice={draft.processorChoice} results={results} />
          <ElectricalPanel supply={draft.supply} results={results} />
        </div>
      </section>

      <section className="border-b border-[#333]">
        {results && (
          <RoutingSchematic
            plan={plan}
            screen={{
              cols: results.cols,
              rows: results.rows,
              cabinetWidth: draft.cabinetChoice.cabinet.width,
              cabinetHeight: draft.cabinetChoice.cabinet.height,
              dataCapacity: results.cabinetsPerDataPort,
              powerCapacity: results.cabinetsPerPowerCable,
            }}
          />
        )}
      </section>
    </div>
  );
}
