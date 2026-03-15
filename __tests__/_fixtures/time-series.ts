/** Weekly seasonal pattern: 7-day cycle with trend */
export function generateSeasonalData(n = 56, trend = 0.5, amplitude = 10, noise = 1): number[] {
  const data: number[] = [];
  for (let i = 0; i < n; i++) {
    const seasonal = amplitude * Math.sin((2 * Math.PI * i) / 7);
    const trendVal = trend * i;
    const noiseVal = noise * (Math.sin(i * 123.456) * 2 - 1); // deterministic pseudo-noise
    data.push(100 + trendVal + seasonal + noiseVal);
  }
  return data;
}

/** Data with a sudden level shift at given index */
export function generateLevelShift(n = 50, shiftAt = 25, shiftSize = 20): number[] {
  const data: number[] = [];
  for (let i = 0; i < n; i++) {
    const base = 50 + (Math.sin(i * 0.7) * 2); // slight wobble
    data.push(i >= shiftAt ? base + shiftSize : base);
  }
  return data;
}

/** Exponential decay: CTR(t) = initial * e^(-lambda * t) */
export function generateExponentialDecay(n = 30, initial = 5.0, lambda = 0.05): number[] {
  return Array.from({ length: n }, (_, t) => initial * Math.exp(-lambda * t));
}

/** Constant series (no variance) */
export const constantSeries = Array.from({ length: 30 }, () => 42);

/** Series with a single outlier */
export function generateWithOutlier(n = 30, outlierIdx = 15, outlierValue = 1000): number[] {
  const data = Array.from({ length: n }, (_, i) => 50 + Math.sin(i) * 5);
  data[outlierIdx] = outlierValue;
  return data;
}

/** Simple linear data: y = slope * x + intercept */
export function generateLinearData(n = 20, slope = 2, intercept = 5): { x: number[]; y: number[] } {
  const x = Array.from({ length: n }, (_, i) => i);
  const y = x.map(xi => slope * xi + intercept);
  return { x, y };
}
