import { SpatialHash } from './spatialHash.js';
import { getRegionWeight } from './regionUtils.js';
import { createPRNG } from './prng.js';

/**
 * Adaptive Variable-Density Poisson Disk / Blue Noise Stippling Engine.
 * Operates in physical millimeter space with polygon & box ROI support,
 * distance-feathered smooth parameter blending, and PRNG sampling.
 */
export function generateShadingPoints(importanceMap, width, height, options = {}) {
  const {
    minSpacingMm = 2.0,
    maxSpacingMm = 12.0,
    pageWidthMm = 210,
    pageHeightMm = 297,
    marginMm = 10,
    exclusionPoints = [],      // Existing outline points for clearance mask in Hybrid mode
    clearanceFactor = 1.25,    // Exclusion radius multiplier
    maxPointsLimit = 10000,    // Target max hole budget safeguard
    kCandidates = 30,          // Poisson candidate attempts per point
    seed = 12345678
  } = options;

  const prng = createPRNG(seed);

  const drawableWidthMm = pageWidthMm - 2 * marginMm;
  const drawableHeightMm = pageHeightMm - 2 * marginMm;

  // Spatial hash grid for fast O(1) collision testing
  const spatialHash = new SpatialHash(minSpacingMm);

  // Insert existing outline points into spatial hash with clearance radius
  for (const ep of exclusionPoints) {
    spatialHash.insert({
      x: ep.x,
      y: ep.y,
      radius: minSpacingMm * clearanceFactor
    });
  }

  const points = [];
  const activeList = [];
  let nextPointId = 1;

  // Helper to lookup importance (0.0 to 1.0) from mm position
  const getImportance = (mmX, mmY) => {
    const normX = (mmX - marginMm) / drawableWidthMm;
    const normY = (mmY - marginMm) / drawableHeightMm;
    if (normX < 0 || normX > 1 || normY < 0 || normY > 1) return 0;

    const px = Math.floor(normX * (width - 1));
    const py = Math.floor(normY * (height - 1));
    return importanceMap[py * width + px] || 0;
  };

  const regions = options.regions || [];

  // Helper to calculate target spacing with smooth region weight blending
  const getSpacing = (mmX, mmY) => {
    const imp = getImportance(mmX, mmY);
    const normX = (mmX - marginMm) / drawableWidthMm;
    const normY = (mmY - marginMm) / drawableHeightMm;

    let localMinSpacing = minSpacingMm;
    for (const reg of regions) {
      const w = getRegionWeight(normX, normY, reg, marginMm, drawableWidthMm, drawableHeightMm);
      if (w > 0 && reg.minSpacingMm !== undefined) {
        localMinSpacing = localMinSpacing * (1 - w) + reg.minSpacingMm * w;
      }
    }
    // Darker/Important areas get smaller spacing (higher density)
    return maxSpacingMm - imp * (maxSpacingMm - localMinSpacing);
  };

  const paperBridgeMm = options.paperBridgeMm || 0.4;
  const markerDiameterMm = options.markerDiameterMm || 0.8;
  const baseRadius = markerDiameterMm / 2.0;
  const variableRadius = options.variableRadius !== false; // default true for artistic depth

  // Helper to calculate dot radius with smooth region weight blending
  const getRadius = (imp, mmX, mmY) => {
    const normX = (mmX - marginMm) / drawableWidthMm;
    const normY = (mmY - marginMm) / drawableHeightMm;

    let scaleFactor = 1.0;
    for (const reg of regions) {
      const w = getRegionWeight(normX, normY, reg, marginMm, drawableWidthMm, drawableHeightMm);
      if (w > 0 && reg.dotSizeFactor !== undefined) {
        scaleFactor = scaleFactor * (1 - w) + reg.dotSizeFactor * w;
      }
    }
    if (!variableRadius) return Number((baseRadius * scaleFactor).toFixed(2));
    // Darker/Important areas get larger punch holes for dramatic depth
    return Number((baseRadius * (0.55 + imp * 0.95) * scaleFactor).toFixed(2));
  };

  // Seed candidate points deterministically across grid
  const gridRows = 25;
  const gridCols = 25;
  const seedCandidates = [];

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const rx = marginMm + ((c + 0.5) / gridCols) * drawableWidthMm;
      const ry = marginMm + ((r + 0.5) / gridRows) * drawableHeightMm;
      const imp = getImportance(rx, ry);
      seedCandidates.push({ x: rx, y: ry, imp });
    }
  }

  // Sort by importance descending so darkest/most detailed areas get seeded first
  seedCandidates.sort((a, b) => b.imp - a.imp);

  // Helper to ensure physical hole circles never overlap or breach paperBridgeMm gap
  const hasPhysicalOverlap = (x, y, candRadius) => {
    const maxNeighborRadius = 2.5;
    const searchRadius = candRadius + maxNeighborRadius + paperBridgeMm;
    const neighbors = spatialHash.getPointsWithin(x, y, searchRadius);
    for (let i = 0; i < neighbors.length; i++) {
      const n = neighbors[i];
      const nRadius = n.radius || baseRadius;
      const minDist = candRadius + nRadius + paperBridgeMm;
      const distSq = (n.x - x) * (n.x - x) + (n.y - y) * (n.y - y);
      if (distSq < minDist * minDist) {
        return true;
      }
    }
    return false;
  };

  for (const cand of seedCandidates) {
    const sp = getSpacing(cand.x, cand.y);
    const candRad = getRadius(cand.imp, cand.x, cand.y);
    if (!spatialHash.hasNeighborWithin(cand.x, cand.y, sp * 0.9) && !hasPhysicalOverlap(cand.x, cand.y, candRad)) {
      const newPoint = {
        id: `p_shd_${nextPointId++}`,
        x: Number(cand.x.toFixed(2)),
        y: Number(cand.y.toFixed(2)),
        radius: candRad,
        type: 'shading'
      };
      points.push(newPoint);
      activeList.push(newPoint);
      spatialHash.insert(newPoint);
      if (points.length >= Math.min(300, maxPointsLimit)) break;
    }
  }

  // Poisson-disk sampling loop around active points
  while (activeList.length > 0 && points.length < maxPointsLimit) {
    const randomIndex = Math.floor(prng() * activeList.length);
    const parentPoint = activeList[randomIndex];
    const rParent = getSpacing(parentPoint.x, parentPoint.y);

    let foundValid = false;

    for (let candidateIdx = 0; candidateIdx < kCandidates; candidateIdx++) {
      const angle = prng() * Math.PI * 2;
      const radius = rParent * (1.0 + prng());

      const candX = parentPoint.x + Math.cos(angle) * radius;
      const candY = parentPoint.y + Math.sin(angle) * radius;

      // Ensure candidate is inside margin bounds
      if (
        candX >= marginMm &&
        candX <= pageWidthMm - marginMm &&
        candY >= marginMm &&
        candY <= pageHeightMm - marginMm
      ) {
        const targetSpacing = getSpacing(candX, candY);
        const imp = getImportance(candX, candY);
        const candRad = getRadius(imp, candX, candY);

        if (
          imp >= 0.005 &&
          !spatialHash.hasNeighborWithin(candX, candY, targetSpacing) &&
          !hasPhysicalOverlap(candX, candY, candRad)
        ) {
          const newPoint = {
            id: `p_shd_${nextPointId++}`,
            x: Number(candX.toFixed(2)),
            y: Number(candY.toFixed(2)),
            radius: candRad,
            type: 'shading'
          };

          points.push(newPoint);
          activeList.push(newPoint);
          spatialHash.insert(newPoint);
          foundValid = true;
          if (points.length >= maxPointsLimit) break;
        }
      }
    }

    if (!foundValid) {
      activeList.splice(randomIndex, 1);
    }
  }

  return points;
}
