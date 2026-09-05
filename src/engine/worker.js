import { processImageData } from './imageProcessor.js';
import { computeSobelEdges } from './edgeDetector.js';
import { buildImportanceMap } from './importanceMap.js';
import { generatePointSet } from './pointGenerator.js';

/**
 * Web Worker for off-main-thread image analysis & point generation.
 * Communicates using zero-copy Transferable Float32Arrays.
 */

self.onmessage = function (e) {
  const { type, payload } = e.data;

  if (type === 'GENERATE') {
    const {
      pixels,
      width,
      height,
      settings
    } = payload;

    // 1. Image Preprocessing & Grayscale with Local Regions
    const prepOptions = Object.assign({}, settings.imagePrep || {}, { regions: payload.regions || [] });
    const processedGray = processImageData(pixels, width, height, prepOptions);

    // 2. Sobel Edge Detection with Local Regions
    const edgeThreshold = (settings.imagePrep?.edgeThreshold || 25) / 100.0;
    const { magnitude, binaryEdges } = computeSobelEdges(processedGray, width, height, edgeThreshold, payload.regions || []);

    // 3. Importance Map
    const importanceMap = buildImportanceMap(processedGray, magnitude, width, height, {
      edgeWeight: (settings.imagePrep?.edgeWeight || 50) / 100.0,
      shadeWeight: (settings.imagePrep?.shadeWeight || 50) / 100.0,
      detailWeight: (settings.imagePrep?.detailWeight || 20) / 100.0
    });

    // 4. Point Generation with Local Region Overrides
    const updatedSettings = Object.assign({}, settings, { regions: payload.regions || [] });
    const points = generatePointSet(processedGray, width, height, importanceMap, binaryEdges, updatedSettings);

    // 5. Pack into Float32Array for zero-copy Transferable transfer
    // Format per point: [x, y, typeVal, radius, contourId, sequenceIndex]
    // typeVal: 1 = outline, 2 = shading
    const floatBuffer = new Float32Array(points.length * 6);
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const idx = i * 6;
      floatBuffer[idx] = p.x;
      floatBuffer[idx + 1] = p.y;
      floatBuffer[idx + 2] = p.type === 'outline' ? 1.0 : 2.0;
      floatBuffer[idx + 3] = p.radius || 0.4;
      floatBuffer[idx + 4] = p.contourId || 0;
      floatBuffer[idx + 5] = p.sequenceIndex || (i + 1);
    }

    self.postMessage(
      {
        type: 'GENERATE_COMPLETE',
        payload: {
          pointBuffer: floatBuffer.buffer,
          pointCount: points.length,
          edgeMagnitudeBuffer: magnitude.buffer,
          width,
          height
        }
      },
      [floatBuffer.buffer, magnitude.buffer]
    );
  }
};
