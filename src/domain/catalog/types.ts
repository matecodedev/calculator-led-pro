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
}

export interface Processor {
  id: string;
  brand: string;
  model: string;
  dataPorts: number;
  maxPixelsPerPort: number;
}

export interface Guide {
  id: string;
  /** The symptom a technician sees on site. */
  issue: string;
  cause: string;
  solution: string;
}
