/**
 * Combines luminance, edge strength, and local contrast into a single normalized Importance Map (0.0 to 1.0).
 */

export function buildImportanceMap(grayMap, edgeMagnitude, width, height, weights = {}) {
  const {
    edgeWeight = 0.5,
    shadeWeight = 0.5,
    detailWeight = 0.2
  } = weights;

  const totalPixels = width * height;
  const importance = new Float32Array(totalPixels);

  // Compute local contrast (variance in 3x3 window)
  const localContrast = new Float32Array(totalPixels);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      let sum = 0;
      let sumSq = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const val = grayMap[(y + dy) * width + (x + dx)];
          sum += val;
          sumSq += val * val;
        }
      }
      const mean = sum / 9;
      const variance = Math.max(0, sumSq / 9 - mean * mean);
      localContrast[idx] = Math.sqrt(variance);
    }
  }

  // Combine components into normalized importance
  let maxVal = 0.0001;
  for (let i = 0; i < totalPixels; i++) {
    const darkness = 1.0 - grayMap[i]; // Dark regions have high weight for shading
    const edgeStr = edgeMagnitude[i];
    const detail = localContrast[i];

    const imp = edgeWeight * edgeStr + shadeWeight * darkness + detailWeight * detail;
    importance[i] = imp;
    if (imp > maxVal) {
      maxVal = imp;
    }
  }

  // Normalize to range [0.0, 1.0]
  for (let i = 0; i < totalPixels; i++) {
    importance[i] = Math.min(1.0, importance[i] / maxVal);
  }

  return importance;
}
