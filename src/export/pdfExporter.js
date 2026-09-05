import { jsPDF } from 'jspdf';
import { exportToSVG } from './svgExporter.js';

/**
 * 100% Scale PDF Exporter using jsPDF vector primitives.
 */

export function downloadPDF(appState, filename = 'needle_art_template.pdf') {
  const page = appState.getPageDimensions();
  const orientation = page.widthMm > page.heightMm ? 'landscape' : 'portrait';

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [page.widthMm, page.heightMm]
  });

  const w = page.widthMm;
  const h = page.heightMm;
  const margin = appState.marginMm;
  const points = appState.points;
  const markerRadius = (appState.settings.markerDiameterMm || 0.8) / 2.0;

  // 1. Grid (Optional)
  if (appState.showGrid) {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.1);
    for (let x = 10; x < w; x += 10) {
      doc.line(x, 0, x, h);
    }
    for (let y = 10; y < h; y += 10) {
      doc.line(0, y, w, y);
    }
  }

  // 2. Margin Boundary
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([2, 2], 0);
  doc.rect(margin, margin, w - 2 * margin, h - 2 * margin);
  doc.setLineDashPattern([], 0);

  // 3. Registration Crosshairs
  if (appState.showRegistrationMarks) {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);
    const corners = [
      { x: 5, y: 5 },
      { x: w - 5, y: 5 },
      { x: 5, y: h - 5 },
      { x: w - 5, y: h - 5 }
    ];
    for (const c of corners) {
      doc.line(c.x - 4, c.y, c.x + 4, c.y);
      doc.line(c.x, c.y - 4, c.x, c.y + 4);
    }
  }

  // 4. Calibration Ruler
  if (appState.showRuler) {
    const rx = 10;
    const ry = h - 6;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(rx, ry, rx + 50, ry);
    doc.setFontSize(6);

    for (let i = 0; i <= 50; i += 5) {
      const isMajor = i % 10 === 0;
      const tickH = isMajor ? 2.5 : 1.2;
      doc.line(rx + i, ry, rx + i, ry - tickH);
      if (isMajor) {
        doc.text(`${i}mm`, rx + i - 1.5, ry - 3);
      }
    }
    doc.text('VERIFY PRINT AT 100% SCALE', rx + 12, ry + 3.5);
  }

  // 5. Draw Holes
  doc.setFillColor(0, 0, 0);
  for (const p of points) {
    const r = p.radius || markerRadius;
    doc.circle(p.x, p.y, r, 'F');
  }

  doc.save(filename);
}
