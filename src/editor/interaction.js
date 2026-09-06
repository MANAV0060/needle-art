import { AddPointCommand, DeletePointCommand, MovePointCommand, BatchDeleteCommand } from './history.js';
import { isPointInRegion, computeBoundingBox } from '../engine/regionUtils.js';

/**
 * Handles pointer events (mouse/touch) for pan, zoom, point editing,
 * and Polygon Lasso & Rectangle Box Region selection drawing.
 */

export function setupInteraction(canvasRenderer, history, onRequestRender) {
  const canvas = canvasRenderer.canvas;
  const state = canvasRenderer.state;

  let isPanning = false;
  let startPanX = 0;
  let startPanY = 0;

  let isDraggingPoint = false;
  let draggedPoint = null;
  let dragStartMm = { x: 0, y: 0 };

  let isBrushing = false;
  let brushedPoints = new Set();

  let isDrawingBoxRegion = false;
  let boxRegionStartMm = { x: 0, y: 0 };
  let currentBoxRegion = null;

  let isDrawingPolygon = false;
  let polygonPts = [];

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newScale = Math.min(25.0, Math.max(0.15, canvasRenderer.scale * zoomFactor));

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    canvasRenderer.panX = mouseX - (mouseX - canvasRenderer.panX) * (newScale / canvasRenderer.scale);
    canvasRenderer.panY = mouseY - (mouseY - canvasRenderer.panY) * (newScale / canvasRenderer.scale);
    canvasRenderer.scale = newScale;

    onRequestRender();
  }, { passive: false });

  // Escape key cancels active polygon drawing
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isDrawingPolygon) {
      isDrawingPolygon = false;
      polygonPts = [];
      canvasRenderer.drawingPolygonPoints = null;
      onRequestRender();
    }
  });

  canvas.addEventListener('dblclick', (e) => {
    if (isDrawingPolygon && polygonPts.length >= 3) {
      finishPolygonRegion();
    }
  });

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const mm = canvasRenderer.canvasToMm(clickX, clickY);

    if (e.button === 1 || e.shiftKey || state.activeTool === 'pan') {
      isPanning = true;
      startPanX = clickX - canvasRenderer.panX;
      startPanY = clickY - canvasRenderer.panY;
      canvas.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== 0) return;

    // 1. Polygon Lasso Selection Mode
    if (state.activeTool === 'region_polygon' || state.activeTool === 'region') {
      if (!isDrawingPolygon) {
        isDrawingPolygon = true;
        polygonPts = [{ x: Number(mm.x.toFixed(2)), y: Number(mm.y.toFixed(2)) }];
      } else {
        // If clicking close to starting point (within 3mm), close polygon
        const startP = polygonPts[0];
        if (polygonPts.length >= 3 && Math.hypot(mm.x - startP.x, mm.y - startP.y) <= 4.0) {
          finishPolygonRegion();
          return;
        }
        polygonPts.push({ x: Number(mm.x.toFixed(2)), y: Number(mm.y.toFixed(2)) });
      }
      canvasRenderer.drawingPolygonPoints = polygonPts;
      onRequestRender();
      return;
    }

    // 2. Rectangle Box Selection Mode
    if (state.activeTool === 'region_box') {
      isDrawingBoxRegion = true;
      boxRegionStartMm = { x: mm.x, y: mm.y };
      const prep = state.settings.imagePrep || {};
      const newRegion = {
        id: `reg_${Date.now()}`,
        name: `Box Area ${state.regions.length + 1}`,
        type: 'box',
        x: mm.x,
        y: mm.y,
        width: 1,
        height: 1,
        contrast: 0,
        gamma: prep.gamma !== undefined ? prep.gamma : 1.2,
        detailStrength: prep.detailStrength !== undefined ? prep.detailStrength : 1.6,
        edgeThreshold: prep.edgeThreshold !== undefined ? prep.edgeThreshold : 20,
        blur: prep.blur !== undefined ? prep.blur : 1,
        minSpacingMm: state.settings.minSpacingMm || 2.5,
        dotSizeFactor: 1.0
      };
      state.addRegion(newRegion);
      currentBoxRegion = newRegion;
      onRequestRender();
      return;
    }

    // 3. Select / Edit Mode
    if (state.activeTool === 'select') {
      const page = state.getPageDimensions();
      const margin = state.marginMm;
      const drawW = page.widthMm - 2 * margin;
      const drawH = page.heightMm - 2 * margin;
      const clickNormX = (mm.x - margin) / drawW;
      const clickNormY = (mm.y - margin) / drawH;

      // Check if clicked inside any ROI region
      let hitRegion = null;
      for (const r of state.regions) {
        // Convert region to normalized form for hit test
        const normReg = {
          xNorm: (r.x - margin) / drawW,
          yNorm: (r.y - margin) / drawH,
          wNorm: r.width / drawW,
          hNorm: r.height / drawH,
          type: r.type || 'box',
          pointsNorm: r.points ? r.points.map(p => ({
            xNorm: (p.x - margin) / drawW,
            yNorm: (p.y - margin) / drawH
          })) : null
        };
        if (isPointInRegion(clickNormX, clickNormY, normReg)) {
          hitRegion = r;
          break;
        }
      }

      if (hitRegion) {
        state.activeRegionId = hitRegion.id;
        onRequestRender();
      }

      // Check if clicked near a point
      const hitRadiusMm = Math.max(1.5, (state.settings.markerDiameterMm || 0.8) * 2.0);
      const hitPoint = state.points.find(p => Math.hypot(p.x - mm.x, p.y - mm.y) <= hitRadiusMm);

      if (hitPoint) {
        isDraggingPoint = true;
        draggedPoint = hitPoint;
        dragStartMm = { x: hitPoint.x, y: hitPoint.y };
        state.selectedPointIds.clear();
        state.selectedPointIds.add(hitPoint.id);
        onRequestRender();
      } else if (!hitRegion) {
        state.selectedPointIds.clear();
        onRequestRender();
      }
    } else if (state.activeTool === 'add') {
      const page = state.getPageDimensions();
      const margin = state.marginMm;

      if (mm.x >= margin && mm.x <= page.widthMm - margin && mm.y >= margin && mm.y <= page.heightMm - margin) {
        const newPoint = {
          id: `p_user_${Date.now()}`,
          x: Number(mm.x.toFixed(2)),
          y: Number(mm.y.toFixed(2)),
          radius: (state.settings.markerDiameterMm || 0.8) / 2,
          type: 'outline'
        };
        history.execute(new AddPointCommand(newPoint));
        onRequestRender();
      }
    } else if (state.activeTool === 'delete') {
      const hitRadiusMm = Math.max(2.0, (state.settings.markerDiameterMm || 0.8) * 2.5);
      const hitPoint = state.points.find(p => Math.hypot(p.x - mm.x, p.y - mm.y) <= hitRadiusMm);
      if (hitPoint) {
        history.execute(new DeletePointCommand(hitPoint));
        onRequestRender();
      }
    } else if (state.activeTool === 'brush') {
      isBrushing = true;
      brushedPoints.clear();
      erasePointsInBrush(mm.x, mm.y);
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isPanning) {
      canvasRenderer.panX = mouseX - startPanX;
      canvasRenderer.panY = mouseY - startPanY;
      onRequestRender();
      return;
    }

    const mm = canvasRenderer.canvasToMm(mouseX, mouseY);

    if (isDrawingPolygon) {
      // Draw live rubber-band line from last vertex to current cursor
      if (polygonPts.length > 0) {
        const previewPts = [...polygonPts, { x: Number(mm.x.toFixed(2)), y: Number(mm.y.toFixed(2)) }];
        canvasRenderer.drawingPolygonPoints = previewPts;
        onRequestRender();
      }
    } else if (isDrawingBoxRegion && currentBoxRegion) {
      currentBoxRegion.x = Math.min(boxRegionStartMm.x, mm.x);
      currentBoxRegion.y = Math.min(boxRegionStartMm.y, mm.y);
      currentBoxRegion.width = Math.max(2, Math.abs(mm.x - boxRegionStartMm.x));
      currentBoxRegion.height = Math.max(2, Math.abs(mm.y - boxRegionStartMm.y));
      onRequestRender();
    } else if (isDraggingPoint && draggedPoint) {
      draggedPoint.x = Number(mm.x.toFixed(2));
      draggedPoint.y = Number(mm.y.toFixed(2));
      onRequestRender();
    } else if (isBrushing) {
      erasePointsInBrush(mm.x, mm.y);
    }
  });

  function finishPolygonRegion() {
    if (polygonPts.length < 3) {
      isDrawingPolygon = false;
      polygonPts = [];
      canvasRenderer.drawingPolygonPoints = null;
      onRequestRender();
      return;
    }

    const bbox = computeBoundingBox(polygonPts);
    const prep = state.settings.imagePrep || {};
    const newRegion = {
      id: `reg_${Date.now()}`,
      name: `Polygon Area ${state.regions.length + 1}`,
      type: 'polygon',
      points: [...polygonPts],
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
      contrast: 0,
      gamma: prep.gamma !== undefined ? prep.gamma : 1.2,
      detailStrength: prep.detailStrength !== undefined ? prep.detailStrength : 1.6,
      edgeThreshold: prep.edgeThreshold !== undefined ? prep.edgeThreshold : 20,
      blur: prep.blur !== undefined ? prep.blur : 1,
      minSpacingMm: state.settings.minSpacingMm || 2.5,
      dotSizeFactor: 1.0
    };

    state.addRegion(newRegion);
    isDrawingPolygon = false;
    polygonPts = [];
    canvasRenderer.drawingPolygonPoints = null;
    onRequestRender();

    if (window.app && typeof window.app.generatePoints === 'function') {
      window.app.generatePoints();
    }
  }

  const stopDragOrBrush = () => {
    if (isPanning) {
      isPanning = false;
      canvas.style.cursor = 'default';
    }

    if (isDrawingBoxRegion && currentBoxRegion) {
      isDrawingBoxRegion = false;
      currentBoxRegion = null;
      if (window.app && typeof window.app.generatePoints === 'function') {
        window.app.generatePoints();
      }
    }

    if (isDraggingPoint && draggedPoint) {
      const p = draggedPoint;
      history.execute(new MovePointCommand(p.id, dragStartMm.x, dragStartMm.y, p.x, p.y));
      isDraggingPoint = false;
      draggedPoint = null;
    }

    if (isBrushing) {
      isBrushing = false;
      if (brushedPoints.size > 0) {
        history.execute(new BatchDeleteCommand(Array.from(brushedPoints)));
        brushedPoints.clear();
      }
    }
  };

  canvas.addEventListener('mouseup', stopDragOrBrush);
  canvas.addEventListener('mouseleave', stopDragOrBrush);

  function erasePointsInBrush(mmX, mmY) {
    const radius = state.brushRadiusMm;
    const targets = state.points.filter(p => Math.hypot(p.x - mmX, p.y - mmY) <= radius);
    if (targets.length > 0) {
      for (const t of targets) {
        brushedPoints.add(t);
      }
      state.removePointsByIds(new Set(targets.map(t => t.id)));
      onRequestRender();
    }
  }
}
