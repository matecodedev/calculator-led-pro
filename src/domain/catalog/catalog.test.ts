import { describe, expect, it } from 'vitest';

import { cabinets, processors } from './catalog';

/**
 * Figures somebody checked against a datasheet, pinned so a later edit cannot
 * quietly undo the checking. The catalog arrived with this app carrying no
 * provenance at all; every entry that earns a `spec` earns a test with it.
 */
describe('verified catalog entries', () => {
  it('has the Absen NT2.9 Indoor as its datasheet publishes it', () => {
    const absen = cabinets.find((c) => c.id === 'a_nt29');

    // 498 W/m² peak and 166 W/m² average over the 0.25 m² of a 500 × 500 panel.
    expect(absen).toMatchObject({
      brand: 'Absen',
      model: 'NT2.9 Indoor',
      pitch: 2.97,
      width: 500,
      height: 500,
      resX: 168,
      resY: 168,
      maxPower: 125,
      avgPower: 42,
      weight: 7.5,
    });
    expect(absen?.spec?.source).toMatch(/Absen/);
  });

  it.each([
    ['p1', 'VX1000', 10, 6_500_000],
    ['p2', 'VX600', 6, 3_900_000],
    ['p4', 'MCTRL4K', 16, 8_800_000],
    ['p6', 'MX40 Pro', 20, 8_800_000],
  ])('has %s (%s) at its published capacity', (id, model, ports, total) => {
    expect(processors.find((p) => p.id === id)).toMatchObject({
      model,
      dataPorts: ports,
      maxPixelsTotal: total,
    });
  });

  it('never lets a controller claim its ports multiplied by a port', () => {
    // The trap this pinning exists for: sixteen gigabit ports are 10.4 M
    // pixels between them and an MCTRL4K drives 8.8 M.
    const mctrl4k = processors.find((p) => p.id === 'p4');

    expect(mctrl4k!.maxPixelsTotal).toBeLessThan(mctrl4k!.dataPorts * mctrl4k!.maxPixelsPerPort);
  });

  it('marks an entry as checked only when it records where and when', () => {
    for (const entry of [...cabinets, ...processors]) {
      if (!entry.spec) continue;
      expect(entry.spec.source.length).toBeGreaterThan(3);
      expect(entry.spec.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
