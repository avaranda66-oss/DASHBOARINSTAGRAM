// =============================================================================
// mmm.ts — Media Mix Modeling: Adstock + Saturação + Grid Search + ROAS Curve
// Pure TypeScript, zero dependencies
//
// Story: US-40 — MMM: Adstock Geométrico + Hill Saturation + Grid Search θ×K
// Referência: Robyn (Meta Open Source MMM), Google Meridian,
//             Jin et al. "Bayesian Methods for Media Mix Modeling" (2017)
//             Binet & Field "The Long and the Short of It" (2007)
// =============================================================================

import { olsSimple } from './math-core';

// =============================================================================
// Tipos Públicos
// =============================================================================

export type SaturationType = 'hill' | 'log';

export interface MMMOptions {
  /** Grid de valores para θ (carryover). Default: [0.1, 0.3, 0.5, 0.7, 0.9] */
  thetas?: number[];
  /** Percentis para derivar o grid de K. Default: [0.3, 0.5, 0.7, 0.9] */
  kPercentiles?: number[];
  /** Tipo de curva de saturação. Default: 'hill' */
  saturationType?: SaturationType;
  /**
   * Expoente α da Hill function (steepness).
   * α=1: curva côncava simples. α>1: curva S com ramp-up lento.
   * Default: 1.0
   */
  hillAlpha?: number;
}

export interface MMMFitResult {
  /** Carryover ótimo θ ∈ (0,1) */
  theta: number;
  /** Semi-saturação K (na mesma unidade do spend) */
  K: number;
  /** Expoente Hill α */
  alpha: number;
  /** Intercepto β₀ da regressão */
  beta0: number;
  /** Coeficiente de resposta β₁ */
  beta1: number;
  /** Mean Squared Error no ajuste */
  mse: number;
  /** Coeficiente de determinação R² */
  rSquared: number;
  /** Tipo de saturação usado */
  saturationType: SaturationType;
  /** true se a otimização executou (false = dados insuficientes) */
  optimized: boolean;
}

export interface ROASCurvePoint {
  /** Nível de spend */
  spend: number;
  /** Outcome esperado (revenue, conversões, etc.) */
  outcome: number;
  /** ROAS total: outcome / spend */
  roas: number;
  /** ROAS marginal: ΔOutcome / ΔSpend — quanto rende cada R$ adicional */
  marginalROAS: number;
}

export interface OptimalBudgetResult {
  /** Ponto de spend com máximo ROAS marginal */
  optimalSpend: number;
  /** ROAS marginal nesse ponto */
  maxMarginalROAS: number;
  /** ROAS total (outcome/spend) nesse ponto */
  totalROAS: number;
}

// =============================================================================
// Helpers Internos
// =============================================================================

/** Percentil p ∈ [0,1] de um array */
function arrayPercentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] * (1 - (idx - lo)) + sorted[hi] * (idx - lo);
}

// =============================================================================
// 1. Transformações de Adstock
// =============================================================================

/**
 * Adstock Geométrico — carryover exponencial.
 *
 * Equação: A_t = X_t + θ · A_{t-1}
 *
 * θ representa a fração do efeito de marketing que persiste para o próximo
 * período. θ=0 → sem carryover; θ=0.9 → efeito persiste muito.
 *
 * Interpretação:
 * - Meta Ads (performance): θ tipicamente 0.3–0.6
 * - Brand awareness / video: θ tipicamente 0.6–0.9
 *
 * @param spend  - Série de gastos
 * @param theta  - Carryover ∈ (0, 1)
 */
export function geometricAdstock(spend: number[], theta: number): number[] {
  const n = spend.length;
  const adstock = new Array<number>(n);
  let prev = 0;
  for (let t = 0; t < n; t++) {
    const val = spend[t] + theta * prev;
    adstock[t] = val;
    prev = val;
  }
  return adstock;
}

/**
 * Adstock de Weibull — modela picos atrasados e caudas não-exponenciais.
 *
 * Usar quando suspeitar de "delayed response" (campanha que demora para
 * atingir seu pico de impacto). Recomendado apenas para séries com
 * 3+ meses de dados diários — com menos dados, overfitting é alto.
 *
 * @param spend   - Série de gastos
 * @param shape   - Parâmetro k: shape>1=pico atrasado, shape<1=decay rápido
 * @param scale   - Parâmetro λ: controla largura do kernel em dias
 * @param maxLag  - Máximo de lags a considerar (default 28)
 */
export function weibullAdstock(
  spend: number[],
  shape: number,
  scale: number,
  maxLag = 28
): number[] {
  const n = spend.length;
  const kernel: number[] = [];
  let kernelSum = 0;

  for (let i = 0; i <= maxLag; i++) {
    const t = i === 0 ? 1e-9 : i;
    const k = shape, lambda = scale;
    const w = (k / lambda) * Math.pow(t / lambda, k - 1) * Math.exp(-Math.pow(t / lambda, k));
    kernel.push(w);
    kernelSum += w;
  }
  // Normalizar kernel para soma = 1
  for (let i = 0; i < kernel.length; i++) kernel[i] /= kernelSum > 0 ? kernelSum : 1;

  const adstock = new Array<number>(n).fill(0);
  for (let t = 0; t < n; t++) {
    let acc = 0;
    for (let lag = 0; lag < kernel.length; lag++) {
      const idx = t - lag;
      if (idx < 0) break;
      acc += spend[idx] * kernel[lag];
    }
    adstock[t] = acc;
  }
  return adstock;
}

// =============================================================================
// 2. Funções de Saturação (Diminishing Returns)
// =============================================================================

/**
 * Saturação Hill (Hill function).
 *
 * f(a) = a^α / (K^α + a^α)
 *
 * Propriedades:
 * - f(0) = 0, f(∞) → 1
 * - f(K) = 0.5 exatamente → K é o "half-saturation spend"
 * - α = 1: curva côncava (sem ponto de inflexão)
 * - α > 1: curva S — ramp-up lento seguido de saturação abrupta
 *
 * @param adstock - Série de adstock transformado
 * @param K       - Half-saturation: spend onde o canal atinge 50% do máximo
 * @param alpha   - Steepness (default 1.0)
 */
export function hillSaturation(adstock: number[], K: number, alpha = 1.0): number[] {
  const Ka = Math.pow(K, alpha);
  return adstock.map(a => {
    const ai = Math.max(a, 0);
    const num = Math.pow(ai, alpha);
    const den = Ka + num;
    return den > 0 ? num / den : 0;
  });
}

/**
 * Saturação Logarítmica — fallback numérico.
 *
 * f(a) = log(1 + a / K)
 *
 * Nunca satura completamente (sem assíntota em 1), mas é extremamente estável.
 * Use quando hillSaturation apresentar instabilidade numérica (K muito pequeno).
 *
 * @param adstock - Série de adstock transformado
 * @param K       - Escala de saturação
 */
export function logSaturation(adstock: number[], K: number): number[] {
  return adstock.map(a => Math.log(1 + Math.max(a, 0) / K));
}

// =============================================================================
// 3. Grid Search: Otimização θ × K
// =============================================================================

/**
 * Ajusta modelo MMM de canal único via grid search sobre θ (carryover) e K (saturação).
 *
 * Modelo:
 *   Y_t = β₀ + β₁ · saturation(adstock(X_t, θ), K) + ε_t
 *
 * Grid default: θ ∈ {0.1, 0.3, 0.5, 0.7, 0.9} × K em percentis do adstock
 * → 5 × 4 = 20 combinações por padrão.
 *
 * Para cada combinação, ajusta OLS (β₀, β₁) e seleciona pelo MSE mínimo.
 *
 * Referência: mesma abordagem do Robyn/Meta MMM com adstock geométrico e
 * função de resposta Hill (Jin et al. 2017).
 *
 * @param spend   - Série de gastos (input do canal)
 * @param outcome - Série de resultado (revenue, conversões, etc.)
 * @param options - Opções de grid e tipo de saturação
 */
export function fitMMM(
  spend: number[],
  outcome: number[],
  options: MMMOptions = {}
): MMMFitResult {
  const n = spend.length;

  const defaultResult: MMMFitResult = {
    theta: 0.5, K: 0, alpha: 1, beta0: 0, beta1: 0,
    mse: Infinity, rSquared: 0, saturationType: 'hill', optimized: false,
  };

  if (n < 7 || n !== outcome.length) return defaultResult;

  const {
    thetas = [0.1, 0.3, 0.5, 0.7, 0.9],
    kPercentiles = [0.3, 0.5, 0.7, 0.9],
    saturationType = 'hill',
    hillAlpha = 1.0,
  } = options;

  let best: MMMFitResult = { ...defaultResult, saturationType };

  for (const theta of thetas) {
    const adstock = geometricAdstock(spend, theta);

    // K derivado da distribuição real do adstock (escala automática)
    const Ks = kPercentiles
      .map(p => arrayPercentile(adstock, p))
      .filter(k => k > 0);

    for (const K of Ks) {
      const transformed = saturationType === 'hill'
        ? hillSaturation(adstock, K, hillAlpha)
        : logSaturation(adstock, K);

      // olsSimple: alpha = intercepto, beta = coeficiente
      const { alpha: b0, beta: b1, rSquared, residuals } = olsSimple(transformed, outcome);

      const mse = residuals.length > 0
        ? residuals.reduce((s, r) => s + r * r, 0) / residuals.length
        : Infinity;

      if (mse < best.mse) {
        best = {
          theta,
          K: Math.round(K * 100) / 100,
          alpha: hillAlpha,
          beta0: b0,
          beta1: b1,
          mse: Math.round(mse * 10000) / 10000,
          rSquared,
          saturationType,
          optimized: true,
        };
      }
    }
  }

  return best;
}

// =============================================================================
// 4. Curva de Resposta e Budget Ótimo
// =============================================================================

/**
 * Prediz o outcome para um nível de spend estático (estado estacionário).
 *
 * Assume adstock estacionário: A = spend / (1 - θ)
 * Válido quando o spend é constante há muitos períodos (≥ 1/(1-θ) períodos).
 *
 * @param spend - Nível de gasto (escalar)
 * @param fit   - Resultado do fitMMM
 */
export function predictOutcome(spend: number, fit: MMMFitResult): number {
  if (spend <= 0) return fit.beta0;
  const steadyAdstock = spend / Math.max(1 - fit.theta, 0.01);
  const sat = fit.saturationType === 'hill'
    ? hillSaturation([steadyAdstock], fit.K, fit.alpha)[0]
    : logSaturation([steadyAdstock], fit.K)[0];
  return fit.beta0 + fit.beta1 * sat;
}

/**
 * Gera a curva de resposta ROAS para uma faixa de níveis de spend.
 *
 * Para cada nível, calcula:
 * - outcome esperado (estado estacionário)
 * - ROAS total: outcome / spend
 * - ROAS marginal: ΔOutcome / ΔSpend (retorno incremental do próximo R$)
 *
 * Use o ROAS marginal para decisões de escala:
 * - ROAS marginal > target → vale escalar
 * - ROAS marginal < target → reduzir budget
 *
 * @param spendLevels - Array de níveis de spend a avaliar
 * @param fit         - Resultado do fitMMM
 */
export function computeROASCurve(
  spendLevels: number[],
  fit: MMMFitResult
): ROASCurvePoint[] {
  const outcomes = spendLevels.map(s => predictOutcome(s, fit));

  return outcomes.map((outcome, i) => {
    const spend = spendLevels[i];
    const roas = spend > 0 ? outcome / spend : 0;
    const marginalROAS = i === 0
      ? roas
      : (outcome - outcomes[i - 1]) / Math.max(spend - spendLevels[i - 1], 1e-9);

    return {
      spend: Math.round(spend * 100) / 100,
      outcome: Math.round(outcome * 100) / 100,
      roas: Math.round(roas * 10000) / 10000,
      marginalROAS: Math.round(marginalROAS * 10000) / 10000,
    };
  });
}

/**
 * Encontra o budget ótimo: ponto com maior ROAS marginal.
 *
 * O "budget ótimo" é onde cada R$ adicional tem maior retorno.
 * Além deste ponto, retornos decrescentes tornam o investimento menos eficiente.
 *
 * @param minSpend  - Gasto mínimo a avaliar
 * @param maxSpend  - Gasto máximo a avaliar
 * @param fit       - Resultado do fitMMM
 * @param steps     - Resolução do grid (default 50)
 */
export function findOptimalBudget(
  minSpend: number,
  maxSpend: number,
  fit: MMMFitResult,
  steps = 50
): OptimalBudgetResult {
  const stepSize = (maxSpend - minSpend) / Math.max(steps, 1);
  const spendLevels = Array.from({ length: steps + 1 }, (_, i) => minSpend + i * stepSize);
  const curve = computeROASCurve(spendLevels, fit);

  let best = curve[0] ?? { spend: minSpend, marginalROAS: 0, roas: 0 };
  for (const point of curve) {
    if (point.marginalROAS > best.marginalROAS) best = point;
  }

  return {
    optimalSpend: best.spend,
    maxMarginalROAS: best.marginalROAS,
    totalROAS: best.roas,
  };
}
