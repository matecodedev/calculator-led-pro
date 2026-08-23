/**
 * The PDF work order.
 *
 * Takes a finished domain calculation and returns a file. It knows nothing about
 * React or component state, and it reads its cable colours from the same palette
 * the on-screen schematic uses — the two drawings cannot disagree.
 */

import type { ProjectCalculation } from '../../domain/calculate';
import type { Cabinet, Processor } from '../../domain/catalog';
import {
  DATA_CABLE_COLORS,
  OVER_CAPACITY_COLOR,
  POWER_CABLE_COLORS,
} from '../../domain/routing/palette';
import type { RoutingDemand } from '../../domain/routing/demand';
import type { GridPosition } from '../../domain/routing/serpentine';

export interface ProjectReport {
  eventName: string;
  screenName: string;
  cabinet: Cabinet;
  processor: Processor;
  calculation: ProjectCalculation;
  voltage: number;
  pduCapacityAmps: number;
  breakerAmps: number;
  cableLoopAmps: number;
  dataRoutes: GridPosition[][];
  powerRoutes: GridPosition[][];
  /**
   * Counted off the routes above. The report used to divide the cabinet count
   * by the loop capacity and print a smaller number than the schematic on the
   * next page drew, which is a shortfall a crew discovers on site.
   */
  demand: RoutingDemand;
}

/** jspdf-autotable attaches this to the document but does not declare it. */
type WithLastTable = { lastAutoTable?: { finalY?: number } };

const PAGE_LEFT = 14;
const SCHEMATIC_WIDTH = 180;
const SCHEMATIC_MAX_HEIGHT = 80;

function rgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/** A filename a technician can tell apart from the other three screens. */
export function reportFilename({
  eventName,
  screenName,
}: Pick<ProjectReport, 'eventName' | 'screenName'>): string {
  const slug = [eventName, screenName]
    .filter(Boolean)
    .join('-')
    .replace(/[^a-zA-Z0-9-]+/g, '_');
  const stamp = new Date().toISOString().slice(0, 10);

  return `led-report_${slug || 'screen'}_${stamp}.pdf`;
}

export async function renderProjectReport(report: ProjectReport): Promise<Blob> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const { cabinet, processor, calculation: calc } = report;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text('Calculator Led Pro by MateCode', PAGE_LEFT, 22);

  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text('Reporte de configuración', PAGE_LEFT, 30);

  doc.setFontSize(10);
  let yPos = 36;
  for (const line of [
    report.eventName && `Evento: ${report.eventName}`,
    report.screenName && `Pantalla: ${report.screenName}`,
    `Fecha: ${new Date().toLocaleDateString('es-AR')}`,
  ]) {
    if (!line) continue;
    doc.text(line, PAGE_LEFT, yPos);
    yPos += 6;
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Medidas y gabinete', 'Valor']],
    body: [
      ['Ancho de pantalla', `${calc.arrayWidthM.toFixed(2)} m`],
      ['Alto de pantalla', `${calc.arrayHeightM.toFixed(2)} m`],
      ['Grilla (col x fila)', `${calc.cols} x ${calc.rows}`],
      ['Gabinetes totales', `${calc.totalCabinets} unid.`],
      ['Peso total', `${calc.weightTotal.toLocaleString()} kg`],
      ['Resolución total', `${calc.resX} x ${calc.resY} px`],
      ['Píxeles totales', `${calc.totalPixels.toLocaleString()} px`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [20, 20, 20] },
  });

  autoTable(doc, {
    head: [['Ficha del gabinete', 'Valor']],
    body: [
      ['Marca y modelo', `${cabinet.brand} ${cabinet.model}`],
      ['Pitch', `${cabinet.pitch} mm`],
      ['Medidas del módulo', `${cabinet.width} x ${cabinet.height} mm`],
      ['Potencia máx. (W/gab)', `${cabinet.maxPower} W`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [20, 20, 20] },
  });

  autoTable(doc, {
    head: [['Data y procesamiento', 'Valor']],
    body: [
      ['Procesador', `${processor.brand} ${processor.model}`],
      ['Procesadores necesarios', `${report.demand.processorsNeeded}`],
      ['Cables de data necesarios', `${report.demand.dataCables}`],
      ['Gabinetes por loop de data', `${calc.cabinetsPerDataPort}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [142, 68, 173] },
  });

  autoTable(doc, {
    head: [['Infraestructura eléctrica', 'Valor']],
    body: [
      ['Tensión de red', `${report.voltage} V`],
      ['PDU principal', `${report.pduCapacityAmps} A`],
      ['Térmico por línea', `${report.breakerAmps} A`],
      ['Carga máx. powerCON', `${report.cableLoopAmps} A`],
      ['Potencia pico total', `${(calc.maxPowerW / 1000).toFixed(2)} kW`],
      ['Corriente pico total', `${calc.maxAmps.toFixed(2)} A`],
      ['Cables de power necesarios', `${report.demand.powerCables}`],
      ['Gabinetes máx. por cable', `${calc.cabinetsPerPowerCable}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [231, 76, 60] },
  });

  if (calc.maxAmps > report.pduCapacityAmps) {
    const lastTable = (doc as unknown as WithLastTable).lastAutoTable;
    doc.setTextColor(255, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(
      'ATENCIÓN: la corriente pico supera la capacidad del PDU principal.',
      PAGE_LEFT,
      (lastTable?.finalY ?? yPos) + 10,
    );
  }

  /** Draws the cabinet grid with its cable runs; returns the y to continue from. */
  const drawSchematic = (
    title: string,
    routes: GridPosition[][],
    colors: readonly string[],
    capacity: number,
    startY: number,
  ): number => {
    doc.setFontSize(14);
    doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'normal');
    doc.text(title, PAGE_LEFT, startY);

    let cellWidth = Math.min(SCHEMATIC_WIDTH / calc.cols, 15);
    let cellHeight = (cabinet.height / cabinet.width) * cellWidth;
    if (cellHeight * calc.rows > SCHEMATIC_MAX_HEIGHT) {
      cellHeight = SCHEMATIC_MAX_HEIGHT / calc.rows;
      cellWidth = (cabinet.width / cabinet.height) * cellHeight;
    }

    const offsetX = PAGE_LEFT + (SCHEMATIC_WIDTH - calc.cols * cellWidth) / 2;
    const offsetY = startY + 5;
    const centreOf = (p: GridPosition) => ({
      x: offsetX + p.x * cellWidth + cellWidth / 2,
      y: offsetY + p.y * cellHeight + cellHeight / 2,
    });

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    for (let c = 0; c < calc.cols; c++) {
      for (let r = 0; r < calc.rows; r++) {
        doc.rect(offsetX + c * cellWidth, offsetY + r * cellHeight, cellWidth, cellHeight);
      }
    }

    doc.setLineWidth(0.6);
    routes.forEach((route, i) => {
      // The printed schematic has to carry the same fault vocabulary as the
      // screen: reserved red, a broken line, and the carried-versus-rated count.
      const overCapacity = route.length > capacity;
      const [r, g, b] = rgb(overCapacity ? OVER_CAPACITY_COLOR : colors[i % colors.length]);
      doc.setDrawColor(r, g, b);
      doc.setFillColor(r, g, b);
      doc.setLineDashPattern(overCapacity ? [1.4, 1] : [], 0);

      const first = route[0];
      if (first) {
        const start = centreOf(first);

        // The main, drawn to the floor: the processor and the PDU are on the
        // ground, so this is the cable the crew actually pulls. Solid and thin,
        // so it never reads as part of the daisy chain.
        const floorY = offsetY + calc.rows * cellHeight;
        doc.setLineDashPattern([], 0);
        doc.setLineWidth(0.25);
        doc.line(start.x, start.y, start.x, floorY);
        doc.setLineWidth(0.6);
        doc.line(start.x - cellWidth * 0.15, floorY, start.x + cellWidth * 0.15, floorY);
        if (overCapacity) doc.setLineDashPattern([1.4, 1], 0);

        doc.circle(start.x, start.y, 1.5, 'DF');

        if (overCapacity) {
          doc.setLineDashPattern([], 0);
          doc.setFontSize(7);
          doc.setTextColor(r, g, b);
          doc.setFont('helvetica', 'bold');
          doc.text(`${route.length}/${capacity}`, start.x, start.y + 4.5, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          doc.setLineDashPattern([1.4, 1], 0);
        }
      }

      for (let step = 0; step < route.length - 1; step++) {
        const from = centreOf(route[step]);
        const to = centreOf(route[step + 1]);

        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.hypot(dx, dy);
        if (length === 0) continue;

        // Pull the link back from both cabinet centres so the arrow reads clearly.
        const padding = Math.min(cellWidth, cellHeight) * 0.25;
        const nx = dx / length;
        const ny = dy / length;
        const x1 = from.x + nx * padding;
        const y1 = from.y + ny * padding;
        const x2 = to.x - nx * padding;
        const y2 = to.y - ny * padding;
        doc.line(x1, y1, x2, y2);
        // The direction mark stays solid: dashing a 1.5mm filled triangle only
        // makes it ragged, and the broken line already carries the warning.
        doc.setLineDashPattern([], 0);

        const angle = Math.atan2(dy, dx);
        const head = 1.5;
        doc.triangle(
          x2,
          y2,
          x2 - head * Math.cos(angle - Math.PI / 6),
          y2 - head * Math.sin(angle - Math.PI / 6),
          x2 - head * Math.cos(angle + Math.PI / 6),
          y2 - head * Math.sin(angle + Math.PI / 6),
          'DF',
        );

        if (overCapacity) doc.setLineDashPattern([1.4, 1], 0);
      }

      doc.setLineDashPattern([], 0);
    });

    return offsetY + calc.rows * cellHeight + 15;
  };

  doc.addPage();
  const afterData = drawSchematic(
    `Esquemático de ruteo DATA (máx ${calc.cabinetsPerDataPort} gab/línea)`,
    report.dataRoutes,
    DATA_CABLE_COLORS,
    calc.cabinetsPerDataPort,
    20,
  );
  drawSchematic(
    `Esquemático de ruteo POWER (máx ${calc.cabinetsPerPowerCable} gab/línea)`,
    report.powerRoutes,
    POWER_CABLE_COLORS,
    calc.cabinetsPerPowerCable,
    afterData,
  );

  return doc.output('blob');
}
