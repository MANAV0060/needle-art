import { generateOutlinePoints } from './contourSampler.js';
import { generateShadingPoints } from './stippling.js';
import { SpatialHash } from './spatialHash.js';

/**
 * Final safety filter to guarantee no physical needle hole perimeters overlap or tear paper.
 */
export function filterOverlappingHoles(points, paperBridgeMm = 0.4, defaultRadius = 0.4) {
  const spatialHash = new SpatialHash(10.0);
  const filtered = [];

  for (const pt of points) {
    const r1 = pt.radius || defaultRadius;
    const searchRadius = r1 + 2.5 + paperBridgeMm;
    const neighbors = spatialHash.getPointsWithin(pt.x, pt.y, searchRadius);
    let overlap = false;

    for (let i = 0; i < neighbors.length; i++) {
      const n = neighbors[i];
      const r2 = n.radius || defaultRadius;
      const minDist = r1 + r2 + paperBridgeMm;
      const distSq = (n.x - pt.x) * (n.x - pt.x) + (n.y - pt.y) * (n.y - pt.y);
      if (distSq < minDist * minDist) {
        overlap = true;
        break;
      }
    }

    if (!overlap) {
      filtered.push(pt);
      spatialHash.insert(pt);
    }
  }

  return filtered;
}

/**
 * Main point generator orchestrator for Outline, Shading, and Hybrid modes.
 */
export function generatePointSet(imageData, width, height, importanceMap, binaryEdges, settings = {}) {
  const {
    mode = 'hybrid', // 'outline' | 'shading' | 'hybrid'
    minSpacingMm = 3.0,
    maxSpacingMm = 12.0,
    pageWidthMm = 210,
    pageHeightMm = 297,
    marginMm = 10,
    markerDiameterMm = 0.8,
    variableRadius = true,
    paperBridgeMm = 0.4,
    maxPointsLimit = 6000
  } = settings;

  let outlinePoints = [];
  let shadingPoints = [];

  if (mode === 'outline' || mode === 'hybrid') {
    outlinePoints = generateOutlinePoints(binaryEdges, width, height, {
      spacingMm: minSpacingMm,
      pageWidthMm,
      pageHeightMm,
      marginMm,
      markerDiameterMm,
      paperBridgeMm,
      regions: settings.regions || []
    });
  }

  if (mode === 'shading') {
    shadingPoints = generateShadingPoints(importanceMap, width, height, {
      minSpacingMm,
      maxSpacingMm,
      pageWidthMm,
      pageHeightMm,
      marginMm,
      markerDiameterMm,
      variableRadius,
      paperBridgeMm,
      regions: settings.regions || [],
      maxPointsLimit
    });
  } else if (mode === 'hybrid') {
    // Generate shading points with exclusion mask around outline points
    const remainingLimit = Math.max(500, maxPointsLimit - outlinePoints.length);
    shadingPoints = generateShadingPoints(importanceMap, width, height, {
      minSpacingMm: Math.max(minSpacingMm, minSpacingMm * 1.1),
      maxSpacingMm,
      pageWidthMm,
      pageHeightMm,
      marginMm,
      markerDiameterMm,
      variableRadius,
      paperBridgeMm,
      regions: settings.regions || [],
      exclusionPoints: outlinePoints,
      clearanceFactor: 1.4,
      maxPointsLimit: remainingLimit
    });
  }

  const rawCombined = [...outlinePoints, ...shadingPoints];
  return filterOverlappingHoles(rawCombined, paperBridgeMm, markerDiameterMm / 2.0);
}

