/**
 * Sobel gradient magnitude and direction calculation.
 */

export function computeSobelEdges(grayMap, width, height, threshold = 0.25, regions = []) {
  const totalPixels = width * height;
  const edgeMagnitude = new Float32Array(totalPixels);
  const edgeDirection = new Float32Array(totalPixels);
  const binaryEdges = new Uint8Array(totalPixels);

  for (let y = 1; y < height - 1; y++) {
    const yNorm = y / height;
    for (let x = 1; x < width - 1; x++) {
      const xNorm = x / width;
      const idx = y * width + x;

      const p00 = grayMap[(y - 1) * width + (x - 1)];
      const p01 = grayMap[(y - 1) * width + x];
      const p02 = grayMap[(y - 1) * width + (x + 1)];

      const p10 = grayMap[y * width + (x - 1)];
      const p12 = grayMap[y * width + (x + 1)];

      const p20 = grayMap[(y + 1) * width + (x - 1)];
      const p21 = grayMap[(y + 1) * width + x];
      const p22 = grayMap[(y + 1) * width + (x + 1)];

      const gx = -p00 + p02 - 2 * p10 + 2 * p12 - p20 + p22;
      const gy = -p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22;

      const mag = Math.sqrt(gx * gx + gy * gy);
      const angle = Math.atan2(gy, gx);

      edgeMagnitude[idx] = Math.min(1.0, mag);
      edgeDirection[idx] = angle;

      // Check if pixel belongs to a region with custom local edge threshold
      let effectiveThresh = threshold;
      for (const reg of regions) {
        if (
          xNorm >= reg.xNorm &&
          xNorm <= reg.xNorm + reg.wNorm &&
          yNorm >= reg.yNorm &&
          yNorm <= reg.yNorm + reg.hNorm
        ) {
          if (reg.edgeThreshold !== undefined) {
            effectiveThresh = reg.edgeThreshold / 100.0;
          }
          break;
        }
      }

      if (mag >= effectiveThresh) {
        binaryEdges[idx] = 1;
      }
    }
  }

  // Fallback: If edge count is very low, perform dynamic percentile thresholding
  let count = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (binaryEdges[i] === 1) count++;
  }

  if (count < totalPixels * 0.005) {
    // Find 92nd percentile edge magnitude
    const mags = Array.from(edgeMagnitude).filter(m => m > 0.02).sort((a, b) => b - a);
    if (mags.length > 0) {
      const adaptiveCutoff = mags[Math.floor(mags.length * 0.25)] || 0.1;
      for (let i = 0; i < totalPixels; i++) {
        if (edgeMagnitude[i] >= adaptiveCutoff) {
          binaryEdges[i] = 1;
        }
      }
    }
  }

  return {
    magnitude: edgeMagnitude,
    direction: edgeDirection,
    binaryEdges
  };
}
