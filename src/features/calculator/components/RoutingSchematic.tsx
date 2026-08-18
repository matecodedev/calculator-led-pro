import { useState } from 'react';
import { Maximize2, Minimize2, Route } from 'lucide-react';

import { cableColors, OVER_CAPACITY_COLOR } from '../../../domain/routing/palette';
import type { GridPosition } from '../../../domain/routing/serpentine';
import SectionHeading from '../../../shared/ui/SectionHeading';
import type { RoutingPlan } from '../useRoutingPlan';
import RoutingToolbar from './RoutingToolbar';

export interface SchematicScreen {
  cols: number;
  rows: number;
  /** Millimetres; sets the aspect ratio of each drawn cell. */
  cabinetWidth: number;
  cabinetHeight: number;
  dataCapacity: number;
  powerCapacity: number;
}

interface RoutingSchematicProps {
  plan: RoutingPlan;
  screen: SchematicScreen;
}

export default function RoutingSchematic({ plan, screen }: RoutingSchematicProps) {
  const { cols, rows, cabinetWidth, cabinetHeight } = screen;
  const capacity = plan.layer === 'data' ? screen.dataCapacity : screen.powerCapacity;
  const colors = cableColors(plan.layer);
  const runs = plan.routesFor(plan.layer);

  const cellWidth = cabinetWidth / 10;
  const cellHeight = cabinetHeight / 10;
  const centreOf = (p: GridPosition) => ({
    x: p.x * cellWidth + cellWidth / 2,
    y: p.y * cellHeight + cellHeight / 2,
  });
  const scale = Math.min(cellWidth, cellHeight) / 50;
  const [fullscreen, setFullscreen] = useState(false);

  /**
   * Sized in user space, not stroke widths, so the arrowhead stays a direction
   * mark on a continuous line instead of swelling into a chevron per cabinet.
   */
  const arrowSize = Math.min(cellWidth, cellHeight) * 0.22;

  /** Retract a link slightly from both cabinet centres so the run reads as a line. */
  const shrink = (from: GridPosition, to: GridPosition) => {
    const a = centreOf(from);
    const b = centreOf(to);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };

    const padding = Math.min(cellWidth, cellHeight) * 0.12;
    const nx = (dx / length) * padding;
    const ny = (dy / length) * padding;
    return { x1: a.x + nx, y1: a.y + ny, x2: b.x - nx, y2: b.y - ny };
  };

  /** In manual mode, clicking a cabinet appends it to the run being drawn. */
  const toggleCabinet = (x: number, y: number) => {
    if (plan.mode !== 'manual') return;

    plan.setManualRoutes((previous) => {
      const runsCopy = previous.length > 0 ? [...previous] : [[]];
      const last = runsCopy.length - 1;
      const current = runsCopy[last];
      const tail = current[current.length - 1];

      // Clicking the last cabinet again removes it.
      if (tail && tail.x === x && tail.y === y) {
        runsCopy[last] = current.slice(0, -1);
        return runsCopy;
      }
      if (runsCopy.some((run) => run.some((p) => p.x === x && p.y === y))) return previous;

      runsCopy[last] = [...current, { x, y }];
      return runsCopy;
    });
  };

  const routedCabinets = runs.reduce((sum, run) => sum + run.length, 0);

  return (
    <div className="bg-[#111] p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
        <div className="flex items-center gap-3">
          <SectionHeading icon={<Route className="w-4 h-4" />} accent="blue" className="">
            Cable Routing Schematics
          </SectionHeading>
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="flex items-center gap-2 px-3 py-2 min-h-11 text-[11px] font-bold uppercase tracking-wider rounded-sm border border-[#444] text-neutral-300 hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CCFF00]"
          >
            <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            Fullscreen
          </button>
        </div>
        <RoutingToolbar
          plan={plan}
          onAutoFill={() => plan.fillFromAuto(screen.dataCapacity, screen.powerCapacity)}
        />
      </div>

      {(runs.length > 0 || plan.mode === 'manual') && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-[#161616] border border-[#333] p-3 text-[11px] uppercase font-mono">
            <div className="font-bold text-[#CCFF00]">
              Legend ({routedCabinets}/{cols * rows})
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full bg-[#1A1A1A] border-2 border-current"
                style={{ color: colors[0] }}
              />
              <span>Cable Line Start</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 rounded-[1px] bg-current h-1" style={{ color: colors[0] }} />
              <span>Link (max {capacity} cab)</span>
            </div>
            <div className="flex items-center gap-4 sm:border-l sm:border-[#333] sm:pl-4 mt-2 sm:mt-0 text-neutral-400">
              <span>Total cables: {runs.length}</span>
              <span>Total cabs: {cols * rows}</span>
            </div>
          </div>

          <div
            className={
              fullscreen
                ? 'fixed inset-0 z-50 bg-[#0A0A0A] p-4 flex justify-center items-center'
                : 'bg-[#0A0A0A] border border-[#333] p-4 flex justify-center items-center overflow-x-auto w-full min-h-[300px]'
            }
          >
            {fullscreen && (
              <button
                type="button"
                onClick={() => setFullscreen(false)}
                className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-2 min-h-11 text-[11px] font-bold uppercase tracking-wider rounded-sm border border-[#444] bg-[#111] text-neutral-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CCFF00]"
              >
                <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
                Close
              </button>
            )}
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${cols * cellWidth} ${rows * cellHeight}`}
              preserveAspectRatio="xMidYMid meet"
              className="flex-shrink-0"
              style={
                fullscreen
                  ? { maxHeight: '100%', maxWidth: '100%' }
                  : { maxHeight: '70vh', maxWidth: '100%' }
              }
              role="img"
              aria-label={`${plan.layer} routing over a ${cols} by ${rows} cabinet grid, ${runs.length} cables`}
            >
              <defs>
                {[...colors, OVER_CAPACITY_COLOR].map((color, i) => (
                  <marker
                    key={color}
                    id={`arrow-${plan.layer}-${i}`}
                    viewBox="0 0 10 10"
                    refX="5"
                    refY="5"
                    markerWidth={arrowSize}
                    markerHeight={arrowSize}
                    markerUnits="userSpaceOnUse"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill={color} />
                  </marker>
                ))}
              </defs>

              {Array.from({ length: cols }).map((_, c) =>
                Array.from({ length: rows }).map((_, r) => (
                  <rect
                    key={`cell-${c}-${r}`}
                    x={c * cellWidth}
                    y={r * cellHeight}
                    width={cellWidth}
                    height={cellHeight}
                    fill="#111"
                    stroke="#666"
                    strokeWidth="1"
                    onClick={() => toggleCabinet(c, r)}
                    className={
                      plan.mode === 'manual'
                        ? 'cursor-pointer hover:fill-[#222] transition-colors'
                        : ''
                    }
                  />
                )),
              )}

              {runs.map((run, i) => {
                const overCapacity = run.length > capacity;
                const color = overCapacity ? OVER_CAPACITY_COLOR : colors[i % colors.length];
                const markerIndex = overCapacity ? colors.length : i % colors.length;
                const first = run[0];

                return (
                  <g key={`run-${i}`}>
                    {first && (
                      <g transform={`translate(${centreOf(first).x}, ${centreOf(first).y})`}>
                        <circle
                          r={Math.max(4, Math.min(cellWidth, cellHeight) * 0.25)}
                          fill="#1A1A1A"
                          stroke={color}
                          strokeWidth="2"
                          style={{ transform: `scale(${scale})` }}
                        />
                        <text
                          y={3 * scale}
                          textAnchor="middle"
                          fontSize={11 * scale}
                          fontWeight="bold"
                          fill={color}
                          fontFamily="monospace"
                        >
                          {run.length}
                        </text>
                      </g>
                    )}

                    {run.map((cabinet, step) => {
                      if (step === 0) return null;
                      const at = centreOf(cabinet);
                      return (
                        <text
                          key={`no-${i}-${step}`}
                          x={at.x}
                          y={at.y + 3.5 * scale}
                          textAnchor="middle"
                          fontSize={10 * scale}
                          fill={color}
                          fillOpacity={0.85}
                          fontFamily="monospace"
                        >
                          {step + 1}
                        </text>
                      );
                    })}

                    {run.slice(0, -1).map((cabinet, step) => {
                      const line = shrink(cabinet, run[step + 1]);
                      return (
                        <line
                          key={`link-${i}-${step}`}
                          {...line}
                          stroke={color}
                          strokeWidth={Math.max(2, Math.min(cellWidth, cellHeight) * 0.05)}
                          strokeLinecap="round"
                          markerEnd={`url(#arrow-${plan.layer}-${markerIndex})`}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
