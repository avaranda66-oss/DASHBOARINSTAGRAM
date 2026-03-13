// =============================================================================
// advanced-indicators.ts — Indicadores Avancados de Marketing Analytics
// Depende de: math-core.ts (olsSimple)
// =============================================================================

import { olsSimple } from './math-core';

/**
 * Calcula a elasticidade publicitaria via regressao log-log.
 *
 * elasticidade = d(log revenue) / d(log spend)
 * - elasticidade > 1: retornos crescentes (raro, investir mais)
 * - elasticidade = 1: retornos proporcionais
 * - elasticidade < 1: retornos decrescentes (normal)
 * - elasticidade < 0: investimento prejudicando (parar)
 *
 * @param spend - Array de gastos por periodo
 * @param revenue - Array de receita/resultado por periodo (mesmo tamanho que spend)
 * @returns { elasticity, rSquared, interpretation, confidence }
 */
export function advertisingElasticity(
  spend: number[],
  revenue: number[]
): {
  elasticity: number;
  rSquared: number;
  interpretation: string;
  confidence: 'high' | 'medium' | 'low';
} {
  if (spend.length < 3 || spend.length !== revenue.length) {
    return { elasticity: 0, rSquared: 0, interpretation: 'Dados insuficientes (minimo 3 periodos)', confidence: 'low' };
  }

  // Filter out zero/negative values (can't log)
  const pairs: { logS: number; logR: number }[] = [];
  for (let i = 0; i < spend.length; i++) {
    if (spend[i] > 0 && revenue[i] > 0) {
      pairs.push({ logS: Math.log(spend[i]), logR: Math.log(revenue[i]) });
    }
  }

  if (pairs.length < 3) {
    return { elasticity: 0, rSquared: 0, interpretation: 'Dados insuficientes apos filtrar zeros', confidence: 'low' };
  }

  const logSpend = pairs.map(p => p.logS);
  const logRevenue = pairs.map(p => p.logR);
  const result = olsSimple(logSpend, logRevenue);

  const e = result.beta;
  let interpretation: string;
  if (e < 0) {
    interpretation = 'Investimento pode estar prejudicando resultado — revisar estrategia';
  } else if (e < 0.5) {
    interpretation = 'Retornos fortemente decrescentes — proximo da saturacao';
  } else if (e < 1) {
    interpretation = 'Retornos decrescentes (normal) — otimizar alocacao';
  } else if (e === 1) {
    interpretation = 'Retornos proporcionais — cada real investido gera retorno constante';
  } else {
    interpretation = 'Retornos crescentes — oportunidade de escalar investimento';
  }

  const confidence: 'high' | 'medium' | 'low' =
    result.rSquared >= 0.7 ? 'high' :
    result.rSquared >= 0.4 ? 'medium' : 'low';

  return {
    elasticity: Math.round(e * 10000) / 10000,
    rSquared: result.rSquared,
    interpretation,
    confidence,
  };
}

/**
 * Modela meia-vida de fadiga criativa via decaimento exponencial.
 *
 * CTR(t) = CTR_0 * e^(-lambda * t)
 * meia-vida = ln(2) / lambda
 *
 * Estima quantos dias ate o CTR cair pela metade.
 *
 * @param dailyCTRs - Array de CTR diarios em ordem cronologica (dia 0, dia 1, ...)
 * @returns { halfLife, lambda, initialCTR, currentCTR, daysAnalyzed, decayRate }
 */
export function creativeHalfLife(
  dailyCTRs: number[]
): {
  halfLife: number;
  lambda: number;
  initialCTR: number;
  currentCTR: number;
  daysAnalyzed: number;
  decayRate: string;
} {
  const valid = dailyCTRs.filter(c => c > 0);
  if (valid.length < 3) {
    return {
      halfLife: Infinity,
      lambda: 0,
      initialCTR: valid[0] ?? 0,
      currentCTR: valid[valid.length - 1] ?? 0,
      daysAnalyzed: valid.length,
      decayRate: 'Dados insuficientes',
    };
  }

  // log-linear regression: ln(CTR) = ln(CTR_0) - lambda * t
  const t = valid.map((_, i) => i);
  const logCTR = valid.map(c => Math.log(c));

  const result = olsSimple(t, logCTR);
  const lambda = -result.beta; // beta is negative for decay

  let decayRate: string;
  let halfLife: number;

  if (lambda <= 0) {
    halfLife = Infinity;
    decayRate = 'Sem decaimento detectado (CTR estavel ou crescente)';
  } else {
    halfLife = Math.log(2) / lambda;
    if (halfLife < 3) {
      decayRate = 'Muito rapido — criativo se esgota em poucos dias';
    } else if (halfLife < 7) {
      decayRate = 'Rapido — renovar criativos semanalmente';
    } else if (halfLife < 14) {
      decayRate = 'Moderado — criativo dura 1-2 semanas';
    } else {
      decayRate = 'Lento — criativo tem boa durabilidade';
    }
  }

  return {
    halfLife: halfLife === Infinity ? Infinity : Math.round(halfLife * 100) / 100,
    lambda: Math.round(lambda * 10000) / 10000,
    initialCTR: Math.round(valid[0] * 10000) / 10000,
    currentCTR: Math.round(valid[valid.length - 1] * 10000) / 10000,
    daysAnalyzed: valid.length,
    decayRate,
  };
}

/**
 * Modela retornos decrescentes via curva de Michaelis-Menten.
 *
 * resultado = (Vmax * spend) / (Km + spend)
 *
 * Onde:
 * - Vmax = resultado maximo teorico (saturacao)
 * - Km = gasto necessario para atingir 50% de Vmax
 *
 * Estimado via transformacao Lineweaver-Burk: 1/resultado = (Km/Vmax)(1/spend) + 1/Vmax
 *
 * @param spend - Array de gastos
 * @param result - Array de resultados correspondentes
 * @returns { Vmax, Km, currentEfficiency, saturationPercent, interpretation }
 */
export function diminishingReturns(
  spend: number[],
  result: number[]
): {
  Vmax: number;
  Km: number;
  currentEfficiency: number;
  saturationPercent: number;
  interpretation: string;
} {
  if (spend.length < 3 || spend.length !== result.length) {
    return { Vmax: 0, Km: 0, currentEfficiency: 0, saturationPercent: 0, interpretation: 'Dados insuficientes' };
  }

  // Filter zeros
  const pairs: { s: number; r: number }[] = [];
  for (let i = 0; i < spend.length; i++) {
    if (spend[i] > 0 && result[i] > 0) {
      pairs.push({ s: spend[i], r: result[i] });
    }
  }

  if (pairs.length < 3) {
    return { Vmax: 0, Km: 0, currentEfficiency: 0, saturationPercent: 0, interpretation: 'Dados insuficientes apos filtrar zeros' };
  }

  // Lineweaver-Burk: 1/r = (Km/Vmax)(1/s) + 1/Vmax
  const invSpend = pairs.map(p => 1 / p.s);
  const invResult = pairs.map(p => 1 / p.r);

  const ols = olsSimple(invSpend, invResult);

  // intercept = 1/Vmax → Vmax = 1/intercept
  // slope = Km/Vmax → Km = slope * Vmax
  if (ols.alpha <= 0) {
    return { Vmax: 0, Km: 0, currentEfficiency: 0, saturationPercent: 0, interpretation: 'Modelo nao convergiu — dados nao seguem padrao de saturacao' };
  }

  const Vmax = 1 / ols.alpha;
  const Km = ols.beta * Vmax;

  if (Km <= 0 || Vmax <= 0) {
    return { Vmax: 0, Km: 0, currentEfficiency: 0, saturationPercent: 0, interpretation: 'Modelo nao convergiu — padrao de saturacao nao detectado' };
  }

  const currentSpend = pairs[pairs.length - 1].s;
  const currentResult = pairs[pairs.length - 1].r;
  const predictedMax = (Vmax * currentSpend) / (Km + currentSpend);
  const saturationPercent = (currentSpend / (Km + currentSpend)) * 100;
  const currentEfficiency = currentResult / currentSpend;

  let interpretation: string;
  if (saturationPercent < 30) {
    interpretation = 'Zona de crescimento — espaco significativo para escalar';
  } else if (saturationPercent < 60) {
    interpretation = 'Zona de eficiencia — retornos ainda bons, otimizar alocacao';
  } else if (saturationPercent < 80) {
    interpretation = 'Zona de retornos decrescentes — cada real adicional rende menos';
  } else {
    interpretation = 'Zona de saturacao — investimento adicional tem impacto minimo';
  }

  return {
    Vmax: Math.round(Vmax * 100) / 100,
    Km: Math.round(Km * 100) / 100,
    currentEfficiency: Math.round(currentEfficiency * 10000) / 10000,
    saturationPercent: Math.round(saturationPercent * 100) / 100,
    interpretation,
  };
}
