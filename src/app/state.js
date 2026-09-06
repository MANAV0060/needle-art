/**
 * Application State store.
 * Holds page layout, point model in mm, settings, active view, and source image.
 */

export const PAPER_SIZES = {
  'A4': { name: 'A4', widthMm: 210, heightMm: 297 },
  'A3': { name: 'A3', widthMm: 297, heightMm: 420 },
  'Letter': { name: 'US Letter', widthMm: 215.9, heightMm: 279.4 },
  'Legal': { name: 'US Legal', widthMm: 215.9, heightMm: 355.6 },
  'Square': { name: 'Square (200mm)', widthMm: 200, heightMm: 200 },
  'Custom': { name: 'Custom Dimension (mm)', widthMm: 200, heightMm: 200 }
};

export class AppState {
  constructor() {
    this.paperKey = 'A4';
    this.orientation = 'portrait'; // 'portrait' | 'landscape'
    this.marginMm = 10;
    this.customWidthMm = 200;
    this.customHeightMm = 200;

    // Physical hole settings
    this.settings = {
      mode: 'hybrid', // 'outline' | 'shading' | 'hybrid'
      minSpacingMm: 2.5,
      maxSpacingMm: 10.0,
      markerDiameterMm: 0.8,
      variableRadius: true,
      paperBridgeMm: 0.4, // Min physical paper gap between hole perimeters to prevent tearing
      estimatedPunchSizeMm: 1.0,
      maxPointsLimit: 6000,
      punchSpeedPerMin: 15,
      presetStyle: 'portrait',

      // Image Preprocessing Controls
      imagePrep: {
        contrast: 25,
        brightness: 5,
        gamma: 1.2,
        detailStrength: 1.6,
        blur: 1,
        invert: false,
        edgeThreshold: 20,
        edgeWeight: 50,
        shadeWeight: 50,
        detailWeight: 25
      }
    };

    // View & Display state
    this.activeView = 'template'; // 'template' | 'simulation' | 'overlay' | 'edges'
    this.activeTool = 'select';   // 'select' | 'add' | 'delete' | 'brush'
    this.brushRadiusMm = 5.0;

    this.showGrid = true;
    this.showRuler = true;
    this.showRegistrationMarks = true;
    this.showRegionOverlay = true; // Toggle selection boundary overlay preview

    // Source image metadata & ImageData
    this.sourceImage = null;
    this.rawImageData = null;
    this.imageWidth = 0;
    this.imageHeight = 0;

    // Point Model Array: [{ id, x, y, radius, type, contourId, sequenceIndex }]
    this.points = [];
    this.selectedPointIds = new Set();

    // Local Selected Regions for Targeted Contrast & Gamma Tuning
    // Array of { id, name, x, y, width, height, contrast, gamma, detailStrength, densityBoost }
    this.regions = [];
    this.activeRegionId = null;
  }

  addRegion(region) {
    this.regions.push(region);
    this.activeRegionId = region.id;
  }

  getActiveRegion() {
    return this.regions.find(r => r.id === this.activeRegionId) || null;
  }

  removeRegion(id) {
    this.regions = this.regions.filter(r => r.id !== id);
    if (this.activeRegionId === id) {
      this.activeRegionId = this.regions[0] ? this.regions[0].id : null;
    }
  }

  getPageDimensions() {
    let dims;
    if (this.paperKey === 'Custom') {
      dims = {
        widthMm: Math.max(30, this.customWidthMm || 200),
        heightMm: Math.max(30, this.customHeightMm || 200)
      };
    } else {
      dims = PAPER_SIZES[this.paperKey] || {
        widthMm: 210,
        heightMm: 297
      };
    }

    if (this.orientation === 'landscape') {
      return {
        widthMm: Math.max(dims.widthMm, dims.heightMm),
        heightMm: Math.min(dims.widthMm, dims.heightMm)
      };
    }
    return {
      widthMm: Math.min(dims.widthMm, dims.heightMm),
      heightMm: Math.max(dims.widthMm, dims.heightMm)
    };
  }

  setPoints(newPoints) {
    this.points = newPoints;
    this.selectedPointIds.clear();
  }

  addPoint(point) {
    this.points.push(point);
  }

  removePointById(id) {
    this.points = this.points.filter(p => p.id !== id);
    this.selectedPointIds.delete(id);
  }

  removePointsByIds(idsSet) {
    this.points = this.points.filter(p => !idsSet.has(p.id));
    this.selectedPointIds.clear();
  }
}
