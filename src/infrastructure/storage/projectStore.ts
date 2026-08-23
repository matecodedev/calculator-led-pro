/**
 * Persistence for saved screens.
 *
 * Storage is the least trustworthy input the app has: it survives upgrades, it
 * can be full, it can be disabled outright in private mode, and another tab can
 * write to it. Every read is validated and every write is allowed to fail — a
 * storage problem must never take the calculator down with it.
 */

import { parseSnapshot, type EventSnapshot } from '../../domain/project/snapshot';

export const AUTOSAVE_KEY = 'calculator-led-pro.autosave';
export const LIBRARY_KEY = 'calculator-led-pro.projects';

/** The slice of the Storage API this module needs, so tests can supply their own. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SavedProject {
  id: string;
  name: string;
  snapshot: EventSnapshot;
}

/** localStorage, or null where it is unavailable (private mode, embedded views). */
export function browserStore(): KeyValueStore | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readJson(store: KeyValueStore | null, key: string): unknown {
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    // Unreadable or not JSON: treat it as absent rather than crashing.
    return null;
  }
}

/** Returns false when the write failed — a full quota, or storage disabled. */
function writeJson(store: KeyValueStore | null, key: string, value: unknown): boolean {
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadAutosave(store: KeyValueStore | null = browserStore()): EventSnapshot | null {
  return parseSnapshot(readJson(store, AUTOSAVE_KEY));
}

export function saveAutosave(
  snapshot: EventSnapshot,
  store: KeyValueStore | null = browserStore(),
): boolean {
  return writeJson(store, AUTOSAVE_KEY, snapshot);
}

export function listProjects(store: KeyValueStore | null = browserStore()): SavedProject[] {
  const raw = readJson(store, LIBRARY_KEY);
  if (!Array.isArray(raw)) return [];

  const projects: SavedProject[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { id, name, snapshot } = entry as Record<string, unknown>;
    if (typeof id !== 'string' || typeof name !== 'string') continue;

    // One corrupt entry loses that project, not the whole library.
    const parsed = parseSnapshot(snapshot);
    if (parsed) projects.push({ id, name, snapshot: parsed });
  }
  return projects;
}

/**
 * Saves under `name`, replacing any project already using it — saving the same
 * screen twice should update it, not leave two entries a technician has to tell
 * apart mid-show.
 */
export function saveProject(
  name: string,
  snapshot: EventSnapshot,
  store: KeyValueStore | null = browserStore(),
): SavedProject[] {
  const trimmed = name.trim();
  if (!trimmed) return listProjects(store);

  const existing = listProjects(store);
  const previous = existing.find((p) => p.name === trimmed);
  const saved: SavedProject = {
    id: previous?.id ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed,
    snapshot,
  };

  const next = previous
    ? existing.map((p) => (p.id === previous.id ? saved : p))
    : [...existing, saved];

  return writeJson(store, LIBRARY_KEY, next) ? next : existing;
}

export function deleteProject(
  id: string,
  store: KeyValueStore | null = browserStore(),
): SavedProject[] {
  const existing = listProjects(store);
  const next = existing.filter((p) => p.id !== id);

  return writeJson(store, LIBRARY_KEY, next) ? next : existing;
}
