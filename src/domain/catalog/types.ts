/** Equipment the calculator plans around. */

export interface Cabinet {
  id: string;
  brand: string;
  model: string;
  /** Distance between LED centres, in millimetres. */
  pitch: number;
  /** Millimetres. */
  width: number;
  /** Millimetres. */
  height: number;
  resX: number;
  resY: number;
  /** Watts per cabinet at full white. */
  maxPower: number;
  /** Watts per cabinet at typical content. */
  avgPower: number;
  /** Kilograms. */
  weight: number;
  /** Absent means nobody has checked these figures against a datasheet. */
  spec?: SpecSource;
}

/**
 * Where a figure came from, so it can be checked and checked again.
 *
 * The catalog arrived with this app and carried no provenance at all: no
 * source, no date, no way to tell a published specification from a plausible
 * guess. Anything the app does with a number inherits that doubt, and this is
 * an electrical and load planning tool.
 */
export interface SpecSource {
  /** Publisher and document. */
  source: string;
  /** ISO date the figure was read. */
  checkedOn: string;
}

export interface Processor {
  id: string;
  brand: string;
  model: string;
  dataPorts: number;
  /** What one gigabit port moves — 650 k at 8-bit across NovaStar's line. */
  maxPixelsPerPort: number;
  /**
   * What the whole controller drives, which is not ports x port capacity: an
   * MCTRL4K has sixteen ports worth 10.4 M between them and carries 8.8 M.
   */
  maxPixelsTotal: number;
  /** Absent means nobody has checked these figures against a datasheet. */
  spec?: SpecSource;
}

export interface Guide {
  id: string;
  /** The symptom a technician sees on site. */
  issue: string;
  cause: string;
  solution: string;
}
