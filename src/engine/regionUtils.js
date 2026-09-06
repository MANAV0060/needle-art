/**
 * Region Utilities for Box and Polygon Selection ROI (Region of Interest) processing.
 */

/**
 * Standard ray-casting algorithm to test if (px, py) is inside a closed polygon.
 */
export function pointInPolygon(px, py, polygon) {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].xNorm !== undefined ? polygon[i].xNorm : polygon[i].x;
    const yi = polygon[i].yNorm !== undefined ? polygon[i].yNorm : polygon[i].y;
    const xj = polygon[j].xNorm !== undefined ? polygon[j].xNorm : polygon[j].x;
    const yj = polygon[j].yNorm !== undefined ? polygon[j].yNorm : polygon[j].y;

    const intersect = ((yi > py) !== (yj > py))
        && (px < (xj - xi) * (py - yi) / ((yj - yi) || 0.00001) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Checks if a point (xNorm, yNorm) is inside a given region (box or polygon).
 */
export function isPointInRegion(xNorm, yNorm, reg) {
  if (!reg) return false;

  // Bounding box pre-check
  const minX = reg.xNorm !== undefined ? reg.xNorm : 0;
  const minY = reg.yNorm !== undefined ? reg.yNorm : 0;
  const maxX = reg.wNorm !== undefined ? minX + reg.wNorm : 1;
  const maxY = reg.hNorm !== undefined ? minY + reg.hNorm : 1;

  if (xNorm < minX || xNorm > maxX || yNorm < minY || yNorm > maxY) {
    return false;
  }

  // Polygon check if polygon type
  if (reg.pointsNorm && reg.pointsNorm.length >= 3) {
    return pointInPolygon(xNorm, yNorm, reg.pointsNorm);
  }

  return true;
}

/**
 * Returns matching region at (xNorm, yNorm) or null.
 */
export function getRegionAtNorm(xNorm, yNorm, regions = []) {
  for (const reg of regions) {
    if (isPointInRegion(xNorm, yNorm, reg)) {
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
