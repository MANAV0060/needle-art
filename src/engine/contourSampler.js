import { SpatialHash } from './spatialHash.js';
import { getRegionWeight } from './regionUtils.js';

/**
 * Traces 8-connected binary edge pixels into polyline contours,
 * parameterizes by arc-length, and samples evenly spaced physical points
 * with smooth polygon & box ROI weight blending.
 */

export function generateOutlinePoints(binaryEdges, width, height, options = {}) {
  const {
    spacingMm = 3.0,          // Target distance between holes along lines in mm
    pageWidthMm = 210,
    pageHeightMm = 297,
    marginMm = 10,
    minContourLengthMm = 5.0, // Filter out tiny noise contours
    paperBridgeMm = 0.4
  } = options;

  const drawableWidthMm = pageWidthMm - 2 * marginMm;
  const drawableHeightMm = pageHeightMm - 2 * marginMm;

  const spatialHash = new SpatialHash(10.0);

  // Conversion scale from image pixels to mm page space
  const scaleX = drawableWidthMm / width;
  const scaleY = drawableHeightMm / height;

  const visited = new Uint8Array(width * height);
  const contours = [];

  // 8-neighbor directions
  const dxs = [1, 1, 0, -1, -1, -1, 0, 1];
  const dys = [0, 1, 1, 1, 0, -1, -1, -1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const startIdx = y * width + x;
      if (binaryEdges[startIdx] === 1 && visited[startIdx] === 0) {
        // Trace connected component contour
        const rawPoints = [];
        let currX = x;
        let currY = y;

        rawPoints.push({ x: currX, y: currY });
        visited[startIdx] = 1;

        let tracing = true;
        while (tracing) {
          let foundNext = false;
          for (let d = 0; d < 8; d++) {
            const nx = currX + dxs[d];
            const ny = currY + dys[d];
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nidx = ny * width + nx;
              if (binaryEdges[nidx] === 1 && visited[nidx] === 0) {
                visited[nidx] = 1;
                currX = nx;
                currY = ny;
                rawPoints.push({ x: currX, y: currY });
                foundNext = true;
                break;
              }
            }
          }
          if (!foundNext) {
            tracing = false;
          }
        }

        if (rawPoints.length >= 3) {
          // Convert pixel coordinates to millimeter page coordinates
          const mmPoints = rawPoints.map(p => ({
            x: marginMm + p.x * scaleX,
            y: marginMm + p.y * scaleY
          }));

          contours.push(mmPoints);
        }
      }
    }
  }

  // Sample points along contours at equal arc-length spacing
  const sampledPoints = [];
  let nextPointId = 1;
  let contourIdCounter = 1;

  for (const contour of contours) {
    // Compute cumulative arc-lengths
    const arcLengths = [0];
    let totalLen = 0;

    for (let i = 1; i < contour.length; i++) {
      const p1 = contour[i - 1];
      const p2 = contour[i];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      totalLen += dist;
      arcLengths.push(totalLen);
    }

    if (totalLen < minContourLengthMm) continue;

    // Evenly place points along total contour length
    const count = Math.max(2, Math.round(totalLen / spacingMm));
    const step = totalLen / count;

    let searchIdx = 0;
    const contourId = contourIdCounter++;

    for (let s = 0; s <= totalLen; s += step) {
      while (searchIdx < arcLengths.length - 1 && arcLengths[searchIdx + 1] < s) {
        searchIdx++;
      }

      const l1 = arcLengths[searchIdx];
      const l2 = arcLengths[searchIdx + 1] || l1;
      const t = l2 > l1 ? (s - l1) / (l2 - l1) : 0;

      const p1 = contour[searchIdx];
      const p2 = contour[searchIdx + 1] || p1;

      const px = p1.x + t * (p2.x - p1.x);
      const py = p1.y + t * (p2.y - p1.y);

      // Check if outline point falls inside any region for local punch size scaling
      const normX = (px - marginMm) / drawableWidthMm;
      const normY = (py - marginMm) / drawableHeightMm;
      const regions = options.regions || [];

      let localScale = 1.0;
      for (const reg of regions) {
        const w = getRegionWeight(normX, normY, reg, marginMm, drawableWidthMm, drawableHeightMm);
        if (w > 0 && reg.dotSizeFactor !== undefined) {
          localScale = localScale * (1 - w) + reg.dotSizeFactor * w;
        }
      }

      const baseRadius = (options.markerDiameterMm || 0.8) / 2.0;
      const pointRadius = Number((baseRadius * localScale).toFixed(2));

      // Physical paper bridge clearance test
      const searchDist = pointRadius + 2.5 + paperBridgeMm;
      const neighbors = spatialHash.getPointsWithin(px, py, searchDist);
      let overlaps = false;
      for (let i = 0; i < neighbors.length; i++) {
        const n = neighbors[i];
        const nRadius = n.radius || baseRadius;
        const minDist = pointRadius + nRadius + paperBridgeMm;
        const distSq = (n.x - px) * (n.x - px) + (n.y - py) * (n.y - py);
        if (distSq < minDist * minDist) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        const newPoint = {
          id: `p_out_${nextPointId++}`,
          x: Number(px.toFixed(2)),
          y: Number(py.toFixed(2)),
          radius: pointRadius,
          type: 'outline',
          contourId,
          sequenceIndex: sampledPoints.length + 1
        };
        sampledPoints.push(newPoint);
        spatialHash.insert(newPoint);
      }
    }
  }

  return sampledPoints;
}
