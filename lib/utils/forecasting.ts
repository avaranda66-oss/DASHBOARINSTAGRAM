// =============================================================================
// forecasting.ts — Previsao de Series Temporais e Deteccao de Mudancas
// Pure TypeScript, zero dependencies
// =============================================================================

/**
 * Holt-Winters Triple Exponential Smoothing (aditivo).
 *
 * Ideal para dados com tendencia + sazonalidade (ex: metricas semanais).
 *
 * @param data - Serie temporal (minimo: 2 * period pontos)
 * @param options - { period: periodo sazonal (default 7), h: horizonte de previsao, alpha, beta, gamma }
 * @returns { fitted, forecast, level, trend, seasonal }
 */
export function holtWinters(
  data: number[],
  options: {
    period?: number;
    h?: number;
    alpha?: number;
    beta?: number;
    gamma?: number;
  } = {}
): {
  fitted: number[];
  forecast: number[];
  level: number;
  trend: number;
  seasonal: number[];
} {
  const period = options.period ?? 7;
  const h = options.h ?? period;
  const alpha = options.alpha ?? 0.3;
  const beta = options.beta ?? 0.1;
  const gamma = options.gamma ?? 0.1;
  const n = data.length;

  // Guards
  if (n < 2 * period) {
    return {
      fitted: [...data],
      forecast: new Array(h).fill(data.length > 0 ? data[data.length - 1] : 0),
      level: data.length > 0 ? data[data.length - 1] : 0,
      trend: 0,
      seasonal: new Array(period).fill(0),
    };
  }

  // Initialize level and trend from first two periods
  let L = data.slice(0, period).reduce((a, v) => a + v, 0) / period;
  let T = 0;
  for (let i = 0; i < period; i++) {
    T += (data[period + i] - data[i]) / period;
  }
  T /= period;

  // Initialize seasonal components
  const S: number[] = new Array(period);
  for (let i = 0; i < period; i++) {
    S[i] = data[i] - L;
  }

  const fitted: number[] = new Array(n);

  // First period: use initial estimates
  for (let i = 0; i < period; i++) {
    fitted[i] = L + T + S[i % period];
  }

  // Apply Holt-Winters recursion
  for (let t = period; t < n; t++) {
    const sIdx = t % period;
    const prevS = S[sIdx];

    const newL = alpha * (data[t] - prevS) + (1 - alpha) * (L + T);
    const newT = beta * (newL - L) + (1 - beta) * T;
    S[sIdx] = gamma * (data[t] - newL) + (1 - gamma) * prevS;

    L = newL;
    T = newT;
    fitted[t] = L + T + S[sIdx];
  }

  // Forecast h steps ahead
  const forecast: number[] = [];
  for (let i = 1; i <= h; i++) {
    const sIdx = (n + i - 1) % period;
    forecast.push(Math.round((L + T * i + S[sIdx]) * 100) / 100);
  }

  return {
    fitted: fitted.map(v => Math.round(v * 100) / 100),
    forecast,
    level: Math.round(L * 100) / 100,
    trend: Math.round(T * 100) / 100,
    seasonal: S.map(v => Math.round(v * 100) / 100),
  };
}

/**
 * CUSUM (Cumulative Sum) change-point detection.
 *
 * Detecta pontos onde a media de uma serie temporal muda significativamente.
 * Usa threshold baseado em desvio padrao.
 *
 * @param data - Serie temporal
 * @param options - { threshold: multiplo do desvio padrao (default 1.0), drift: ajuste de sensibilidade (default 0.5) }
 * @returns { changePoints: indices detectados, cusumPos: serie CUSUM+, cusumNeg: serie CUSUM- }
 */
export function cusumDetect(
  data: number[],
  options: { threshold?: number; drift?: number } = {}
): {
  changePoints: number[];
  cusumPos: number[];
  cusumNeg: number[];
} {
  const n = data.length;
  if (n < 3) {
    return { changePoints: [], cusumPos: new Array(n).fill(0), cusumNeg: new Array(n).fill(0) };
  }

  const mean = data.reduce((a, v) => a + v, 0) / n;
  const variance = data.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1);
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return { changePoints: [], cusumPos: new Array(n).fill(0), cusumNeg: new Array(n).fill(0) };
  }

  const thresholdMult = options.threshold ?? 1.0;
  const drift = options.drift ?? 0.5;
  const H = thresholdMult * stdDev;
  const K = drift * stdDev;

  const cusumPos: number[] = [0];
  const cusumNeg: number[] = [0];
  const changePoints: number[] = [];

  for (let i = 1; i < n; i++) {
    const z = data[i] - mean;
    cusumPos.push(Math.max(0, cusumPos[i - 1] + z - K));
    cusumNeg.push(Math.max(0, cusumNeg[i - 1] - z - K));

    if (cusumPos[i] > H || cusumNeg[i] > H) {
      changePoints.push(i);
      // Reset after detection
      cusumPos[i] = 0;
      cusumNeg[i] = 0;
    }
  }

  return {
    changePoints,
    cusumPos: cusumPos.map(v => Math.round(v * 100) / 100),
    cusumNeg: cusumNeg.map(v => Math.round(v * 100) / 100),
  };
}
