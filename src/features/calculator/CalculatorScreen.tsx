import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';

import { summariseEvent } from '../../domain/project/eventSummary';
import { screenPlan } from '../../domain/project/screenTotals';
import {
  describeSnapshot,
  newScreenId,
  SNAPSHOT_VERSION,
  type EventSnapshot,
  type ScreenSnapshot,
} from '../../domain/project/snapshot';
import { routingDemand } from '../../domain/routing/demand';
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
import EventBar from './components/EventBar';
import ProcessingPanel from './components/ProcessingPanel';
import ProjectAlerts, { type DangerAlert } from './components/ProjectAlerts';
import ProjectBar from './components/ProjectBar';
import ProjectIdentityPanel from './components/ProjectIdentityPanel';
import RiggingPanel from './components/RiggingPanel';
import RoutingSchematic from './components/RoutingSchematic';
import TotalOutputPanel from './components/TotalOutputPanel';
import { useProjectDraft } from './useProjectDraft';
import { useRoutingPlan, type ResizeNotice } from './useRoutingPlan';

/** How long to wait after the last edit before writing to storage. */
const AUTOSAVE_DELAY_MS = 500;

const cabinetWord = (count: number) => (count === 1 ? 'gabinete' : 'gabinetes');

/** `8x5` reads as a grid, not as a multiplication the technician typed. */
const describeGrid = (signature: string) => signature.replace('x', ' × ');

function resizeNoticeMessage(notice: NonNullable<ResizeNotice>): string {
  if (notice.kind === 'restored') {
    return `Se recuperaron ${notice.count} ${cabinetWord(notice.count)} dibujados a mano de la última vez que esta pantalla tuvo esta medida.`;
  }
  // Naming the grid rather than the field is deliberate: in dimensions mode the
  // technician typed metres, so "go back to what you typed" would be a lie.
  return `La pantalla cambió de medida, así que ${notice.count} ${cabinetWord(
    notice.count,
  )} dibujados a mano ya no existen y se quitaron del ruteo. Volvé la pantalla a ${describeGrid(
    notice.restoreGrid,
  )} gabinetes y el dibujo vuelve.`;
}

/**
 * A well-formed empty screen. The editor's own hooks seed the real defaults on
 * first render and write them straight back, so these values only have to hold
 * the document together before anyone has typed.
 */
function blankScreen(): ScreenSnapshot {
  return {
    id: newScreenId(),
    name: '',
    target: { calcMode: 'dimensions', targetWidthM: 4, targetHeightM: 2.5, cols: 6, rows: 4 },
    cabinet: {
      selectedId: '',
      isCustom: false,
      custom: {
        id: 'custom',
        brand: 'Custom',
        model: 'Cabinet',
        pitch: 3.9,
        width: 500,
        height: 500,
        resX: 128,
        resY: 128,
        maxPower: 150,
        avgPower: 50,
        weight: 8,
      },
    },
    processor: {
      selectedId: '',
      isCustom: false,
      custom: {
        id: 'custom_p',
        brand: 'Custom',
        model: 'Processor',
        dataPorts: 4,
        maxPixelsPerPort: 650000,
      },
    },
    supply: { voltage: 220, pduCapacityAmps: 96, breakerAmps: 16, cableLoopAmps: 16 },
    operating: { brightness: 1, content: 'video' },
    rigging: { mount: 'flown', points: null, pointCapacityKg: null },
    routing: {
      layer: 'data',
      priority: 'vertical',
      start: 'bottom-left',
      mains: 'start-edge',
      mode: 'auto',
      manualData: [[]],
      manualPower: [[]],
    },
  };
}

function blankEvent(): EventSnapshot {
  const screen = blankScreen();
  return {
    version: SNAPSHOT_VERSION,
    savedAt: new Date(0).toISOString(),
    eventName: '',
    mainsCapacityAmps: null,
    screens: [screen],
    activeScreenId: screen.id,
  };
}

/**
 * An event and the screens in it.
 *
 * A show is a main, two laterals and a pair of totems, each a different size on
 * the same feed. The editor works on one screen at a time and remounts when you
 * switch — React's own way to reset twenty fields — while this component keeps
 * the event whole, totals every screen, and is the only thing that can tell you
 * the show as a whole does not fit the building.
 */
export default function CalculatorScreen() {
  const [event, setEvent] = useState<EventSnapshot>(() => loadAutosave() ?? blankEvent());
  /** Bumping this remounts the editor, which reseeds every field. */
  const [generation, setGeneration] = useState(0);
  const [projects, setProjects] = useState<SavedProject[]>(() => listProjects());
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const storageAvailable = browserStore() !== null;

  const active = event.screens.find((s) => s.id === event.activeScreenId) ?? event.screens[0];

  // Every screen, including the one being edited, goes through the same
  // arithmetic. A second path for the active screen is how a total ends up
  // disagreeing with the screen it came from.
  const plans = useMemo(
    () => event.screens.map(screenPlan).filter((p) => p !== null),
    [event.screens],
  );
  const summary = useMemo(
    () =>
      summariseEvent({
        screens: plans.map((p) => p.totals),
        capacityAmps: event.mainsCapacityAmps,
      }),
    [plans, event.mainsCapacityAmps],
  );

  // Serialising gives the effect a stable dependency; the object identity
  // changes on every render, the text only changes when the work does.
  const documentJson = useMemo(
    () =>
      JSON.stringify({
        eventName: event.eventName,
        mainsCapacityAmps: event.mainsCapacityAmps,
        screens: event.screens,
        activeScreenId: event.activeScreenId,
      }),
    [event.eventName, event.mainsCapacityAmps, event.screens, event.activeScreenId],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const stamped: EventSnapshot = {
        version: SNAPSHOT_VERSION,
        savedAt: new Date().toISOString(),
        ...(JSON.parse(documentJson) as Omit<EventSnapshot, 'version' | 'savedAt'>),
      };
      if (saveAutosave(stamped)) setSavedAt(new Date());
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [documentJson]);

  const toSnapshot = (): EventSnapshot => ({ ...event, savedAt: new Date().toISOString() });
  const saveName = describeSnapshot(toSnapshot());
  const isNamed = saveName !== 'Evento sin nombre';

  /** Replaces the screen being edited with whatever the editor now holds. */
  const updateActiveScreen = (screen: ScreenSnapshot) =>
    setEvent((previous) => ({
      ...previous,
      screens: previous.screens.map((s) => (s.id === screen.id ? screen : s)),
    }));

  const openScreen = (id: string) => {
    setEvent((previous) => ({ ...previous, activeScreenId: id }));
    setGeneration((g) => g + 1);
  };

  const addScreen = (from?: ScreenSnapshot) => {
    const screen: ScreenSnapshot = from
      ? { ...structuredClone(from), id: newScreenId(), name: `${from.name || 'Screen'} copy` }
      : blankScreen();
    setEvent((previous) => ({
      ...previous,
      screens: [...previous.screens, screen],
      activeScreenId: screen.id,
    }));
    setGeneration((g) => g + 1);
  };

  const removeActiveScreen = () => {
    if (event.screens.length <= 1) return;
    setEvent((previous) => {
      const remaining = previous.screens.filter((s) => s.id !== previous.activeScreenId);
      return { ...previous, screens: remaining, activeScreenId: remaining[0].id };
    });
    setGeneration((g) => g + 1);
  };

  const openProject = (project: SavedProject) => {
    setEvent(project.snapshot);
    setOpenProjectId(project.id);
    setGeneration((g) => g + 1);
  };

  const handleSave = () => {
    const next = saveProject(saveName, toSnapshot());
    setProjects(next);
    const saved = next.find((p) => p.name === saveName);
    if (saved) setOpenProjectId(saved.id);
  };

  const handleDelete = (id: string) => {
    setProjects(deleteProject(id));
    setOpenProjectId(null);
  };

  // One document for the whole show. A crew builds from one printout, not from
  // five exported one at a time, and the totals only mean anything together.
  const exportReport = async () => {
    if (plans.length === 0) return;
    try {
      const blob = await renderProjectReport({
        eventName: event.eventName,
        screens: plans,
        summary,
      });
      downloadBlob(blob, reportFilename({ eventName: event.eventName }));
      setExportError(null);
    } catch (error) {
      console.error('PDF export failed', error);
      setExportError('No se pudo generar el PDF. Intentá de nuevo.');
    }
  };

  const exportButtonClass =
    'flex items-center justify-center gap-2 min-h-11 bg-[#CCFF00] text-black font-bold uppercase tracking-wider ' +
    `rounded-sm transition-colors hover:bg-[#aacc00] disabled:opacity-40 disabled:cursor-not-allowed ${buttonFocusClass}`;

  // The show as a whole overrunning the venue feed is a hazard no single screen
  // can see: each one passes its own PDU and the sum still trips the building.
  const eventDanger: DangerAlert | null = summary.overCapacity
    ? {
        headline: 'El evento se pasa de la acometida',
        detail: `Las ${summary.screens.length} pantallas consumen ${summary.totalMaxAmps.toFixed(1)} A entre todas y la acometida declarada es de ${summary.capacityAmps} A. Cada pantalla puede entrar en su propia alimentación y aun así el show no entrar en el edificio.`,
      }
    : null;

  return (
    <div className="animate-in fade-in duration-300">
      <ProjectBar
        projects={projects}
        openProjectId={openProjectId}
        saveName={isNamed ? saveName : ''}
        savedAt={savedAt}
        storageAvailable={storageAvailable}
        onOpen={(id) => {
          const project = projects.find((p) => p.id === id);
          if (project) openProject(project);
        }}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <div className="p-4 bg-[#111] border-b border-[#333] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold tracking-widest uppercase text-white">
            Plan del evento
          </h2>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Un PDF con el resumen, las {plans.length}{' '}
            {plans.length === 1 ? 'pantalla' : 'pantallas'} y sus esquemáticos
          </p>
        </div>
        <button
          type="button"
          onClick={() => void exportReport()}
          disabled={plans.length === 0}
          className={`${exportButtonClass} px-4 py-3 sm:py-2 text-[11px] w-full sm:w-auto`}
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Descargar PDF del evento
        </button>
      </div>

      <EventBar
        eventName={event.eventName}
        onEventNameChange={(eventName) => setEvent((p) => ({ ...p, eventName }))}
        mainsCapacityAmps={event.mainsCapacityAmps}
        onMainsCapacityChange={(mainsCapacityAmps) =>
          setEvent((p) => ({ ...p, mainsCapacityAmps }))
        }
        screens={event.screens}
        activeScreenId={active.id}
        summary={summary}
        onSelectScreen={openScreen}
        onAddScreen={() => addScreen()}
        onDuplicateScreen={() => addScreen(active)}
        onDeleteScreen={removeActiveScreen}
      />

      <ScreenEditor
        key={`${generation}-${active.id}`}
        initial={active}
        eventDanger={eventDanger}
        exportError={exportError}
        onScreenChange={updateActiveScreen}
      />
    </div>
  );
}

interface ScreenEditorProps {
  initial: ScreenSnapshot;
  eventDanger: DangerAlert | null;
  exportError: string | null;
  onScreenChange: (screen: ScreenSnapshot) => void;
}

function ScreenEditor({ initial, eventDanger, exportError, onScreenChange }: ScreenEditorProps) {
  const draft = useProjectDraft(initial);
  const plan = useRoutingPlan(draft.results, initial);
  const { results, issues } = draft;

  // What the plan actually costs. This used to be the cabinet count divided by
  // the loop capacity, computed beside the routing instead of from it, so the
  // report printed three main data cables over a schematic that drew four.
  // Guarded on `results`: with a half-typed processor there is no valid port
  // count to divide by, and the panels show nothing at that point anyway.
  const demand = results
    ? routingDemand({
        dataRuns: plan.routesFor('data'),
        powerRuns: plan.routesFor('power'),
        dataPortsPerProcessor: draft.processorChoice.processor.dataPorts,
      })
    : { dataCables: 0, powerCables: 0, processorsNeeded: 0 };

  const screenJson = useMemo(
    () => JSON.stringify({ id: initial.id, ...draft.snapshotSlice, routing: plan.snapshotSlice }),
    [initial.id, draft.snapshotSlice, plan.snapshotSlice],
  );

  useEffect(() => {
    onScreenChange(JSON.parse(screenJson) as ScreenSnapshot);
    // `onScreenChange` is a fresh closure on every parent render, so depending
    // on it would write the screen back on every keystroke anywhere in the app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenJson]);

  // The hazard this screen can see on its own: more current than its supply.
  const danger: DangerAlert | null =
    results && results.maxAmps > draft.supply.pduCapacityAmps
      ? {
          headline: 'Se pasa de la alimentación',
          detail: `Esta pantalla consume ${results.maxAmps.toFixed(1)} A a ${draft.supply.voltage} V y la alimentación entrega ${draft.supply.pduCapacityAmps} A. Hay que achicar la pantalla, repartirla entre varias fuentes o conseguir una acometida mayor.`,
        }
      : null;

  return (
    <div>
      <ProjectAlerts
        dangers={[eventDanger, danger].filter((d) => d !== null)}
        issues={issues}
        exportError={exportError}
        notice={
          plan.resizeNotice
            ? {
                message: resizeNoticeMessage(plan.resizeNotice),
                onDismiss: plan.dismissResizeNotice,
              }
            : null
        }
      />

      <ProjectIdentityPanel {...draft.identity} />

      <section className="grid grid-cols-1 xl:grid-cols-2 border-b border-[#333]">
        <div className="border-b xl:border-b-0 xl:border-r border-[#333] flex flex-col">
          <CabinetPanel choice={draft.cabinetChoice} target={draft.target} />
          <TotalOutputPanel results={results} />
        </div>

        <div className="grid grid-rows-[auto_1fr]">
          <ProcessingPanel choice={draft.processorChoice} results={results} demand={demand} />
          <ElectricalPanel
            supply={draft.supply}
            results={results}
            demand={demand}
            operating={draft.operating}
          />
          <RiggingPanel
            rigging={draft.rigging}
            cabinet={draft.cabinetChoice.cabinet}
            results={results}
          />
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
