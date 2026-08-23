import { describe, expect, it } from 'vitest';
import {
  describeSnapshot,
  LEGACY_LINE_VOLTAGE,
  parseSnapshot,
  SNAPSHOT_VERSION,
  type ProjectSnapshot,
} from './snapshot';

const snapshot: ProjectSnapshot = {
  version: 2,
  savedAt: '2026-08-17T20:00:00.000Z',
  identity: { eventName: 'Lollapalooza 2026', screenName: 'Main Stage' },
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

/** What actually goes to storage and comes back. */
const roundTrip = (value: unknown) => parseSnapshot(JSON.parse(JSON.stringify(value)));

describe('parseSnapshot', () => {
  it('survives a JSON round trip unchanged', () => {
    expect(roundTrip(snapshot)).toEqual(snapshot);
  });

  it('keeps hand-drawn routes cell for cell', () => {
    const parsed = roundTrip(snapshot);

    expect(parsed?.routing.manualData).toEqual([
      [
        { x: 0, y: 3 },
        { x: 0, y: 2 },
      ],
      [{ x: 1, y: 0 }],
    ]);
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
    ['identity', { identity: { eventName: 'x' } }],
    ['target mode', { target: { ...snapshot.target, calcMode: 'sideways' } }],
    ['target numbers', { target: { ...snapshot.target, cols: 'six' } }],
    ['supply', { supply: { ...snapshot.supply, breakerAmps: null } }],
    ['starting corner', { routing: { ...snapshot.routing, start: 'middle' } }],
    ['routing mode', { routing: { ...snapshot.routing, mode: 'psychic' } }],
    ['cable layer', { routing: { ...snapshot.routing, layer: 'audio' } }],
    ['manual routes', { routing: { ...snapshot.routing, manualData: [[{ x: 0 }]] } }],
    ['custom cabinet', { cabinet: { ...snapshot.cabinet, custom: { id: 'custom' } } }],
    ['custom processor', { processor: { ...snapshot.processor, custom: null } }],
  ])('rejects a snapshot with a broken %s', (_label, patch) => {
    expect(roundTrip({ ...snapshot, ...patch })).toBeNull();
  });

  it('migrates a version 1 snapshot, which predates the mains-voltage field', () => {
    // Everything saved before the voltage selector existed was implicitly 220 V,
    // because that is what the app hardcoded. Assuming anything else would
    // silently restate someone's electrical plan.
    const { supply, ...rest } = snapshot;
    const { voltage: _dropped, ...supplyWithoutVoltage } = supply;
    const v1 = { ...rest, version: 1, supply: supplyWithoutVoltage };

    const migrated = roundTrip(v1);

    expect(migrated?.version).toBe(SNAPSHOT_VERSION);
    expect(migrated?.supply.voltage).toBe(LEGACY_LINE_VOLTAGE);
    expect(migrated?.supply.pduCapacityAmps).toBe(96);
    expect(migrated?.routing.manualData).toEqual(snapshot.routing.manualData);
  });

  it('defaults a snapshot saved before mains were a choice', () => {
    // Unlike the voltage migration, this one does NOT preserve the old
    // behaviour. A run beginning halfway up the screen was a defect in how the
    // snake was sliced, not a plan anyone drew, and auto routing is derived, so
    // nothing hand-drawn moves underneath the technician.
    const { routing, ...rest } = snapshot;
    const { mains: _dropped, ...routingWithoutMains } = routing;

    expect(roundTrip({ ...rest, routing: routingWithoutMains })?.routing.mains).toBe('start-edge');
  });

  it('rejects a snapshot whose mains policy is not one we know', () => {
    expect(
      roundTrip({ ...snapshot, routing: { ...snapshot.routing, mains: 'sideways' } })?.routing
        .mains,
    ).toBe('start-edge');
  });

  it('rejects a version 1 snapshot that is broken in some other way', () => {
    const { supply, ...rest } = snapshot;
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

  it('rejects a snapshot with a non-numeric voltage', () => {
    expect(roundTrip({ ...snapshot, supply: { ...snapshot.supply, voltage: 'mains' } })).toBeNull();
  });

  it('tolerates a missing timestamp rather than discarding the work', () => {
    const { savedAt: _dropped, ...withoutTimestamp } = snapshot;

    expect(roundTrip(withoutTimestamp)?.identity.eventName).toBe('Lollapalooza 2026');
  });

  it('drops unknown extra keys instead of carrying them forward', () => {
    const parsed = roundTrip({ ...snapshot, somethingNew: 'from a later version' });

    expect(parsed).not.toBeNull();
    expect(parsed).not.toHaveProperty('somethingNew');
  });
});

describe('describeSnapshot', () => {
  it('joins the event and the screen', () => {
    expect(describeSnapshot(snapshot)).toBe('Lollapalooza 2026 — Main Stage');
  });

  it('falls back to whichever one is filled in', () => {
    expect(
      describeSnapshot({ ...snapshot, identity: { eventName: '', screenName: 'DJ Booth' } }),
    ).toBe('DJ Booth');
  });

  it('names an unnamed screen', () => {
    expect(describeSnapshot({ ...snapshot, identity: { eventName: '', screenName: '' } })).toBe(
      'Untitled screen',
    );
  });
});
