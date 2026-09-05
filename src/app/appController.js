import { AppState } from './state.js';
import { CommandHistory } from '../editor/history.js';
import { CanvasRenderer } from '../editor/canvasRenderer.js';
import { setupInteraction } from '../editor/interaction.js';
import { setupSidebar } from '../ui/sidebar.js';
import { setupToolbar } from '../ui/toolbar.js';
import { updateAnalytics } from '../ui/analytics.js';
import { createSampleImage } from '../presets/sampleImages.js';
import { downloadSVG } from '../export/svgExporter.js';
import { downloadPDF } from '../export/pdfExporter.js';
import { triggerPrint } from '../export/print.js';

export class AppController {
  constructor() {
    this.state = new AppState();
    this.history = new CommandHistory(this.state, () => this.onStateChange());

    // Worker Instance
    this.worker = new Worker(new URL('../engine/worker.js', import.meta.url), { type: 'module' });
    this.isProcessing = false;

    this.initUI();
    this.initWorker();
    this.initKeyboardShortcuts();

    // Load initial sample butterfly preset
    this.loadSample('butterfly');
  }

  initUI() {
    this.canvasEl = document.getElementById('main-canvas');
    this.sidebarEl = document.getElementById('sidebar-container');
    this.toolbarEl = document.getElementById('toolbar-container');
    this.analyticsEl = document.getElementById('analytics-container');

    this.renderer = new CanvasRenderer(this.canvasEl, this.state);

    // Interaction Setup
    setupInteraction(this.renderer, this.history, () => this.render());

    // UI Setup
    setupSidebar(this.sidebarEl, this.state, () => this.generatePoints(), (id) => this.loadSample(id));
    setupToolbar(this.toolbarEl, this.state, this.history, this.renderer, () => this.render());

    // Window Resize Observer
    window.addEventListener('resize', () => {
      const container = this.canvasEl.parentElement;
      this.renderer.resize(container.clientWidth, container.clientHeight);
    });
    const container = this.canvasEl.parentElement;
    this.renderer.resize(container.clientWidth, container.clientHeight);

    // Export Buttons
    document.getElementById('btn-export-svg').addEventListener('click', () => downloadSVG(this.state));
    document.getElementById('btn-export-pdf').addEventListener('click', () => downloadPDF(this.state));
    document.getElementById('btn-print').addEventListener('click', () => triggerPrint(this.state));

    // Upload Image Drag & Drop
    const fileInput = document.getElementById('file-upload-input');
    const uploadBtn = document.getElementById('btn-upload-image');
    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.loadImageFile(e.target.files[0]);
      }
    });

    const dropZone = document.body;
    dropZone.addEventListener('dragover', (e) => e.preventDefault());
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.loadImageFile(e.dataTransfer.files[0]);
      }
    });
  }

  initWorker() {
    this.worker.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === 'GENERATE_COMPLETE') {
        const { pointBuffer, pointCount, edgeMagnitudeBuffer, width, height } = payload;
        const floatArray = new Float32Array(pointBuffer);

        const newPoints = [];
        for (let i = 0; i < pointCount; i++) {
          const idx = i * 6;
          newPoints.push({
            id: `p_${i + 1}`,
            x: floatArray[idx],
            y: floatArray[idx + 1],
            type: floatArray[idx + 2] === 1.0 ? 'outline' : 'shading',
            radius: floatArray[idx + 3],
            contourId: floatArray[idx + 4],
            sequenceIndex: floatArray[idx + 5]
          });
        }

        this.state.setPoints(newPoints);
        this.history.clear();

        // Edge map buffer for optional edge map view mode
        this.renderer.setEdgeMapBuffer(edgeMagnitudeBuffer, width, height);

        this.isProcessing = false;
        this.render();
      }
    };
  }

  async loadSample(presetId) {
    const { img, canvas } = await createSampleImage(presetId, 600, 600);
    this.state.sourceImage = img;
    this.state.imageWidth = 600;
    this.state.imageHeight = 600;

    const ctx = canvas.getContext('2d');
    this.state.rawImageData = ctx.getImageData(0, 0, 600, 600);

    this.generatePoints();
  }

  loadImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Normalize max dimension for fast worker processing
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        const scale = Math.min(maxDim / w, maxDim / h, 1.0);
        w = Math.floor(w * scale);
        h = Math.floor(h * scale);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        this.state.sourceImage = img;
        this.state.imageWidth = w;
        this.state.imageHeight = h;
        this.state.rawImageData = ctx.getImageData(0, 0, w, h);

        this.generatePoints();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  generatePoints() {
    if (!this.state.rawImageData || this.isProcessing) return;

    this.isProcessing = true;
    const pixels = new Uint8ClampedArray(this.state.rawImageData.data);
    // Clone buffer so rawImageData is not detached
    const bufferCopy = pixels.buffer.slice(0);

    const margin = this.state.marginMm;
    const page = this.state.getPageDimensions();
    const drawW = page.widthMm - 2 * margin;
    const drawH = page.heightMm - 2 * margin;

    const normalizedRegions = this.state.regions.map(r => ({
      id: r.id,
      xNorm: Math.max(0, (r.x - margin) / drawW),
      yNorm: Math.max(0, (r.y - margin) / drawH),
      wNorm: r.width / drawW,
      hNorm: r.height / drawH,
      contrast: r.contrast || 0,
      gamma: r.gamma || 1.2,
      detailStrength: r.detailStrength || 1.6,
      densityBoost: r.densityBoost || 1.0
    }));

    this.worker.postMessage({
      type: 'GENERATE',
      payload: {
        pixels: bufferCopy,
        width: this.state.imageWidth,
        height: this.state.imageHeight,
        regions: normalizedRegions,
        settings: JSON.parse(JSON.stringify(this.state.settings))
      }
    }, [bufferCopy]);
  }

  onStateChange() {
    this.render();
  }

  render() {
    this.renderer.render();
    updateAnalytics(this.analyticsEl, this.state);
  }

  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.history.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.history.redo();
      }
    });
  }
}
