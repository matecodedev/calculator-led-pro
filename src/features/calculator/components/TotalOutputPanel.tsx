import type { ProjectCalculation } from '../../../domain/calculate';
import SectionHeading from '../../../shared/ui/SectionHeading';
import AwaitingInput from './AwaitingInput';

interface TotalOutputPanelProps {
  results: ProjectCalculation | null;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-[#222] pb-1 gap-3">
      <span className="text-[11px] uppercase tracking-wide text-neutral-400">{label}</span>
      <span className="font-mono tabular-nums text-white text-xs">{value}</span>
    </div>
  );
}

export default function TotalOutputPanel({ results }: TotalOutputPanelProps) {
  return (
    <div className="p-6 bg-[#0A0A0A] border-t border-[#333] flex-1">
      <SectionHeading accent="blue">Total Output</SectionHeading>

      {results ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Row
              label="Total Cabinets"
              value={`${results.cols} × ${results.rows} = ${results.totalCabinets}`}
            />
            <Row
              label="Physical Size"
              value={`${results.arrayWidthM.toFixed(2)}m × ${results.arrayHeightM.toFixed(2)}m`}
            />
            <Row label="Total Weight" value={`${results.weightTotal.toLocaleString()} kg`} />
          </div>
          <div className="bg-[#111] border border-[#333] p-4 flex flex-col justify-center items-center text-center">
            <div className="text-[11px] uppercase tracking-wide text-neutral-400 mb-2">
              Total Resolution
            </div>
            <div className="text-xl sm:text-2xl font-mono tabular-nums tracking-tighter text-white">
              {results.resX.toLocaleString()}
            </div>
            <div className="text-xs font-mono tabular-nums text-[#CCFF00]">
              × {results.resY.toLocaleString()} px
            </div>
            <div className="mt-2 text-[11px] uppercase tracking-wide text-neutral-400">
              Pixels: {results.totalPixels.toLocaleString()}
            </div>
          </div>
        </div>
      ) : (
        <AwaitingInput />
      )}
    </div>
  );
}
