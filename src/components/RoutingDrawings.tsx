import React, { useState, useMemo } from "react";
import { Route, Zap, Network } from "lucide-react";

const DATA_COLORS = [
  "#CCFF00",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#f97316",
  "#3b82f6",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
];
const POWER_COLORS = ["#FF4444", "#f97316", "#f59e0b", "#eab308", "#dc2626"];

interface Props {
  cols: number;
  rows: number;
  cabinetWidth: number;
  cabinetHeight: number;
  dataMaxCapacity: number;
  powerMaxCapacity: number;
  routingType: "data" | "power";
  setRoutingType: (t: "data" | "power") => void;
  routingPriority: "vertical" | "horizontal";
  setRoutingPriority: (t: "vertical" | "horizontal") => void;
  routingStart: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  setRoutingStart: (
    t: "top-left" | "top-right" | "bottom-left" | "bottom-right",
  ) => void;
  routingMode: "auto" | "manual";
  setRoutingMode: (m: "auto" | "manual") => void;
  manualDataRoutes: { x: number; y: number }[][];
  setManualDataRoutes: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }[][]>
  >;
  manualPowerRoutes: { x: number; y: number }[][];
  setManualPowerRoutes: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }[][]>
  >;
}

export default function RoutingDrawings({
  cols,
  rows,
  cabinetWidth,
  cabinetHeight,
  dataMaxCapacity,
  powerMaxCapacity,
  routingType,
  setRoutingType,
  routingPriority,
  setRoutingPriority,
  routingStart,
  setRoutingStart,
  routingMode,
  setRoutingMode,
  manualDataRoutes,
  setManualDataRoutes,
  manualPowerRoutes,
  setManualPowerRoutes,
}: Props) {
  const maxCapacity =
    routingType === "data" ? dataMaxCapacity : powerMaxCapacity;
  const colors = routingType === "data" ? DATA_COLORS : POWER_COLORS;

  const generateChunksForCapacity = (capacity: number) => {
    const sequence: { x: number; y: number }[] = [];

    if (routingPriority === "vertical") {
      const startX = routingStart.includes("right") ? cols - 1 : 0;
      const startY = routingStart.includes("bottom") ? rows - 1 : 0;
      const stepX = routingStart.includes("right") ? -1 : 1;

      for (let c = 0; c < cols; c++) {
        const x = startX + c * stepX;
        const isEvenCol = c % 2 === 0;
        const currentStartY = isEvenCol
          ? startY
          : routingStart.includes("bottom")
            ? 0
            : rows - 1;
        const stepY = isEvenCol
          ? routingStart.includes("bottom")
            ? -1
            : 1
          : routingStart.includes("bottom")
            ? 1
            : -1;

        for (let r = 0; r < rows; r++) {
          const y = currentStartY + r * stepY;
          sequence.push({ x, y });
        }
      }
    } else {
      const startX = routingStart.includes("right") ? cols - 1 : 0;
      const startY = routingStart.includes("bottom") ? rows - 1 : 0;
      const stepY = routingStart.includes("bottom") ? -1 : 1;

      for (let r = 0; r < rows; r++) {
        const y = startY + r * stepY;
        const isEvenRow = r % 2 === 0;
        const currentStartX = isEvenRow
          ? startX
          : routingStart.includes("right")
            ? 0
            : cols - 1;
        const stepX = isEvenRow
          ? routingStart.includes("right")
            ? -1
            : 1
          : routingStart.includes("right")
            ? 1
            : -1;

        for (let c = 0; c < cols; c++) {
          const x = currentStartX + c * stepX;
          sequence.push({ x, y });
        }
      }
    }

    const totalModules = sequence.length;
    if (totalModules === 0) return [];

    const numCables = Math.ceil(totalModules / capacity);
    const baseCount = Math.floor(totalModules / numCables);
    const remainder = totalModules % numCables;

    const res: { x: number; y: number }[][] = [];
    let currentIndex = 0;
    for (let i = 0; i < numCables; i++) {
      const currentCapacity = baseCount + (i < remainder ? 1 : 0);
      res.push(sequence.slice(currentIndex, currentIndex + currentCapacity));
      currentIndex += currentCapacity;
    }
    return res;
  };

  const autoChunks = useMemo(() => {
    return generateChunksForCapacity(maxCapacity);
  }, [cols, rows, routingPriority, routingStart, maxCapacity]);

  const activeChunks =
    routingMode === "auto"
      ? autoChunks
      : (routingType === "data" ? manualDataRoutes : manualPowerRoutes).filter(
          (c) => c.length > 0,
        );

  const handleCellClick = (c: number, r: number) => {
    if (routingMode !== "manual") return;

    const setManualRoutes =
      routingType === "data" ? setManualDataRoutes : setManualPowerRoutes;

    setManualRoutes((prev) => {
      const newRoutes = [...prev];
      if (newRoutes.length === 0) newRoutes.push([]);
      const currentLineIndex = newRoutes.length - 1;
      const currentLine = newRoutes[currentLineIndex];

      if (
        currentLine.length > 0 &&
        currentLine[currentLine.length - 1].x === c &&
        currentLine[currentLine.length - 1].y === r
      ) {
        newRoutes[currentLineIndex] = currentLine.slice(0, -1);
        return newRoutes;
      }

      const alreadyInUse = newRoutes.some((line) =>
        line.some((p) => p.x === c && p.y === r),
      );
      if (alreadyInUse) return prev;

      newRoutes[currentLineIndex] = [...currentLine, { x: c, y: r }];
      return newRoutes;
    });
  };

  const undoManualLine = () => {
    const setManualRoutes =
      routingType === "data" ? setManualDataRoutes : setManualPowerRoutes;
    setManualRoutes((prev) => {
      const newRoutes = [...prev];
      const currentLineIndex = newRoutes.length - 1;
      if (currentLineIndex < 0) return prev;
      const currentLine = newRoutes[currentLineIndex];

      if (currentLine.length > 0) {
        newRoutes[currentLineIndex] = currentLine.slice(0, -1);
      } else if (newRoutes.length > 1) {
        newRoutes.pop();
      }
      return newRoutes;
    });
  };

  const startNewLine = () => {
    const setManualRoutes =
      routingType === "data" ? setManualDataRoutes : setManualPowerRoutes;
    setManualRoutes((prev) => {
      const newRoutes = [...prev];
      const currentLineIndex = newRoutes.length - 1;
      if (currentLineIndex >= 0 && newRoutes[currentLineIndex].length === 0)
        return prev;
      newRoutes.push([]);
      return newRoutes;
    });
  };

  const clearManual = () => {
    const setManualRoutes =
      routingType === "data" ? setManualDataRoutes : setManualPowerRoutes;
    setManualRoutes([[]]);
  };

  const cellWidth = cabinetWidth / 10;
  const cellHeight = cabinetHeight / 10;

  function getShrinkedLine(x1: number, y1: number, x2: number, y2: number) {
    const padding = Math.min(cellWidth, cellHeight) * 0.25;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { x1, y1, x2, y2 };
    const nx = dx / len;
    const ny = dy / len;
    return {
      x1: x1 + nx * padding,
      y1: y1 + ny * padding,
      x2: x2 - nx * padding,
      y2: y2 - ny * padding,
    };
  }

  return (
    <div className="bg-[#111] p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
        <h2 className="text-xs font-bold tracking-widest uppercase flex items-center gap-2 text-blue-400">
          <Route className="w-4 h-4" /> Cable Routing Schematics
        </h2>

        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <div>
            <label className="block text-[9px] opacity-50 uppercase mb-1">
              Cable Layer
            </label>
            <div className="flex bg-[#1A1A1A] border border-[#444] rounded-sm p-1">
              <button
                onClick={() => setRoutingType("data")}
                className={`flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-sm transition-colors ${
                  routingType === "data"
                    ? "bg-[#CCFF00] text-black"
                    : "text-neutral-500 hover:text-white"
                }`}
              >
                <Network className="w-3 h-3" /> Data
              </button>
              <button
                onClick={() => setRoutingType("power")}
                className={`flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-sm transition-colors ${
                  routingType === "power"
                    ? "bg-[#FF4444] text-white"
                    : "text-neutral-500 hover:text-white"
                }`}
              >
                <Zap className="w-3 h-3" /> Power
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[9px] opacity-50 uppercase mb-1">
              Mode
            </label>
            <div className="flex bg-[#1A1A1A] border border-[#444] rounded-sm p-1">
              <button
                onClick={() => setRoutingMode("auto")}
                className={`flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-sm transition-colors ${
                  routingMode === "auto"
                    ? "bg-[#333] text-white"
                    : "text-neutral-500 hover:text-white"
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => setRoutingMode("manual")}
                className={`flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-sm transition-colors ${
                  routingMode === "manual"
                    ? "bg-[#333] text-white"
                    : "text-neutral-500 hover:text-white"
                }`}
              >
                Manual
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[9px] opacity-50 uppercase mb-1">
              Priority
            </label>
            <select
              value={routingPriority}
              onChange={(e) =>
                setRoutingPriority(e.target.value as "vertical" | "horizontal")
              }
              className="bg-[#1A1A1A] border border-[#444] rounded-sm px-3 py-2 text-[10px] font-mono text-white focus:border-[#CCFF00] focus:outline-none appearance-none h-[34px]"
            >
              <option value="vertical">Vertical Snake</option>
              <option value="horizontal">Horizontal Snake</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] opacity-50 uppercase mb-1">
              Starting Corner
            </label>
            <select
              value={routingStart}
              onChange={(e) => setRoutingStart(e.target.value as any)}
              className="bg-[#1A1A1A] border border-[#444] rounded-sm px-3 py-2 text-[10px] font-mono text-white focus:border-[#CCFF00] focus:outline-none appearance-none h-[34px]"
            >
              <option value="bottom-left">Bottom-Left</option>
              <option value="bottom-right">Bottom-Right</option>
              <option value="top-left">Top-Left</option>
              <option value="top-right">Top-Right</option>
            </select>
          </div>

          {routingMode === "manual" && (
            <div>
              <label className="block text-[9px] opacity-50 uppercase mb-1">
                Manual Controls
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setManualDataRoutes(
                      generateChunksForCapacity(dataMaxCapacity),
                    );
                    setManualPowerRoutes(
                      generateChunksForCapacity(powerMaxCapacity),
                    );
                  }}
                  className="bg-[#10b981] text-black hover:bg-[#34d399] border border-[#059669] rounded-sm px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors h-[34px]"
                  title="Generate optimal serpentine route for both Data and Power"
                >
                  Intelligent Auto-Path
                </button>
                <button
                  onClick={startNewLine}
                  className="bg-[#333] text-white hover:bg-[#444] border border-[#555] rounded-sm px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors h-[34px]"
                >
                  + New Line
                </button>
                <button
                  onClick={undoManualLine}
                  className="bg-[#1A1A1A] text-neutral-300 hover:text-white border border-[#444] rounded-sm px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors h-[34px]"
                >
                  Undo
                </button>
                <button
                  onClick={clearManual}
                  className="bg-[#1A1A1A] text-red-400 hover:text-red-300 border border-[#444] rounded-sm px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors h-[34px]"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {(activeChunks.length > 0 || routingMode === "manual") && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-[#161616] border border-[#333] p-3 text-[10px] uppercase font-mono">
            <div className="font-bold text-[#CCFF00]">
              Legend (
              {(routingType === "data"
                ? manualDataRoutes
                : manualPowerRoutes
              ).reduce((a, b) => a + b.length, 0)}
              /{cols * rows})
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full bg-[#1A1A1A] border-2 border-current"
                style={{ color: colors[0] }}
              ></span>
              <span>Cable Line Start</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-3 rounded-[1px] bg-current h-1"
                style={{ color: colors[0] }}
              ></span>
              <span>Link (Max {maxCapacity} cab)</span>
            </div>
            <div className="flex items-center gap-4 sm:border-l sm:border-[#333] sm:pl-4 mt-2 sm:mt-0">
              <span className="opacity-50">
                Total Cables: {activeChunks.length}
              </span>
              <span className="opacity-50">Total Cabs: {cols * rows}</span>
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-[#333] p-4 flex justify-center items-center overflow-x-auto w-full">
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${cols * cellWidth} ${rows * cellHeight}`}
              preserveAspectRatio="xMidYMid meet"
              className="flex-shrink-0"
              style={{
                maxHeight: "70vh",
                minHeight: "300px",
                maxWidth: "100%",
              }}
            >
              <defs>
                {colors.map((c, i) => (
                  <marker
                    key={`arrow-${i}`}
                    id={`arrow-${i}`}
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill={c} />
                  </marker>
                ))}
                <marker
                  key="arrow-error"
                  id="arrow-error"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
                </marker>
              </defs>

              {/* Grid Cells */}
              {Array.from({ length: cols }).map((_, c) =>
                Array.from({ length: rows }).map((_, r) => (
                  <rect
                    key={`cell-${c}-${r}`}
                    x={c * cellWidth}
                    y={r * cellHeight}
                    width={cellWidth}
                    height={cellHeight}
                    fill="#111"
                    stroke="#333"
                    strokeWidth="1"
                    onClick={() => handleCellClick(c, r)}
                    className={
                      routingMode === "manual"
                        ? "cursor-pointer hover:fill-[#222] transition-colors"
                        : ""
                    }
                  />
                )),
              )}

              {/* Connections */}
              {activeChunks.map((route, i) => {
                const isInvalid = route.length > maxCapacity;
                const color = isInvalid ? "#ef4444" : colors[i % colors.length];
                const markerId = isInvalid
                  ? "url(#arrow-error)"
                  : `url(#arrow-${i % colors.length})`;

                return (
                  <g key={`route-${i}`}>
                    {/* Draw Start Marker */}
                    {route.length > 0 && (
                      <g
                        transform={`translate(${route[0].x * cellWidth + cellWidth / 2}, ${route[0].y * cellHeight + cellHeight / 2})`}
                      >
                        <circle
                          r={Math.max(
                            4,
                            Math.min(cellWidth, cellHeight) * 0.25,
                          )}
                          fill="#1A1A1A"
                          stroke={color}
                          strokeWidth="2"
                          style={{
                            transform: `scale(${Math.min(cellWidth, cellHeight) / 50})`,
                          }}
                        />
                        <text
                          y={3 * (Math.min(cellWidth, cellHeight) / 50)}
                          textAnchor="middle"
                          fontSize={11 * (Math.min(cellWidth, cellHeight) / 50)}
                          fontWeight="bold"
                          fill={color}
                          fontFamily="monospace"
                        >
                          {route.length}
                        </text>
                      </g>
                    )}

                    {/* Draw Links */}
                    {route.map((p, pIndex) => {
                      if (pIndex === route.length - 1) return null;
                      const next = route[pIndex + 1];

                      const cx1 = p.x * cellWidth + cellWidth / 2;
                      const cy1 = p.y * cellHeight + cellHeight / 2;
                      const cx2 = next.x * cellWidth + cellWidth / 2;
                      const cy2 = next.y * cellHeight + cellHeight / 2;

                      const line = getShrinkedLine(cx1, cy1, cx2, cy2);

                      return (
                        <line
                          key={`link-${i}-${pIndex}`}
                          x1={line.x1}
                          y1={line.y1}
                          x2={line.x2}
                          y2={line.y2}
                          stroke={color}
                          strokeWidth={Math.max(
                            2,
                            Math.min(cellWidth, cellHeight) * 0.05,
                          )}
                          strokeLinecap="round"
                          markerEnd={markerId}
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
