import { describe, expect, it } from 'vitest';
import {
  describeSnapshot,
  LEGACY_LINE_VOLTAGE,
  newScreenId,
  parseSnapshot,
  SNAPSHOT_VERSION,
  type EventSnapshot,
  type ScreenSnapshot,
} from './snapshot';

/** The fields a screen carries, without the identity a version decides. */
const screenBody: Omit<ScreenSnapshot, 'id' | 'name'> = {
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
  supply: { voltage: 230, pduCapacityAmps: 96, breakerAmps: 16, cableLoopAmps: 16 },
  operating: { brightness: 1, content: 'video' },
  rigging: { mount: 'flown', points: null, pointCapacityKg: null },
  install: { trimHeightM: 0, distanceToSourceM: null },
  routing: {
    layer: 'data',
    priority: 'vertical',
    start: 'bottom-left',
    mains: 'start-edge',
    mode: 'manual',
    manualData: [
      [
        { x: 0, y: 3 },
        { x: 0, y: 2 },
      ],
      [{ x: 1, y: 0 }],
    ],
    manualPower: [[]],
  },
};

const screen: ScreenSnapshot = { id: 'screen-main', name: 'Main Stage', ...screenBody };

const snapshot: EventSnapshot = {
  version: SNAPSHOT_VERSION,
  savedAt: '2026-08-17T20:00:00.000Z',
  eventName: 'Lollapalooza 2026',
  mainsCapacityAmps: 96,
  screens: [screen],
  activeScreenId: 'screen-main',
};

/** The version 2 document: one screen at the top level, event name inside it. */
const legacy = {
  version: 2,
  savedAt: '2026-08-17T20:00:00.000Z',
  identity: { eventName: 'Lollapalooza 2026', screenName: 'Main Stage' },
  ...screenBody,
};

/** What actually goes to storage and comes back. */
const roundTrip = (value: unknown) => parseSnapshot(JSON.parse(JSON.stringify(value)));

describe('parseSnapshot', () => {
  it('survives a JSON round trip unchanged', () => {
    expect(roundTrip(snapshot)).toEqual(snapshot);
  });

  it('keeps hand-drawn routes cell for cell', () => {
    expect(roundTrip(snapshot)?.screens[0].routing.manualData).toEqual([
      [
        { x: 0, y: 3 },
        { x: 0, y: 2 },
      ],
      [{ x: 1, y: 0 }],
    ]);
  });

  it('reads an event of several screens', () => {
    const parsed = roundTrip({
      ...snapshot,
      screens: [
        screen,
        { ...screen, id: 'screen-lateral', name: 'Lateral L' },
        { ...screen, id: 'screen-totem', name: 'Totem 1' },
      ],
      activeScreenId: 'screen-totem',
    });

    expect(parsed?.screens.map((s) => s.name)).toEqual(['Main Stage', 'Lateral L', 'Totem 1']);
    expect(parsed?.activeScreenId).toBe('screen-totem');
  });

  it('rejects two screens sharing an id', () => {
    // The switcher and the report both address screens by id; a duplicate makes
    // "this screen" ambiguous, which is not something to guess about.
    expect(
      roundTrip({ ...snapshot, screens: [screen, { ...screen, name: 'Lateral L' }] }),
    ).toBeNull();
  });

  it('rejects an event with no screens at all', () => {
    expect(roundTrip({ ...snapshot, screens: [] })).toBeNull();
  });

  it('falls back to the first screen when the active one is gone', () => {
    expect(roundTrip({ ...snapshot, activeScreenId: 'deleted' })?.activeScreenId).toBe(
      'screen-main',
    );
  });

  it('reads an event whose venue feed was never declared', () => {
    const parsed = roundTrip({ ...snapshot, mainsCapacityAmps: null });

    expect(parsed).not.toBeNull();
    expect(parsed?.mainsCapacityAmps).toBeNull();
  });

  it('rejects a venue feed that is not a number', () => {
    expect(roundTrip({ ...snapshot, mainsCapacityAmps: 'plenty' })).toBeNull();
  });

  it.each([
    ['null', null],
    ['a string', 'not a project'],
    ['an array', []],
    ['an empty object', {}],
  ])('rejects %s', (_label, value) => {
    expect(parseSnapshot(value)).toBeNull();
  });

  it('rejects a snapshot from an unknown future version', () => {
    expect(roundTrip({ ...snapshot, version: 99 })).toBeNull();
  });

  it.each([
    ['target mode', { target: { ...screenBody.target, calcMode: 'sideways' } }],
    ['target numbers', { target: { ...screenBody.target, cols: 'six' } }],
    ['supply', { supply: { ...screenBody.supply, breakerAmps: null } }],
    ['starting corner', { routing: { ...screenBody.routing, start: 'middle' } }],
    ['routing mode', { routing: { ...screenBody.routing, mode: 'psychic' } }],
    ['cable layer', { routing: { ...screenBody.routing, layer: 'audio' } }],
    ['manual routes', { routing: { ...screenBody.routing, manualData: [[{ x: 0 }]] } }],
    ['custom cabinet', { cabinet: { ...screenBody.cabinet, custom: { id: 'custom' } } }],
    ['custom processor', { processor: { ...screenBody.processor, custom: null } }],
  ])('rejects an event whose screen has a broken %s', (_label, patch) => {
    expect(roundTrip({ ...snapshot, screens: [{ ...screen, ...patch }] })).toBeNull();
  });

  it('migrates a version 2 document into an event of one screen', () => {
    const migrated = roundTrip(legacy);

    expect(migrated?.version).toBe(SNAPSHOT_VERSION);
    expect(migrated?.eventName).toBe('Lollapalooza 2026');
    expect(migrated?.screens).toHaveLength(1);
    expect(migrated?.screens[0].name).toBe('Main Stage');
    expect(migrated?.activeScreenId).toBe(migrated?.screens[0].id);
    expect(migrated?.screens[0].routing.manualData).toEqual(screenBody.routing.manualData);
  });

  it('leaves the venue feed undeclared when migrating', () => {
    // Nobody declared one before the field existed, and inventing a capacity
    // would put a number nobody chose into an electrical plan.
    expect(roundTrip(legacy)?.mainsCapacityAmps).toBeNull();
  });

  it('migrates a version 1 snapshot, which predates the mains-voltage field', () => {
    // Everything saved before the voltage selector existed was implicitly 220 V,
    // because that is what the app hardcoded. Assuming anything else would
    // silently restate someone's electrical plan.
    const { supply, ...rest } = legacy;
    const { voltage: _dropped, ...supplyWithoutVoltage } = supply;

    const migrated = roundTrip({ ...rest, version: 1, supply: supplyWithoutVoltage });

    expect(migrated?.version).toBe(SNAPSHOT_VERSION);
    expect(migrated?.screens[0].supply.voltage).toBe(LEGACY_LINE_VOLTAGE);
    expect(migrated?.screens[0].supply.pduCapacityAmps).toBe(96);
  });

  it('defaults a screen saved before mains were a choice', () => {
    // Unlike the voltage migration, this one does NOT preserve the old
    // behaviour. A run beginning halfway up the screen was a defect in how the
    // snake was sliced, not a plan anyone drew, and auto routing is derived, so
    // nothing hand-drawn moves underneath the technician.
    const { mains: _dropped, ...routingWithoutMains } = screenBody.routing;
    const parsed = roundTrip({
      ...snapshot,
      screens: [{ ...screen, routing: routingWithoutMains }],
    });

    expect(parsed?.screens[0].routing.mains).toBe('start-edge');
  });

  it('falls back when the mains policy is not one we know', () => {
    const parsed = roundTrip({
      ...snapshot,
      screens: [{ ...screen, routing: { ...screenBody.routing, mains: 'sideways' } }],
    });

    expect(parsed?.screens[0].routing.mains).toBe('start-edge');
  });

  it('rejects a version 1 snapshot that is broken in some other way', () => {
    const { supply, ...rest } = legacy;
    const { voltage: _dropped, ...supplyWithoutVoltage } = supply;

    expect(
      roundTrip({
        ...rest,
        version: 1,
        supply: supplyWithoutVoltage,
        identity: { eventName: 'x' },
      }),
    ).toBeNull();
  });

  it('rejects a screen with a non-numeric voltage', () => {
    expect(
      roundTrip({
        ...snapshot,
        screens: [{ ...screen, supply: { ...screenBody.supply, voltage: 'mains' } }],
      }),
    ).toBeNull();
  });

  it('tolerates a missing timestamp rather than discarding the work', () => {
    const { savedAt: _dropped, ...withoutTimestamp } = snapshot;

    expect(roundTrip(withoutTimestamp)?.eventName).toBe('Lollapalooza 2026');
  });

  it('names a screen that arrived without one', () => {
    const { name: _dropped, ...unnamed } = screen;

    expect(roundTrip({ ...snapshot, screens: [unnamed] })?.screens[0].name).toBe('Screen 1');
  });

  it('drops unknown extra keys instead of carrying them forward', () => {
    const parsed = roundTrip({ ...snapshot, somethingNew: 'from a later version' });

    expect(parsed).not.toBeNull();
    expect(parsed).not.toHaveProperty('somethingNew');
  });
});

describe('newScreenId', () => {
  it('does not hand out the same id twice', () => {
    const ids = new Set(Array.from({ length: 200 }, newScreenId));

    expect(ids.size).toBe(200);
  });
});

describe('describeSnapshot', () => {
  it('uses the event name', () => {
    expect(describeSnapshot(snapshot)).toBe('Lollapalooza 2026');
  });

  it('falls back to the first named screen when the event is unnamed', () => {
    expect(describeSnapshot({ ...snapshot, eventName: '' })).toBe('Main Stage');
  });

  it('has something to call an event with nothing named at all', () => {
    expect(
      describeSnapshot({ ...snapshot, eventName: '', screens: [{ ...screen, name: '' }] }),
    ).toBe('Evento sin nombre');
  });
});
