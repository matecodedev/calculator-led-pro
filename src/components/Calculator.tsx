import { useState, useMemo } from 'react';
import { cabinets, processors } from '../data';
import { Settings2, Cpu, Download } from 'lucide-react';
import type { Cabinet, Processor } from '../types';

import RoutingDrawings from './RoutingDrawings';

export default function Calculator() {
  const [calcMode, setCalcMode] = useState<'dimensions' | 'count'>('dimensions');
  const [targetWidth, setTargetWidth] = useState<number>(4); // meters
  const [targetHeight, setTargetHeight] = useState<number>(2.5); // meters
  const [cols, setCols] = useState<number>(6);
  const [rows, setRows] = useState<number>(4);
  
  const [selectedCabinetId, setSelectedCabinetId] = useState<string>(cabinets[0].id);
  const [isCustomCabinet, setIsCustomCabinet] = useState(false);
  const [customCabinet, setCustomCabinet] = useState<Cabinet>({
    id: 'custom', brand: 'Custom', model: 'Cabinet', pitch: 3.9, width: 500, height: 500, resX: 128, resY: 128, maxPower: 150, avgPower: 50, weight: 8
  });

  const [selectedProcessorId, setSelectedProcessorId] = useState<string>(processors[0].id);
  const [isCustomProcessor, setIsCustomProcessor] = useState(false);
  const [customProcessor, setCustomProcessor] = useState<Processor>({
    id: 'custom_p', brand: 'Custom', model: 'Processor', dataPorts: 4, maxPixelsPerPort: 650000
  });

  const voltage = 220; // Line voltage (V). Fixed until a mains-voltage selector exists.
  const [pduCapacityAmps, setPduCapacityAmps] = useState<number>(96); // Default 32A Triphase
  const [breakerAmps, setBreakerAmps] = useState<number>(16);
  const [cableLoopAmps, setCableLoopAmps] = useState<number>(16);

  const [exportError, setExportError] = useState<string | null>(null);

  const [eventName, setEventName] = useState<string>('');
  const [screenName, setScreenName] = useState<string>('');

  const activeCabinet = isCustomCabinet ? customCabinet : (cabinets.find((c) => c.id === selectedCabinetId) || cabinets[0]);
  const activeProcessor = isCustomProcessor ? customProcessor : (processors.find((p) => p.id === selectedProcessorId) || processors[0]);

  const results = useMemo(() => {
    let finalCols = 0;
    let finalRows = 0;

    if (calcMode === 'dimensions') {
      const cabWidthM = activeCabinet.width / 1000;
      const cabHeightM = activeCabinet.height / 1000;
      finalCols = Math.ceil(targetWidth / cabWidthM);
      finalRows = Math.ceil(targetHeight / cabHeightM);
    } else {
      finalCols = cols;
      finalRows = rows;
    }

    const totalCabinets = finalCols * finalRows;
    const arrayWidthM = (finalCols * activeCabinet.width) / 1000;
    const arrayHeightM = (finalRows * activeCabinet.height) / 1000;
    const resX = finalCols * activeCabinet.resX;
    const resY = finalRows * activeCabinet.resY;
    const totalPixels = resX * resY;
    const maxPowerW = totalCabinets * activeCabinet.maxPower;
    const avgPowerW = totalCabinets * activeCabinet.avgPower;
    const maxAmps = maxPowerW / voltage;
    const weightTotal = totalCabinets * activeCabinet.weight;

    // Data Cables Calculation
    const pixelsPerCabinet = activeCabinet.resX * activeCabinet.resY;
    const cabinetsPerDataPort = Math.max(1, Math.floor(activeProcessor.maxPixelsPerPort / pixelsPerCabinet));
    const dataCablesNeeded = Math.ceil(totalCabinets / cabinetsPerDataPort);

    // Power Cables Calculation (Account for physical cable limit + breaker derating)
    const effectiveAmpsPerLine = Math.min(breakerAmps * 0.8, cableLoopAmps);
    const powerPerCircuit = voltage * effectiveAmpsPerLine; 
    const cabinetsPerPowerCable = Math.max(1, Math.floor(powerPerCircuit / activeCabinet.maxPower));
    const powerCablesNeeded = Math.ceil(totalCabinets / cabinetsPerPowerCable);

    return {
      cols: finalCols,
      rows: finalRows,
      totalCabinets,
      arrayWidthM,
      arrayHeightM,
      resX,
      resY,
      totalPixels,
      maxPowerW,
      avgPowerW,
      maxAmps,
      weightTotal,
      dataCablesNeeded,
      powerCablesNeeded,
      cabinetsPerDataPort,
      cabinetsPerPowerCable,
      effectiveAmpsPerLine,
    };
  }, [calcMode, activeCabinet, activeProcessor, targetWidth, targetHeight, cols, rows, voltage, breakerAmps, cableLoopAmps]);

  const exportToPDF = async () => {
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.setTextColor(20, 20, 20);
        doc.text('Calculator Led Pro by MateCode', 14, 22);
        
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text('Configuration Report', 14, 30);
        
        doc.setFontSize(10);
        let yPos = 36;
        if (eventName) { doc.text(`Event: ${eventName}`, 14, yPos); yPos += 6; }
        if (screenName) { doc.text(`Screen: ${screenName}`, 14, yPos); yPos += 6; }
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, yPos);
        yPos += 6;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Dimensions & Cabinet', 'Value']],
          body: [
            ['Screen Width', `${results.arrayWidthM.toFixed(2)} m`],
            ['Screen Height', `${results.arrayHeightM.toFixed(2)} m`],
            ['Grid (Cols x Rows)', `${results.cols} x ${results.rows}`],
            ['Total Cabinets', `${results.totalCabinets} units`],
            ['Total Module Weight', `${results.weightTotal.toLocaleString()} kg`],
            ['Total Resolution', `${results.resX} x ${results.resY} px`],
            ['Total Pixels', `${results.totalPixels.toLocaleString()} px`],
          ],
          theme: 'grid',
          headStyles: { fillColor: [20, 20, 20] }
        });

        autoTable(doc, {
          head: [['Cabinet Specs', 'Value']],
          body: [
            ['Make & Model', `${activeCabinet.brand} ${activeCabinet.model}`],
            ['Pixel Pitch', `${activeCabinet.pitch} mm`],
            ['Module Dimensions', `${activeCabinet.width} x ${activeCabinet.height} mm`],
            ['Max Power (W/Cab)', `${activeCabinet.maxPower} W`],
          ],
          theme: 'grid',
          headStyles: { fillColor: [20, 20, 20] }
        });

        autoTable(doc, {
          head: [['Data & Processing', 'Value']],
          body: [
            ['Processor Model', `${activeProcessor.brand} ${activeProcessor.model}`],
            ['Total Units Needed', `${Math.ceil(results.dataCablesNeeded / activeProcessor.dataPorts)}`],
            ['Main Data Cables Needed', `${results.dataCablesNeeded}`],
            ['Cabinets per Data Loop', `${results.cabinetsPerDataPort}`],
          ],
          theme: 'grid',
          headStyles: { fillColor: [142, 68, 173] } // Purple tone
        });

        autoTable(doc, {
          head: [['Electrical Infrastructure', 'Value']],
          body: [
            ['Voltage System', `${voltage} V`],
            ['Main PDU / Breakout', `${pduCapacityAmps} A`],
            ['Breaker Limit per line', `${breakerAmps} A`],
            ['PowerCON Max Load', `${cableLoopAmps} A`],
            ['Total Peak Power', `${(results.maxPowerW / 1000).toFixed(2)} kW`],
            ['Total Peak Current', `${results.maxAmps.toFixed(2)} A`],
            ['Main Power Cables Needed', `${results.powerCablesNeeded}`],
            ['Max Cabinets per Power Cable', `${results.cabinetsPerPowerCable}`],
          ],
          theme: 'grid',
          headStyles: { fillColor: [231, 76, 60] } // Red tone
        });

      const lastTable = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable;
      if (results.maxAmps > pduCapacityAmps) {
        doc.setTextColor(255, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(
          'WARNING: Total Peak Current exceeds Main PDU Capacity!',
          14,
          (lastTable?.finalY ?? yPos) + 10,
        );
      }

        const drawSchematic = (title: string, chunks: {x: number, y: number}[][], colors: string[], startY: number) => {
          doc.setFontSize(14);
          doc.setTextColor(20, 20, 20);
          doc.setFont('helvetica', 'normal');
          doc.text(title, 14, startY);
          
          const availableWidth = 180;
          let cellWidth = Math.min(availableWidth / results.cols, 15);
          let cellHeight = (activeCabinet.height / activeCabinet.width) * cellWidth;
          
          if (cellHeight * results.rows > 80) { // constrain height if it gets too big
             cellHeight = 80 / results.rows;
             cellWidth = (activeCabinet.width / activeCabinet.height) * cellHeight;
          }

          const mapWidth = results.cols * cellWidth;
          const offsetX = 14 + (availableWidth - mapWidth) / 2;
          const offsetY = startY + 5;

          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.1);
          for (let c = 0; c < results.cols; c++) {
            for (let r = 0; r < results.rows; r++) {
               doc.rect(offsetX + c*cellWidth, offsetY + r*cellHeight, cellWidth, cellHeight);
            }
          }

          doc.setLineWidth(0.6);
          chunks.forEach((route, i) => {
             const colorHex = colors[i % colors.length];
             const rStr = parseInt(colorHex.substring(1,3), 16);
             const gStr = parseInt(colorHex.substring(3,5), 16);
             const bStr = parseInt(colorHex.substring(5,7), 16);
             doc.setDrawColor(rStr, gStr, bStr);
             doc.setFillColor(rStr, gStr, bStr);
             
             if (route.length > 0) {
               const startPoint = route[0];
               const sx = offsetX + startPoint.x * cellWidth + cellWidth / 2;
               const sy = offsetY + startPoint.y * cellHeight + cellHeight / 2;
               doc.circle(sx, sy, 1.5, 'DF'); 
             }

             route.forEach((p, pIndex) => {
                if(pIndex === route.length - 1) return;
                const next = route[pIndex + 1];
                const cx1 = offsetX + p.x * cellWidth + cellWidth / 2;
                const cy1 = offsetY + p.y * cellHeight + cellHeight / 2;
                const cx2 = offsetX + next.x * cellWidth + cellWidth / 2;
                const cy2 = offsetY + next.y * cellHeight + cellHeight / 2;

                const dx = cx2 - cx1;
                const dy = cy2 - cy1;
                const len = Math.sqrt(dx*dx + dy*dy);
                const padding = Math.min(cellWidth, cellHeight) * 0.25;
                if(len > 0) {
                  const nx = dx / len;
                  const ny = dy / len;
                  const newX1 = cx1 + nx * padding;
                  const newY1 = cy1 + ny * padding;
                  const newX2 = cx2 - nx * padding;
                  const newY2 = cy2 - ny * padding;
                  doc.line(newX1, newY1, newX2, newY2);

                  const angle = Math.atan2(dy, dx);
                  const asize = 1.5;
                  const aX1 = newX2 - asize * Math.cos(angle - Math.PI / 6);
                  const aY1 = newY2 - asize * Math.sin(angle - Math.PI / 6);
                  const aX2 = newX2 - asize * Math.cos(angle + Math.PI / 6);
                  const aY2 = newY2 - asize * Math.sin(angle + Math.PI / 6);
                  doc.triangle(newX2, newY2, aX1, aY1, aX2, aY2, 'DF');
                }
             })
          });

          return offsetY + (results.rows * cellHeight) + 15;
        };

        const DATA_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f97316', '#3b82f6', '#ec4899'];
        const POWER_COLORS = ['#e74c3c', '#f97316', '#f59e0b', '#eab308', '#dc2626'];

        const generateAutoChunks = (maxCap: number) => {
          const sequence: {x: number, y: number}[] = [];
          if (routingPriority === 'vertical') {
            const startX = routingStart.includes("right") ? results.cols - 1 : 0;
            const startYPos = routingStart.includes("bottom") ? results.rows - 1 : 0;
            const stepX = routingStart.includes("right") ? -1 : 1;
            for (let c = 0; c < results.cols; c++) {
              const x = startX + c * stepX;
              const isEvenCol = c % 2 === 0;
              const currentStartY = isEvenCol ? startYPos : (routingStart.includes("bottom") ? 0 : results.rows - 1);
              const stepY = isEvenCol ? (routingStart.includes("bottom") ? -1 : 1) : (routingStart.includes("bottom") ? 1 : -1);
              for (let r = 0; r < results.rows; r++) { sequence.push({ x, y: currentStartY + r * stepY }); }
            }
          } else {
             const startX = routingStart.includes("right") ? results.cols - 1 : 0;
             const startYPos = routingStart.includes("bottom") ? results.rows - 1 : 0;
             const stepY = routingStart.includes("bottom") ? -1 : 1;
             for (let r = 0; r < results.rows; r++) {
                const y = startYPos + r * stepY;
                const isEvenRow = r % 2 === 0;
                const currentStartX = isEvenRow ? startX : (routingStart.includes("right") ? 0 : results.cols - 1);
                const stepX = isEvenRow ? (routingStart.includes("right") ? -1 : 1) : (routingStart.includes("right") ? 1 : -1);
                for (let c = 0; c < results.cols; c++) { sequence.push({ x: currentStartX + c * stepX, y }); }
             }
          }
          
          const totalModules = sequence.length;
          if (totalModules === 0) return [];
          const numCables = Math.ceil(totalModules / maxCap);
          const baseCount = Math.floor(totalModules / numCables);
          const remainder = totalModules % numCables;
          
          const chunks: {x: number, y: number}[][] = [];
          let currentIndex = 0;
          for (let i = 0; i < numCables; i++) {
             const currentCapacity = baseCount + (i < remainder ? 1 : 0);
             chunks.push(sequence.slice(currentIndex, currentIndex + currentCapacity));
             currentIndex += currentCapacity;
          }
          return chunks;
        }

        const dataChunksToDraw = routingMode === 'auto' ? generateAutoChunks(results.cabinetsPerDataPort) : manualDataRoutes;
        const powerChunksToDraw = routingMode === 'auto' ? generateAutoChunks(results.cabinetsPerPowerCable) : manualPowerRoutes;

      doc.addPage();
      const dataSchematicEndY = drawSchematic(`Data Routing Schematic (${results.cabinetsPerDataPort} cab/line max)`, dataChunksToDraw, DATA_COLORS, 20);
      drawSchematic(`Power Routing Schematic (${results.cabinetsPerPowerCable} cab/line max)`, powerChunksToDraw, POWER_COLORS, dataSchematicEndY);

      const slug = [eventName, screenName]
        .filter(Boolean)
        .join('-')
        .replace(/[^a-zA-Z0-9-]+/g, '_');
       
      const stamp = new Date().toISOString().slice(0, 10);
      doc.save(`led-report_${slug || 'screen'}_${stamp}.pdf`);
      setExportError(null);
    } catch (error) {
      console.error('PDF export failed', error);
      setExportError('The PDF report could not be generated. Please try again.');
    }
  };

  const [routingType, setRoutingType] = useState<"data" | "power">("data");
  const [routingPriority, setRoutingPriority] = useState<
    "vertical" | "horizontal"
  >("vertical");
  const [routingStart, setRoutingStart] = useState<
    "top-left" | "top-right" | "bottom-left" | "bottom-right"
  >("bottom-left");

  const [routingMode, setRoutingMode] = useState<"auto" | "manual">("auto");
  const [manualDataRoutes, setManualDataRoutes] = useState<{x:number, y:number}[][]>([[]]);
  const [manualPowerRoutes, setManualPowerRoutes] = useState<{x:number, y:number}[][]>([[]]);
  
  // Hand-drawn routes hold cell coordinates, so they are only valid for the grid
  // they were drawn on. The grid comes from `results`, which in 'dimensions' mode
  // also changes with the target size and the selected cabinet — not just cols/rows.
  const routedGrid = `${results.cols}x${results.rows}`;
  const [drawnOnGrid, setDrawnOnGrid] = useState(routedGrid);
  if (drawnOnGrid !== routedGrid) {
    setDrawnOnGrid(routedGrid);
    setManualDataRoutes([[]]);
    setManualPowerRoutes([[]]);
  }

  return (
    <div className="animate-in fade-in duration-300">
      
      {/* Top Header & Export */}
      <div className="p-4 bg-[#111] border-b border-[#333] flex justify-between items-center sticky top-0 z-10 hidden sm:flex">
        <h1 className="text-xs font-bold tracking-widest uppercase text-white">Active Configuration Project</h1>
        <button 
          onClick={() => void exportToPDF()}
          className="flex items-center gap-2 bg-[#CCFF00] text-black px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-sm hover:bg-[#aacc00] transition-colors shadow-lg"
        >
          <Download className="w-3.5 h-3.5" />
          Export PDF Report
        </button>
      </div>
      <div className="p-4 bg-[#111] border-b border-[#333] flex justify-between items-center sm:hidden">
        <button 
          onClick={() => void exportToPDF()}
          className="flex-1 flex justify-center items-center gap-2 bg-[#CCFF00] text-black px-4 py-3 text-[10px] font-bold uppercase tracking-wider rounded-sm hover:bg-[#aacc00] transition-colors"
        >
          <Download className="w-4 h-4" />
          Download PDF Export
        </button>
      </div>

      <div role="alert" aria-live="polite">
        {exportError && (
          <p className="px-4 py-3 bg-[#2C1A17] border-b border-[#FF4444] text-[#FF9F91] text-xs">
            {exportError}
          </p>
        )}
      </div>

      {/* Top Section */}
      <section className="p-4 sm:p-6 bg-[#161616] border-b border-[#333] flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-[10px] opacity-50 uppercase mb-1">Event Name</label>
            <input 
              type="text" 
              placeholder="e.g. Lollapalooza 2026"
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#444] px-3 py-2 text-white font-mono focus:border-[#CCFF00] focus:outline-none transition-colors"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] opacity-50 uppercase mb-1">Screen Name</label>
            <input 
              type="text" 
              placeholder="e.g. Main Stage / DJ Booth"
              value={screenName}
              onChange={e => setScreenName(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#444] px-3 py-2 text-white font-mono focus:border-[#CCFF00] focus:outline-none transition-colors"
            />
          </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 border-b border-[#333]">
        <div className="border-b xl:border-b-0 xl:border-r border-[#333] flex flex-col">
          <div className="p-6">
            <div className="flex justify-between items-end mb-4 xl:mb-6 mt-2 xl:mt-0">
              <h2 className="text-xs font-bold tracking-widest uppercase text-[#CCFF00] flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Dimension & Cabinet
              </h2>
              <span className="text-[10px] font-mono opacity-50 uppercase">REF: {activeCabinet.model}</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] opacity-50 uppercase mb-1">Gabinete / Panel</label>
                <select
                  value={isCustomCabinet ? 'custom' : selectedCabinetId}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setIsCustomCabinet(true);
                    } else {
                      setIsCustomCabinet(false);
                      setSelectedCabinetId(e.target.value);
                    }
                  }}
                  className="w-full bg-[#1A1A1A] border border-[#444] px-3 py-2 font-mono text-[#CCFF00] focus:border-[#CCFF00] focus:outline-none transition-colors appearance-none"
                >
                  {cabinets.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.brand} {c.model} ({c.pitch}mm)
                    </option>
                  ))}
                  <option value="custom">-- Custom Cabinet --</option>
                </select>
              </div>

              {isCustomCabinet && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#161616] p-3 border border-[#333]">
                  <div>
                    <label className="block text-[9px] opacity-60 uppercase mb-1">Ancho(mm)</label>
                    <input type="number" value={customCabinet.width} onChange={e => setCustomCabinet({...customCabinet, width: Number(e.target.value)})} className="w-full bg-[#0A0A0A] border border-[#444] px-2 py-1 text-xs text-white" />
                  </div>
                  <div>
                    <label className="block text-[9px] opacity-60 uppercase mb-1">Alto(mm)</label>
                    <input type="number" value={customCabinet.height} onChange={e => setCustomCabinet({...customCabinet, height: Number(e.target.value)})} className="w-full bg-[#0A0A0A] border border-[#444] px-2 py-1 text-xs text-white" />
                  </div>
                  <div>
                    <label className="block text-[9px] opacity-60 uppercase mb-1">ResX(px)</label>
                    <input type="number" value={customCabinet.resX} onChange={e => setCustomCabinet({...customCabinet, resX: Number(e.target.value)})} className="w-full bg-[#0A0A0A] border border-[#444] px-2 py-1 text-xs text-white" />
                  </div>
                  <div>
                    <label className="block text-[9px] opacity-60 uppercase mb-1">ResY(px)</label>
                    <input type="number" value={customCabinet.resY} onChange={e => setCustomCabinet({...customCabinet, resY: Number(e.target.value)})} className="w-full bg-[#0A0A0A] border border-[#444] px-2 py-1 text-xs text-white" />
                  </div>
                  <div>
                    <label className="block text-[9px] opacity-60 uppercase mb-1">Max Pwr(W)</label>
                    <input type="number" value={customCabinet.maxPower} onChange={e => setCustomCabinet({...customCabinet, maxPower: Number(e.target.value)})} className="w-full bg-[#0A0A0A] border border-[#444] px-2 py-1 text-xs text-white" />
                  </div>
                  <div>
                    <label className="block text-[9px] opacity-60 uppercase mb-1">Pitch(mm)</label>
                    <input type="number" value={customCabinet.pitch} onChange={e => setCustomCabinet({...customCabinet, pitch: Number(e.target.value)})} className="w-full bg-[#0A0A0A] border border-[#444] px-2 py-1 text-xs text-white" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] opacity-50 uppercase mb-2">Modo de Cálculo</label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCalcMode('dimensions')}
                    className={`flex-1 py-2 text-[10px] tracking-wider uppercase font-bold rounded-sm border transition-colors ${
                      calcMode === 'dimensions' ? 'bg-[#CCFF00] text-black border-[#CCFF00]' : 'text-neutral-500 border-transparent hover:border-[#444] hover:bg-[#222]'
                    }`}
                  >
                    Por Metros
                  </button>
                  <button
                    onClick={() => setCalcMode('count')}
                    className={`flex-1 py-2 text-[10px] tracking-wider uppercase font-bold rounded-sm border transition-colors ${
                      calcMode === 'count' ? 'bg-[#CCFF00] text-black border-[#CCFF00]' : 'text-neutral-500 border-transparent hover:border-[#444] hover:bg-[#222]'
                    }`}
                  >
                    Por Cantidad
                  </button>
                </div>
              </div>

              {calcMode === 'dimensions' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] opacity-50 uppercase mb-1">Base (m)</label>
                    <input
                      type="number"
                      value={targetWidth}
                      onChange={(e) => setTargetWidth(Number(e.target.value))}
                      min={0.5} step={0.5}
                      className="w-full bg-[#1A1A1A] border border-[#444] px-3 py-2 font-mono text-white focus:border-[#CCFF00] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] opacity-50 uppercase mb-1">Altura (m)</label>
                    <input
                      type="number"
                      value={targetHeight}
                      onChange={(e) => setTargetHeight(Number(e.target.value))}
                      min={0.5} step={0.5}
                      className="w-full bg-[#1A1A1A] border border-[#444] px-3 py-2 font-mono text-white focus:border-[#CCFF00] focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] opacity-50 uppercase mb-1">Columnas (H-Cab)</label>
                    <input
                      type="number"
                      value={cols}
                      onChange={(e) => setCols(Number(e.target.value))}
                      min={1} step={1}
                      className="w-full bg-[#1A1A1A] border border-[#444] px-3 py-2 font-mono text-white focus:border-[#CCFF00] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] opacity-50 uppercase mb-1">Filas (V-Cab)</label>
                    <input
                      type="number"
                      value={rows}
                      onChange={(e) => setRows(Number(e.target.value))}
                      min={1} step={1}
                      className="w-full bg-[#1A1A1A] border border-[#444] px-3 py-2 font-mono text-white focus:border-[#CCFF00] focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6 bg-[#0A0A0A] border-t border-[#333] flex-1">
             <div className="flex justify-between items-end mb-4">
               <h2 className="text-xs font-bold tracking-widest uppercase text-blue-400">Total Output</h2>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-[#222] pb-1">
                    <span className="text-[10px] opacity-50 uppercase">Total Cabinets</span>
                    <span className="font-mono text-white text-xs">{results.cols} × {results.rows} = {results.totalCabinets}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#222] pb-1">
                    <span className="text-[10px] opacity-50 uppercase">Physical Size</span>
                    <span className="font-mono text-white text-xs">{results.arrayWidthM.toFixed(2)}m × {results.arrayHeightM.toFixed(2)}m</span>
                  </div>
                  <div className="flex justify-between border-b border-[#222] pb-1">
                    <span className="text-[10px] opacity-50 uppercase">Total Weight</span>
                    <span className="font-mono text-white text-xs">{results.weightTotal.toLocaleString()} kg</span>
                  </div>
                </div>
                <div className="bg-[#111] border border-[#333] p-4 flex flex-col justify-center items-center text-center">
                  <div className="text-[10px] uppercase opacity-40 mb-2">Total Resolution</div>
                  <div className="text-xl sm:text-2xl font-mono tracking-tighter text-white">{results.resX.toLocaleString()}</div>
                  <div className="text-[10px] font-mono text-[#CCFF00]">× {results.resY.toLocaleString()} px</div>
                  <div className="mt-2 text-[9px] uppercase opacity-40">Pixels: {results.totalPixels.toLocaleString()}</div>
                </div>
             </div>
          </div>
        </div>

        {/* Right Top Section: Infrastructure & Data */}
        <div className="grid grid-rows-[auto_1fr]">
          
          {/* Processing & Data Cables */}
          <div className="p-6 border-b border-[#333] bg-[#0F0F0F]">
             <div className="flex justify-between items-end mb-4">
               <h2 className="text-xs font-bold tracking-widest uppercase text-fuchsia-400 flex items-center gap-2">
                 <Cpu className="w-4 h-4" /> Processing & Data Mapper
               </h2>
             </div>
             
             <div className="space-y-4">
                <div>
                  <label className="block text-[10px] opacity-50 uppercase mb-1">Processor / Sending Box</label>
                  <select
                    value={isCustomProcessor ? 'custom' : selectedProcessorId}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomProcessor(true);
                      } else {
                        setIsCustomProcessor(false);
                        setSelectedProcessorId(e.target.value);
                      }
                    }}
                    className="w-full bg-[#1A1A1A] border border-[#444] px-3 py-2 font-mono text-fuchsia-400 focus:border-fuchsia-400 focus:outline-none transition-colors appearance-none"
                  >
                    {processors.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.brand} {p.model} ({p.dataPorts} Ports)
                      </option>
                    ))}
                    <option value="custom">-- Custom Processor --</option>
                  </select>
                </div>
                
                {isCustomProcessor && (
                  <div className="grid grid-cols-2 gap-2 bg-[#161616] p-3 border border-[#333]">
                    <div>
                      <label className="block text-[9px] opacity-60 uppercase mb-1">Out Ports</label>
                      <input type="number" value={customProcessor.dataPorts} onChange={e => setCustomProcessor({...customProcessor, dataPorts: Number(e.target.value)})} className="w-full bg-[#0A0A0A] border border-[#444] px-2 py-1 text-xs text-white" />
                    </div>
                    <div>
                      <label className="block text-[9px] opacity-60 uppercase mb-1">Max PX / Port</label>
                      <input type="number" value={customProcessor.maxPixelsPerPort} onChange={e => setCustomProcessor({...customProcessor, maxPixelsPerPort: Number(e.target.value)})} className="w-full bg-[#0A0A0A] border border-[#444] px-2 py-1 text-xs text-white" />
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-[#161616] p-3 border border-[#333]">
                    <div className="text-[9px] opacity-40 uppercase">Main Data Cables Req.</div>
                    <div className="text-xl sm:text-2xl font-mono text-fuchsia-400">{results.dataCablesNeeded}</div>
                    <div className="text-[9px] opacity-60 mt-1">~{results.cabinetsPerDataPort} cab / cable</div>
                  </div>
                  <div className={`bg-[#161616] p-3 border ${results.dataCablesNeeded > activeProcessor.dataPorts ? 'border-[#FF4444]' : 'border-[#333]'}`}>
                    <div className="text-[9px] opacity-40 uppercase">Processors Needed</div>
                    <div className={`text-xl sm:text-2xl font-mono ${results.dataCablesNeeded > activeProcessor.dataPorts ? 'text-[#FF4444]' : 'text-white'}`}>
                      {Math.ceil(results.dataCablesNeeded / activeProcessor.dataPorts)}
                      <span className="text-xs ml-1 opacity-50">units</span>
                    </div>
                    {results.dataCablesNeeded > activeProcessor.dataPorts && (
                      <div className="text-[9px] text-[#FF4444] mt-1 font-bold tracking-widest uppercase">CAPACITY EXCEEDED!</div>
                    )}
                  </div>
                </div>
             </div>
          </div>

          {/* Electrical Load Analysis */}
          <div className="p-6 bg-[#111]">
            <h2 className="text-xs font-bold tracking-widest uppercase mb-4 text-[#FF4444]">Electrical Infrastructure</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] opacity-50 uppercase mb-1">Acometida / Main PDU</label>
                  <select
                    value={pduCapacityAmps}
                    onChange={(e) => setPduCapacityAmps(Number(e.target.value))}
                    className="w-full bg-[#1A1A1A] border border-[#444] px-2 py-2 font-mono text-white focus:border-[#FF4444] focus:outline-none appearance-none text-xs"
                  >
                    <option value={16}>Monofásica 16A (1 linea)</option>
                    <option value={32}>Monofásica 32A (1 linea)</option>
                    <option value={63}>Monofásica 63A (1 linea)</option>
                    <option value={96}>Trifásica 32A (3x32A) - Típica</option>
                    <option value={189}>Trifásica 63A (3x63A)</option>
                    <option value={375}>Trifásica 125A (3x125A)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] opacity-50 uppercase mb-1">Breaker Limit</label>
                  <select
                    value={breakerAmps}
                    onChange={(e) => setBreakerAmps(Number(e.target.value))}
                    className="w-full bg-[#1A1A1A] border border-[#444] px-2 py-2 font-mono text-white focus:border-[#FF4444] focus:outline-none appearance-none text-xs"
                  >
                    <option value={10}>10A Circuit</option>
                    <option value={16}>16A Circuit</option>
                    <option value={20}>20A Circuit</option>
                    <option value={32}>32A Circuit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] opacity-50 uppercase mb-1">PowerCON Max Load</label>
                  <select
                     value={cableLoopAmps}
                     onChange={(e) => setCableLoopAmps(Number(e.target.value))}
                     className="w-full bg-[#1A1A1A] border border-[#444] px-2 py-2 font-mono text-white focus:border-[#FF4444] focus:outline-none appearance-none text-xs"
                  >
                     <option value={10}>10A (Safe Limit)</option>
                     <option value={16}>16A (True1/HQ)</option>
                     <option value={20}>20A (Direct/Heavy)</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="bg-black p-3 border border-[#333] flex flex-col justify-center">
                  <div className="text-[9px] opacity-40 uppercase">Main Power Cables Req.</div>
                  <div className="text-xl sm:text-2xl font-mono text-amber-400">{results.powerCablesNeeded}</div>
                  <div className="text-[9px] opacity-60 mt-1 flex justify-between">
                     <span>Max {results.cabinetsPerPowerCable} cbs/cable</span>
                     <span>({results.effectiveAmpsPerLine.toFixed(1)}A cap)</span>
                  </div>
                </div>
                <div className={`bg-black p-3 border flex flex-col justify-center ${results.maxAmps > pduCapacityAmps ? 'border-[#FF4444]' : 'border-[#333]'}`}>
                  <div className="text-[9px] opacity-40 uppercase">Total Load / Peak Amp</div>
                  <div className={`text-xl sm:text-2xl font-mono ${results.maxAmps > pduCapacityAmps ? 'text-[#FF4444]' : 'text-white'}`}>
                    {results.maxAmps.toFixed(1)} A
                    <span className="text-xs opacity-50 ml-1">/ {pduCapacityAmps}A</span>
                  </div>
                  <div className="text-[9px] opacity-60 mt-1">Max Power: {(results.maxPowerW / 1000).toFixed(1)} kW</div>
                  {results.maxAmps > pduCapacityAmps && (
                     <div className="text-[9px] text-[#FF4444] font-bold uppercase mt-2 border-t border-[#FF4444] pt-1 pt-2">
                       ¡Carga excede capacidad del circuito/PDU!
                     </div>
                  )}
                </div>
              </div>
              
            </div>
          </div>

        </div>
      </section>

      {/* Schematics Section */}
      <section className="border-b border-[#333]">
         <RoutingDrawings 
           cols={results.cols} 
           rows={results.rows} 
           cabinetWidth={activeCabinet.width}
           cabinetHeight={activeCabinet.height}
           dataMaxCapacity={results.cabinetsPerDataPort}
           powerMaxCapacity={results.cabinetsPerPowerCable}
           routingType={routingType}
           setRoutingType={setRoutingType}
           routingPriority={routingPriority}
           setRoutingPriority={setRoutingPriority}
           routingStart={routingStart}
           setRoutingStart={setRoutingStart}
           routingMode={routingMode}
           setRoutingMode={setRoutingMode}
           manualDataRoutes={manualDataRoutes}
           setManualDataRoutes={setManualDataRoutes}
           manualPowerRoutes={manualPowerRoutes}
           setManualPowerRoutes={setManualPowerRoutes}
         />
      </section>
    </div>
  );
}

