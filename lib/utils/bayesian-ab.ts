// =============================================================================
// bayesian-ab.ts — A/B Testing Estatisticamente Correto para CTR
// Pure TypeScript, zero dependencies
//
// Story: US-24 — Bayesian A/B Testing + Chi² para CTR
// Referência: Kohavi et al. (2020) Trustworthy Online Controlled Experiments
// =============================================================================

import { normalCDF } from './math-core';

// =============================================================================
// Tipos Públicos
// =============================================================================

export interface ChiSquaredResult {
  /** Estatística chi-quadrado de Pearson (com correção de Yates se necessário) */
  chiSq: number;
  /** p-value aproximado (CDF chi-quadrado df=1) */
  pValue: number;
  /** true se pValue < alpha (default 0.05) */
  significant: boolean;
  /** Diferença relativa de CTR: (ctrB - ctrA) / ctrA * 100 */
  effectPercent: number;
  /** CTR de cada variante */
  ctrA: number;
  ctrB: number;
  /** Aplicou correção de Yates? (célula esperada < 10) */
  yatesCorrectionApplied: boolean;
}

export interface BayesianABResult {
  /** P(B > A) via Monte Carlo Beta sampling */
  probBWins: number;
  /** Custo esperado de deployar B quando A é melhor: E[max(θA - θB, 0)] */
  expectedLoss: number;
  /** Intervalo de credibilidade 95% para (θB - θA) */
  credibleInterval: { lower: number; upper: number };
  /** Decisão baseada em threshold configurável */
  recommendation: 'deploy_B' | 'keep_A' | 'inconclusive';
  /** CTR posterior médio de cada variante (média da distribuição Beta posterior) */
  posteriorMeanA: number;
  posteriorMeanB: number;
}

export interface SPRTResult {
  /** Decisão atual do teste sequencial */
  decision: 'accept_H1' | 'accept_H0' | 'continue';
  /** Log da razão de verossimilhança acumulada */
  logLikelihoodRatio: number;
  /** Número de observações processadas */
  sampleSize: number;
  /** true quando o teste pode parar */
  canStop: boolean;
  /** Boundaries usados: A (inferior) e B (superior) */
  boundaries: { A: number; B: number };
}

// =============================================================================
// Tipos Públicos — Fisher Exact
// =============================================================================

export interface FisherExactResult {
  /** p-value bilateral (soma das probabilidades ≤ P_observada) */
  pValue: number;
  /** Odds ratio: (a*d)/(b*c) — com Haldane-Anscombe (+0.5) se b=0 ou c=0 */
  oddsRatio: number;
  /** true se pValue < alpha (default 0.05) */
  significant: boolean;
}

// =============================================================================
// Helpers internos
// =============================================================================

/**
 * CDF da distribuição chi-quadrado com 1 grau de liberdade.
 *
 * P(χ²(1) ≤ x) = erf(√(x/2))
 * Usamos a relação com normalCDF: P(χ²(1) ≤ x) = 2 * normalCDF(√x) - 1
 *
 * Precisão: |erro| < 1e-4 para x < 30
 */
function chiSquaredCDF1(x: number): number {
  if (x <= 0) return 0;
  return 2 * normalCDF(Math.sqrt(x)) - 1;
}

/**
 * Gera amostra de Beta(alpha, beta) via método de rejeição simplificado.
 *
 * Para parâmetros pequenos (alpha, beta > 0.5), usa transformação via
 * variáveis Gamma(a,1) e Gamma(b,1): Beta = G_a / (G_a + G_b)
 *
 * Aproximação via Box-Muller + gamma shape via Marsaglia & Tsang (2000)
 * para parâmetros inteiros ou semi-inteiros — suficiente para posterior
 * Beta(1 + clicks, 1 + impr - clicks).
 */
function betaSample(alpha: number, beta: number, rng: () => number): number {
  // Para alpha e beta inteiros ou grandes, gamma via Marsaglia-Tsang
  const ga = gammaSample(alpha, rng);
  const gb = gammaSample(beta, rng);
  const total = ga + gb;
  if (total === 0) return 0.5;
  return ga / total;
}

/**
 * Amostra Gamma(shape, 1) via Marsaglia & Tsang (2000).
 * Funciona para shape >= 1. Para shape < 1, usa redução: G(d) = G(d+1) * U^(1/d)
 */
function gammaSample(shape: number, rng: () => number): number {
  if (shape <= 0) return 0;

  if (shape < 1) {
    return gammaSample(shape + 1, rng) * Math.pow(rng(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  for (let iter = 0; iter < 1000; iter++) {
    let x: number;
    let v: number;

    do {
      // Box-Muller para Normal(0,1)
      const u1 = rng();
      const u2 = rng();
      x = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-15))) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = rng();

    if (u < 1 - 0.0331 * (x * x) * (x * x)) {
      return d * v;
    }
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }

  return d; // fallback (não deve chegar aqui)
}

/** LCG determinístico como PRNG interno. Seed configurável. */
function makePRNG(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223;
    s = s >>> 0;
    return s / 0x100000000;
  };
}

// =============================================================================
// 1. Chi-squared para proporções (CTR)
// =============================================================================

/**
 * Teste chi-quadrado de Pearson para comparar dois CTRs (proporções binárias).
 *
 * Correto para CTR porque a métrica é uma proporção binomial (cliques/impressões),
 * não uma variável contínua gaussiana. O Z-test gaussiano produz falsos positivos
 * especialmente para n < 500 ou p < 0.01.
 *
 * Aplica correção de Yates automaticamente quando qualquer célula esperada < 10.
 *
 * @param aClicks - Cliques na variante A
 * @param aImpressions - Impressões da variante A
 * @param bClicks - Cliques na variante B
 * @param bImpressions - Impressões da variante B
 * @param alpha - Nível de significância (default 0.05)
 */
export function chiSquaredProportions(
  aClicks: number,
  aImpressions: number,
  bClicks: number,
  bImpressions: number,
  alpha = 0.05
): ChiSquaredResult {
  const defaultResult: ChiSquaredResult = {
    chiSq: 0, pValue: 1, significant: false, effectPercent: 0,
    ctrA: 0, ctrB: 0, yatesCorrectionApplied: false,
  };

  if (aImpressions <= 0 || bImpressions <= 0) return defaultResult;
  if (aClicks < 0 || bClicks < 0) return defaultResult;

  const aNonClicks = aImpressions - aClicks;
  const bNonClicks = bImpressions - bClicks;
  const n = aImpressions + bImpressions;

  if (n === 0) return defaultResult;

  // Totais marginais
  const totalClicks = aClicks + bClicks;
  const totalNonClicks = aNonClicks + bNonClicks;

  // Frequências esperadas
  const eAClicks = (totalClicks * aImpressions) / n;
  const eANon = (totalNonClicks * aImpressions) / n;
  const eBClicks = (totalClicks * bImpressions) / n;
  const eBNon = (totalNonClicks * bImpressions) / n;

  const minExpected = Math.min(eAClicks, eANon, eBClicks, eBNon);
  const useYates = minExpected < 10;

  // χ² = Σ (|O - E| - 0.5)² / E  com Yates
  //     Σ (O - E)² / E           sem Yates
  const yate = useYates ? 0.5 : 0;

  const chiSq =
    Math.pow(Math.max(Math.abs(aClicks - eAClicks) - yate, 0), 2) / eAClicks +
    Math.pow(Math.max(Math.abs(aNonClicks - eANon) - yate, 0), 2) / eANon +
    Math.pow(Math.max(Math.abs(bClicks - eBClicks) - yate, 0), 2) / eBClicks +
    Math.pow(Math.max(Math.abs(bNonClicks - eBNon) - yate, 0), 2) / eBNon;

  const pValue = 1 - chiSquaredCDF1(chiSq);

  const ctrA = aClicks / aImpressions;
  const ctrB = bClicks / bImpressions;
  const effectPercent = ctrA > 0
    ? Math.round(((ctrB - ctrA) / ctrA) * 10000) / 100
    : 0;

  return {
    chiSq: Math.round(chiSq * 10000) / 10000,
    pValue: Math.round(pValue * 100000) / 100000,
    significant: pValue < alpha,
    effectPercent,
    ctrA: Math.round(ctrA * 100000) / 100000,
    ctrB: Math.round(ctrB * 100000) / 100000,
    yatesCorrectionApplied: useYates,
  };
}

// =============================================================================
// 2. Bayesian A/B Testing (Beta-Binomial)
// =============================================================================

/**
 * Teste A/B Bayesiano para CTR via distribuição Beta-Binomial conjugada.
 *
 * Prior: Beta(1, 1) — uniforme não-informativo (equivalente a 1 clique e 1 não-clique
 * "fantasmas" por variante, cenário ultra-conservador).
 *
 * Posterior: se observamos k cliques em n impressões, então:
 *   θ | dados ~ Beta(1 + k, 1 + n - k)
 *
 * P(B > A) calculado via Monte Carlo com B=10.000 amostras (seed=42 determinístico).
 *
 * @param aClicks - Cliques na variante A
 * @param aImpressions - Impressões da variante A
 * @param bClicks - Cliques na variante B
 * @param bImpressions - Impressões da variante B
 * @param options.threshold - P(B > A) mínimo para "deploy_B" (default 0.95)
 * @param options.B - Número de amostras Monte Carlo (default 10000)
 * @param options.seed - Seed do PRNG (default 42)
 */
export function bayesianAB(
  aClicks: number,
  aImpressions: number,
  bClicks: number,
  bImpressions: number,
  options: { threshold?: number; B?: number; seed?: number } = {}
): BayesianABResult {
  const threshold = options.threshold ?? 0.95;
  const B = options.B ?? 10_000;
  const seed = options.seed ?? 42;

  const defaultResult: BayesianABResult = {
    probBWins: 0.5, expectedLoss: 0, credibleInterval: { lower: 0, upper: 0 },
    recommendation: 'inconclusive', posteriorMeanA: 0, posteriorMeanB: 0,
  };

  if (aImpressions <= 0 || bImpressions <= 0) return defaultResult;

  // Parâmetros do posterior: Beta(1 + clicks, 1 + impressões - clicks)
  const alphaA = 1 + Math.max(0, aClicks);
  const betaA = 1 + Math.max(0, aImpressions - aClicks);
  const alphaB = 1 + Math.max(0, bClicks);
  const betaB = 1 + Math.max(0, bImpressions - bClicks);

  const rng = makePRNG(seed);

  let bWins = 0;
  let lossSum = 0;
  const diffs: number[] = [];

  for (let i = 0; i < B; i++) {
    const thetaA = betaSample(alphaA, betaA, rng);
    const thetaB = betaSample(alphaB, betaB, rng);

    if (thetaB > thetaA) bWins++;
    lossSum += Math.max(thetaA - thetaB, 0);
    diffs.push(thetaB - thetaA);
  }

  diffs.sort((a, b) => a - b);

  const probBWins = bWins / B;
  const expectedLoss = lossSum / B;
  const ci025 = diffs[Math.floor(0.025 * B)];
  const ci975 = diffs[Math.floor(0.975 * B)];

  let recommendation: BayesianABResult['recommendation'];
  if (probBWins >= threshold) {
    recommendation = 'deploy_B';
  } else if (probBWins <= 1 - threshold) {
    recommendation = 'keep_A';
  } else {
    recommendation = 'inconclusive';
  }

  return {
    probBWins: Math.round(probBWins * 10000) / 10000,
    expectedLoss: Math.round(expectedLoss * 100000) / 100000,
    credibleInterval: {
      lower: Math.round(ci025 * 100000) / 100000,
      upper: Math.round(ci975 * 100000) / 100000,
    },
    recommendation,
    posteriorMeanA: Math.round((alphaA / (alphaA + betaA)) * 100000) / 100000,
    posteriorMeanB: Math.round((alphaB / (alphaB + betaB)) * 100000) / 100000,
  };
}

// =============================================================================
// 3. SPRT — Sequential Probability Ratio Test (Wald, 1945)
// =============================================================================

/**
 * Teste sequencial de razão de verossimilhança para parada antecipada de A/B tests.
 *
 * Permite parar o teste assim que há evidência suficiente — sem inflar o erro tipo I
 * (ao contrário de "peeking" com testes frequentistas repetidos).
 *
 * Assume H0: θB = θA (sem efeito) e H1: θB = θA + delta (efeito mínimo detectável).
 *
 * Boundaries de Wald:
 *   B_lower = β / (1 - α)    — aceitar H0
 *   B_upper = (1 - β) / α    — aceitar H1
 *
 * @param clicksA - Array de observações binárias para A (1=clique, 0=não-clique), em ordem temporal
 * @param clicksB - Array de observações binárias para B (1=clique, 0=não-clique), em ordem temporal
 * @param options.alpha - Erro tipo I (default 0.05)
 * @param options.beta - Erro tipo II (default 0.20)
 * @param options.delta - Efeito mínimo detectável em CTR absoluto (default 0.005 = 0.5pp)
 */
export function sprtTest(
  clicksA: number[],
  clicksB: number[],
  options: { alpha?: number; beta?: number; delta?: number } = {}
): SPRTResult {
  const alpha = options.alpha ?? 0.05;
  const beta = options.beta ?? 0.20;
  const delta = options.delta ?? 0.005;

  // Wald boundaries
  const lowerBound = beta / (1 - alpha);        // aceitar H0
  const upperBound = (1 - beta) / alpha;        // aceitar H1

  const n = Math.min(clicksA.length, clicksB.length);

  if (n === 0) {
    return {
      decision: 'continue', logLikelihoodRatio: 0, sampleSize: 0,
      canStop: false, boundaries: { A: lowerBound, B: upperBound },
    };
  }

  let logLR = 0;

  // CTR estimado de A (H0: θB = θA = pA)
  let sumA = 0;
  for (let i = 0; i < n; i++) {
    sumA += clicksA[i];
  }

  const pA = n > 0 ? sumA / n : 0.01;
  const p0 = pA;                      // H0: θB = θA
  const p1 = Math.min(pA + delta, 0.999); // H1: θB = θA + delta

  // Log-likelihood ratio acumulado para as observações de B
  for (let i = 0; i < n; i++) {
    const obs = clicksB[i]; // 1 ou 0
    const llH1 = obs * Math.log(Math.max(p1, 1e-10)) + (1 - obs) * Math.log(Math.max(1 - p1, 1e-10));
    const llH0 = obs * Math.log(Math.max(p0, 1e-10)) + (1 - obs) * Math.log(Math.max(1 - p0, 1e-10));
    logLR += llH1 - llH0;
  }

  const LR = Math.exp(logLR);

  let decision: SPRTResult['decision'];
  if (LR >= upperBound) {
    decision = 'accept_H1';
  } else if (LR <= lowerBound) {
    decision = 'accept_H0';
  } else {
    decision = 'continue';
  }

  return {
    decision,
    logLikelihoodRatio: Math.round(logLR * 10000) / 10000,
    sampleSize: n,
    canStop: decision !== 'continue',
    boundaries: {
      A: Math.round(lowerBound * 10000) / 10000,
      B: Math.round(upperBound * 10000) / 10000,
    },
  };
}

// =============================================================================
// 4. Fisher Exact Test para tabelas 2×2
// =============================================================================

/**
 * Logaritmo do fatorial: ln(n!).
 *
 * Exato para n ≤ 20 (soma de logs). Stirling para n > 20:
 *   ln(n!) ≈ n*ln(n) - n + 0.5*ln(2πn) + 1/(12n)
 *
 * Erro da aproximação de Stirling: < 1/(360n³) — desprezível para n > 20.
 */
function logFactorial(n: number): number {
  if (n <= 1) return 0;

  if (n <= 20) {
    let f = 0;
    for (let i = 2; i <= n; i++) f += Math.log(i);
    return f;
  }

  // Stirling com correção de Lanczos
  return (
    n * Math.log(n) -
    n +
    0.5 * Math.log(2 * Math.PI * n) +
    1 / (12 * n)
  );
}

/**
 * Teste Exato de Fisher para tabelas de contingência 2×2.
 *
 * Alternativa exata ao Chi² quando células esperadas < 5 ou n total < 40.
 * Especialmente útil para A/B tests com poucos cliques por variante.
 *
 * Tabela:
 * ```
 *          | Positivo | Negativo |
 * ---------|----------|----------|
 * Variante A|    a    |    b     |
 * Variante B|    c    |    d     |
 * ```
 *
 * p-value bilateral = Σ P(X=k) para todo k onde P(k) ≤ P(observado).
 * Distribuição hipergeométrica com totais marginais fixos.
 *
 * @param a - Cliques/sucessos na variante A
 * @param b - Não-cliques/falhas na variante A
 * @param c - Cliques/sucessos na variante B
 * @param d - Não-cliques/falhas na variante B
 * @param alpha - Nível de significância (default 0.05)
 *
 * @example
 * ```typescript
 * // A/B test com poucos dados
 * const r = fisherExact2x2(3, 17, 10, 10); // pValue ≈ 0.037
 * r.significant // true com alpha=0.05
 * ```
 */
export function fisherExact2x2(
  a: number,
  b: number,
  c: number,
  d: number,
  alpha = 0.05
): FisherExactResult {
  // Validação de inputs
  if (a < 0 || b < 0 || c < 0 || d < 0) {
    return { pValue: 1, oddsRatio: 1, significant: false };
  }

  const r1 = a + b; // total linha 1 (variante A)
  const r2 = c + d; // total linha 2 (variante B)
  const c1 = a + c; // total coluna 1 (positivos)
  const c2 = b + d; // total coluna 2 (negativos)
  const n  = r1 + r2; // total geral

  if (n === 0) return { pValue: 1, oddsRatio: 1, significant: false };

  /**
   * Log-probabilidade hipergeométrica P(X = k) com totais marginais fixos.
   *
   * ln P(k) = lnC(r1,k) + lnC(r2,c1-k) - lnC(n,c1)
   *         = [ln(r1!) - ln(k!) - ln(r1-k!)]
   *           + [ln(r2!) - ln(c1-k)! - ln(r2-(c1-k))!]
   *           - [ln(n!) - ln(c1!) - ln(c2!)]
   */
  function hypergeomLogProb(k: number): number {
    const k2 = c1 - k;      // coluna 1 na linha 2
    const b_ = r1 - k;      // coluna 2 na linha 1
    const d_ = r2 - k2;     // coluna 2 na linha 2

    if (k < 0 || k2 < 0 || b_ < 0 || d_ < 0) return -Infinity;

    return (
      logFactorial(r1) + logFactorial(r2) +
      logFactorial(c1) + logFactorial(c2) -
      logFactorial(n) -
      logFactorial(k) - logFactorial(b_) -
      logFactorial(k2) - logFactorial(d_)
    );
  }

  // Domínio de k (máximo e mínimo possíveis para o valor observado `a`)
  const kMin = Math.max(0, c1 - r2);
  const kMax = Math.min(r1, c1);

  // Log-probabilidade da tabela observada
  const logPobs = hypergeomLogProb(a);

  // p-value bilateral: soma P(k) para todo k onde P(k) ≤ P(observado)
  let pValue = 0;

  for (let k = kMin; k <= kMax; k++) {
    const logPk = hypergeomLogProb(k);
    // Inclui k se sua probabilidade é tão ou mais extrema que a observada
    // Tolerância 1e-10 para floating point
    if (logPk <= logPobs + 1e-10) {
      pValue += Math.exp(logPk);
    }
  }

  // Clamp para [0,1] por imprecisão numérica
  pValue = Math.min(1, Math.max(0, pValue));

  // Odds ratio: (a*d)/(b*c)
  // Correção de Haldane-Anscombe (+0.5) para células zero
  const oddsRatio =
    b === 0 || c === 0
      ? ((a + 0.5) * (d + 0.5)) / ((b + 0.5) * (c + 0.5))
      : (a * d) / (b * c);

  return {
    pValue: Math.round(pValue * 100000) / 100000,
    oddsRatio: Math.round(oddsRatio * 10000) / 10000,
    significant: pValue < alpha,
  };
}
