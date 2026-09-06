import { createIcons, icons } from 'lucide';

export function setupToolbar(containerElement, appState, history, canvasRenderer, onRequestRender) {
  containerElement.innerHTML = `
    <!-- Left: View Mode Toggles -->
    <div class="tool-group">
      <button class="btn ${appState.activeView === 'template' ? 'active' : ''}" id="btn-view-template">
        <i data-lucide="file" style="width:14px;height:14px"></i> Template
      </button>
      <button class="btn ${appState.activeView === 'simulation' ? 'active' : ''}" id="btn-view-simulation">
        <i data-lucide="sparkles" style="width:14px;height:14px"></i> Punch Simulation
      </button>
      <button class="btn ${appState.activeView === 'overlay' ? 'active' : ''}" id="btn-view-overlay">
        <i data-lucide="image" style="width:14px;height:14px"></i> Image Overlay
      </button>
      <button class="btn ${appState.activeView === 'edges' ? 'active' : ''}" id="btn-view-edges">
        <i data-lucide="activity" style="width:14px;height:14px"></i> Edge Map
      </button>
    </div>

    <!-- Center: Interactive Editing & Selection Tools -->
    <div class="tool-group">
      <button class="icon-btn ${appState.activeTool === 'select' ? 'active' : ''}" id="tool-select" title="Select / Drag Dot or Region">
        <i data-lucide="mouse-pointer" style="width:16px;height:16px"></i>
      </button>
      <button class="icon-btn ${appState.activeTool === 'region_polygon' || appState.activeTool === 'region' ? 'active' : ''}" id="tool-region-polygon" title="Polygon Lasso Selection Tool (Click points or drag lasso around faces/hair)">
        <i data-lucide="pentagon" style="width:16px;height:16px"></i>
      </button>
      <button class="icon-btn ${appState.activeTool === 'region_box' ? 'active' : ''}" id="tool-region-box" title="Rectangle Box Selection Tool">
        <i data-lucide="square" style="width:16px;height:16px"></i>
      </button>
      <button class="icon-btn ${appState.activeTool === 'add' ? 'active' : ''}" id="tool-add" title="Add Single Hole">
        <i data-lucide="plus-circle" style="width:16px;height:16px"></i>
      </button>
      <button class="icon-btn ${appState.activeTool === 'delete' ? 'active' : ''}" id="tool-delete" title="Delete Single Hole">
        <i data-lucide="minus-circle" style="width:16px;height:16px"></i>
      </button>
      <button class="icon-btn ${appState.activeTool === 'brush' ? 'active' : ''}" id="tool-brush" title="Brush Erase Holes">
        <i data-lucide="eraser" style="width:16px;height:16px"></i>
      </button>
      <button class="icon-btn ${appState.activeTool === 'pan' ? 'active' : ''}" id="tool-pan" title="Pan Workspace">
        <i data-lucide="hand" style="width:16px;height:16px"></i>
      </button>
    </div>

    <!-- Right: History & Zoom Controls -->
    <div class="tool-group">
      <button class="icon-btn" id="btn-undo" title="Undo (Ctrl+Z)">
        <i data-lucide="undo" style="width:16px;height:16px"></i>
      </button>
      <button class="icon-btn" id="btn-redo" title="Redo (Ctrl+Y)">
        <i data-lucide="redo" style="width:16px;height:16px"></i>
      </button>
      <div style="width:1px;height:20px;background:var(--border-color);margin:0 4px"></div>
      <button class="icon-btn" id="btn-zoom-in" title="Zoom In">
        <i data-lucide="zoom-in" style="width:16px;height:16px"></i>
      </button>
      <button class="icon-btn" id="btn-zoom-out" title="Zoom Out">
        <i data-lucide="zoom-out" style="width:16px;height:16px"></i>
      </button>
      <button class="icon-btn" id="btn-zoom-fit" title="Fit to Screen">
        <i data-lucide="maximize" style="width:16px;height:16px"></i>
      </button>
    </div>
  `;

  createIcons({ icons, nameAttr: 'data-lucide' });

  // Bind View Mode buttons
  bindViewBtn('btn-view-template', 'template');
  bindViewBtn('btn-view-simulation', 'simulation');
  bindViewBtn('btn-view-overlay', 'overlay');
  bindViewBtn('btn-view-edges', 'edges');

  // Bind Tool buttons
  bindToolBtn('tool-select', 'select');
  bindToolBtn('tool-region-polygon', 'region_polygon');
  bindToolBtn('tool-region-box', 'region_box');
  bindToolBtn('tool-add', 'add');
  bindToolBtn('tool-delete', 'delete');
  bindToolBtn('tool-brush', 'brush');
  bindToolBtn('tool-pan', 'pan');

  // Undo / Redo
  containerElement.querySelector('#btn-undo').addEventListener('click', () => { history.undo(); onRequestRender(); });
  containerElement.querySelector('#btn-redo').addEventListener('click', () => { history.redo(); onRequestRender(); });

  // Zoom controls
  containerElement.querySelector('#btn-zoom-in').addEventListener('click', () => { canvasRenderer.scale *= 1.25; onRequestRender(); });
  containerElement.querySelector('#btn-zoom-out').addEventListener('click', () => { canvasRenderer.scale *= 0.8; onRequestRender(); });
  containerElement.querySelector('#btn-zoom-fit').addEventListener('click', () => { canvasRenderer.resetView(); onRequestRender(); });

  function bindViewBtn(id, viewMode) {
    containerElement.querySelector(`#${id}`).addEventListener('click', () => {
      appState.activeView = viewMode;
      setupToolbar(containerElement, appState, history, canvasRenderer, onRequestRender);
      onRequestRender();
    });
  }

  function bindToolBtn(id, toolMode) {
    containerElement.querySelector(`#${id}`).addEventListener('click', () => {
      appState.activeTool = toolMode;
      setupToolbar(containerElement, appState, history, canvasRenderer, onRequestRender);
    });
  }
}
