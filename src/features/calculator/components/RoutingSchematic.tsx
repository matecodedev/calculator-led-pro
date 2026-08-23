import { useEffect, useMemo, useRef, useState } from 'react';
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
   * Pan and zoom over the drawing.
   *
   * A dense grid draws ten-pixel cabinets, and "Fullscreen" gained sixteen
   * percent of width on a portrait phone — which is why the numbers on the
   * schematic were unreadable on the device the app is for. Zoom is the answer
   * the size of the page cannot give.
   */
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const panFrom = useRef<{ x: number; y: number } | null>(null);
  const boardW = cols * cellWidth;
  const boardH = rows * cellHeight;
  const zoomed = view.scale !== 1 || view.x !== 0 || view.y !== 0;
  const resetView = () => setView({ scale: 1, x: 0, y: 0 });

  /** Keeps the drawing from being dragged off its own frame. */
  const clamp = (next: { scale: number; x: number; y: number }) => {
    const scale = Math.min(6, Math.max(1, next.scale));
    const spanX = boardW / scale;
    const spanY = boardH / scale;
    return {
      scale,
      x: Math.min(Math.max(0, next.x), boardW - spanX),
      y: Math.min(Math.max(0, next.y), boardH - spanY),
    };
  };

  const zoomTo = (target: number, atX: number, atY: number) =>
    setView((previous) => {
      const scale = Math.min(6, Math.max(1, target));
      // Hold the point under the fingers still while the scale changes.
      return clamp({
        scale,
        x: atX - (atX - previous.x) * (previous.scale / scale),
        y: atY - (atY - previous.y) * (previous.scale / scale),
      });
    });

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

  const manual = plan.mode === 'manual';
  const svgRef = useRef<SVGSVGElement>(null);
  /** The cell the roving tab stop sits on. Runs start at the bottom edge. */
  const [focusCell, setFocusCell] = useState<GridPosition>({ x: 0, y: rows - 1 });
  /**
   * Dragging is hit-tested on the svg, not delegated to each cell.
   *
   * A touch pointer is captured by whatever element received `pointerdown`, so
   * `pointerenter` never fires on the cells the finger crosses — the drag would
   * have added exactly one cabinet on a phone, which is the device this app is
   * for. Mapping the pointer into viewBox units works for touch, mouse and pen
   * alike, and a ref keeps the flag readable without waiting for a render.
   */
  const drawingRef = useRef(false);
  const lastDrawn = useRef<string | null>(null);

  // A run drawn by dragging can end anywhere, including outside the drawing.
  useEffect(() => {
    if (!manual) return;
    const stop = () => {
      drawingRef.current = false;
      lastDrawn.current = null;
    };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, [manual]);

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

  /** Dragging only ever adds; pulling back over a cabinet must not delete it. */
  const appendCabinet = (x: number, y: number) => {
    if (!manual) return;
    plan.setManualRoutes((previous) => {
      const runsCopy = previous.length > 0 ? [...previous] : [[]];
      const last = runsCopy.length - 1;
      if (runsCopy.some((run) => run.some((p) => p.x === x && p.y === y))) return previous;
      runsCopy[last] = [...runsCopy[last], { x, y }];
      return runsCopy;
    });
  };

  /**
   * Where each cabinet sits in the drawing. A screen reader hears "column 3,
   * row 2, position 17 of cable 2" — the same sentence the numbers on the cell
   * say to everyone else.
   */
  const placement = useMemo(() => {
    const map = new Map<string, { cable: number; step: number }>();
    runs.forEach((run, i) =>
      run.forEach((cell, step) => map.set(`${cell.x}-${cell.y}`, { cable: i + 1, step: step + 1 })),
    );
    return map;
  }, [runs]);

  const describeCell = (c: number, r: number) => {
    const at = placement.get(`${c}-${r}`);
    const where = `Columna ${c + 1}, fila ${r + 1}`;
    return at ? `${where}, posición ${at.step} del cable ${at.cable}` : `${where}, sin rutear`;
  };

  /** Which cabinet the pointer is over, in grid coordinates. */
  const cellAt = (event: React.PointerEvent): GridPosition | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;

    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    const x = Math.floor(point.x / cellWidth);
    const y = Math.floor(point.y / cellHeight);
    return x < 0 || x >= cols || y < 0 || y >= rows ? null : { x, y };
  };

  /** In viewBox units, so pan and zoom arithmetic stays in the drawing's space. */
  const pointAt = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const onGridPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    // Two fingers are always a pinch, never a stray line across the grid.
    if (pointers.current.size >= 2) {
      drawingRef.current = false;
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale };
      return;
    }

    if (manual) {
      const cell = cellAt(event);
      if (!cell) return;
      drawingRef.current = true;
      lastDrawn.current = `${cell.x}-${cell.y}`;
      svgRef.current?.setPointerCapture(event.pointerId);
      toggleCabinet(cell.x, cell.y);
      return;
    }

    // Nothing to draw in auto mode, so one finger pans.
    panFrom.current = { x: event.clientX, y: event.clientY };
  };

  const onGridPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (pointers.current.has(event.pointerId)) {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current.distance > 0) {
        const centre = pointAt((a.x + b.x) / 2, (a.y + b.y) / 2);
        const target = pinch.current.scale * (distance / pinch.current.distance);
        if (centre) zoomTo(target, centre.x, centre.y);
      }
      return;
    }

    if (manual && drawingRef.current) {
      const cell = cellAt(event);
      if (!cell) return;
      const key = `${cell.x}-${cell.y}`;
      if (key === lastDrawn.current) return;
      lastDrawn.current = key;
      appendCabinet(cell.x, cell.y);
      return;
    }

    if (!manual && panFrom.current) {
      // The anchor stays in screen coordinates and the delta is converted with
      // the live CTM. Holding it in viewBox units meant reading a ref inside the
      // state updater, which React can run after pointerup has cleared it.
      const from = panFrom.current;
      const ctm = svgRef.current?.getScreenCTM();
      if (!ctm || ctm.a === 0 || ctm.d === 0) return;

      const dx = (event.clientX - from.x) / ctm.a;
      const dy = (event.clientY - from.y) / ctm.d;
      panFrom.current = { x: event.clientX, y: event.clientY };
      setView((previous) => clamp({ ...previous, x: previous.x - dx, y: previous.y - dy }));
    }
  };

  const onGridPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) panFrom.current = null;
  };

  /** Ctrl or pinch on a trackpad arrives as a wheel event. */
  const onGridWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    const at = pointAt(event.clientX, event.clientY);
    if (at) zoomTo(view.scale * (event.deltaY < 0 ? 1.12 : 1 / 1.12), at.x, at.y);
  };

  const focusAt = (x: number, y: number) => {
    setFocusCell({ x, y });
    svgRef.current?.querySelector<SVGRectElement>(`[data-cell="${x}-${y}"]`)?.focus();
  };

  const MOVES: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };

  const onCellKeyDown = (event: React.KeyboardEvent, c: number, r: number) => {
    const move = MOVES[event.key];
    if (move) {
      event.preventDefault();
      focusAt(
        Math.min(cols - 1, Math.max(0, c + move[0])),
        Math.min(rows - 1, Math.max(0, r + move[1])),
      );
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      focusAt(0, r);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      focusAt(cols - 1, r);
      return;
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      toggleCabinet(c, r);
    }
  };

  const routedCabinets = runs.reduce((sum, run) => sum + run.length, 0);
  const overCapacityRuns = runs.filter((run) => run.length > capacity).length;

  return (
    <div className="bg-[#111] p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
        <div className="flex items-center gap-3">
          <SectionHeading icon={<Route className="w-4 h-4" />} accent="blue" className="">
            Esquemático de ruteo
          </SectionHeading>
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="flex items-center gap-2 px-3 py-2 min-h-11 text-[11px] font-bold uppercase tracking-wider rounded-sm border border-[#444] text-neutral-300 hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CCFF00]"
          >
            <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            Pantalla completa
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
              Referencias ({routedCabinets}/{cols * rows})
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full bg-[#1A1A1A] border-2 border-current"
                style={{ color: colors[0] }}
              />
              <span>Inicio del cable</span>
            </div>
            {zoomed && (
              <button
                type="button"
                onClick={resetView}
                className="flex items-center gap-2 px-2 py-1 min-h-11 sm:min-h-0 sm:py-1 rounded-sm border border-[#CCFF00] text-[#CCFF00] font-bold uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CCFF00]"
              >
                Zoom {view.scale.toFixed(1)}× · ver todo
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="w-3 rounded-[1px] bg-current h-1" style={{ color: colors[0] }} />
              <span>Enlace (máx {capacity} gab)</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-0.5 h-3 rounded-[1px] bg-current opacity-60"
                style={{ color: colors[0] }}
              />
              <span>Main (baja al piso)</span>
            </div>
            {overCapacityRuns > 0 && (
              <div className="flex items-center gap-2 font-bold text-[#ef4444]">
                <span
                  className="w-3 h-1 shrink-0 rounded-[1px]"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(to right, currentColor 0 3px, transparent 3px 5px)',
                  }}
                />
                <span>
                  {overCapacityRuns} sobrecargado{overCapacityRuns > 1 ? 's' : ''} (punteado)
                </span>
              </div>
            )}
            <div className="flex items-center gap-4 sm:border-l sm:border-[#333] sm:pl-4 mt-2 sm:mt-0 text-neutral-400">
              <span>Cables: {runs.length}</span>
              <span>Gabinetes: {cols * rows}</span>
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
                Cerrar
              </button>
            )}
            <svg
              width="100%"
              height="100%"
              viewBox={`${view.x} ${view.y} ${boardW / view.scale} ${boardH / view.scale}`}
              preserveAspectRatio="xMidYMid meet"
              className="flex-shrink-0"
              style={{
                maxWidth: '100%',
                maxHeight: fullscreen ? '100%' : '70vh',
                // Without this the browser scrolls the page instead of drawing.
                touchAction: 'none',
              }}
              ref={svgRef}
              onPointerDown={onGridPointerDown}
              onPointerMove={onGridPointerMove}
              onPointerUp={onGridPointerUp}
              onPointerCancel={onGridPointerUp}
              onPointerLeave={onGridPointerUp}
              onWheel={onGridWheel}
              role={manual ? 'grid' : 'img'}
              aria-rowcount={manual ? rows : undefined}
              aria-colcount={manual ? cols : undefined}
              aria-label={
                `${manual ? 'Grilla editable de ruteo' : 'Ruteo'} de ${
                  plan.layer === 'data' ? 'data' : 'power'
                } sobre ${cols} por ${rows} gabinetes, ${runs.length} cables` +
                (overCapacityRuns > 0
                  ? `, ${overCapacityRuns} por encima del límite de ${capacity} gabinetes`
                  : '')
              }
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

              {Array.from({ length: rows }).map((_, r) => (
                <g key={`row-${r}`} role={manual ? 'row' : undefined}>
                  {Array.from({ length: cols }).map((_, c) => {
                    const focused = manual && focusCell.x === c && focusCell.y === r;
                    return (
                      <rect
                        key={`cell-${c}-${r}`}
                        data-cell={`${c}-${r}`}
                        x={c * cellWidth}
                        y={r * cellHeight}
                        width={cellWidth}
                        height={cellHeight}
                        fill="#111"
                        stroke={focused ? '#CCFF00' : '#666'}
                        strokeWidth={focused ? 3 : 1}
                        role={manual ? 'gridcell' : undefined}
                        // One tab stop for the whole grid; the arrows move
                        // inside it. Tabbing through 360 cabinets is not
                        // navigation, it is a trap.
                        tabIndex={manual ? (focused ? 0 : -1) : undefined}
                        aria-label={manual ? describeCell(c, r) : undefined}
                        onFocus={manual ? () => setFocusCell({ x: c, y: r }) : undefined}
                        onKeyDown={manual ? (event) => onCellKeyDown(event, c, r) : undefined}
                        className={manual ? 'cursor-pointer hover:fill-[#222]' : ''}
                      />
                    );
                  })}
                </g>
              ))}

              {runs.map((run, i) => {
                const overCapacity = run.length > capacity;
                const color = overCapacity ? OVER_CAPACITY_COLOR : colors[i % colors.length];
                const markerIndex = overCapacity ? colors.length : i % colors.length;
                const first = run[0];

                return (
                  // Links first, numbers last. SVG paints in document order, so
                  // emitting the sequence numbers before the cables struck every
                  // digit through with its own 2.5px stroke.
                  <g key={`run-${i}`}>
                    {/*
                     * The main: the feed from the processor or the PDU, which
                     * are on the ground. Drawn to the floor even when the run
                     * begins high up, because that is the cable a crew has to
                     * pull and its length is the thing worth seeing.
                     */}
                    {first && (
                      <g opacity={0.6}>
                        <line
                          x1={centreOf(first).x}
                          y1={centreOf(first).y}
                          x2={centreOf(first).x}
                          y2={rows * cellHeight}
                          stroke={color}
                          strokeWidth={Math.max(1, Math.min(cellWidth, cellHeight) * 0.025)}
                        />
                        <line
                          x1={centreOf(first).x - cellWidth * 0.15}
                          y1={rows * cellHeight}
                          x2={centreOf(first).x + cellWidth * 0.15}
                          y2={rows * cellHeight}
                          stroke={color}
                          strokeWidth={Math.max(2, Math.min(cellWidth, cellHeight) * 0.05)}
                          strokeLinecap="round"
                        />
                      </g>
                    )}

                    {run.slice(0, -1).map((cabinet, step) => {
                      const line = shrink(cabinet, run[step + 1]);
                      const strokeWidth = Math.max(2, Math.min(cellWidth, cellHeight) * 0.05);
                      return (
                        <line
                          key={`link-${i}-${step}`}
                          {...line}
                          stroke={color}
                          strokeWidth={strokeWidth}
                          strokeLinecap="round"
                          // A broken line survives a colourblind technician and a
                          // phone screen in the dark; the colour alone does not.
                          strokeDasharray={
                            overCapacity ? `${strokeWidth * 2} ${strokeWidth * 1.5}` : undefined
                          }
                          markerEnd={`url(#arrow-${plan.layer}-${markerIndex})`}
                        />
                      );
                    })}

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
                          {/*
                           * The first cabinet on the run, so the sequence reads
                           * 1, 2, 3. It used to print the run's length, which
                           * made a 20-cabinet run read "20, 2, 3" and gave two
                           * equally long runs the same label.
                           */}
                          1
                        </text>

                        {/*
                         * Carried-versus-rated, printed on the drawing. The
                         * schematic is what the crew patches from, so the run
                         * that will trip has to say so where it is read.
                         */}
                        {overCapacity && (
                          <g>
                            <rect
                              x={-24 * scale}
                              y={9 * scale}
                              width={48 * scale}
                              height={15 * scale}
                              rx={2 * scale}
                              fill="#1A1A1A"
                              stroke={OVER_CAPACITY_COLOR}
                              strokeWidth={Math.max(1, 1.5 * scale)}
                            />
                            <text
                              y={19.5 * scale}
                              textAnchor="middle"
                              fontSize={10 * scale}
                              fontWeight="bold"
                              fill={OVER_CAPACITY_COLOR}
                              fontFamily="monospace"
                            >
                              {run.length}/{capacity}
                            </text>
                          </g>
                        )}
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
                          fontFamily="monospace"
                          // A halo in the cell fill keeps the digit readable
                          // where a cable or an arrowhead passes behind it.
                          stroke="#111"
                          strokeWidth={2.5 * scale}
                          paintOrder="stroke"
                        >
                          {step + 1}
                        </text>
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
