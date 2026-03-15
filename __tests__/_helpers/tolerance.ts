/** Check if two numbers are approximately equal within a tolerance */
export function approxEqual(a: number, b: number, tol = 1e-4): boolean {
  if (a === b) return true;
  if (!isFinite(a) || !isFinite(b)) return a === b;
  return Math.abs(a - b) <= tol;
}

/** Check if a value is within [min, max] inclusive */
export function withinRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/** Assert value is in range [0, 1] */
export function assertUnit(value: number): boolean {
  return withinRange(value, 0, 1);
}

/** Assert value is in range [0, 100] */
export function assertPercent(value: number): boolean {
  return withinRange(value, 0, 100);
}

/** Check no NaN/Infinity */
export function isClean(value: number): boolean {
  return typeof value === 'number' && isFinite(value) && !isNaN(value);
}
