/**
 * The PDF work order.
 *
 * This is the artefact the crew builds from: it leaves the app and lands in the
 * hands of a rigger, an electrician and whoever signs for the gear. So it covers
 * the whole event — a cover with the figures the venue is asked for, a summary
 * of every screen, then each screen in full with its schematics.
 *
 * It takes finished plans and draws them. It knows nothing about React or
 * component state, and it reads its cable colours from the same palette the
 * on-screen schematic uses, so the two drawings cannot disagree.
 */

import type { EventSummary } from '../../domain/project/eventSummary';
import type { ScreenPlan } from '../../domain/project/screenTotals';
import {
  PRINT_DATA_CABLE_COLORS,
  PRINT_OVER_CAPACITY_COLOR,
  PRINT_POWER_CABLE_COLORS,
} from '../../domain/routing/palette';
import type { GridPosition } from '../../domain/routing/serpentine';

export interface ProjectReport {
  eventName: string;
  screens: ScreenPlan[];
  summary: EventSummary;
}

/** jspdf-autotable attaches this to the document but does not declare it. */
type WithLastTable = { lastAutoTable?: { finalY?: number } };

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

/**
 * Print ink, not screen paint. The app's lime disappears on white paper, so the
 * report carries its own restrained palette: near-black for text, one grey for
 * rules and secondary figures, and red reserved — as everywhere else in this
 * app — for a physical hazard.
 */
const INK: [number, number, number] = [24, 24, 24];
const MUTED: [number, number, number] = [122, 122, 122];
const RULE: [number, number, number] = [214, 214, 214];
const DANGER: [number, number, number] = [200, 32, 32];
const BAND: [number, number, number] = [244, 244, 244];

function rgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

const amps = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(1)} A`;
const kw = (value: number) => `${(value / 1000).toFixed(2)} kW`;

/** "Main" or, before it is named, its position in the event. */
const screenLabel = (plan: ScreenPlan, index: number) =>
  plan.screen.name.trim() || `Pantalla ${index + 1}`;

/** A filename the crew can tell apart from the other three events. */
export function reportFilename({ eventName }: Pick<ProjectReport, 'eventName'>): string {
  const slug = (eventName || 'evento').trim().replace(/[^a-zA-Z0-9-]+/g, '_');
  const stamp = new Date().toISOString().slice(0, 10);

  return `plan-led_${slug}_${stamp}.pdf`;
}

export async function renderProjectReport(report: ProjectReport): Promise<Blob> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF();
  const { summary } = report;
  const eventTitle = report.eventName || 'Evento sin nombre';

  const finalY = () => (doc as unknown as WithLastTable).lastAutoTable?.finalY ?? MARGIN;

  /** A hairline the eye reads as structure, without the weight of a box. */
  const rule = (y: number) => {
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  };

  const runningHead = (right: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('CALCULATOR LED PRO', MARGIN, 12);
    doc.text(right, PAGE_W - MARGIN, 12, { align: 'right' });
    rule(14.5);
  };

  const sectionTitle = (text: string, y: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(text.toUpperCase(), MARGIN, y);
    rule(y + 2);
    return y + 9;
  };

  /** Shared table look: no heavy fills, numbers right, rules instead of boxes. */
  const tableStyles = {
    theme: 'plain' as const,
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 },
      textColor: INK,
      lineColor: RULE,
      lineWidth: 0,
    },
    headStyles: {
      fontStyle: 'bold' as const,
      fontSize: 7.5,
      textColor: MUTED,
      fillColor: BAND,
    },
    alternateRowStyles: { fillColor: [252, 252, 252] as [number, number, number] },
  };

  // ---------------------------------------------------------------- cover ---

  runningHead(new Date().toLocaleDateString('es-AR'));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...INK);
  doc.text(eventTitle, MARGIN, 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text(
    `Plan de montaje · ${report.screens.length} ${
      report.screens.length === 1 ? 'pantalla' : 'pantallas'
    }`,
    MARGIN,
    37,
  );

  // The four figures a crew chief reads before anything else.
  let y = sectionTitle('Resumen eléctrico del evento', 50);

  const figure = (label: string, value: string, note: string, column: number, danger = false) => {
    const x = MARGIN + column * (CONTENT_W / 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(...(danger ? DANGER : INK));
    doc.text(value, x, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(note, x, y + 13);
  };

  figure(
    'Pico total',
    amps(summary.totalMaxAmps),
    'todo blanco, brillo pleno',
    0,
    summary.overCapacity,
  );
  figure('Esperado', amps(summary.totalExpectedAmps), 'como se va a usar', 1);
  figure(
    'Acometida',
    summary.capacityAmps === null ? '—' : amps(summary.capacityAmps),
    summary.capacityAmps === null ? 'sin declarar' : 'declarada',
    2,
  );
  figure(
    'Margen',
    summary.headroomPercent === null ? '—' : `${summary.headroomPercent.toFixed(0)}%`,
    summary.capacityAmps === null ? 'sin acometida' : 'sobre el pico',
    3,
    summary.overCapacity,
  );

  y += 22;

  if (summary.overCapacity) {
    doc.setFillColor(...DANGER);
    doc.rect(MARGIN, y, CONTENT_W, 15, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('EL EVENTO SE PASA DE LA ACOMETIDA', MARGIN + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(
      `Pico de ${amps(summary.totalMaxAmps)} contra ${amps(summary.capacityAmps ?? 0)} declarados.`,
      MARGIN + 4,
      y + 10.5,
    );
    doc.text(
      'Cada pantalla puede entrar en su propia alimentación y aun así el show no entrar en el edificio.',
      MARGIN + 4,
      y + 13.5,
    );
    y += 21;
  }

  y = sectionTitle('Pantallas', y + 4);

  autoTable(doc, {
    ...tableStyles,
    startY: y,
    head: [
      [
        'Pantalla',
        'Grilla',
        'Medida',
        ...['Gab', 'Peso', 'Pico', 'Esperado', 'Data', 'Power'].map((content) => ({
          content,
          styles: { halign: 'right' as const },
        })),
      ],
    ],
    body: report.screens.map((plan, index) => [
      screenLabel(plan, index),
      `${plan.calc.cols} x ${plan.calc.rows}`,
      `${plan.calc.arrayWidthM.toFixed(2)} x ${plan.calc.arrayHeightM.toFixed(2)} m`,
      `${plan.calc.totalCabinets}`,
      `${plan.calc.weightTotal.toLocaleString('es-AR')} kg`,
      amps(plan.calc.maxAmps),
      amps(plan.calc.expectedAmps),
      `${plan.demand.dataCables}`,
      `${plan.demand.powerCables}`,
    ]),
    foot: [
      [
        'TOTAL',
        '',
        '',
        // Explicit, because columnStyles does not reach the foot: the total has
        // to sit under the column it totals.
        ...[
          `${summary.totalCabinets}`,
          `${summary.totalWeightKg.toLocaleString('es-AR')} kg`,
          amps(summary.totalMaxAmps),
          amps(summary.totalExpectedAmps),
          `${summary.totalDataCables}`,
          `${summary.totalPowerCables}`,
        ].map((content) => ({ content, styles: { halign: 'right' as const } })),
      ],
    ],
    footStyles: {
      fontStyle: 'bold',
      fontSize: 8.5,
      textColor: INK,
      fillColor: BAND,
    },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right' },
    },
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(
    'El pico es todo blanco a brillo pleno: sobre esa cifra se calculan térmicos, cables y gabinetes por circuito.',
    MARGIN,
    finalY() + 8,
  );
  doc.text(
    'El esperado es la estimación al brillo y contenido cargados, para pedirle potencia al venue.',
    MARGIN,
    finalY() + 12,
  );
  doc.text(
    'No incluye el consumo fijo que no atenúa: receiving cards, ventiladores y reposo de los drivers.',
    MARGIN,
    finalY() + 16,
  );

  // -------------------------------------------------------------- screens ---

  report.screens.forEach((plan, index) => {
    const { calc, screen } = plan;
    const { cabinet, processor } = plan.input;
    const name = screenLabel(plan, index);

    doc.addPage();
    runningHead(eventTitle);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...INK);
    doc.text(name, MARGIN, 26);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(
      `Pantalla ${index + 1} de ${report.screens.length} · ${cabinet.brand} ${cabinet.model} · ${calc.cols} x ${calc.rows} gabinetes`,
      MARGIN,
      32,
    );

    let sy = 40;

    if (calc.maxAmps > screen.supply.pduCapacityAmps) {
      doc.setFillColor(...DANGER);
      doc.rect(MARGIN, sy, CONTENT_W, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(
        `SE PASA DE SU ALIMENTACIÓN — ${amps(calc.maxAmps)} contra ${amps(screen.supply.pduCapacityAmps)}`,
        MARGIN + 4,
        sy + 6,
      );
      sy += 15;
    }

    // Two columns, so the specs and the drawings share one page. A crew reads a
    // screen off one sheet; splitting it across two is how a page gets lost.
    const colW = (CONTENT_W - 6) / 2;
    const leftCol = { left: MARGIN, right: MARGIN + colW + 6 };
    const rightCol = { left: MARGIN + colW + 6, right: MARGIN };

    autoTable(doc, {
      ...tableStyles,
      startY: sy,
      margin: leftCol,
      tableWidth: colW,
      head: [['Medidas y gabinete', '']],
      body: [
        [
          'Medida de pantalla',
          `${calc.arrayWidthM.toFixed(2)} x ${calc.arrayHeightM.toFixed(2)} m`,
        ],
        ['Grilla', `${calc.cols} x ${calc.rows}`],
        ['Gabinetes', `${calc.totalCabinets}`],
        ['Peso total', `${calc.weightTotal.toLocaleString('es-AR')} kg`],
        ['Resolución', `${calc.resX} x ${calc.resY} px`],
        ['Píxeles', calc.totalPixels.toLocaleString('es-AR')],
        ['Pitch', `${cabinet.pitch} mm`],
        ['Gabinete', `${cabinet.width} x ${cabinet.height} mm`],
      ],
      columnStyles: { 1: { halign: 'right' } },
    });

    autoTable(doc, {
      ...tableStyles,
      startY: finalY() + 6,
      margin: leftCol,
      tableWidth: colW,
      head: [['Data y procesamiento', '']],
      body: [
        ['Procesador', `${processor.brand} ${processor.model}`],
        ['Procesadores', `${plan.demand.processorsNeeded}`],
        ['Cables de data', `${plan.demand.dataCables}`],
        ['Gabinetes por loop', `${calc.cabinetsPerDataPort}`],
      ],
      columnStyles: { 1: { halign: 'right' } },
    });

    const rig = plan.rigging;
    const flown = screen.rigging.mount === 'flown';

    autoTable(doc, {
      ...tableStyles,
      startY: finalY() + 6,
      margin: leftCol,
      tableWidth: colW,
      head: [['Rigging', '']],
      body: [
        ['Montaje', flown ? 'Colgada' : 'Apilada en piso'],
        ['Peso total', `${rig.totalKg.toLocaleString('es-AR')} kg`],
        ['Columna más cargada', `${rig.heaviestColumnKg.toLocaleString('es-AR')} kg`],
        ...(flown
          ? [
              [
                'Puntos de izaje',
                screen.rigging.points === null ? 'Sin declarar' : `${screen.rigging.points}`,
              ],
              [
                'Por punto',
                rig.perPointKg === null
                  ? 'Sin declarar'
                  : `${rig.perPointKg.toLocaleString('es-AR', { maximumFractionDigits: 1 })} kg`,
              ],
            ]
          : [
              [
                'Sobre el gabinete inferior',
                `${rig.onBottomCabinetKg.toLocaleString('es-AR', { maximumFractionDigits: 1 })} kg`,
              ],
            ]),
        [
          flown ? 'Carga admisible por punto' : 'Límite del gabinete',
          rig.pointCapacityKg === null ? 'Sin declarar' : `${rig.pointCapacityKg} kg`,
        ],
      ],
      columnStyles: { 1: { halign: 'right' } },
    });

    autoTable(doc, {
      ...tableStyles,
      startY: sy,
      margin: rightCol,
      tableWidth: colW,
      head: [['Eléctrico', '']],
      body: [
        ['Tensión de red', `${screen.supply.voltage} V`],
        ['PDU / alimentación', `${screen.supply.pduCapacityAmps} A`],
        ['Térmico por línea', `${screen.supply.breakerAmps} A`],
        ['Carga máxima powerCON', `${screen.supply.cableLoopAmps} A`],
        [
          'Utilizable por línea',
          `${calc.ampsPerLine.toFixed(1)} A (${screen.supply.breakerAmps} A x 80%)`,
        ],
        ['Gabinetes máx. por cable', `${calc.cabinetsPerPowerCable}`],
        ['Cables de power', `${plan.demand.powerCables}`],
        ['Potencia pico', kw(calc.maxPowerW)],
        ['Corriente pico', amps(calc.maxAmps)],
        [
          'Consumo esperado',
          `${amps(calc.expectedAmps)} · ${kw(calc.expectedPowerW)} · ${Math.round(screen.operating.brightness * 100)}% brillo`,
        ],
      ],
      columnStyles: { 1: { halign: 'right' } },
    });

    // A pull sheet: what actually goes in the truck. Data and power carry their
    // own distance because the scaler and the distro are rarely in one place.
    const cableRows = (
      [
        ['data', 'Data', 'la técnica', screen.install.distanceToDataM],
        ['power', 'Power', 'la usina', screen.install.distanceToPowerM],
      ] as const
    ).flatMap(([layer, label, source, distance]) => {
      const schedule = plan.cables[layer];
      return [
        [`${label} · desde ${source}`, distance === null ? 'Sin declarar' : `${distance} m`],
        [`${label} · mains`, `${schedule.totalMains}`],
        [`${label} · jumpers`, `${schedule.totalJumpers}`],
        ...(distance === null
          ? []
          : schedule.mainsByLength.map(({ lengthM, count }) => [
              `${label} · cable de ${lengthM} m`,
              `x ${count}`,
            ])),
      ];
    });

    autoTable(doc, {
      ...tableStyles,
      startY: finalY() + 6,
      margin: rightCol,
      tableWidth: colW,
      head: [['Planilla de cables', '']],
      body: cableRows,
      columnStyles: { 1: { halign: 'right' } },
    });

    // ------------------------------------------------------- schematics ---

    /** Draws the grid and its runs; returns the y to continue from. */
    const drawSchematic = (
      title: string,
      routes: GridPosition[][],
      colors: readonly string[],
      capacity: number,
      startY: number,
      maxHeight: number,
    ): number => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      doc.text(title, MARGIN, startY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...MUTED);
      doc.text(
        'Cada color es un cable · el número es el orden · la línea fina baja al piso (main) · punteado rojo = sobrecargado',
        MARGIN,
        startY + 4,
      );

      let cellWidth = Math.min(CONTENT_W / calc.cols, 20);
      let cellHeight = (cabinet.height / cabinet.width) * cellWidth;
      if (cellHeight * calc.rows > maxHeight) {
        cellHeight = maxHeight / calc.rows;
        cellWidth = (cabinet.width / cabinet.height) * cellHeight;
      }

      const offsetX = MARGIN + (CONTENT_W - calc.cols * cellWidth) / 2;
      const offsetY = startY + 9;
      const centreOf = (p: GridPosition) => ({
        x: offsetX + p.x * cellWidth + cellWidth / 2,
        y: offsetY + p.y * cellHeight + cellHeight / 2,
      });
      const floorY = offsetY + calc.rows * cellHeight;

      doc.setDrawColor(190, 190, 190);
      doc.setLineWidth(0.15);
      for (let c = 0; c < calc.cols; c++) {
        for (let r = 0; r < calc.rows; r++) {
          doc.rect(offsetX + c * cellWidth, offsetY + r * cellHeight, cellWidth, cellHeight);
        }
      }

      routes.forEach((route, i) => {
        // The printed schematic carries the same fault vocabulary as the screen:
        // reserved red, a broken line, and the carried-versus-rated count.
        const overCapacity = route.length > capacity;
        const [r, g, b] = rgb(overCapacity ? PRINT_OVER_CAPACITY_COLOR : colors[i % colors.length]);
        doc.setDrawColor(r, g, b);
        doc.setFillColor(r, g, b);

        const first = route[0];
        if (first) {
          const start = centreOf(first);

          // The main, drawn to the floor: the processor and the PDU are on the
          // ground, so this is the cable the crew actually pulls.
          doc.setLineDashPattern([], 0);
          doc.setLineWidth(0.2);
          doc.line(start.x, start.y, start.x, floorY);
          doc.setLineWidth(0.5);
          doc.line(start.x - cellWidth * 0.15, floorY, start.x + cellWidth * 0.15, floorY);
        }

        doc.setLineWidth(0.5);
        doc.setLineDashPattern(overCapacity ? [1.2, 0.9] : [], 0);

        for (let step = 0; step < route.length - 1; step++) {
          const from = centreOf(route[step]);
          const to = centreOf(route[step + 1]);
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const length = Math.hypot(dx, dy);
          if (length === 0) continue;

          const padding = Math.min(cellWidth, cellHeight) * 0.14;
          const nx = dx / length;
          const ny = dy / length;
          doc.line(
            from.x + nx * padding,
            from.y + ny * padding,
            to.x - nx * padding,
            to.y - ny * padding,
          );
        }
        doc.setLineDashPattern([], 0);

        // Marks and numbers last, so a cable never strikes through its own order.
        if (first) {
          const start = centreOf(first);
          doc.circle(start.x, start.y, Math.min(1.7, cellWidth * 0.2), 'DF');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(Math.min(6, cellWidth * 0.5));
          doc.setTextColor(255, 255, 255);
          doc.text('1', start.x, start.y + 0.8, { align: 'center' });
          doc.setFont('helvetica', 'normal');

          if (overCapacity) {
            doc.setTextColor(r, g, b);
            doc.setFontSize(5.5);
            // Inside the cell: at 0.45 it lands on the cell edge and collides with the
            // main's floor mark, because a run starts on the bottom row.
            doc.text(`${route.length}/${capacity}`, start.x, start.y + cellHeight * 0.3, {
              align: 'center',
            });
          }
        }

        doc.setFontSize(Math.min(6, cellWidth * 0.45));
        doc.setTextColor(r, g, b);
        route.forEach((at, step) => {
          if (step === 0) return;
          const p = centreOf(at);
          doc.text(`${step + 1}`, p.x, p.y + 0.8, { align: 'center' });
        });
      });

      return floorY + 8;
    };

    // The drawing gets its own page, always.
    //
    // Fitting it under the tables costs it about half its size, and at six
    // millimetres a cell the order numbers stop being readable — which makes it
    // decoration. This is the sheet a crew patches from, so it gets the room.
    doc.addPage();
    runningHead(eventTitle);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text(`${name} — ruteo`, MARGIN, 25);

    // Vertical budget, stated once: the page below the title, minus the footer,
    // split in two, minus each block's own title and trailing gap. Getting this
    // wrong put the power drawing through the footer.
    const SCHEMATIC_TOP = 36;
    const TITLE_H = 9;
    const BLOCK_GAP = 10;
    const available = PAGE_H - MARGIN - SCHEMATIC_TOP;
    const drawMax = (available - BLOCK_GAP) / 2 - TITLE_H - 8;

    const afterData = drawSchematic(
      `DATA — máximo ${calc.cabinetsPerDataPort} gabinetes por línea`,
      plan.dataRoutes,
      PRINT_DATA_CABLE_COLORS,
      calc.cabinetsPerDataPort,
      SCHEMATIC_TOP,
      drawMax,
    );
    drawSchematic(
      `POWER — máximo ${calc.cabinetsPerPowerCable} gabinetes por línea`,
      plan.powerRoutes,
      PRINT_POWER_CABLE_COLORS,
      calc.cabinetsPerPowerCable,
      afterData + BLOCK_GAP,
      drawMax,
    );
  });

  // Page numbers last, once the total is known.
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text('Cifras de planificación. No reemplazan a un electricista.', MARGIN, PAGE_H - 9);
    doc.text(`${page} / ${pages}`, PAGE_W - MARGIN, PAGE_H - 9, { align: 'right' });
  }

  return doc.output('blob');
}
