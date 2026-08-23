import { describe, expect, it } from 'vitest';
import type { Cabinet, Processor } from './catalog';
import { calculateProject, validateProject, type ProjectInput } from './calculate';

const cabinet: Cabinet = {
  id: 'a_nt29',
  brand: 'Absen',
  model: 'NT2.9 V2',
  pitch: 2.97,
  width: 500,
  height: 500,
  resX: 168,
  resY: 168,
  maxPower: 160,
  avgPower: 53,
  weight: 8.5,
};

const processor: Processor = {
  id: 'p1',
  brand: 'NovaStar',
  model: 'VX1000',
  dataPorts: 10,
  maxPixelsPerPort: 650_000,
};

const input: ProjectInput = {
  target: { mode: 'dimensions', widthM: 4, heightM: 2.5 },
  cabinet,
  processor,
  voltage: 220,
  breakerAmps: 16,
  brightness: 1,
  content: 'video',
  cableLoopAmps: 16,
};

describe('calculateProject', () => {
  const result = calculateProject(input);

  it('sizes the grid from the target screen', () => {
    expect(result.cols).toBe(8);
    expect(result.rows).toBe(5);
    expect(result.totalCabinets).toBe(40);
  });

  it('reports the physical screen and its resolution', () => {
    expect(result.arrayWidthM).toBe(4);
    expect(result.arrayHeightM).toBe(2.5);
    expect(result.resX).toBe(1344);
    expect(result.resY).toBe(840);
    expect(result.weightTotal).toBe(340);
  });

  it('reports the electrical load', () => {
    expect(result.maxPowerW).toBe(6400);
    expect(result.maxAmps).toBeCloseTo(29.09, 2);
    expect(result.cabinetsPerPowerCable).toBe(17);
  });

  it('reports the data distribution', () => {
    expect(result.cabinetsPerDataPort).toBe(23);
  });

  it('leaves the cable and processor count to the routing', () => {
    // How many cables a screen needs depends on how the runs fall over the
    // grid, which this calculation cannot see. Dividing the cabinet count by
    // the loop capacity printed three data cables under a four-cable drawing,
    // so the number moved to `routing/demand.ts`, which counts the runs.
    expect(result).not.toHaveProperty('dataCablesNeeded');
    expect(result).not.toHaveProperty('powerCablesNeeded');
    expect(result).not.toHaveProperty('processorsNeeded');
  });

  it('takes the grid directly when the screen is stated in panels', () => {
    const byCount = calculateProject({ ...input, target: { mode: 'count', cols: 6, rows: 4 } });

    expect(byCount.totalCabinets).toBe(24);
    expect(byCount.arrayWidthM).toBe(3);
  });

  it('rejects input that would produce nonsense instead of returning Infinity', () => {
    expect(() => calculateProject({ ...input, cabinet: { ...cabinet, resX: 0 } })).toThrow(
      RangeError,
    );
  });
});

describe('validateProject', () => {
  it('passes a well-formed project', () => {
    expect(validateProject(input)).toEqual([]);
  });

  it('gathers issues from the target, the cabinet and the processor at once', () => {
    const issues = validateProject({
      ...input,
      target: { mode: 'dimensions', widthM: 0, heightM: 2.5 },
      cabinet: { ...cabinet, resX: 0 },
      processor: { ...processor, dataPorts: 0 },
    });

    expect(issues.map((i) => i.field).sort()).toEqual(['dataPorts', 'resX', 'widthM']);
  });

  it('catches a grid too large to draw before anything tries to render it', () => {
    expect(
      validateProject({ ...input, target: { mode: 'count', cols: 300, rows: 300 } }),
    ).toHaveLength(1);
  });

  it('catches a metre target that resolves to too many cabinets', () => {
    const issues = validateProject({
      ...input,
      target: { mode: 'dimensions', widthM: 500, heightM: 500 },
    });

    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/cabinets/i);
  });

  it('never reports an issue for a project calculateProject would accept', () => {
    expect(() => calculateProject(input)).not.toThrow();
    expect(validateProject(input)).toEqual([]);
  });
});
