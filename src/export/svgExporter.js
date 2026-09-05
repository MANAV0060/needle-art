/**
 * Vector SVG exporter with exact physical millimeter units (`mm`),
 * grouped layers, registration marks, and 50mm print calibration ruler.
 */

export function exportToSVG(appState) {
  const page = appState.getPageDimensions();
  const points = appState.points;
  const markerRadius = (appState.settings.markerDiameterMm || 0.8) / 2.0;

  const w = page.widthMm;
  const h = page.heightMm;
  const margin = appState.marginMm;

  let svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">\n`;
  svg += `  <title>Needle Art Hole Template</title>\n`;
  svg += `  <style>\n`;
  svg += `    .outline-hole { fill: #000000; stroke: none; }\n`;
  svg += `    .shading-hole { fill: #1e293b; stroke: none; }\n`;
  svg += `    .margin-line { fill: none; stroke: #94a3b8; stroke-width: 0.2; stroke-dasharray: 2,2; }\n`;
  svg += `    .grid-line { fill: none; stroke: #e2e8f0; stroke-width: 0.1; }\n`;
  svg += `    .crosshair { fill: none; stroke: #000000; stroke-width: 0.25; }\n`;
  svg += `    .ruler-text { font-family: monospace; font-size: 2px; fill: #000000; }\n`;
  svg += `  </style>\n\n`;

  // 1. Sheet Background (White)
  svg += `  <!-- Background Sheet -->\n`;
  svg += `  <rect width="${w}" height="${h}" fill="#ffffff" />\n\n`;

  // 2. Grid Layer (Optional)
  if (appState.showGrid) {
    svg += `  <!-- Reference Grid (10mm) -->\n`;
    svg += `  <g id="reference-grid">\n`;
    for (let x = 10; x < w; x += 10) {
      svg += `    <line x1="${x}" y1="0" x2="${x}" y2="${h}" class="grid-line" />\n`;
    }
    for (let y = 10; y < h; y += 10) {
      svg += `    <line x1="0" y1="${y}" x2="${w}" y2="${y}" class="grid-line" />\n`;
    }
    svg += `  </g>\n\n`;
  }

  // 3. Margin Boundary
  svg += `  <!-- Printable Margin -->\n`;
  svg += `  <rect x="${margin}" y="${margin}" width="${w - 2 * margin}" height="${h - 2 * margin}" class="margin-line" />\n\n`;

  // 4. Registration Crosshairs
  if (appState.showRegistrationMarks) {
    svg += `  <!-- Registration Crosshairs -->\n`;
    svg += `  <g id="registration-marks">\n`;
    const corners = [
      { x: 5, y: 5 },
      { x: w - 5, y: 5 },
      { x: 5, y: h - 5 },
      { x: w - 5, y: h - 5 }
    ];
    for (const c of corners) {
      svg += `    <line x1="${c.x - 4}" y1="${c.y}" x2="${c.x + 4}" y2="${c.y}" class="crosshair" />\n`;
      svg += `    <line x1="${c.x}" y1="${c.y - 4}" x2="${c.x}" y2="${c.y + 4}" class="crosshair" />\n`;
    }
    svg += `  </g>\n\n`;
  }

  // 5. 50mm Verification Calibration Ruler
  if (appState.showRuler) {
    svg += `  <!-- Physical Print Calibration Ruler -->\n`;
    svg += `  <g id="calibration-ruler">\n`;
    const rx = 10;
    const ry = h - 6;
    svg += `    <line x1="${rx}" y1="${ry}" x2="${rx + 50}" y2="${ry}" stroke="#000000" stroke-width="0.3" />\n`;
    for (let i = 0; i <= 50; i += 5) {
      const isMajor = i % 10 === 0;
      const tickH = isMajor ? 2.5 : 1.2;
      svg += `    <line x1="${rx + i}" y1="${ry}" x2="${rx + i}" y2="${ry - tickH}" stroke="#000000" stroke-width="0.2" />\n`;
      if (isMajor) {
        svg += `    <text x="${rx + i - 1.5}" y="${ry - 3}" class="ruler-text">${i}mm</text>\n`;
      }
    }
    svg += `    <text x="${rx + 12}" y="${ry + 3.5}" class="ruler-text">VERIFY PRINT AT 100% SCALE</text>\n`;
    svg += `  </g>\n\n`;
  }

  // 6. Hole Points Layer
  svg += `  <!-- Hole Points Layer (${points.length} holes) -->\n`;
  svg += `  <g id="perforation-holes">\n`;
  for (const p of points) {
    const cls = p.type === 'outline' ? 'outline-hole' : 'shading-hole';
    const r = p.radius || markerRadius;
    svg += `    <circle cx="${p.x}" cy="${p.y}" r="${r}" class="${cls}" data-id="${p.id}" />\n`;
  }
  svg += `  </g>\n`;

  svg += `</svg>`;
  return svg;
}

export function downloadSVG(appState, filename = 'needle_art_template.svg') {
  const svgContent = exportToSVG(appState);
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
