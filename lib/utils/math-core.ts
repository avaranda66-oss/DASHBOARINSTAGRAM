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
 * Inversa da CDF da distribuição normal padrão (Φ⁻¹).
 *
 * Retorna z tal que P(Z ≤ z) = p, onde Z ~ Normal(0,1).
 *
 * Implementação: rational approximation de Acklam (2003).
 * Precisão: |erro| < 4.5e-4 para p ∈ (1e-15, 1-1e-15).
 *
 * Casos especiais:
 *   normalQuantile(0.5)   = 0
 *   normalQuantile(0)     = -Infinity
 *   normalQuantile(1)     = +Infinity
 *   normalQuantile(0.975) ≈ 1.96
 *   normalQuantile(0.025) ≈ -1.96
 *
 * @param p - Probabilidade acumulada ∈ (0, 1)
 * @returns z-score correspondente
 */
export function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  // Coeficientes — Acklam (2003) rational approximation
  const a = [
    -3.969683028665376e+01,  2.209460984245205e+02,
    -2.759285104469687e+02,  1.383577518672690e+02,
    -3.066479806614716e+01,  2.506628277459239e+00,
  ];
  const b = [
    -5.447609879822406e+01,  1.615858368580409e+02,
    -1.556989798598866e+02,  6.680131188771972e+01,
    -1.328068155288572e+01,
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
     4.374664141464968e+00,  2.938163982698783e+00,
  ];
  const d = [
     7.784695709041462e-03,  3.224671290700398e-01,
     2.445134137142996e+00,  3.754408661907416e+00,
  ];

  const pLow  = 0.02425;
  const pHigh = 1 - pLow;

  let q: number;

  if (p < pLow) {
    // Região da cauda inferior
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  } else if (p <= pHigh) {
    // Região central
    q = p - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  } else {
    // Região da cauda superior (simetria)
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
}

/**
 * Clamp de um número para o intervalo [0, 1].
 *
 * @param x - Valor a ser clampado
 * @returns x restrito a [0, 1]
 */
export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Resolve sistema linear A·x = b via Eliminação Gaussiana com pivotamento parcial.
 *
 * A é matriz (k×k), b é vetor de comprimento k. Retorna x de comprimento k.
 * Usado por: fitITS (4×4), e futuro OLS k-regressores.
 *
 * @throws Error se a matriz for singular (det ≈ 0)
 */
export function solveLinearSystem(A: number[][], b: number[]): number[] {
  const k = A.length;
  // Matriz aumentada [A | b]
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < k; col++) {
    // Pivotamento parcial: troca com a linha de maior valor absoluto
    let pivotRow = col;
    for (let r = col + 1; r < k; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivotRow][col])) {
        pivotRow = r;
      }
    }
    if (Math.abs(M[pivotRow][col]) < 1e-12) {
      throw new Error(`solveLinearSystem: singular matrix at column ${col}`);
    }
    if (pivotRow !== col) {
      [M[col], M[pivotRow]] = [M[pivotRow], M[col]];
    }
    // Normaliza linha do pivô
    const pivot = M[col][col];
    for (let c = col; c <= k; c++) M[col][c] /= pivot;
    // Elimina demais linhas
    for (let r = 0; r < k; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let c = col; c <= k; c++) {
        M[r][c] -= factor * M[col][c];
      }
    }
  }

  return Array.from({ length: k }, (_, i) => M[i][k]);
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
