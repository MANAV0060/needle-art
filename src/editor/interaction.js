import { AddPointCommand, DeletePointCommand, MovePointCommand, BatchDeleteCommand } from './history.js';

/**
 * Handles pointer events (mouse/touch) for pan, zoom, selection, adding, moving, and brush erasing dots.
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

  let isDrawingRegion = false;
  let regionStartMm = { x: 0, y: 0 };
  let currentRegion = null;

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newScale = Math.min(25.0, Math.max(0.15, canvasRenderer.scale * zoomFactor));

    // Zoom centered at mouse position
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    canvasRenderer.panX = mouseX - (mouseX - canvasRenderer.panX) * (newScale / canvasRenderer.scale);
    canvasRenderer.panY = mouseY - (mouseY - canvasRenderer.panY) * (newScale / canvasRenderer.scale);
    canvasRenderer.scale = newScale;

    onRequestRender();
  }, { passive: false });

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const mm = canvasRenderer.canvasToMm(clickX, clickY);

    // Pan with Middle Mouse Button or Spacebar
    if (e.button === 1 || e.shiftKey || state.activeTool === 'pan') {
      isPanning = true;
      startPanX = clickX - canvasRenderer.panX;
      startPanY = clickY - canvasRenderer.panY;
      canvas.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== 0) return; // Only primary button for editing

    if (state.activeTool === 'region') {
      isDrawingRegion = true;
      regionStartMm = { x: mm.x, y: mm.y };
      const prep = state.settings.imagePrep || {};
      const newRegion = {
        id: `reg_${Date.now()}`,
        name: `Local Area ${state.regions.length + 1}`,
        x: mm.x,
        y: mm.y,
        width: 1,
        height: 1,
        contrast: 0, // 0 offset from global contrast (identical initial look)
        gamma: prep.gamma !== undefined ? prep.gamma : 1.2,
        detailStrength: prep.detailStrength !== undefined ? prep.detailStrength : 1.6,
        edgeThreshold: prep.edgeThreshold !== undefined ? prep.edgeThreshold : 20,
        blur: prep.blur !== undefined ? prep.blur : 1,
        minSpacingMm: state.settings.minSpacingMm || 2.5,
        dotSizeFactor: 1.0
      };
      state.addRegion(newRegion);
      currentRegion = newRegion;
      onRequestRender();
      return;
    }

    if (state.activeTool === 'select') {
      // Check if clicked inside a region boundary
      const hitRegion = state.regions.find(r =>
        mm.x >= r.x && mm.x <= r.x + r.width && mm.y >= r.y && mm.y <= r.y + r.height
      );

      if (hitRegion) {
        state.activeRegionId = hitRegion.id;
        onRequestRender();
      }

      // Find point within click radius
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

      // Ensure within margins
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

    if (isDrawingRegion && currentRegion) {
      currentRegion.x = Math.min(regionStartMm.x, mm.x);
      currentRegion.y = Math.min(regionStartMm.y, mm.y);
      currentRegion.width = Math.max(2, Math.abs(mm.x - regionStartMm.x));
      currentRegion.height = Math.max(2, Math.abs(mm.y - regionStartMm.y));
      onRequestRender();
    } else if (isDraggingPoint && draggedPoint) {
      draggedPoint.x = Number(mm.x.toFixed(2));
      draggedPoint.y = Number(mm.y.toFixed(2));
      onRequestRender();
    } else if (isBrushing) {
      erasePointsInBrush(mm.x, mm.y);
    }
  });

  const stopDragOrBrush = () => {
    if (isPanning) {
      isPanning = false;
      canvas.style.cursor = 'default';
    }

    if (isDrawingRegion && currentRegion) {
      isDrawingRegion = false;
      currentRegion = null;
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
