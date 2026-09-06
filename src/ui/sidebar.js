import { createIcons, icons } from 'lucide';
import { PAPER_SIZES } from '../app/state.js';
import { SAMPLE_PRESETS } from '../presets/sampleImages.js';

export function setupSidebar(containerElement, appState, onSettingChange, onLoadSample) {
  containerElement.innerHTML = `
    <!-- 0. Upload Image Card -->
    <div class="sidebar-section">
      <div class="sidebar-title">
        <i data-lucide="image-plus" style="width:14px;height:14px"></i> Your Image
      </div>
      <button class="btn btn-primary" id="sidebar-btn-upload" style="width:100%;justify-content:center;padding:10px;">
        <i data-lucide="upload-cloud" style="width:18px;height:18px"></i>
        Upload New Image
      </button>
    </div>

    <!-- 1. Sample Gallery Onboarding -->
    <div class="sidebar-section">
      <div class="sidebar-title">
        <i data-lucide="sparkles" style="width:14px;height:14px"></i> Or Try Sample Preset
      </div>
      <div class="preset-strip" id="preset-gallery-strip"></div>
    </div>

    <!-- 2. Generation Mode -->
    <div class="sidebar-section">
      <div class="sidebar-title">
        <i data-lucide="layers" style="width:14px;height:14px"></i> Generation Mode
      </div>
      <div class="mode-grid">
        <button class="mode-btn ${appState.settings.mode === 'outline' ? 'active' : ''}" data-mode="outline">
          <i data-lucide="spline" style="width:18px;height:18px"></i>
          Outline
        </button>
        <button class="mode-btn ${appState.settings.mode === 'shading' ? 'active' : ''}" data-mode="shading">
          <i data-lucide="grid" style="width:18px;height:18px"></i>
          Shading
        </button>
        <button class="mode-btn ${appState.settings.mode === 'hybrid' ? 'active' : ''}" data-mode="hybrid">
          <i data-lucide="combine" style="width:18px;height:18px"></i>
          Hybrid
        </button>
      </div>
    </div>

    <!-- 3. Physical Paper & Page Setup -->
    <div class="sidebar-section">
      <div class="sidebar-title">
        <i data-lucide="file-text" style="width:14px;height:14px"></i> Paper & Print Setup
      </div>

      <div class="control-group">
        <div class="control-label">Paper Size</div>
        <select id="select-paper-size">
          ${Object.keys(PAPER_SIZES).map(k => `
            <option value="${k}" ${appState.paperKey === k ? 'selected' : ''}>${PAPER_SIZES[k].name} ${k !== 'Custom' ? `(${PAPER_SIZES[k].widthMm}×${PAPER_SIZES[k].heightMm}mm)` : ''}</option>
          `).join('')}
        </select>
      </div>

      ${appState.paperKey === 'Custom' ? `
        <div style="background:rgba(255,255,255,0.04);padding:10px;border-radius:8px;border:1px solid var(--border-color);margin-bottom:12px;">
          <div style="font-size:0.75rem;font-weight:700;color:var(--accent-cyan);margin-bottom:8px;">Custom Page Dimensions</div>
          
          <div class="control-group">
            <div class="control-label">
              <span>Width (mm)</span>
              <span class="control-val" id="val-custom-width">${appState.customWidthMm} mm</span>
            </div>
            <input type="range" id="slider-custom-width" min="50" max="800" value="${appState.customWidthMm}" step="5">
          </div>

          <div class="control-group">
            <div class="control-label">
              <span>Height (mm)</span>
              <span class="control-val" id="val-custom-height">${appState.customHeightMm} mm</span>
            </div>
            <input type="range" id="slider-custom-height" min="50" max="800" value="${appState.customHeightMm}" step="5">
          </div>

          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
            <div class="preset-chip" id="btn-custom-100x100">100×100mm</div>
            <div class="preset-chip" id="btn-custom-150x150">150×150mm</div>
            <div class="preset-chip" id="btn-custom-300x300">300×300mm</div>
            <div class="preset-chip" id="btn-custom-postcard">105×148mm</div>
          </div>
        </div>
      ` : ''}

      <div class="control-group">
        <div class="control-label">Orientation</div>
        <select id="select-orientation">
          <option value="portrait" ${appState.orientation === 'portrait' ? 'selected' : ''}>Portrait</option>
          <option value="landscape" ${appState.orientation === 'landscape' ? 'selected' : ''}>Landscape</option>
        </select>
      </div>

      <div class="control-group">
        <div class="control-label">
          <span>Page Margin</span>
          <span class="control-val" id="val-margin">${appState.marginMm} mm</span>
        </div>
        <input type="range" id="slider-margin" min="5" max="30" value="${appState.marginMm}" step="1">
      </div>
    </div>

    <!-- 4. Physical Hole Spacing & Sizes -->
    <div class="sidebar-section">
      <div class="sidebar-title">
        <i data-lucide="ruler" style="width:14px;height:14px"></i> Hole Measurements (mm)
      </div>

      <div class="control-group">
        <div class="control-label">
          <span>Hole Spacing (Min)</span>
          <span class="control-val" id="val-min-spacing">${appState.settings.minSpacingMm} mm</span>
        </div>
        <input type="range" id="slider-min-spacing" min="1.5" max="15.0" value="${appState.settings.minSpacingMm}" step="0.5">
      </div>

      <div class="control-group">
        <div class="control-label">
          <span>Hole Spacing (Max / Sparse)</span>
          <span class="control-val" id="val-max-spacing">${appState.settings.maxSpacingMm} mm</span>
        </div>
        <input type="range" id="slider-max-spacing" min="4.0" max="25.0" value="${appState.settings.maxSpacingMm}" step="0.5">
      </div>

      <div class="control-group">
        <div class="control-label">
          <span>Printed Dot Diameter</span>
          <span class="control-val" id="val-dot-diameter">${appState.settings.markerDiameterMm} mm</span>
        </div>
        <input type="range" id="slider-dot-diameter" min="0.4" max="3.0" value="${appState.settings.markerDiameterMm}" step="0.1">
      </div>

      <div class="control-group">
        <div class="control-label">
          <span>Paper Bridge Safety Margin</span>
          <span class="control-val" id="val-paper-bridge">${appState.settings.paperBridgeMm || 0.4} mm</span>
        </div>
        <input type="range" id="slider-paper-bridge" min="0.1" max="1.5" value="${appState.settings.paperBridgeMm || 0.4}" step="0.05">
        <div style="font-size:0.7rem;color:var(--accent-cyan);margin-top:4px;display:flex;align-items:center;gap:4px;">
          <i data-lucide="shield-check" style="width:12px;height:12px"></i> Guaranteed Paper Tear Protection (Zero Overlap)
        </div>
      </div>

      <div class="control-group">
        <label style="display:flex;align-items:center;gap:10px;font-size:0.8rem;cursor:pointer;color:var(--text-main);">
          <input type="checkbox" id="chk-variable-radius" ${appState.settings.variableRadius ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--accent-cyan)">
          <span>Variable Needle Hole Size (3D Depth)</span>
        </label>
      </div>

      <div class="control-group">
        <div class="control-label">
          <span>Target Hole Limit</span>
          <span class="control-val" id="val-hole-limit">${appState.settings.maxPointsLimit}</span>
        </div>
        <input type="range" id="slider-hole-limit" min="1000" max="14000" value="${appState.settings.maxPointsLimit}" step="500">
      </div>
    </div>

    <!-- 5. Image Preprocessing & Contrast Controls -->
    <div class="sidebar-section">
      <div class="sidebar-title">
        <i data-lucide="sliders" style="width:14px;height:14px"></i> Portrait & Image Tuning
      </div>

      <div class="control-group">
        <div class="control-label">
          <span>Facial Feature Sharpness</span>
          <span class="control-val" id="val-detail">${appState.settings.imagePrep.detailStrength || 1.6}</span>
        </div>
        <input type="range" id="slider-detail" min="1.0" max="3.0" value="${appState.settings.imagePrep.detailStrength || 1.6}" step="0.1">
      </div>

      <div class="control-group">
        <div class="control-label">
          <span>Contrast</span>
          <span class="control-val" id="val-contrast">${appState.settings.imagePrep.contrast}</span>
        </div>
        <input type="range" id="slider-contrast" min="-50" max="80" value="${appState.settings.imagePrep.contrast}" step="1">
      </div>

      <div class="control-group">
        <div class="control-label">
          <span>Tonal Gamma (Midtones)</span>
          <span class="control-val" id="val-gamma">${appState.settings.imagePrep.gamma || 1.2}</span>
        </div>
        <input type="range" id="slider-gamma" min="0.6" max="2.2" value="${appState.settings.imagePrep.gamma || 1.2}" step="0.1">
      </div>

      <div class="control-group">
        <div class="control-label">
          <span>Edge Sensitivity</span>
          <span class="control-val" id="val-edge-sensitivity">${appState.settings.imagePrep.edgeThreshold}</span>
        </div>
        <input type="range" id="slider-edge-sensitivity" min="5" max="80" value="${appState.settings.imagePrep.edgeThreshold}" step="1">
      </div>

      <div class="control-group">
        <div class="control-label">
          <span>Noise Smoothing</span>
          <span class="control-val" id="val-blur">${appState.settings.imagePrep.blur}</span>
        </div>
        <input type="range" id="slider-blur" min="0" max="5" value="${appState.settings.imagePrep.blur}" step="1">
      </div>
    </div>

    <!-- 6. Targeted Local Area Adjustments (ROI) -->
    <div class="sidebar-section">
      <div class="sidebar-title">
        <i data-lucide="crop" style="width:14px;height:14px"></i> Targeted Area Adjustments
      </div>

      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <button class="btn ${appState.activeTool === 'region_polygon' || appState.activeTool === 'region' ? 'btn-primary' : ''}" id="btn-draw-polygon" style="flex:1;justify-content:center;font-size:0.75rem;padding:8px 4px;">
          <i data-lucide="pentagon" style="width:14px;height:14px"></i>
          ${appState.activeTool === 'region_polygon' || appState.activeTool === 'region' ? 'Click Canvas for Polygon...' : '+ Polygon Lasso'}
        </button>
        <button class="btn ${appState.activeTool === 'region_box' ? 'btn-primary' : ''}" id="btn-draw-box" style="flex:1;justify-content:center;font-size:0.75rem;padding:8px 4px;">
          <i data-lucide="square" style="width:14px;height:14px"></i>
          ${appState.activeTool === 'region_box' ? 'Drag Box on Canvas...' : '+ Rectangle Box'}
        </button>
      </div>

      <div class="preset-strip" id="region-list-strip" style="margin-bottom:10px;">
        <div class="preset-chip ${!appState.activeRegionId ? 'active' : ''}" data-reg-id="">Global Image</div>
        ${appState.regions.map(r => `
          <div class="preset-chip ${appState.activeRegionId === r.id ? 'active' : ''}" data-reg-id="${r.id}">${r.name}</div>
        `).join('')}
      </div>

      <button class="btn" id="btn-toggle-region-overlay" style="width:100%;justify-content:center;margin-bottom:12px;font-size:0.75rem;padding:6px;">
        <i data-lucide="${appState.showRegionOverlay ? 'eye-off' : 'eye'}" style="width:14px;height:14px"></i>
        ${appState.showRegionOverlay ? 'Hide Selection Boundary (Preview Dots)' : 'Show Selection Boundary'}
      </button>

      ${appState.getActiveRegion() ? `
        <div style="background:rgba(255,255,255,0.04);padding:12px;border-radius:8px;border:1px solid var(--border-color)">
          <div style="font-size:0.75rem;font-weight:700;color:var(--accent-cyan);margin-bottom:10px;display:flex;align-items:center;justify-space-between;">
            <span>${appState.getActiveRegion().name} Tuning</span>
            <span style="font-size:0.65rem;background:rgba(56,189,248,0.15);padding:2px 6px;border-radius:4px;color:#38bdf8">
              ${appState.getActiveRegion().type === 'polygon' ? `Polygon (${appState.getActiveRegion().points ? appState.getActiveRegion().points.length : 0} pts)` : 'Rectangle Box'}
            </span>
          </div>
          
          <div class="control-group">
            <div class="control-label">
              <span>Local Feature Sharpness</span>
              <span class="control-val" id="val-reg-detail">${appState.getActiveRegion().detailStrength || 1.6}</span>
            </div>
            <input type="range" id="slider-reg-detail" min="1.0" max="3.0" value="${appState.getActiveRegion().detailStrength || 1.6}" step="0.1">
          </div>

          <div class="control-group">
            <div class="control-label">
              <span>Local Contrast Boost</span>
              <span class="control-val" id="val-reg-contrast">${appState.getActiveRegion().contrast || 0}</span>
            </div>
            <input type="range" id="slider-reg-contrast" min="-50" max="80" value="${appState.getActiveRegion().contrast || 0}" step="1">
          </div>

          <div class="control-group">
            <div class="control-label">
              <span>Local Tonal Gamma</span>
              <span class="control-val" id="val-reg-gamma">${appState.getActiveRegion().gamma || 1.2}</span>
            </div>
            <input type="range" id="slider-reg-gamma" min="0.6" max="2.4" value="${appState.getActiveRegion().gamma || 1.2}" step="0.1">
          </div>

          <div class="control-group">
            <div class="control-label">
              <span>Local Edge Sensitivity</span>
              <span class="control-val" id="val-reg-edge">${appState.getActiveRegion().edgeThreshold || 20}</span>
            </div>
            <input type="range" id="slider-reg-edge" min="5" max="80" value="${appState.getActiveRegion().edgeThreshold || 20}" step="1">
          </div>

          <div class="control-group">
            <div class="control-label">
              <span>Local Noise Smoothing</span>
              <span class="control-val" id="val-reg-blur">${appState.getActiveRegion().blur || 1}</span>
            </div>
            <input type="range" id="slider-reg-blur" min="0" max="5" value="${appState.getActiveRegion().blur || 1}" step="1">
          </div>

          <div class="control-group">
            <div class="control-label">
              <span>Local Hole Spacing (Min)</span>
              <span class="control-val" id="val-reg-spacing">${appState.getActiveRegion().minSpacingMm || 2.5} mm</span>
            </div>
            <input type="range" id="slider-reg-spacing" min="1.5" max="10.0" value="${appState.getActiveRegion().minSpacingMm || 2.5}" step="0.5">
          </div>

          <div class="control-group">
            <div class="control-label">
              <span>Local Punch Size Scale</span>
              <span class="control-val" id="val-reg-size">${appState.getActiveRegion().dotSizeFactor || 1.0}x</span>
            </div>
            <input type="range" id="slider-reg-size" min="0.5" max="2.0" value="${appState.getActiveRegion().dotSizeFactor || 1.0}" step="0.1">
          </div>

          <button class="btn btn-accent" id="btn-delete-region" style="width:100%;justify-content:center;padding:6px;font-size:0.75rem;margin-top:8px;">
            Delete Selected Area
          </button>
        </div>
      ` : `<div style="font-size:0.75rem;color:var(--text-muted)">No area selected. Click <b>"+ Select / Draw Area"</b> and drag a box over any part of the image (e.g. eyes or face) to fine-tune all 7 local controls.</div>`}
    </div>
  `;

  createIcons({ icons, nameAttr: 'data-lucide' });

  // Bind Sidebar Upload Button
  const sidebarUploadBtn = containerElement.querySelector('#sidebar-btn-upload');
  const fileInput = document.getElementById('file-upload-input');
  if (sidebarUploadBtn && fileInput) {
    sidebarUploadBtn.addEventListener('click', () => fileInput.click());
  }

  // Render Sample Gallery Chips
  const galleryStrip = containerElement.querySelector('#preset-gallery-strip');
  for (const preset of SAMPLE_PRESETS) {
    const chip = document.createElement('div');
    chip.className = 'preset-chip';
    chip.innerText = preset.name;
    chip.addEventListener('click', () => onLoadSample(preset.id));
    galleryStrip.appendChild(chip);
  }

  // Attach Mode Button Listeners
  const modeBtns = containerElement.querySelectorAll('.mode-btn');
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.settings.mode = btn.dataset.mode;
      onSettingChange();
    });
  });

  // Attach Select & Slider Listeners
  bindSelect('select-paper-size', val => {
    appState.paperKey = val;
    setupSidebar(containerElement, appState, onSettingChange, onLoadSample);
    onSettingChange();
  });

  if (appState.paperKey === 'Custom') {
    bindSlider('slider-custom-width', 'val-custom-width', ' mm', val => {
      appState.customWidthMm = val;
      onSettingChange();
    });
    bindSlider('slider-custom-height', 'val-custom-height', ' mm', val => {
      appState.customHeightMm = val;
      onSettingChange();
    });

    const bindCustomChip = (id, w, h) => {
      const chip = containerElement.querySelector(`#${id}`);
      if (chip) {
        chip.addEventListener('click', () => {
          appState.customWidthMm = w;
          appState.customHeightMm = h;
          setupSidebar(containerElement, appState, onSettingChange, onLoadSample);
          onSettingChange();
        });
      }
    };

    bindCustomChip('btn-custom-100x100', 100, 100);
    bindCustomChip('btn-custom-150x150', 150, 150);
    bindCustomChip('btn-custom-300x300', 300, 300);
    bindCustomChip('btn-custom-postcard', 105, 148);
  }

  bindSelect('select-orientation', val => { appState.orientation = val; onSettingChange(); });

  bindSlider('slider-margin', 'val-margin', ' mm', val => { appState.marginMm = val; onSettingChange(); });
  bindSlider('slider-min-spacing', 'val-min-spacing', ' mm', val => { appState.settings.minSpacingMm = val; onSettingChange(); });
  bindSlider('slider-max-spacing', 'val-max-spacing', ' mm', val => { appState.settings.maxSpacingMm = val; onSettingChange(); });
  bindSlider('slider-dot-diameter', 'val-dot-diameter', ' mm', val => { appState.settings.markerDiameterMm = val; onSettingChange(); });
  bindSlider('slider-paper-bridge', 'val-paper-bridge', ' mm', val => { appState.settings.paperBridgeMm = val; onSettingChange(); });
  bindSlider('slider-hole-limit', 'val-hole-limit', '', val => { appState.settings.maxPointsLimit = val; onSettingChange(); });

  const chkVarRad = containerElement.querySelector('#chk-variable-radius');
  if (chkVarRad) {
    chkVarRad.addEventListener('change', () => {
      appState.settings.variableRadius = chkVarRad.checked;
      onSettingChange();
    });
  }

  bindSlider('slider-contrast', 'val-contrast', '', val => { appState.settings.imagePrep.contrast = val; onSettingChange(); });
  bindSlider('slider-detail', 'val-detail', '', val => { appState.settings.imagePrep.detailStrength = val; onSettingChange(); });
  bindSlider('slider-gamma', 'val-gamma', '', val => { appState.settings.imagePrep.gamma = val; onSettingChange(); });
  bindSlider('slider-edge-sensitivity', 'val-edge-sensitivity', '', val => { appState.settings.imagePrep.edgeThreshold = val; onSettingChange(); });
  bindSlider('slider-blur', 'val-blur', '', val => { appState.settings.imagePrep.blur = val; onSettingChange(); });

  // Region Drawing Buttons
  const drawPolyBtn = containerElement.querySelector('#btn-draw-polygon');
  if (drawPolyBtn) {
    drawPolyBtn.addEventListener('click', () => {
      appState.activeTool = 'region_polygon';
      setupSidebar(containerElement, appState, onSettingChange, onLoadSample);
    });
  }

  const drawBoxBtn = containerElement.querySelector('#btn-draw-box');
  if (drawBoxBtn) {
    drawBoxBtn.addEventListener('click', () => {
      appState.activeTool = 'region_box';
      setupSidebar(containerElement, appState, onSettingChange, onLoadSample);
    });
  }

  const toggleOverlayBtn = containerElement.querySelector('#btn-toggle-region-overlay');
  if (toggleOverlayBtn) {
    toggleOverlayBtn.addEventListener('click', () => {
      appState.showRegionOverlay = !appState.showRegionOverlay;
      setupSidebar(containerElement, appState, onSettingChange, onLoadSample);
      onSettingChange();
    });
  }

  // Region Selection Chips
  const regionChips = containerElement.querySelectorAll('#region-list-strip .preset-chip');
  regionChips.forEach(chip => {
    chip.addEventListener('click', () => {
      appState.activeRegionId = chip.dataset.regId || null;
      setupSidebar(containerElement, appState, onSettingChange, onLoadSample);
      onSettingChange();
    });
  });

  // Active Region Sliders
  const activeReg = appState.getActiveRegion();
  if (activeReg) {
    bindSlider('slider-reg-detail', 'val-reg-detail', '', val => {
      activeReg.detailStrength = val;
      onSettingChange();
    });

    bindSlider('slider-reg-contrast', 'val-reg-contrast', '', val => {
      activeReg.contrast = val;
      onSettingChange();
    });

    bindSlider('slider-reg-gamma', 'val-reg-gamma', '', val => {
      activeReg.gamma = val;
      onSettingChange();
    });

    bindSlider('slider-reg-edge', 'val-reg-edge', '', val => {
      activeReg.edgeThreshold = val;
      onSettingChange();
    });

    bindSlider('slider-reg-blur', 'val-reg-blur', '', val => {
      activeReg.blur = val;
      onSettingChange();
    });

    bindSlider('slider-reg-spacing', 'val-reg-spacing', ' mm', val => {
      activeReg.minSpacingMm = val;
      onSettingChange();
    });

    bindSlider('slider-reg-size', 'val-reg-size', 'x', val => {
      activeReg.dotSizeFactor = val;
      onSettingChange();
    });

    const deleteRegBtn = containerElement.querySelector('#btn-delete-region');
    if (deleteRegBtn) {
      deleteRegBtn.addEventListener('click', () => {
        appState.removeRegion(activeReg.id);
        setupSidebar(containerElement, appState, onSettingChange, onLoadSample);
        onSettingChange();
      });
    }
  }

  function bindSlider(sliderId, valId, unit, callback) {
    const slider = containerElement.querySelector(`#${sliderId}`);
    const valDisplay = containerElement.querySelector(`#${valId}`);
    if (slider && valDisplay) {
      slider.addEventListener('input', () => {
        valDisplay.innerText = `${slider.value}${unit}`;
        callback(Number(slider.value));
      });
    }
  }

  function bindSelect(selectId, callback) {
    const sel = containerElement.querySelector(`#${selectId}`);
    if (sel) {
      sel.addEventListener('change', () => callback(sel.value));
    }
  }
}
