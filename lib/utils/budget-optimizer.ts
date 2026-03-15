// =============================================================================
// budget-optimizer.ts — Otimização de Budget: Bid Landscape + Markowitz Allocation
// Pure TypeScript, zero dependencies
//
// Story: US-37 — Budget Optimizer: Bid Landscape + Markowitz Allocation
// Referência: Varian (2007) GSP Auctions; Markowitz (1952) Portfolio Selection
//
// NOTA: Para detecção de retornos decrescentes, use `diminishingReturns()`
// de `lib/utils/advanced-indicators.ts` — já implementado com maior rigor.
// =============================================================================

// =============================================================================
// Tipos Públicos
// =============================================================================

/**
 * Amostra histórica de bid para estimar P(win|bid).
 *
 * NOTA DE SCHEMA: `eligibleImpressions` e `wonImpressions` são campos que
 * precisam ser adicionados a `types/ads.ts` quando a integração com Meta API
 * for estendida para expor dados de reach_estimate e impressions delivered.
 * A Meta API expõe CPM histórico e impressions entregues — `eligibleImpressions`
 * pode ser estimado via CPM médio do mercado vs CPM realizado.
 */
export interface BidSample {
  /** Proxy de bid: ex. target CPA invertido (1 / targetCPA) ou budget / targetImpressions */
  bid: number;
  /** Impressões elegíveis estimadas no período */
  eligibleImpressions: number;
  /** Impressões efetivamente entregues no período */
  wonImpressions: number;
}

/** Bucket da curva P(win|bid) após binning */
export interface BidBucket {
  /** Bid central do bucket (média dos bids no chunk) */
  bidCenter: number;
  /** Probabilidade de ganhar o leilão neste nível de bid (monotônica crescente) */
  winProb: number;
}

/**
 * Ponto da curva de bid com todas as métricas necessárias para otimização.
 * Combina bid landscape com CTR, CVR e CPM históricos.
 */
export interface BidCurvePoint {
  bid: number;
  winProb: number;
  /** CTR histórico neste nível de bid */
  ctr: number;
  /** CVR (conversion rate = conversões / cliques) neste nível */
  cvr: number;
  /** CPM (custo por mil impressões) neste nível de bid */
  cpm: number;
}

/** Resultado da otimização de bid sob constraint de budget */
export interface BidOptResult {
  /** Bid ótimo encontrado */
  bid: number;
  /** Conversões esperadas com este bid e budget */
  expectedConversions: number;
  /** Custo esperado (deve ser ≤ budget) */
  expectedCost: number;
}

/** Estatísticas históricas de um ad set para alocação de portfolio */
export interface AdSetStats {
  id: string;
  /** ROAS médio histórico */
  meanRoas: number;
  /** Desvio padrão do ROAS histórico */
  roasStd: number;
  /** Gasto mínimo operacional (piso) */
  minSpend: number;
  /** Gasto máximo técnico (teto) */
  maxSpend: number;
}

/** Resultado de alocação de budget entre ad sets */
export interface Allocation {
  adSetId: string;
  spend: number;
}

// =============================================================================
// 1. Estimativa da Bid Landscape — P(win|bid)
// =============================================================================

/**
 * Estima empiricamente a curva P(win|bid) a partir de amostras históricas.
 *
 * Algoritmo:
 * 1. Ordena amostras por bid crescente
 * 2. Bina em `buckets` chunks de tamanho uniforme
 * 3. Calcula winProb = wonImpressions / eligibleImpressions por chunk
 * 4. Enforça monotonicidade crescente: P(win|b_i) ≥ P(win|b_{i-1})
 *
 * @param samples - Amostras históricas de bid
 * @param buckets - Número de buckets (default 20)
 * @returns Curva de bid com winProb monotonicamente crescente
 */
export function estimateBidLandscape(
  samples: BidSample[],
  buckets = 20
): BidBucket[] {
  if (samples.length === 0) return [];

  const sorted = [...samples].sort((a, b) => a.bid - b.bid);
  const chunkSize = Math.ceil(sorted.length / buckets);
  const result: BidBucket[] = [];

  for (let i = 0; i < sorted.length; i += chunkSize) {
    const chunk = sorted.slice(i, i + chunkSize);
    const totalEligible = chunk.reduce((s, c) => s + c.eligibleImpressions, 0);
    const totalWon = chunk.reduce((s, c) => s + c.wonImpressions, 0);

    if (totalEligible === 0) continue;

    const bidCenter = chunk.reduce((s, c) => s + c.bid, 0) / chunk.length;
    const winProb = totalWon / totalEligible;

    result.push({ bidCenter, winProb });
  }

  // Enforçar monotonicidade crescente: bid maior ≥ bid menor em P(win)
  for (let i = 1; i < result.length; i++) {
    result[i].winProb = Math.max(result[i].winProb, result[i - 1].winProb);
  }

  return result;
}

// =============================================================================
// 2. Maximizar Conversões sob Constraint de Budget — Grid Search 1D
// =============================================================================

/**
 * Encontra o bid ótimo para maximizar conversões dado um budget diário.
 *
 * Modelo econômico (baseado em Varian 2007 + prática Meta Ads):
 *   impressions(b) = eligibleImpressions × P(win|b)
 *   clicks(b)      = impressions(b) × ctr(b)
 *   conversions(b) = clicks(b) × cvr(b)
 *   cost(b)        = impressions(b) × cpm(b) / 1000
 *
 * Retorna o ponto da curva que maximiza conversions(b) sob cost(b) ≤ budget.
 * Grid search O(n) é suficiente com ~20 buckets.
 *
 * @param curve - Curva de bid com CTR, CVR e CPM históricos por nível
 * @param eligibleImpressions - Impressões elegíveis estimadas no período
 * @param budget - Budget máximo disponível (mesma moeda do CPM)
 * @returns Ponto ótimo ou null se nenhum ponto couber no budget
 */
export function optimizeBidUnderBudget(
  curve: BidCurvePoint[],
  eligibleImpressions: number,
  budget: number
): BidOptResult | null {
  let best: BidOptResult | null = null;

  for (const p of curve) {
    const impressions = eligibleImpressions * p.winProb;
    const clicks = impressions * p.ctr;
    const conversions = clicks * p.cvr;
    const cost = (impressions * p.cpm) / 1000;

    if (cost > budget) continue;

    if (best === null || conversions > best.expectedConversions) {
      best = {
        bid: p.bid,
        expectedConversions: Math.round(conversions * 100) / 100,
        expectedCost: Math.round(cost * 100) / 100,
      };
    }
  }

  return best;
}

// =============================================================================
// 3. Alocação de Budget entre Ad Sets — Markowitz Diagonal
// =============================================================================

/**
 * Aloca budget entre ad sets usando aproximação Markowitz diagonal.
 *
 * Aproximação diagonal (sem matriz de covariância) é adequada quando:
 * - Número de ad sets é pequeno (2-10)
 * - Histórico insuficiente para estimar covariâncias estáveis
 * - Rotatividade alta de criativos entre períodos
 *
 * Algoritmo:
 * 1. Score ajustado por risco: μ_i − γ × σ_i
 * 2. Normaliza para [0,1]: (adj_i − min) / (max − min)
 * 3. Aloca budget proporcional ao peso, clampado entre [minSpend, maxSpend]
 * 4. Distribui sobra pelos ad sets com maior score, respeitando maxSpend
 *
 * @param adSets - Ad sets com ROAS histórico médio, desvio e limites de gasto
 * @param totalBudget - Budget total a distribuir
 * @param riskAversion - Parâmetro γ de aversão ao risco (0 = só retorno, 1 = equilibrado, >1 = conservador)
 * @returns Alocação por ad set
 */
export function allocateBudgetMarkowitzLike(
  adSets: AdSetStats[],
  totalBudget: number,
  riskAversion: number
): Allocation[] {
  if (adSets.length === 0) return [];

  // Score ajustado por risco: μ - γσ
  const scored = adSets.map(as => ({
    id: as.id,
    adjusted: as.meanRoas - riskAversion * as.roasStd,
  }));

  const minAdj = Math.min(...scored.map(s => s.adjusted));
  const maxAdj = Math.max(...scored.map(s => s.adjusted));
  const range = maxAdj - minAdj;

  // Normalizar para [0,1]; se todos iguais, pesos iguais
  const weights = scored.map(s => ({
    id: s.id,
    weight: Math.max(range === 0 ? 1 : (s.adjusted - minAdj) / range, 0),
  }));

  const weightSum = weights.reduce((s, w) => s + w.weight, 0) || 1;

  // Alocação inicial com clamps
  const allocations: Allocation[] = adSets.map(as => {
    const wNorm = (weights.find(w => w.id === as.id)?.weight ?? 0) / weightSum;
    let target = totalBudget * wNorm;
    target = Math.max(target, as.minSpend);
    target = Math.min(target, as.maxSpend);
    return { adSetId: as.id, spend: Math.round(target * 100) / 100 };
  });

  // Distribuir sobra pelos ad sets de maior score-ajustado
  const allocated = allocations.reduce((s, a) => s + a.spend, 0);
  let remaining = Math.round((totalBudget - allocated) * 100) / 100;

  if (remaining > 0.01) {
    const sortedByScore = [...adSets].sort(
      (a, b) =>
        b.meanRoas - riskAversion * b.roasStd - (a.meanRoas - riskAversion * a.roasStd)
    );

    for (const as of sortedByScore) {
      if (remaining <= 0.01) break;
      const alloc = allocations.find(a => a.adSetId === as.id);
      if (!alloc) continue;
      const headroom = as.maxSpend - alloc.spend;
      if (headroom <= 0) continue;
      const extra = Math.min(headroom, remaining);
      alloc.spend = Math.round((alloc.spend + extra) * 100) / 100;
      remaining = Math.round((remaining - extra) * 100) / 100;
    }
  }

  return allocations;
}
