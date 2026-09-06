/**
 * Region Utilities for Box and Polygon Selection ROI (Region of Interest) processing.
 * Supports exact point-in-polygon ray casting, distance feathering, and mm <-> normalized coordinate mapping.
 */

/**
 * Standard ray-casting algorithm to test if (px, py) is inside a closed polygon.
 */
export function pointInPolygon(px, py, polygon) {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const p1 = polygon[i];
    const p2 = polygon[j];
    const xi = p1.xNorm !== undefined ? p1.xNorm : (p1.x !== undefined ? p1.x : 0);
    const yi = p1.yNorm !== undefined ? p1.yNorm : (p1.y !== undefined ? p1.y : 0);
    const xj = p2.xNorm !== undefined ? p2.xNorm : (p2.x !== undefined ? p2.x : 0);
    const yj = p2.yNorm !== undefined ? p2.yNorm : (p2.y !== undefined ? p2.y : 0);

    const intersect = ((yi > py) !== (yj > py))
        && (px < (xj - xi) * (py - yi) / ((yj - yi) || 0.000001) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculates shortest Euclidean distance from (px, py) to any edge of a polygon.
 */
export function distanceToPolygonBoundary(px, py, polygon) {
  if (!polygon || polygon.length < 3) return Infinity;
  let minDistance = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const p1 = polygon[i];
    const p2 = polygon[j];
    const x1 = p1.xNorm !== undefined ? p1.xNorm : p1.x;
    const y1 = p1.yNorm !== undefined ? p1.yNorm : p1.y;
    const x2 = p2.xNorm !== undefined ? p2.xNorm : p2.x;
    const y2 = p2.yNorm !== undefined ? p2.yNorm : p2.y;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    const dist = Math.hypot(px - projX, py - projY);
    if (dist < minDistance) minDistance = dist;
  }
  return minDistance;
}

/**
 * Checks if a point (xNorm, yNorm) is inside a given region (box or polygon).
 */
export function isPointInRegion(xNorm, yNorm, reg, marginMm = 0, drawW = 1, drawH = 1) {
  if (!reg) return false;

  // Bounding box pre-check
  const minX = reg.xNorm !== undefined ? reg.xNorm : (reg.x !== undefined ? (reg.x - marginMm) / drawW : 0);
  const minY = reg.yNorm !== undefined ? reg.yNorm : (reg.y !== undefined ? (reg.y - marginMm) / drawH : 0);
  const widthN = reg.wNorm !== undefined ? reg.wNorm : (reg.width !== undefined ? reg.width / drawW : 1);
  const heightN = reg.hNorm !== undefined ? reg.hNorm : (reg.height !== undefined ? reg.height / drawH : 1);
  const maxX = minX + widthN;
  const maxY = minY + heightN;

  if (xNorm < minX || xNorm > maxX || yNorm < minY || yNorm > maxY) {
    return false;
  }

  const isPolygon = reg.type === 'polygon' || (reg.points && reg.points.length >= 3) || (reg.pointsNorm && reg.pointsNorm.length >= 3);

  if (isPolygon) {
    const pts = reg.pointsNorm || reg.points;
    if (pts && pts.length >= 3) {
      const normalizedPts = pts.map(p => {
        if (p.xNorm !== undefined && p.yNorm !== undefined) return p;
        return {
          xNorm: (p.x - marginMm) / drawW,
          yNorm: (p.y - marginMm) / drawH
        };
      });
      return pointInPolygon(xNorm, yNorm, normalizedPts);
    }
    return false;
  }

  return true;
}

/**
 * Computes smooth distance-feathered region weight W in [0.0, 1.0].
 * Eliminates artificial straight lines or square box edges of dots along selection borders.
 */
export function getRegionWeight(xNorm, yNorm, reg, marginMm = 0, drawW = 1, drawH = 1, featherNorm = 0.035) {
  if (!isPointInRegion(xNorm, yNorm, reg, marginMm, drawW, drawH)) {
    return 0.0;
  }

  const isPolygon = reg.type === 'polygon' || (reg.points && reg.points.length >= 3) || (reg.pointsNorm && reg.pointsNorm.length >= 3);

  let distToEdge = 0;
  if (isPolygon) {
    const pts = reg.pointsNorm || reg.points;
    const normalizedPts = pts.map(p => {
      if (p.xNorm !== undefined && p.yNorm !== undefined) return p;
      return {
        xNorm: (p.x - marginMm) / drawW,
        yNorm: (p.y - marginMm) / drawH
      };
    });
    distToEdge = distanceToPolygonBoundary(xNorm, yNorm, normalizedPts);
  } else {
    // Box region distance to 4 edges
    const minX = reg.xNorm !== undefined ? reg.xNorm : (reg.x - marginMm) / drawW;
    const minY = reg.yNorm !== undefined ? reg.yNorm : (reg.y - marginMm) / drawH;
    const wN = reg.wNorm !== undefined ? reg.wNorm : reg.width / drawW;
    const hN = reg.hNorm !== undefined ? reg.hNorm : reg.height / drawH;
    const maxX = minX + wN;
    const maxY = minY + hN;

    distToEdge = Math.min(
      xNorm - minX,
      maxX - xNorm,
      yNorm - minY,
      maxY - yNorm
    );
  }

  if (distToEdge <= 0) return 0.0;
  if (distToEdge >= featherNorm) return 1.0;

  // Smooth Hermite curve for zero-discontinuity blending across boundary
  const t = distToEdge / featherNorm;
  return t * t * (3 - 2 * t);
}

/**
 * Returns matching region at (xNorm, yNorm) or null.
 */
export function getRegionAtNorm(xNorm, yNorm, regions = [], marginMm = 0, drawW = 1, drawH = 1) {
  for (const reg of regions) {
    if (isPointInRegion(xNorm, yNorm, reg, marginMm, drawW, drawH)) {
      return reg;
    }
  }
  return null;
}

/**
 * Computes bounding box for a set of mm or normalized points.
 */
export function computeBoundingBox(points) {
  if (!points || points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    const px = p.x !== undefined ? p.x : p.xNorm;
    const py = p.y !== undefined ? p.y : p.yNorm;
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY)
  };
}
