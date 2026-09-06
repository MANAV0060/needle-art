/**
 * Region Utilities for Box and Polygon Selection ROI (Region of Interest) processing.
 * Supports exact point-in-polygon ray casting and mm <-> normalized coordinate mapping.
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
      // Normalize points if passed in mm space
      const normalizedPts = pts.map(p => {
        if (p.xNorm !== undefined && p.yNorm !== undefined) return p;
        return {
          xNorm: (p.x - marginMm) / drawW,
          yNorm: (p.y - marginMm) / drawH
        };
      });
      return pointInPolygon(xNorm, yNorm, normalizedPts);
    }
    // DO NOT fall back to bounding box if polygon points are missing or invalid
    return false;
  }

  return true;
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
