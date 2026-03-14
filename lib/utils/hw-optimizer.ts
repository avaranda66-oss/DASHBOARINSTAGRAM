// =============================================================================
// hw-optimizer.ts — Holt-Winters Auto-tuning + Prediction Intervals
// Pure TypeScript, zero dependencies
//
// Story: US-26 — Holt-Winters Auto-tuning + Prediction Intervals
// Referência: Hyndman & Athanasopoulos "Forecasting: Principles and Practice"
//             Capítulos 8-9 (Exponential Smoothing)
// =============================================================================

import { holtWinters } from './forecasting';

// =============================================================================
// Tipos Públicos
// =============================================================================

export type HWModel = 'additive' | 'multiplicative';

export interface HWOptimizeResult {
  /** Parâmetro de suavização do nível (0-1) */
  alpha: number;
  /** Parâmetro de suavização da tendência (0-1) */
  beta: number;
  /** Parâmetro de suavização sazonal (0-1) */
  gamma: number;
  /** Mean Squared Scaled Error com estes parâmetros */
  msse: number;
  /** Modelo selecionado automaticamente */
  model: HWModel;
  /** true se otimização foi executada (false = dados insuficientes, usou defaults) */
  optimized: boolean;
}

export interface PredictionInterval {
  lower: number;
  upper: number;
}

export interface HWWithPIResult {
  fitted: number[];
  forecast: number[];
  level: number;
  trend: number;
  seasonal: number[];
  /** Intervalos de predição 80% para cada passo do forecast */
  pi80: PredictionInterval[];
  /** Intervalos de predição 95% para cada passo do forecast */
  pi95: PredictionInterval[];
  /** Desvio padrão dos resíduos (sigma_1) */
  residualStdDev: number;
  /** Parâmetros usados */
  params: { alpha: number; beta: number; gamma: number; model: HWModel };
}

// =============================================================================
// Helpers internos
// =============================================================================

/**
 * Calcula MSSE (Mean Squared Scaled Error) — métrica de avaliação de forecast
 * que é invariante à escala da série, permitindo comparação entre métricas diferentes.
 *
 * MSSE = mean((actual - fitted)²) / mean(|diff(actual)|²)
 *
 * O denominador escala pelo "ruído médio" da série via diferenças de primeira ordem.
 * Séries muito suaves têm denominador pequeno, o que penaliza mais erros de fitting.
 */
function computeMSSE(actual: number[], fitted: number[]): number {
  const n = actual.length;
  if (n < 2) return Infinity;

  // Numerador: MSE
  let mse = 0;
  for (let i = 0; i < n; i++) {
    mse += (actual[i] - fitted[i]) ** 2;
  }
  mse /= n;

  // Denominador: variância das diferenças de primeira ordem
  let diffVar = 0;
  for (let i = 1; i < n; i++) {
    diffVar += (actual[i] - actual[i - 1]) ** 2;
  }
  diffVar /= (n - 1);

  if (diffVar === 0) return mse > 0 ? Infinity : 0;
  return mse / diffVar;
}

/** Desvio padrão dos resíduos (actual - fitted) */
function residualStd(actual: number[], fitted: number[]): number {
  const n = actual.length;
  if (n < 2) return 0;
  const residuals = actual.map((v, i) => v - fitted[i]);
  const meanRes = residuals.reduce((a, v) => a + v, 0) / n;
  const variance = residuals.reduce((a, v) => a + (v - meanRes) ** 2, 0) / (n - 1);
  return Math.sqrt(variance);
}

/** Quantil Z para intervalos de predição */
function zQuantile(confidence: 0.80 | 0.95): number {
  // normalCDF inverso via bisection para os valores mais usados
  // (evita implementar normalCDF inverso completo)
  const targets: Record<number, number> = { 0.80: 1.2816, 0.95: 1.9600 };
  return targets[confidence] ?? 1.9600;
}

// =============================================================================
// 1. Seleção Automática: Aditivo vs Multiplicativo
// =============================================================================

/**
 * Seleciona automaticamente o modelo Holt-Winters mais apropriado.
 *
 * Critério: coeficiente de variação (CV) dos fatores sazonais brutos.
 * Se a amplitude sazonal cresce proporcionalmente com a tendência (série multiplicativa),
 * os fatores sazonais (data/trend) terão CV alto.
 *
 * Regra: se CV(seasonal_ratios) > 0.15 → multiplicativo
 *
 * @param data - Série temporal
 * @param period - Período sazonal (default 7)
 */
export function selectHWModel(data: number[], period = 7): HWModel {
  const n = data.length;

  // Se qualquer valor for <= 0, forçar aditivo (multiplicativo não suporta)
  if (data.some(v => v <= 0)) return 'additive';
  if (n < 2 * period) return 'additive';

  // Estimativa grosseira da tendência via média móvel de comprimento period
  const half = Math.floor(period / 2);
  const ratios: number[] = [];

  for (let i = half; i < n - half; i++) {
    const window = data.slice(i - half, i + half + 1);
    const trendEst = window.reduce((a, v) => a + v, 0) / window.length;
    if (trendEst > 0) {
      ratios.push(data[i] / trendEst);
    }
  }

  if (ratios.length < period) return 'additive';

  const meanR = ratios.reduce((a, v) => a + v, 0) / ratios.length;
  const stdR = Math.sqrt(ratios.reduce((a, v) => a + (v - meanR) ** 2, 0) / ratios.length);
  const cv = meanR > 0 ? stdR / meanR : 0;

  return cv > 0.15 ? 'multiplicative' : 'additive';
}

// =============================================================================
// 2. Holt-Winters Multiplicativo
// =============================================================================

/**
 * Holt-Winters Triple Exponential Smoothing — variante multiplicativa.
 *
 * Use quando a amplitude sazonal é proporcional ao nível da série
 * (ex: conta crescendo — as diferenças fim de semana vs dia útil crescem em termos absolutos).
 *
 * Equações multiplicativas:
 *   L_t = α * (x_t / S_{t-m}) + (1-α)(L_{t-1} + T_{t-1})
 *   T_t = β * (L_t - L_{t-1}) + (1-β) * T_{t-1}
 *   S_t = γ * (x_t / L_t) + (1-γ) * S_{t-m}
 *   Forecast_h = (L + h*T) * S_{t-m+h_mod_m}
 *
 * @param data - Série temporal (todos os valores devem ser > 0)
 * @param options - Mesma interface que holtWinters
 */
export function holtWintersMultiplicative(
  data: number[],
  options: { period?: number; h?: number; alpha?: number; beta?: number; gamma?: number } = {}
): { fitted: number[]; forecast: number[]; level: number; trend: number; seasonal: number[] } {
  // Guard: se qualquer valor <= 0, fallback para aditivo
  if (data.some(v => v <= 0)) {
    return holtWinters(data, options);
  }

  const period = options.period ?? 7;
  const h = options.h ?? period;
  const alpha = options.alpha ?? 0.3;
  const beta = options.beta ?? 0.1;
  const gamma = options.gamma ?? 0.1;
  const n = data.length;

  if (n < 2 * period) {
    return {
      fitted: [...data],
      forecast: new Array(h).fill(data[data.length - 1] ?? 0),
      level: data[data.length - 1] ?? 0,
      trend: 0,
      seasonal: new Array(period).fill(1),
    };
  }

  // Inicialização: nível = média do 1º período, tendência = crescimento médio
  let L = data.slice(0, period).reduce((a, v) => a + v, 0) / period;
  let T = 0;
  for (let i = 0; i < period; i++) {
    T += (data[period + i] - data[i]) / (period * period);
  }

  // Fatores sazonais iniciais: ratio data/level
  const S: number[] = new Array(period);
  for (let i = 0; i < period; i++) {
    S[i] = L > 0 ? data[i] / L : 1;
  }

  // Normalizar para que a soma dos fatores sazonais seja = period
  const sumS = S.reduce((a, v) => a + v, 0);
  for (let i = 0; i < period; i++) {
    S[i] = sumS > 0 ? S[i] * (period / sumS) : 1;
  }

  const fitted: number[] = new Array(n);
  for (let i = 0; i < period; i++) {
    fitted[i] = (L + T) * S[i % period];
  }

  for (let t = period; t < n; t++) {
    const sIdx = t % period;
    const prevS = S[sIdx];
    const prevL = L;

    L = alpha * (data[t] / Math.max(prevS, 1e-10)) + (1 - alpha) * (prevL + T);
    T = beta * (L - prevL) + (1 - beta) * T;
    S[sIdx] = gamma * (data[t] / Math.max(L, 1e-10)) + (1 - gamma) * prevS;

    fitted[t] = Math.round((L + T) * S[sIdx] * 100) / 100;
  }

  const forecast: number[] = [];
  for (let i = 1; i <= h; i++) {
    const sIdx = (n + i - 1) % period;
    forecast.push(Math.round((L + T * i) * S[sIdx] * 100) / 100);
  }

  return {
    fitted: fitted.map(v => Math.round(v * 100) / 100),
    forecast,
    level: Math.round(L * 100) / 100,
    trend: Math.round(T * 100) / 100,
    seasonal: S.map(v => Math.round(v * 10000) / 10000),
  };
}

// =============================================================================
// 3. Grid Search para Otimização de α,β,γ
// =============================================================================

/**
 * Otimiza automaticamente os parâmetros α,β,γ do Holt-Winters via grid search.
 *
 * Grid: α,β,γ ∈ {0.1, 0.2, ..., 0.9} — 9³ = 729 combinações
 * Métrica: MSSE (invariante à escala — permite comparar métricas diferentes)
 *
 * Performance: para séries longas (N > 90), usa apenas os últimos 90 pontos
 * para otimização (mantém os mais recentes, que são os mais relevantes).
 *
 * @param data - Série temporal (mínimo 14 pontos para otimização)
 * @param options.period - Período sazonal (default 7)
 * @param options.model - Forçar modelo específico (default: auto-detect)
 */
export function optimizeHW(
  data: number[],
  options: { period?: number; model?: HWModel } = {}
): HWOptimizeResult {
  const period = options.period ?? 7;
  const defaults: HWOptimizeResult = {
    alpha: 0.3, beta: 0.1, gamma: 0.1, msse: Infinity,
    model: 'additive', optimized: false,
  };

  if (data.length < 2 * period) return defaults;

  // Selecionar modelo (ou usar o fornecido)
  const model: HWModel = options.model ?? selectHWModel(data, period);

  // Para séries longas, usar últimos 90 pontos (mais relevantes e mais rápido)
  const trainData = data.length > 90 ? data.slice(-90) : data;

  const gridValues = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

  let bestAlpha = 0.3;
  let bestBeta = 0.1;
  let bestGamma = 0.1;
  let bestMSSE = Infinity;

  const hwFn = model === 'multiplicative' ? holtWintersMultiplicative : holtWinters;

  for (const alpha of gridValues) {
    for (const beta of gridValues) {
      for (const gamma of gridValues) {
        try {
          const result = hwFn(trainData, { period, h: 0, alpha, beta, gamma });
          const msse = computeMSSE(trainData, result.fitted);

          if (msse < bestMSSE) {
            bestMSSE = msse;
            bestAlpha = alpha;
            bestBeta = beta;
            bestGamma = gamma;
          }
        } catch {
          // Combinação inválida — ignorar
        }
      }
    }
  }

  return {
    alpha: bestAlpha,
    beta: bestBeta,
    gamma: bestGamma,
    msse: Math.round(bestMSSE * 10000) / 10000,
    model,
    optimized: bestMSSE < Infinity,
  };
}

// =============================================================================
// 4. Holt-Winters com Intervalos de Predição
// =============================================================================

/**
 * Executa Holt-Winters com otimização automática de parâmetros e intervalos de predição.
 *
 * Intervalos de predição (Hyndman & Athanasopoulos, cap. 8.7):
 *   PI_h = forecast_h ± z_conf * sigma_1 * sqrt(h)
 *
 * Onde:
 * - sigma_1 = desvio padrão dos resíduos de fitting (1-passo)
 * - sqrt(h) cresce com o horizonte (incerteza aumenta com distância)
 * - z_80 = 1.2816, z_95 = 1.9600
 *
 * A fórmula sqrt(h) assume erros não-correlacionados — aproximação razoável para
 * séries de engajamento social após remoção da sazonalidade.
 *
 * @param data - Série temporal
 * @param options.period - Período sazonal (default 7)
 * @param options.h - Horizonte de forecast (default = period)
 * @param options.autoOptimize - Otimizar parâmetros automaticamente (default true)
 * @param options.alpha/beta/gamma - Parâmetros manuais (ignorados se autoOptimize=true)
 */
export function holtWintersWithPI(
  data: number[],
  options: {
    period?: number;
    h?: number;
    autoOptimize?: boolean;
    alpha?: number;
    beta?: number;
    gamma?: number;
  } = {}
): HWWithPIResult {
  const period = options.period ?? 7;
  const h = options.h ?? period;
  const autoOptimize = options.autoOptimize ?? true;

  let alpha = options.alpha ?? 0.3;
  let beta = options.beta ?? 0.1;
  let gamma = options.gamma ?? 0.1;
  let model: HWModel = 'additive';

  if (autoOptimize && data.length >= 2 * period) {
    const optimized = optimizeHW(data, { period });
    alpha = optimized.alpha;
    beta = optimized.beta;
    gamma = optimized.gamma;
    model = optimized.model;
  }

  const hwFn = model === 'multiplicative' ? holtWintersMultiplicative : holtWinters;
  const hwResult = hwFn(data, { period, h, alpha, beta, gamma });

  const sigma = residualStd(data, hwResult.fitted);

  // z-values para PI 80% e 95%
  const z80 = zQuantile(0.80);
  const z95 = zQuantile(0.95);

  const pi80: PredictionInterval[] = hwResult.forecast.map((f, i) => {
    const margin = z80 * sigma * Math.sqrt(i + 1);
    return {
      lower: Math.round((f - margin) * 100) / 100,
      upper: Math.round((f + margin) * 100) / 100,
    };
  });

  const pi95: PredictionInterval[] = hwResult.forecast.map((f, i) => {
    const margin = z95 * sigma * Math.sqrt(i + 1);
    return {
      lower: Math.round((f - margin) * 100) / 100,
      upper: Math.round((f + margin) * 100) / 100,
    };
  });

  return {
    ...hwResult,
    pi80,
    pi95,
    residualStdDev: Math.round(sigma * 100) / 100,
    params: { alpha, beta, gamma, model },
  };
}
