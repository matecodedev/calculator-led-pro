// src/types.ts
export interface Cabinet {
  id: string;
  brand: string;
  model: string;
  pitch: number; // in mm
  width: number; // in mm
  height: number; // in mm
  resX: number; // pixels
  resY: number; // pixels
  maxPower: number; // watts per cabinet
  avgPower: number; // watts per cabinet
  weight: number; // kg
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
  issue: string; // The problem
  cause: string; // Possible causes
  solution: string; // How to fix it
}

export type TabState = 'calculator' | 'library' | 'guides';
