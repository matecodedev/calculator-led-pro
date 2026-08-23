import { beforeEach, describe, expect, it } from 'vitest';
import { SNAPSHOT_VERSION, type EventSnapshot } from '../../domain/project/snapshot';
import {
  AUTOSAVE_KEY,
  LIBRARY_KEY,
  deleteProject,
  listProjects,
  loadAutosave,
  saveAutosave,
  saveProject,
  type KeyValueStore,
} from './projectStore';

function fakeStore(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

/** Storage that is out of room — the quota error real browsers throw. */
const fullStore = (): KeyValueStore => ({
  getItem: () => null,
  setItem: () => {
    throw new DOMException('exceeded the quota', 'QuotaExceededError');
  },
  removeItem: () => {},
});

const screen = {
  id: 'screen-main',
  name: 'Main Stage',
  target: { calcMode: 'dimensions', targetWidthM: 4, targetHeightM: 2.5, cols: 6, rows: 4 },
  cabinet: {
    selectedId: 'a_nt29',
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
    selectedId: 'p1',
    isCustom: false,
    custom: {
      id: 'custom_p',
      brand: 'Custom',
      model: 'Processor',
      dataPorts: 4,
      maxPixelsPerPort: 650_000,
    },
  },
  supply: { voltage: 220, pduCapacityAmps: 96, breakerAmps: 16, cableLoopAmps: 16 },
  operating: { brightness: 1, content: 'video' },
  rigging: { mount: 'flown', points: null, pointCapacityKg: null },
  install: { trimHeightM: 0, distanceToSourceM: null },
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

const snapshot: EventSnapshot = {
  version: SNAPSHOT_VERSION,
  savedAt: '2026-08-17T20:00:00.000Z',
  eventName: 'Lollapalooza 2026',
  mainsCapacityAmps: 96,
  screens: [screen],
  activeScreenId: screen.id,
} as EventSnapshot;

const named = (name: string, eventName: string): EventSnapshot =>
  ({
    ...snapshot,
    eventName,
    screens: [{ ...screen, name }],
  }) as EventSnapshot;

describe('autosave', () => {
  let store: ReturnType<typeof fakeStore>;
  beforeEach(() => {
    store = fakeStore();
  });

  it('restores the work that was in progress', () => {
    saveAutosave(snapshot, store);

    expect(loadAutosave(store)).toEqual(snapshot);
  });

  it('reports nothing on a first visit', () => {
    expect(loadAutosave(store)).toBeNull();
  });

  it('ignores a corrupt autosave rather than failing to start', () => {
    expect(loadAutosave(fakeStore({ [AUTOSAVE_KEY]: '{not json' }))).toBeNull();
  });

  it('ignores an autosave from an older schema', () => {
    const stale = JSON.stringify({ ...snapshot, version: 0 });

    expect(loadAutosave(fakeStore({ [AUTOSAVE_KEY]: stale }))).toBeNull();
  });

  it('survives storage being unavailable', () => {
    expect(loadAutosave(null)).toBeNull();
    expect(saveAutosave(snapshot, null)).toBe(false);
  });

  it('reports a failed write instead of pretending it saved', () => {
    expect(saveAutosave(snapshot, fullStore())).toBe(false);
  });
});

describe('the project library', () => {
  let store: ReturnType<typeof fakeStore>;
  beforeEach(() => {
    store = fakeStore();
  });

  it('starts empty', () => {
    expect(listProjects(store)).toEqual([]);
  });

  it('keeps several screens from the same event', () => {
    saveProject('Main Stage', named('Main Stage', 'Lolla'), store);
    saveProject('DJ Booth', named('DJ Booth', 'Lolla'), store);

    expect(listProjects(store).map((p) => p.name)).toEqual(['Main Stage', 'DJ Booth']);
  });

  it('updates a screen saved again under the same name', () => {
    saveProject('Main Stage', named('Main Stage', 'Lolla'), store);
    const after = saveProject('Main Stage', named('Main Stage', 'Cosquin'), store);

    expect(after).toHaveLength(1);
    expect(after[0].snapshot.eventName).toBe('Cosquin');
  });

  it('keeps the id stable when a screen is updated', () => {
    const [first] = saveProject('Main Stage', snapshot, store);
    const [updated] = saveProject('Main Stage', named('Main Stage', 'Cosquin'), store);

    expect(updated.id).toBe(first.id);
  });

  it('gives different screens different ids', () => {
    saveProject('Main Stage', snapshot, store);
    const all = saveProject('DJ Booth', snapshot, store);

    expect(all[0].id).not.toBe(all[1].id);
  });

  it('ignores a blank name', () => {
    expect(saveProject('   ', snapshot, store)).toEqual([]);
  });

  it('trims the name it saves under', () => {
    expect(saveProject('  Main Stage  ', snapshot, store)[0].name).toBe('Main Stage');
  });

  it('deletes one screen and leaves the rest', () => {
    saveProject('Main Stage', snapshot, store);
    const [, booth] = saveProject('DJ Booth', snapshot, store);

    expect(deleteProject(booth.id, store).map((p) => p.name)).toEqual(['Main Stage']);
  });

  it('drops only the corrupt entry, not the whole library', () => {
    const library = JSON.stringify([
      { id: 'a', name: 'Good', snapshot },
      { id: 'b', name: 'Broken', snapshot: { version: 3, eventName: 'x', screens: 'nope' } },
      { id: 'c', name: 'Also good', snapshot },
    ]);

    expect(listProjects(fakeStore({ [LIBRARY_KEY]: library })).map((p) => p.name)).toEqual([
      'Good',
      'Also good',
    ]);
  });

  it('treats a library that is not an array as empty', () => {
    expect(listProjects(fakeStore({ [LIBRARY_KEY]: '"a string"' }))).toEqual([]);
  });

  it('leaves the library untouched when the write fails', () => {
    expect(saveProject('Main Stage', snapshot, fullStore())).toEqual([]);
  });
});
