import { useMemo, useState } from 'react';

import { calculateProject, validateProject, type ProjectInput } from '../../domain/calculate';
import { cabinets, processors, type Cabinet, type Processor } from '../../domain/catalog';
import type { ProjectSnapshot } from '../../domain/project/snapshot';

/**
 * Default mains voltage (V). 220 matches the catalog's region and what the app
 * assumed before this selector existed, so an existing plan keeps its numbers.
 * A crew landing in North America must change it — every amperage depends on it.
 */
export const DEFAULT_LINE_VOLTAGE = 220;

export type CalcMode = 'dimensions' | 'count';

const BLANK_CABINET: Cabinet = {
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
};

const BLANK_PROCESSOR: Processor = {
  id: 'custom_p',
  brand: 'Custom',
  model: 'Processor',
  dataPorts: 4,
  maxPixelsPerPort: 650000,
};

/**
 * The whole editable state of one screen, plus what the domain makes of it.
 *
 * The container owns this; the panels receive only the slice they edit. Keeping
 * it in one hook is what lets the PDF export read the same values the panels
 * show, without any of them being passed through a component that doesn't use
 * them.
 */
export function useProjectDraft(initial?: ProjectSnapshot | null) {
  const [eventName, setEventName] = useState(initial?.identity.eventName ?? '');
  const [screenName, setScreenName] = useState(initial?.identity.screenName ?? '');

  const [calcMode, setCalcMode] = useState<CalcMode>(initial?.target.calcMode ?? 'dimensions');
  const [targetWidthM, setTargetWidthM] = useState(initial?.target.targetWidthM ?? 4);
  const [targetHeightM, setTargetHeightM] = useState(initial?.target.targetHeightM ?? 2.5);
  const [cols, setCols] = useState(initial?.target.cols ?? 6);
  const [rows, setRows] = useState(initial?.target.rows ?? 4);

  const [selectedCabinetId, setSelectedCabinetId] = useState(
    initial?.cabinet.selectedId ?? cabinets[0].id,
  );
  const [isCustomCabinet, setIsCustomCabinet] = useState(initial?.cabinet.isCustom ?? false);
  const [customCabinet, setCustomCabinet] = useState<Cabinet>(
    initial?.cabinet.custom ?? BLANK_CABINET,
  );

  const [selectedProcessorId, setSelectedProcessorId] = useState(
    initial?.processor.selectedId ?? processors[0].id,
  );
  const [isCustomProcessor, setIsCustomProcessor] = useState(initial?.processor.isCustom ?? false);
  const [customProcessor, setCustomProcessor] = useState<Processor>(
    initial?.processor.custom ?? BLANK_PROCESSOR,
  );

  const [voltage, setVoltage] = useState(initial?.supply.voltage ?? DEFAULT_LINE_VOLTAGE);
  const [pduCapacityAmps, setPduCapacityAmps] = useState(initial?.supply.pduCapacityAmps ?? 96);
  const [breakerAmps, setBreakerAmps] = useState(initial?.supply.breakerAmps ?? 16);
  const [cableLoopAmps, setCableLoopAmps] = useState(initial?.supply.cableLoopAmps ?? 16);

  const cabinet = isCustomCabinet
    ? customCabinet
    : (cabinets.find((c) => c.id === selectedCabinetId) ?? cabinets[0]);
  const processor = isCustomProcessor
    ? customProcessor
    : (processors.find((p) => p.id === selectedProcessorId) ?? processors[0]);

  const input = useMemo<ProjectInput>(
    () => ({
      target:
        calcMode === 'dimensions'
          ? { mode: 'dimensions', widthM: targetWidthM, heightM: targetHeightM }
          : { mode: 'count', cols, rows },
      cabinet,
      processor,
      voltage,
      breakerAmps,
      cableLoopAmps,
    }),
    [
      calcMode,
      targetWidthM,
      targetHeightM,
      cols,
      rows,
      cabinet,
      processor,
      voltage,
      breakerAmps,
      cableLoopAmps,
    ],
  );

  const issues = useMemo(() => validateProject(input), [input]);
  const results = useMemo(
    () => (issues.length === 0 ? calculateProject(input) : null),
    [input, issues],
  );

  /** Picking "custom" from the dropdown switches to the editable cabinet. */
  const selectCabinet = (id: string) => {
    setIsCustomCabinet(id === 'custom');
    if (id !== 'custom') setSelectedCabinetId(id);
  };

  const selectProcessor = (id: string) => {
    setIsCustomProcessor(id === 'custom');
    if (id !== 'custom') setSelectedProcessorId(id);
  };

  return {
    identity: { eventName, screenName, setEventName, setScreenName },
    target: {
      calcMode,
      setCalcMode,
      targetWidthM,
      setTargetWidthM,
      targetHeightM,
      setTargetHeightM,
      cols,
      setCols,
      rows,
      setRows,
    },
    cabinetChoice: {
      cabinet,
      selectedId: isCustomCabinet ? 'custom' : selectedCabinetId,
      isCustom: isCustomCabinet,
      custom: customCabinet,
      select: selectCabinet,
      updateCustom: setCustomCabinet,
    },
    processorChoice: {
      processor,
      selectedId: isCustomProcessor ? 'custom' : selectedProcessorId,
      isCustom: isCustomProcessor,
      custom: customProcessor,
      select: selectProcessor,
      updateCustom: setCustomProcessor,
    },
    supply: {
      voltage,
      setVoltage,
      pduCapacityAmps,
      setPduCapacityAmps,
      breakerAmps,
      setBreakerAmps,
      cableLoopAmps,
      setCableLoopAmps,
    },
    /** This hook's share of the saved document. */
    snapshotSlice: {
      identity: { eventName, screenName },
      target: { calcMode, targetWidthM, targetHeightM, cols, rows },
      cabinet: {
        selectedId: isCustomCabinet ? 'custom' : selectedCabinetId,
        isCustom: isCustomCabinet,
        custom: customCabinet,
      },
      processor: {
        selectedId: isCustomProcessor ? 'custom' : selectedProcessorId,
        isCustom: isCustomProcessor,
        custom: customProcessor,
      },
      supply: { voltage, pduCapacityAmps, breakerAmps, cableLoopAmps },
    },
    input,
    issues,
    results,
  };
}

export type ProjectDraft = ReturnType<typeof useProjectDraft>;
export type CabinetChoice = ProjectDraft['cabinetChoice'];
export type ProcessorChoice = ProjectDraft['processorChoice'];
export type TargetControls = ProjectDraft['target'];
export type SupplyControls = ProjectDraft['supply'];
export type ProjectIdentity = ProjectDraft['identity'];
