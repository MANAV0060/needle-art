import { isPointInRegion } from './regionUtils.js';

/**
 * Image processing utilities: grayscale, contrast, brightness, blur, and local contrast
 * with Polygon & Box Region of Interest (ROI) support.
 */

export function processImageData(pixels, width, height, options = {}) {
  const {
    contrast = 0,       // -100 to 100
    brightness = 0,     // -100 to 100
    blur = 0,           // 0 to 5
    invert = false,
    detailStrength = 1.0
  } = options;

  const totalPixels = width * height;
  const gray = new Float32Array(totalPixels);
  const processed = new Float32Array(totalPixels);

  // Convert pixels ArrayBuffer to typed Uint8Array if needed
  const pixelData = (pixels instanceof Uint8Array || pixels instanceof Uint8ClampedArray)
    ? pixels
    : new Uint8Array(pixels);

  // 1. Grayscale + Brightness/Contrast + Gamma Adjustment + Region Blending
  const globalGamma = options.gamma || 1.2;
  const globalContrast = contrast;
  const globalDetail = detailStrength || 1.6;
  const globalBlur = blur || 0;
  const brightnessOffset = brightness * 2.55;
  const regions = options.regions || [];

  const effectiveDetailMap = new Float32Array(totalPixels);
  const effectiveBlurMap = new Float32Array(totalPixels);

  for (let y = 0; y < height; y++) {
    const yNorm = y / height;
    for (let x = 0; x < width; x++) {
      const xNorm = x / width;
      const i = y * width + x;
      const idx = i * 4;

      const r = pixelData[idx] || 0;
      const g = pixelData[idx + 1] || 0;
      const b = pixelData[idx + 2] || 0;

      let effectiveContrast = globalContrast;
      let effectiveGamma = globalGamma;
      let effectiveDetail = globalDetail;
      let effectiveBlur = globalBlur;

      for (const reg of regions) {
        if (isPointInRegion(xNorm, yNorm, reg)) {
          const regContrast = reg.contrast !== undefined ? reg.contrast : 0;
          const regGamma = reg.gamma !== undefined ? reg.gamma : globalGamma;
          const regDetail = reg.detailStrength !== undefined ? reg.detailStrength : globalDetail;
          const regBlur = reg.blur !== undefined ? reg.blur : globalBlur;

          effectiveContrast += regContrast;
          effectiveGamma = regGamma;
          effectiveDetail = regDetail;
          effectiveBlur = regBlur;
          break; // Use active/first matching region
        }
      }

      effectiveDetailMap[i] = effectiveDetail;
      effectiveBlurMap[i] = effectiveBlur;

      const contrastFact = (259 * (effectiveContrast + 255)) / (255 * (259 - effectiveContrast));

      // Standard perceived luminance
      let luma = 0.299 * r + 0.587 * g + 0.114 * b;

      // Apply brightness and contrast
      luma = contrastFact * (luma - 128) + 128 + brightnessOffset;
      luma = Math.max(0, Math.min(255, luma)) / 255.0;

      // Apply Gamma Correction
      luma = Math.pow(luma, effectiveGamma);

      if (invert) {
        luma = 1.0 - luma;
      }

      gray[i] = Math.max(0, Math.min(1.0, luma));
    }
  }

  // 2. Feature-Preserving Smoothing (Global + Regional)
  const maxBlurRadius = 3;
  const blurredMap = new Float32Array(totalPixels);
  applySeparableBlur(gray, blurredMap, width, height, maxBlurRadius);

  for (let i = 0; i < totalPixels; i++) {
    const blurAmt = Math.min(1.0, effectiveBlurMap[i] / 3.0);
    processed[i] = gray[i] * (1.0 - blurAmt) + blurredMap[i] * blurAmt;
  }

  // 3. Feature Edge Enhancement (Unsharp Mask - Global + Regional)
  const detailBlurred = new Float32Array(totalPixels);
  applySeparableBlur(processed, detailBlurred, width, height, 2);

  for (let i = 0; i < totalPixels; i++) {
    const dStr = effectiveDetailMap[i];
    if (dStr > 1.0) {
      const highFreq = processed[i] - detailBlurred[i];
      const enhanced = processed[i] + highFreq * (dStr - 1.0);
      processed[i] = Math.max(0, Math.min(1.0, enhanced));
    }
  }

  return processed;
}

function applySeparableBlur(input, output, width, height, radius) {
  const temp = new Float32Array(width * height);
  const r = Math.round(radius);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let k = -r; k <= r; k++) {
        const px = Math.min(width - 1, Math.max(0, x + k));
        sum += input[y * width + px];
        count++;
      }
      temp[y * width + x] = sum / count;
    }
  }

  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let k = -r; k <= r; k++) {
        const py = Math.min(height - 1, Math.max(0, y + k));
        sum += temp[py * width + x];
        count++;
      }
      output[y * width + x] = sum / count;
    }
  }
}
