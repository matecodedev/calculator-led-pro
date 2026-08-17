import { useMemo, useState } from 'react';

import { calculateProject, validateProject, type ProjectInput } from '../../domain/calculate';
import { cabinets, processors, type Cabinet, type Processor } from '../../domain/catalog';

/** Line voltage (V). Fixed until a mains-voltage selector exists. */
export const LINE_VOLTAGE = 220;

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
export function useProjectDraft() {
  const [eventName, setEventName] = useState('');
  const [screenName, setScreenName] = useState('');

  const [calcMode, setCalcMode] = useState<CalcMode>('dimensions');
  const [targetWidthM, setTargetWidthM] = useState(4);
  const [targetHeightM, setTargetHeightM] = useState(2.5);
  const [cols, setCols] = useState(6);
  const [rows, setRows] = useState(4);

  const [selectedCabinetId, setSelectedCabinetId] = useState(cabinets[0].id);
  const [isCustomCabinet, setIsCustomCabinet] = useState(false);
  const [customCabinet, setCustomCabinet] = useState<Cabinet>(BLANK_CABINET);

  const [selectedProcessorId, setSelectedProcessorId] = useState(processors[0].id);
  const [isCustomProcessor, setIsCustomProcessor] = useState(false);
  const [customProcessor, setCustomProcessor] = useState<Processor>(BLANK_PROCESSOR);

  const [pduCapacityAmps, setPduCapacityAmps] = useState(96); // Three-phase 32 A
  const [breakerAmps, setBreakerAmps] = useState(16);
  const [cableLoopAmps, setCableLoopAmps] = useState(16);

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
      voltage: LINE_VOLTAGE,
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
      voltage: LINE_VOLTAGE,
      pduCapacityAmps,
      setPduCapacityAmps,
      breakerAmps,
      setBreakerAmps,
      cableLoopAmps,
      setCableLoopAmps,
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
