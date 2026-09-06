/**
 * Deterministic Pseudo-Random Number Generator (Mulberry32).
 * Guarantees reproducible point generation and prevents random point drifting/distortion
 * when tweaking local selection parameters.
 */
export function createPRNG(seed = 12345678) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
