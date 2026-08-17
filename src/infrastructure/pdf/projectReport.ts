/**
 * The PDF work order.
 *
 * Takes a finished domain calculation and returns a file. It knows nothing about
 * React or component state, and it reads its cable colours from the same palette
 * the on-screen schematic uses — the two drawings cannot disagree.
 */

import type { ProjectCalculation } from '../../domain/calculate';
import type { Cabinet, Processor } from '../../domain/catalog';
import { DATA_CABLE_COLORS, POWER_CABLE_COLORS } from '../../domain/routing/palette';
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
  doc.text('Configuration Report', PAGE_LEFT, 30);

  doc.setFontSize(10);
  let yPos = 36;
  for (const line of [
    report.eventName && `Event: ${report.eventName}`,
    report.screenName && `Screen: ${report.screenName}`,
    `Date: ${new Date().toLocaleDateString()}`,
  ]) {
    if (!line) continue;
    doc.text(line, PAGE_LEFT, yPos);
    yPos += 6;
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Dimensions & Cabinet', 'Value']],
    body: [
      ['Screen Width', `${calc.arrayWidthM.toFixed(2)} m`],
      ['Screen Height', `${calc.arrayHeightM.toFixed(2)} m`],
      ['Grid (Cols x Rows)', `${calc.cols} x ${calc.rows}`],
      ['Total Cabinets', `${calc.totalCabinets} units`],
      ['Total Module Weight', `${calc.weightTotal.toLocaleString()} kg`],
      ['Total Resolution', `${calc.resX} x ${calc.resY} px`],
      ['Total Pixels', `${calc.totalPixels.toLocaleString()} px`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [20, 20, 20] },
  });

  autoTable(doc, {
    head: [['Cabinet Specs', 'Value']],
    body: [
      ['Make & Model', `${cabinet.brand} ${cabinet.model}`],
      ['Pixel Pitch', `${cabinet.pitch} mm`],
      ['Module Dimensions', `${cabinet.width} x ${cabinet.height} mm`],
      ['Max Power (W/Cab)', `${cabinet.maxPower} W`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [20, 20, 20] },
  });

  autoTable(doc, {
    head: [['Data & Processing', 'Value']],
    body: [
      ['Processor Model', `${processor.brand} ${processor.model}`],
      ['Total Units Needed', `${calc.processorsNeeded}`],
      ['Main Data Cables Needed', `${calc.dataCablesNeeded}`],
      ['Cabinets per Data Loop', `${calc.cabinetsPerDataPort}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [142, 68, 173] },
  });

  autoTable(doc, {
    head: [['Electrical Infrastructure', 'Value']],
    body: [
      ['Voltage System', `${report.voltage} V`],
      ['Main PDU / Breakout', `${report.pduCapacityAmps} A`],
      ['Breaker Limit per line', `${report.breakerAmps} A`],
      ['PowerCON Max Load', `${report.cableLoopAmps} A`],
      ['Total Peak Power', `${(calc.maxPowerW / 1000).toFixed(2)} kW`],
      ['Total Peak Current', `${calc.maxAmps.toFixed(2)} A`],
      ['Main Power Cables Needed', `${calc.powerCablesNeeded}`],
      ['Max Cabinets per Power Cable', `${calc.cabinetsPerPowerCable}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [231, 76, 60] },
  });

  if (calc.maxAmps > report.pduCapacityAmps) {
    const lastTable = (doc as unknown as WithLastTable).lastAutoTable;
    doc.setTextColor(255, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(
      'WARNING: Total Peak Current exceeds Main PDU Capacity!',
      PAGE_LEFT,
      (lastTable?.finalY ?? yPos) + 10,
    );
  }

  /** Draws the cabinet grid with its cable runs; returns the y to continue from. */
  const drawSchematic = (
    title: string,
    routes: GridPosition[][],
    colors: readonly string[],
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
      const [r, g, b] = rgb(colors[i % colors.length]);
      doc.setDrawColor(r, g, b);
      doc.setFillColor(r, g, b);

      const first = route[0];
      if (first) {
        const start = centreOf(first);
        doc.circle(start.x, start.y, 1.5, 'DF');
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
      }
    });

    return offsetY + calc.rows * cellHeight + 15;
  };

  doc.addPage();
  const afterData = drawSchematic(
    `Data Routing Schematic (${calc.cabinetsPerDataPort} cab/line max)`,
    report.dataRoutes,
    DATA_CABLE_COLORS,
    20,
  );
  drawSchematic(
    `Power Routing Schematic (${calc.cabinetsPerPowerCable} cab/line max)`,
    report.powerRoutes,
    POWER_CABLE_COLORS,
    afterData,
  );

  return doc.output('blob');
}
