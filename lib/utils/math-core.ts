// =============================================================================
// math-core.ts — Primitivas Matematicas Reutilizaveis
// Pure TypeScript, zero dependencies
// =============================================================================

/**
 * CDF da distribuicao normal padrao (Abramowitz & Stegun, formula 26.2.17).
 * Precisao: |erro| < 7.5e-8
 *
 * @param z - Z-score
 * @returns Probabilidade acumulada P(Z <= z)
 */
export function normalCDF(z: number): number {
  if (z === 0) return 0.5;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z);

  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 0.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const t = 1 / (1 + p * x);
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const t5 = t4 * t;

  const pdf = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * (b1 * t + b2 * t2 + b3 * t3 + b4 * t4 + b5 * t5);

  return sign === 1 ? cdf : 1 - cdf;
}

/**
 * Bootstrap confidence interval via percentile method.
 *
 * Reamostra `values` com reposicao B vezes, calcula a estatistica (default=media)
 * e retorna o intervalo de confianca.
 *
 * @param values - Dados originais
 * @param options - { B: numero de reamostras (default 1000), alpha: nivel de significancia (default 0.05), statFn: funcao estatistica }
 * @returns { lower, upper, point, B }
 */
export function bootstrapCI(
  values: number[],
  options: {
    B?: number;
    alpha?: number;
    statFn?: (sample: number[]) => number;
  } = {}
): { lower: number; upper: number; point: number; B: number } {
  const n = values.length;
  if (n === 0) return { lower: 0, upper: 0, point: 0, B: 0 };
  if (n === 1) return { lower: values[0], upper: values[0], point: values[0], B: 0 };

  const B = options.B ?? 1000;
  const alpha = options.alpha ?? 0.05;
  const statFn = options.statFn ?? ((s: number[]) => s.reduce((a, v) => a + v, 0) / s.length);

  const point = statFn(values);
  const stats: number[] = [];

  // Seed determinístico simples para reprodutibilidade
  let seed = 42;
  const pseudoRandom = () => {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let b = 0; b < B; b++) {
    const sample: number[] = [];
    for (let i = 0; i < n; i++) {
      sample.push(values[Math.floor(pseudoRandom() * n)]);
    }
    stats.push(statFn(sample));
  }

  stats.sort((a, b) => a - b);

  const loIdx = Math.floor((alpha / 2) * B);
  const hiIdx = Math.floor((1 - alpha / 2) * B) - 1;

  return {
    lower: Math.round(stats[Math.max(0, loIdx)] * 10000) / 10000,
    upper: Math.round(stats[Math.min(B - 1, hiIdx)] * 10000) / 10000,
    point: Math.round(point * 10000) / 10000,
    B,
  };
}

/**
 * Regressao linear simples (OLS) via equacoes normais.
 *
 * y = alpha + beta * x
 *
 * @param x - Variavel independente
 * @param y - Variavel dependente
 * @returns { alpha, beta, rSquared, residuals }
 */
export function olsSimple(
  x: number[],
  y: number[]
): { alpha: number; beta: number; rSquared: number; residuals: number[] } {
  const n = x.length;
  if (n < 2 || x.length !== y.length) {
    return { alpha: 0, beta: 0, rSquared: 0, residuals: [] };
  }

  const sumX = x.reduce((a, v) => a + v, 0);
  const sumY = y.reduce((a, v) => a + v, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  let ssXY = 0;
  let ssXX = 0;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    ssXY += (x[i] - meanX) * (y[i] - meanY);
    ssXX += (x[i] - meanX) ** 2;
    ssTot += (y[i] - meanY) ** 2;
  }

  if (ssXX === 0) {
    return { alpha: meanY, beta: 0, rSquared: 0, residuals: y.map(() => 0) };
  }

  const beta = ssXY / ssXX;
  const alpha = meanY - beta * meanX;

  const residuals = y.map((yi, i) => yi - (alpha + beta * x[i]));
  const ssRes = residuals.reduce((a, r) => a + r * r, 0);
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return {
    alpha: Math.round(alpha * 10000) / 10000,
    beta: Math.round(beta * 10000) / 10000,
    rSquared: Math.round(rSquared * 10000) / 10000,
    residuals,
  };
}
