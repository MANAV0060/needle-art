/**
 * Spatial Hash / Uniform Grid for fast 2D distance & proximity queries.
 * Operates on millimeter coordinates.
 */
export class SpatialHash {
  constructor(cellSize) {
    this.cellSize = Math.max(0.1, cellSize);
    this.grid = new Map();
  }

  _hashKey(cx, cy) {
    return `${cx},${cy}`;
  }

  _getCoords(x, y) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return [cx, cy];
  }

  clear() {
    this.grid.clear();
  }

  insert(point) {
    const [cx, cy] = this._getCoords(point.x, point.y);
    const key = this._hashKey(cx, cy);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key).push(point);
  }

  /**
   * Checks if any point in hash is closer than `minDistance` to (x, y)
   */
  hasNeighborWithin(x, y, minDistance) {
    const minDistSq = minDistance * minDistance;
    const searchRadiusCells = Math.ceil(minDistance / this.cellSize);
    const [cx, cy] = this._getCoords(x, y);

    for (let dx = -searchRadiusCells; dx <= searchRadiusCells; dx++) {
      for (let dy = -searchRadiusCells; dy <= searchRadiusCells; dy++) {
        const key = this._hashKey(cx + dx, cy + dy);
        const cell = this.grid.get(key);
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            const p = cell[i];
            const distSq = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
            if (distSq < minDistSq) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  /**
   * Get all points within a specific radius of (x, y)
   */
  getPointsWithin(x, y, radius) {
    const radiusSq = radius * radius;
    const searchRadiusCells = Math.ceil(radius / this.cellSize);
    const [cx, cy] = this._getCoords(x, y);
    const results = [];

    for (let dx = -searchRadiusCells; dx <= searchRadiusCells; dx++) {
      for (let dy = -searchRadiusCells; dy <= searchRadiusCells; dy++) {
        const key = this._hashKey(cx + dx, cy + dy);
        const cell = this.grid.get(key);
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            const p = cell[i];
            const distSq = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
            if (distSq <= radiusSq) {
              results.push(p);
            }
          }
        }
      }
    }
    return results;
  }
}
