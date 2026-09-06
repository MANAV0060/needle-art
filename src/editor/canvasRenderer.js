/**
 * Canvas Renderer with smooth Pan & Zoom, 4 Render Modes,
 * mm grid ruler overlay, and physical punching simulation.
 */

export class CanvasRenderer {
  constructor(canvasElement, appState) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.state = appState;

    // Camera Transform (Pan & Zoom)
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;

    this.edgeMapImageData = null; // Optional edge map view image
    this.dpr = window.devicePixelRatio || 1;
  }

  resize(width, height) {
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    // Center page on initial load or resize if pan is 0
    if (this.panX === 0 && this.panY === 0) {
      this.resetView();
    } else {
      this.render();
    }
  }

  resetView() {
    const page = this.state.getPageDimensions();
    const containerW = this.canvas.width / this.dpr;
    const containerH = this.canvas.height / this.dpr;

    const fitScale = Math.min((containerW * 0.85) / page.widthMm, (containerH * 0.85) / page.heightMm);
    this.scale = fitScale;
    this.panX = (containerW - page.widthMm * this.scale) / 2;
    this.panY = (containerH - page.heightMm * this.scale) / 2;
    this.render();
  }

  // Convert canvas pixel coordinates to page mm coordinates
  canvasToMm(canvasX, canvasY) {
    const mmX = (canvasX - this.panX) / this.scale;
    const mmY = (canvasY - this.panY) / this.scale;
    return { x: mmX, y: mmY };
  }

  // Convert page mm coordinates to canvas pixel coordinates
  mmToCanvas(mmX, mmY) {
    const cx = mmX * this.scale + this.panX;
    const cy = mmY * this.scale + this.panY;
    return { x: cx, y: cy };
  }

  setEdgeMapBuffer(magnitudeBuffer, width, height) {
    if (!magnitudeBuffer) return;
    const magnitude = new Float32Array(magnitudeBuffer);
    const imgData = this.ctx.createImageData(width, height);
    for (let i = 0; i < width * height; i++) {
      const v = Math.floor(magnitude[i] * 255);
      const idx = i * 4;
      imgData.data[idx] = v;
      imgData.data[idx + 1] = v;
      imgData.data[idx + 2] = v;
      imgData.data[idx + 3] = 255;
    }
    this.edgeMapImageData = imgData;
  }

  render() {
    const ctx = this.ctx;
    const dpr = this.dpr;
    const page = this.state.getPageDimensions();

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);

    // Dark workspace backdrop
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);

    // Apply Pan & Zoom Transform
    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);

    // Draw Paper Sheet
    if (this.state.activeView === 'simulation') {
      // Dark room paper backdrop for backlit needle art simulation
      ctx.fillStyle = '#0f121d';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 25;
      ctx.fillRect(0, 0, page.widthMm, page.heightMm);
      ctx.shadowBlur = 0;
    } else {
      // White Printable Paper
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetY = 4;
      ctx.fillRect(0, 0, page.widthMm, page.heightMm);
      ctx.shadowBlur = 0;
    }

    // 1. Draw Background Content (Original Image / Edge Map)
    const margin = this.state.marginMm;
    const drawW = page.widthMm - 2 * margin;
    const drawH = page.heightMm - 2 * margin;

    if (this.state.activeView === 'overlay' && this.state.sourceImage) {
      ctx.globalAlpha = 0.35;
      ctx.drawImage(this.state.sourceImage, margin, margin, drawW, drawH);
      ctx.globalAlpha = 1.0;
    } else if (this.state.activeView === 'edges' && this.edgeMapImageData) {
      ctx.globalAlpha = 0.5;
      // Render offscreen temp canvas for edge map image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.edgeMapImageData.width;
      tempCanvas.height = this.edgeMapImageData.height;
      tempCanvas.getContext('2d').putImageData(this.edgeMapImageData, 0, 0);
      ctx.drawImage(tempCanvas, margin, margin, drawW, drawH);
      ctx.globalAlpha = 1.0;
    }

    // 2. Printable Margin Boundary
    ctx.strokeStyle = this.state.activeView === 'simulation' ? '#1e293b' : '#cbd5e1';
    ctx.lineWidth = 0.2;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(margin, margin, drawW, drawH);
    ctx.setLineDash([]);

    // 3. Grid & Registration Marks
    if (this.state.showGrid && this.state.activeView !== 'simulation') {
      this._drawGrid(ctx, page.widthMm, page.heightMm);
    }
    if (this.state.showRegistrationMarks && this.state.activeView !== 'simulation') {
      this._drawRegistrationMarks(ctx, page.widthMm, page.heightMm);
    }

    // 4. Physical 50mm Calibration Verification Ruler on Margin
    if (this.state.showRuler && this.state.activeView !== 'simulation') {
      this._drawCalibrationRuler(ctx, page.widthMm, page.heightMm);
    }

    // 5. Draw Holes / Dots with Variable Radius Support
    const fallbackRadius = (this.state.settings.markerDiameterMm || 0.8) / 2.0;

    if (this.state.activeView === 'simulation') {
      // Backlit Light Box Simulation: Glowing pinpricks of light passing through paper
      for (const p of this.state.points) {
        const r = p.radius || fallbackRadius;
        const glowRadius = Math.max(0.6, r * 1.8);
        const grad = ctx.createRadialGradient(p.x, p.y, r * 0.2, p.x, p.y, glowRadius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, p.type === 'outline' ? '#38bdf8' : '#fbbf24');
        grad.addColorStop(1, 'rgba(251, 191, 36, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Standard printable template hole dots
      for (const p of this.state.points) {
        const isSelected = this.state.selectedPointIds.has(p.id);
        const r = p.radius || fallbackRadius;

        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);

        if (isSelected) {
          ctx.fillStyle = '#ef4444';
          ctx.fill();
          ctx.strokeStyle = '#991b1b';
          ctx.lineWidth = 0.3;
          ctx.stroke();
        } else {
          ctx.fillStyle = p.type === 'outline' ? '#0f172a' : '#334155';
          ctx.fill();
        }
      }
    }

    // 6. Draw Local ROI Selected Regions (Box & Polygon)
    for (const reg of this.state.regions) {
      const isActive = reg.id === this.state.activeRegionId;
      ctx.strokeStyle = isActive ? '#38bdf8' : 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = isActive ? 0.6 : 0.3;
      ctx.fillStyle = isActive ? 'rgba(56, 189, 248, 0.08)' : 'rgba(56, 189, 248, 0.03)';

      if (reg.type === 'polygon' && reg.points && reg.points.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(reg.points[0].x, reg.points[0].y);
        for (let i = 1; i < reg.points.length; i++) {
          ctx.lineTo(reg.points[i].x, reg.points[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Render polygon vertex handles
        if (isActive) {
          for (const p of reg.points) {
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 0.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        // Standard Rectangle Box Region
        ctx.fillRect(reg.x, reg.y, reg.width, reg.height);
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(reg.x, reg.y, reg.width, reg.height);
        ctx.setLineDash([]);
      }

      // Region Label Badge
      const labelW = Math.max(22, (reg.name || 'Local Area').length * 2.2);
      const labelX = reg.type === 'polygon' && reg.points ? reg.points[0].x : reg.x;
      const labelY = reg.type === 'polygon' && reg.points ? reg.points[0].y : reg.y;

      ctx.fillStyle = isActive ? '#0284c7' : 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(labelX, Math.max(0, labelY - 4.5), labelW, 4.5);
      ctx.fillStyle = '#ffffff';
      ctx.font = '2.2px sans-serif';
      ctx.fillText(reg.name || 'Local Area', labelX + 1.2, Math.max(3, labelY - 1.2));
    }

    // 7. Draw Live Polygon Drawing Preview
    if (this.drawingPolygonPoints && this.drawingPolygonPoints.length > 0) {
      ctx.strokeStyle = '#f43f5e';
      ctx.fillStyle = 'rgba(244, 63, 94, 0.12)';
      ctx.lineWidth = 0.5;

      ctx.beginPath();
      ctx.moveTo(this.drawingPolygonPoints[0].x, this.drawingPolygonPoints[0].y);
      for (let i = 1; i < this.drawingPolygonPoints.length; i++) {
        ctx.lineTo(this.drawingPolygonPoints[i].x, this.drawingPolygonPoints[i].y);
      }
      ctx.stroke();

      for (const p of this.drawingPolygonPoints) {
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore(); // Restore camera pan/zoom
    ctx.restore();
  }

  _drawGrid(ctx, widthMm, heightMm) {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.1;
    const gridSpacingMm = 10; // 1cm reference grid

    for (let x = gridSpacingMm; x < widthMm; x += gridSpacingMm) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, heightMm);
      ctx.stroke();
    }
    for (let y = gridSpacingMm; y < heightMm; y += gridSpacingMm) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(widthMm, y);
      ctx.stroke();
    }
  }

  _drawRegistrationMarks(ctx, widthMm, heightMm) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.2;
    const markSize = 4; // 4mm crosshairs in corners

    const corners = [
      { x: 5, y: 5 },
      { x: widthMm - 5, y: 5 },
      { x: 5, y: heightMm - 5 },
      { x: widthMm - 5, y: heightMm - 5 }
    ];

    for (const c of corners) {
      ctx.beginPath();
      ctx.moveTo(c.x - markSize, c.y);
      ctx.lineTo(c.x + markSize, c.y);
      ctx.moveTo(c.x, c.y - markSize);
      ctx.lineTo(c.x, c.y + markSize);
      ctx.stroke();
    }
  }

  _drawCalibrationRuler(ctx, widthMm, heightMm) {
    const rx = 10;
    const ry = heightMm - 6;
    const rLen = 50; // 50mm ruler

    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#0f172a';
    ctx.lineWidth = 0.2;
    ctx.font = '1.8px sans-serif';

    // Main line
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + rLen, ry);
    ctx.stroke();

    // Tick marks every 5mm and 10mm
    for (let i = 0; i <= rLen; i += 5) {
      const isMajor = i % 10 === 0;
      const tickH = isMajor ? 2.5 : 1.2;

      ctx.beginPath();
      ctx.moveTo(rx + i, ry);
      ctx.lineTo(rx + i, ry - tickH);
      ctx.stroke();

      if (isMajor) {
        ctx.fillText(`${i}mm`, rx + i - 1.5, ry - 3);
      }
    }
    ctx.fillText('VERIFY PRINT AT 100% SCALE', rx + 12, ry + 3);
  }
}
