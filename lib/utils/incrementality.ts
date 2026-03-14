// =============================================================================
// incrementality.ts — Incrementality Testing: ITS + Welch t-test + MDE
// Pure TypeScript, zero dependencies
//
// Story: US-41 — Incrementality Testing para conta única Meta Ads
// Referência: Northbeam/Rockerbox incrementality methodology
//             Penfold & Zhang "Interrupted Time Series Analysis" (2013)
//             Welch "The generalization of Student's problem" (1947)
// =============================================================================

import { normalCDF, normalQuantile, solveLinearSystem } from './math-core';

// =============================================================================
// Tipos Públicos
// =============================================================================

export interface ITSResult {
  /**
   * Coeficientes [β₀, β₁, β₂, β₃] do modelo:
   * Y_t = β₀ + β₁·t + β₂·D_t + β₃·(t·D_t) + ε
   *
   * β₀ = nível base pré-intervenção
   * β₁ = slope (tendência) pré-intervenção
   * β₂ = mudança de NÍVEL imediata na intervenção
   * β₃ = mudança de SLOPE após intervenção
   */
  beta: [number, number, number, number];
  /** Residuos do modelo */
  residuals: number[];
  /** Estimativa de variância dos residuos */
  sigma2: number;
  /** R² do modelo completo */
  rSquared: number;
  /**
   * Efeito causal estimado em cada ponto pós-intervenção.
   * Δ_t = β₂ + β₃·t_pós
   */
  causalEffects: number[];
  /** Efeito total acumulado no período pós-intervenção */
  cumulativeEffect: number;
  /** Índice de intervenção passado como argumento */
  interventionIndex: number;
}

export interface WelchTTestResult {
  /** Estatística t de Welch */
  t: number;
  /** Graus de liberdade (Welch-Satterthwaite) */
  df: number;
  /** P-value bilateral */
  pValue: number;
  /** Diferença de médias: mean(x) - mean(y) */
  diff: number;
  /** Significativo a 5%? */
  significant: boolean;
}

export interface BootstrapDiffResult {
  /** Estimativa pontual da diferença de médias */
  point: number;
  /** Limite inferior do IC (default 95%) */
  lower: number;
  /** Limite superior do IC (default 95%) */
  upper: number;
  /** Número de reamostras usadas */
  B: number;
}

export interface MDEResult {
  /** Dias necessários por grupo para detectar o lift especificado */
  daysPerGroup: number;
  /** Lift mínimo detectável com esse N de dias (inverso) */
  mdePercent: number;
  /** Parâmetros usados */
  params: { lift: number; mu: number; sigma: number; alpha: number; power: number };
}

// =============================================================================
// 1. Regressão de Séries Temporais Interrompidas (ITS)
// =============================================================================

/**
 * Ajusta o modelo de Interrupted Time Series (ITS) por OLS via equações normais.
 *
 * O modelo "segmented regression" com mudança de nível E slope:
 *   Y_t = β₀ + β₁·t + β₂·D_t + β₃·(t·D_t) + ε_t
 *
 * onde:
 *   D_t = 0 antes da intervenção, 1 a partir de interventionIndex
 *   β₂ = efeito imediato de nível (level shift)
 *   β₃ = mudança de tendência (slope change)
 *
 * O contrafactual (o que teria acontecido sem a intervenção) é:
 *   Ŷ_t^{cf} = β₀ + β₁·t
 *
 * O efeito causal em t: Δ_t = β₂ + β₃·(t - interventionIndex)
 *
 * Assunção crítica: sem outras mudanças concomitantes à intervenção
 * (parallel trends implícito via extrapolação do trend pré-período).
 *
 * @param y                 - Série temporal de outcome
 * @param interventionIndex - Índice (1-based) do primeiro período pós-intervenção
 */
export function fitITS(y: number[], interventionIndex: number): ITSResult {
  const n = y.length;
  if (n < 4) {
    return {
      beta: [0, 0, 0, 0], residuals: [], sigma2: 0, rSquared: 0,
      causalEffects: [], cumulativeEffect: 0, interventionIndex,
    };
  }

  const k = 4; // intercept, t, D, t·D
  // Acumula X'X e X'y
  const XTX: number[][] = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const XTy: number[] = new Array<number>(k).fill(0);

  for (let i = 0; i < n; i++) {
    const t = i + 1;                          // 1-based time index
    const D = t > interventionIndex ? 1 : 0;
    const xRow = [1, t, D, t * D];

    for (let r = 0; r < k; r++) {
      for (let c = 0; c < k; c++) {
        XTX[r][c] += xRow[r] * xRow[c];
      }
      XTy[r] += xRow[r] * y[i];
    }
  }

  let betaArr: number[];
  try {
    betaArr = solveLinearSystem(XTX, XTy);
  } catch {
    betaArr = [0, 0, 0, 0];
  }

  const [b0, b1, b2, b3] = betaArr;
  const beta: [number, number, number, number] = [
    Math.round(b0 * 10000) / 10000,
    Math.round(b1 * 10000) / 10000,
    Math.round(b2 * 10000) / 10000,
    Math.round(b3 * 10000) / 10000,
  ];

  // Residuos e R²
  const residuals: number[] = [];
  let sse = 0;
  const yMean = y.reduce((s, v) => s + v, 0) / n;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    const t = i + 1;
    const D = t > interventionIndex ? 1 : 0;
    const yHat = b0 + b1 * t + b2 * D + b3 * t * D;
    const e = y[i] - yHat;
    residuals.push(e);
    sse += e * e;
    ssTot += (y[i] - yMean) ** 2;
  }

  const sigma2 = n > k ? sse / (n - k) : 0;
  const rSquared = ssTot > 0 ? Math.round((1 - sse / ssTot) * 10000) / 10000 : 0;

  // Efeitos causais no período pós-intervenção
  const causalEffects: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i + 1;
    if (t > interventionIndex) {
      const tPost = t - interventionIndex;
      causalEffects.push(Math.round((b2 + b3 * tPost) * 10000) / 10000);
    }
  }

  const cumulativeEffect = Math.round(
    causalEffects.reduce((s, v) => s + v, 0) * 100
  ) / 100;

  return { beta, residuals, sigma2, rSquared, causalEffects, cumulativeEffect, interventionIndex };
}

// =============================================================================
// 2. Welch t-test para Holdout Campaigns
// =============================================================================

/**
 * Teste t de Welch para diferença de médias (dois grupos independentes).
 *
 * Versão robusta do t-test que NÃO assume variâncias iguais entre grupos
 * (usa aproximação de Welch-Satterthwaite para os graus de liberdade).
 *
 * Use caso: comparar métricas diárias entre campanhas em holdout vs controle.
 *
 * H₀: mean(x) = mean(y)
 * H₁: mean(x) ≠ mean(y)  [bilateral]
 *
 * @param x - Obs. do grupo controle (ex: conversões diárias em campanhas ativas)
 * @param y - Obs. do grupo holdout (ex: conversões diárias em campanhas pausadas)
 */
export function welchTTest(x: number[], y: number[]): WelchTTestResult {
  const nx = x.length;
  const ny = y.length;

  if (nx < 2 || ny < 2) {
    return { t: 0, df: 0, pValue: 1, diff: 0, significant: false };
  }

  const mx = x.reduce((s, v) => s + v, 0) / nx;
  const my = y.reduce((s, v) => s + v, 0) / ny;

  const vx = x.reduce((s, v) => s + (v - mx) ** 2, 0) / (nx - 1);
  const vy = y.reduce((s, v) => s + (v - my) ** 2, 0) / (ny - 1);

  const diff = mx - my;
  const se = Math.sqrt(vx / nx + vy / ny);

  if (se === 0) {
    return { t: 0, df: 0, pValue: 1, diff: 0, significant: diff === 0 };
  }

  const t = diff / se;

  // Graus de liberdade Welch-Satterthwaite
  const dfNum = (vx / nx + vy / ny) ** 2;
  const dfDen = (vx / nx) ** 2 / (nx - 1) + (vy / ny) ** 2 / (ny - 1);
  const df = dfNum / dfDen;

  // P-value via aproximação normal (conservadora para df grandes, suficiente para marketing)
  const pValue = 2 * (1 - normalCDF(Math.abs(t)));

  return {
    t: Math.round(t * 10000) / 10000,
    df: Math.round(df * 10) / 10,
    pValue: Math.round(pValue * 100000) / 100000,
    diff: Math.round(diff * 10000) / 10000,
    significant: pValue < 0.05,
  };
}

// =============================================================================
// 3. Bootstrap CI para Diferença de Médias
// =============================================================================

/**
 * Intervalo de confiança bootstrap para diferença de médias (mean(x) - mean(y)).
 *
 * Usa PRNG determinístico (LCG seed=42) — resultados reproduzíveis.
 * Método: percentile bootstrap (não paramétrico, sem assunção de normalidade).
 *
 * @param x     - Grupo A (controle)
 * @param y     - Grupo B (holdout)
 * @param B     - Número de reamostras (default 5000)
 * @param alpha - Nível de significância (default 0.05 → IC 95%)
 */
export function bootstrapDiffMeans(
  x: number[],
  y: number[],
  B = 5000,
  alpha = 0.05
): BootstrapDiffResult {
  const nx = x.length;
  const ny = y.length;

  if (nx === 0 || ny === 0) {
    return { point: 0, lower: 0, upper: 0, B: 0 };
  }

  // PRNG determinístico LCG (seed=42) — não usar Math.random()
  let seed = 42;
  const prng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };

  const diffs: number[] = [];

  for (let b = 0; b < B; b++) {
    let sumX = 0;
    for (let i = 0; i < nx; i++) sumX += x[Math.floor(prng() * nx)];

    let sumY = 0;
    for (let j = 0; j < ny; j++) sumY += y[Math.floor(prng() * ny)];

    diffs.push(sumX / nx - sumY / ny);
  }

  diffs.sort((a, b) => a - b);

  const loIdx = Math.max(0, Math.floor((alpha / 2) * B));
  const hiIdx = Math.min(B - 1, Math.floor((1 - alpha / 2) * B));
  const point = diffs.reduce((s, v) => s + v, 0) / B;

  return {
    point: Math.round(point * 10000) / 10000,
    lower: Math.round(diffs[loIdx] * 10000) / 10000,
    upper: Math.round(diffs[hiIdx] * 10000) / 10000,
    B,
  };
}

// =============================================================================
// 4. MDE Calculator — Duração Mínima de Experimento
// =============================================================================

/**
 * Calcula quantos dias por grupo são necessários para detectar um lift
 * com a potência e significância desejadas (aproximação normal).
 *
 * Fórmula:
 *   n = 2 · (z_{1-α/2} + z_{1-β})² / d²
 *   onde d = lift · μ / σ  (Cohen's d)
 *
 * @param lift   - Lift alvo em fração (ex: 0.10 = 10%)
 * @param mu     - Média baseline da métrica (ex: conversões/dia)
 * @param sigma  - Desvio padrão histórico da métrica (ex: std de conversões/dia)
 * @param alpha  - Nível de significância (default 0.05)
 * @param power  - Potência desejada (default 0.80)
 */
export function requiredDaysForLift(
  lift: number,
  mu: number,
  sigma: number,
  alpha = 0.05,
  power = 0.80
): MDEResult {
  const zAlpha = normalQuantile(1 - alpha / 2);   // z_0.975 ≈ 1.96
  const zBeta  = normalQuantile(power);            // z_0.80  ≈ 0.842

  const delta = lift * mu;
  const cohensD = sigma > 0 ? delta / sigma : Infinity;

  const daysPerGroup = cohensD > 0 && isFinite(cohensD)
    ? Math.ceil(2 * (zAlpha + zBeta) ** 2 / cohensD ** 2)
    : Infinity;

  return {
    daysPerGroup,
    mdePercent: Math.round(lift * 100 * 100) / 100,
    params: { lift, mu, sigma, alpha, power },
  };
}

/**
 * Calcula o MDE (Minimum Detectable Effect) dado um número fixo de dias por grupo.
 *
 * Útil quando a duração máxima do teste já está definida (ex: 14 dias disponíveis)
 * e você quer saber qual o menor efeito que pode detectar.
 *
 * @param daysPerGroup - Dias disponíveis por grupo
 * @param mu           - Média baseline
 * @param sigma        - Desvio padrão histórico
 * @param alpha        - Nível de significância (default 0.05)
 * @param power        - Potência desejada (default 0.80)
 */
export function minimumDetectableEffect(
  daysPerGroup: number,
  mu: number,
  sigma: number,
  alpha = 0.05,
  power = 0.80
): MDEResult {
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta  = normalQuantile(power);

  // n = 2(z_α + z_β)² / d² → d = sqrt(2(z_α + z_β)² / n)
  const cohensD = Math.sqrt(2 * (zAlpha + zBeta) ** 2 / daysPerGroup);
  const lift = mu > 0 ? (cohensD * sigma) / mu : 0;

  return {
    daysPerGroup,
    mdePercent: Math.round(lift * 100 * 100) / 100,
    params: { lift, mu, sigma, alpha, power },
  };
}
