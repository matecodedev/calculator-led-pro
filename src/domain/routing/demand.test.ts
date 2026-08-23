import { describe, expect, it } from 'vitest';

import { routingDemand } from './demand';
import { planRoutes, type GridPosition } from './serpentine';

/** `runs(3, 2)` is two runs of three cabinets; the coordinates do not matter. */
const runs = (length: number, count: number): GridPosition[][] =>
  Array.from({ length: count }, (_, r) => Array.from({ length }, (_, i) => ({ x: i, y: r })));

describe('routingDemand', () => {
  it('counts the cables the plan actually draws', () => {
    const demand = routingDemand({
      dataRuns: runs(18, 4),
      powerRuns: runs(12, 5),
      dataPortsPerProcessor: 4,
      totalPixels: 1_000_000,
      maxPixelsPerProcessor: 8_800_000,
      resX: 100,
      resY: 100,
      maxCanvasWidth: 10_240,
      maxCanvasHeight: 8_192,
    });

    expect(demand.dataCables).toBe(4);
    expect(demand.powerCables).toBe(5);
  });

  it('reports the shortfall the old arithmetic hid', () => {
    // The Amcham report: a 10x6 screen, 23 cabinets per data loop and 17 per
    // power cable. Dividing says 3 and 4. The drawing needs 4 and 5, because a
    // run takes whole columns so its main can reach the floor.
    const grid = { cols: 10, rows: 6, priority: 'vertical', start: 'bottom-left' } as const;
    const demand = routingDemand({
      dataRuns: planRoutes({ ...grid, capacity: 23 }),
      powerRuns: planRoutes({ ...grid, capacity: 17 }),
      dataPortsPerProcessor: 4,
      totalPixels: 1_000_000,
      maxPixelsPerProcessor: 8_800_000,
      resX: 100,
      resY: 100,
      maxCanvasWidth: 10_240,
      maxCanvasHeight: 8_192,
    });

    expect(Math.ceil(60 / 23)).toBe(3);
    expect(Math.ceil(60 / 17)).toBe(4);
    expect(demand.dataCables).toBe(4);
    expect(demand.powerCables).toBe(5);
  });

  it('needs a second processor when the screen outgrows one box, not its ports', () => {
    // An MCTRL4K has sixteen ports and carries 8.8 M pixels. Sixteen times the
    // 650 k a port moves is 10.4 M, so counting ports alone says one box is
    // enough for a screen it cannot drive.
    const demand = routingDemand({
      dataRuns: runs(9, 4),
      powerRuns: [],
      dataPortsPerProcessor: 16,
      totalPixels: 10_000_000,
      maxPixelsPerProcessor: 8_800_000,
      resX: 100,
      resY: 100,
      maxCanvasWidth: 10_240,
      maxCanvasHeight: 8_192,
    });

    expect(demand.processorsNeeded).toBe(2);
  });

  it('takes whichever limit bites first', () => {
    const byPorts = routingDemand({
      dataRuns: runs(9, 12),
      powerRuns: [],
      dataPortsPerProcessor: 6,
      totalPixels: 1_000_000,
      maxPixelsPerProcessor: 8_800_000,
      resX: 100,
      resY: 100,
      maxCanvasWidth: 10_240,
      maxCanvasHeight: 8_192,
    });

    expect(byPorts.processorsNeeded).toBe(2);
  });

  it('needs one controller per canvas tile when the screen outgrows the canvas', () => {
    // A VX1000 drives a canvas 10,240 px wide. A wider screen has to be split
    // across controllers however few pixels it has, because no single box can
    // address that width.
    const demand = routingDemand({
      dataRuns: runs(9, 2),
      powerRuns: [],
      dataPortsPerProcessor: 10,
      totalPixels: 1_000_000,
      maxPixelsPerProcessor: 6_500_000,
      resX: 12_000,
      resY: 400,
      maxCanvasWidth: 10_240,
      maxCanvasHeight: 8_192,
    });

    expect(demand.processorsNeeded).toBe(2);
    expect(demand.processorLimit).toBe('canvas');
  });

  it('tiles in both directions', () => {
    const demand = routingDemand({
      dataRuns: runs(9, 2),
      powerRuns: [],
      dataPortsPerProcessor: 10,
      totalPixels: 1_000_000,
      maxPixelsPerProcessor: 6_500_000,
      resX: 12_000,
      resY: 9_000,
      maxCanvasWidth: 10_240,
      maxCanvasHeight: 8_192,
    });

    expect(demand.processorsNeeded).toBe(4);
  });

  it('names no ceiling when one controller is enough', () => {
    // A 15 x 3 m screen of Absen NT2.9: 5,080,320 pixels of the 6.5 M a VX1000
    // carries, ten cables into its ten ports, well inside the canvas. Nothing
    // is exceeded, so nothing may be reported as exceeded — the panel was
    // printing "excede los píxeles que mueve un equipo" over a plan that fits.
    const demand = routingDemand({
      dataRuns: runs(23, 10),
      powerRuns: [],
      dataPortsPerProcessor: 10,
      totalPixels: 5_080_320,
      maxPixelsPerProcessor: 6_500_000,
      resX: 5_040,
      resY: 1_008,
      maxCanvasWidth: 10_240,
      maxCanvasHeight: 8_192,
    });

    expect(demand.processorsNeeded).toBe(1);
    expect(demand.processorLimit).toBeNull();
  });

  it('names which ceiling bit, because the fix is different for each', () => {
    const base = {
      powerRuns: [],
      resX: 100,
      resY: 100,
      maxCanvasWidth: 10_240,
      maxCanvasHeight: 8_192,
    };

    expect(
      routingDemand({
        ...base,
        dataRuns: runs(9, 20),
        dataPortsPerProcessor: 10,
        totalPixels: 1_000,
        maxPixelsPerProcessor: 6_500_000,
      }).processorLimit,
    ).toBe('ports');

    expect(
      routingDemand({
        ...base,
        dataRuns: runs(9, 2),
        dataPortsPerProcessor: 10,
        totalPixels: 9_000_000,
        maxPixelsPerProcessor: 6_500_000,
      }).processorLimit,
    ).toBe('pixels');
  });

  it('sizes the processor count from the cables that exist, not the theoretical minimum', () => {
    // Four data runs on a four-port box is one processor; a fifth needs a second.
    expect(
      routingDemand({
        dataRuns: runs(9, 4),
        powerRuns: [],
        dataPortsPerProcessor: 4,
        totalPixels: 1_000,
        maxPixelsPerProcessor: 8_800_000,
        resX: 100,
        resY: 100,
        maxCanvasWidth: 10_240,
        maxCanvasHeight: 8_192,
      }),
    ).toHaveProperty('processorsNeeded', 1);
    expect(
      routingDemand({
        dataRuns: runs(9, 5),
        powerRuns: [],
        dataPortsPerProcessor: 4,
        totalPixels: 1_000,
        maxPixelsPerProcessor: 8_800_000,
        resX: 100,
        resY: 100,
        maxCanvasWidth: 10_240,
        maxCanvasHeight: 8_192,
      }),
    ).toHaveProperty('processorsNeeded', 2);
  });

  it('ignores the empty run a half-drawn manual plan carries', () => {
    const demand = routingDemand({
      dataRuns: [[{ x: 0, y: 0 }], []],
      powerRuns: [[]],
      dataPortsPerProcessor: 2,
      totalPixels: 1_000,
      maxPixelsPerProcessor: 8_800_000,
      resX: 100,
      resY: 100,
      maxCanvasWidth: 10_240,
      maxCanvasHeight: 8_192,
    });

    expect(demand.dataCables).toBe(1);
    expect(demand.powerCables).toBe(0);
  });

  it('asks for nothing when nothing is drawn', () => {
    const demand = routingDemand({
      dataRuns: [],
      powerRuns: [],
      dataPortsPerProcessor: 4,
      totalPixels: 0,
      maxPixelsPerProcessor: 8_800_000,
      resX: 0,
      resY: 0,
      maxCanvasWidth: 10_240,
      maxCanvasHeight: 8_192,
    });

    expect(demand).toEqual({
      dataCables: 0,
      powerCables: 0,
      processorsNeeded: 0,
      processorLimit: null,
    });
  });

  it.each([0, -1, 2.5])('rejects a processor with %s data ports', (ports) => {
    expect(() =>
      routingDemand({
        dataRuns: [],
        powerRuns: [],
        dataPortsPerProcessor: ports,
        totalPixels: 0,
        maxPixelsPerProcessor: 8_800_000,
        resX: 100,
        resY: 100,
        maxCanvasWidth: 10_240,
        maxCanvasHeight: 8_192,
      }),
    ).toThrow(RangeError);
  });
});
