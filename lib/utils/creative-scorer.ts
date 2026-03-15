// =============================================================================
// creative-scorer.ts — Motor de Scoring de Criativos para Meta Ads
// Pure TypeScript, zero dependencies
//
// Story: US-36 — Creative Intelligence Scorer
// Referência: Meta/AppsFlyer/Dentsu (2024) Creative Analytics; Neuromarketing
//             Gestalt visual design + LIWC caption analysis patterns
//
// NOTA DE DADOS: Os campos de metadados (hasFace, textDensity, dominantHue, etc.)
// não são retornados pelo Meta Graph API. Devem ser anotados offline (admin panel,
// planilha ou processo de visão computacional) e salvos em banco de dados.
// Este módulo define o schema de tipos e a lógica de scoring — o processo de
// anotação está fora do escopo desta story.
// =============================================================================

import { clamp01 } from './math-core';
import { stlDecompose } from './anomaly-detection';

// =============================================================================
// Tipos Públicos — Metadados do Criativo
// =============================================================================

/** Cor dominante do criativo (anotação offline) */
export type HueLabel = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW' | 'BLACK' | 'OTHER';

/** Densidade de texto na peça (anotação offline) */
export type TextDensity = 'LOW' | 'MEDIUM' | 'HIGH';

/** Tipo de copy/caption (anotação offline ou NLP simples) */
export type CaptionType = 'QUESTION' | 'STATEMENT' | 'LIST' | 'HOW_TO' | 'OTHER';

/** Objetivo da campanha (mapeado do Meta API) */
export type CreativeObjective =
  | 'CONVERSIONS'
  | 'AWARENESS'
  | 'TRAFFIC'
  | 'LEADS'
  | 'ENGAGEMENT'
  | 'OTHER';

/** Categoria de negócio (anotação offline) */
export type BusinessCategory =
  | 'FOOD'
  | 'FASHION'
  | 'B2B'
  | 'FINANCE'
  | 'LOCAL_BUSINESS'
  | 'OTHER';

/**
 * Metadados de um criativo — combinação de campos do Graph API e anotações offline.
 *
 * Campos sem `?` são obrigatórios (disponíveis via API).
 * Campos com `?` são opcionais (requerem anotação offline).
 */
export interface CreativeMeta {
  id: string;
  campaignId: string;
  adSetId: string;
  objective: CreativeObjective;
  /** Categoria do negócio — anotação offline, usada para bônus de cor contextual */
  category?: BusinessCategory;
  /** Cor dominante do criativo (anotação offline) */
  dominantHue?: HueLabel;
  /** O criativo mostra face humana? (anotação offline ou visão computacional offline) */
  hasFace?: boolean;
  /** Densidade de texto na peça (anotação offline) */
  textDensity?: TextDensity;
  /** Tipo de copy/caption (anotação offline ou NLP) */
  captionType?: CaptionType;
  /** Número de emojis na caption (calculável por regex no texto do anúncio) */
  emojiCount?: number;
  /** O criativo é UGC (User Generated Content)? (anotação offline) */
  isUGC?: boolean;
}

// =============================================================================
// Tipos Públicos — Stats e Benchmarks
// =============================================================================

/** Métricas de performance de um criativo num período */
export interface CreativeStats {
  impressions: number;
  clicks: number;
  /** CTR = clicks / impressions */
  ctr: number;
  /** Hook Rate = video_3s_views / impressions (vídeo) */
  hookRate?: number;
  /** Hold Rate = video_complete_views / impressions (vídeo) */
  holdRate?: number;
  /** Save Rate = saves / impressions */
  saveRate: number;
  /** Comment Rate = comments / impressions */
  commentRate: number;
  /** ROAS = revenue / spend (se disponível) */
  roas?: number;
  spend: number;
  period: { start: number; end: number };
}

/** Benchmarks da conta ou ad set para comparação relativa */
export interface CreativeBenchmark {
  avgCtr: number;
  avgHookRate?: number;
  avgSaveRate: number;
  avgCommentRate: number;
  avgRoas?: number;
}

/** Série histórica de um criativo */
export interface HistoricalSerie {
  /** Pontos em ordem cronológica (mais antigo primeiro) */
  points: CreativeStats[];
  benchmarks: CreativeBenchmark;
}

/** Score multidimensional de um criativo */
export interface CreativeScore {
  creativeId: string;
  /** Score visual (0-1): baseado em face, densidade de texto, cor, UGC */
  visualScore: number;
  /** Score de copy (0-1): tipo de caption, emojis */
  copyScore: number;
  /** Score de performance (0-1): CTR, saveRate, commentRate, ROAS vs benchmarks */
  performanceScore: number;
  /**
   * Score de fadiga (0-1): quanto mais alto, mais fatigado.
   * Detectado via STL trend decrescente, não comparação first-vs-last.
   */
  fatigueScore: number;
  /**
   * Score total (0-1):
   * 0.2×visual + 0.2×copy + 0.5×performance − 0.3×fatigue
   */
  totalScore: number;
}

// =============================================================================
// Helpers internos
// =============================================================================

/** Normaliza um KPI pelo benchmark: >1 melhor que média, <1 pior */
function relativeKpi(value: number, avg: number): number {
  if (avg <= 0) return 1;
  return value / avg;
}

/**
 * Detecta se a componente de tendência STL está em queda por N períodos consecutivos.
 *
 * @param trend - Array de valores de tendência (output de stlDecompose)
 * @param minConsecutive - Mínimo de períodos consecutivos em queda para confirmar
 * @returns Número máximo de períodos consecutivos em queda encontrados
 */
function maxConsecutiveDecline(trend: number[]): number {
  if (trend.length < 2) return 0;

  let maxRun = 0;
  let currentRun = 0;

  for (let i = 1; i < trend.length; i++) {
    if (trend[i] < trend[i - 1]) {
      currentRun++;
      maxRun = Math.max(maxRun, currentRun);
    } else {
      currentRun = 0;
    }
  }

  return maxRun;
}

// =============================================================================
// 1. Score Visual
// =============================================================================

/**
 * Calcula o score visual de um criativo baseado em metadados offline.
 *
 * Heurísticas baseadas em:
 * - Meta/AppsFlyer (2024): UGC e faces humanas correlacionam com +Hook Rate
 * - Gestalt visual design: texto baixo + fundo neutro (60-30-10) melhora legibilidade
 * - Color psychology: bônus contextual por categoria de negócio
 *
 * @param meta - Metadados do criativo
 * @returns Score em [0, 1], base 0.5
 */
export function scoreVisual(meta: CreativeMeta): number {
  let delta = 0;

  // Faces humanas: bônus de engajamento em social media
  if (meta.hasFace === true) delta += 0.15;

  // Densidade de texto: excesso reduz legibilidade e hook rate nos primeiros 3s
  if (meta.textDensity === 'LOW') delta += 0.15;
  else if (meta.textDensity === 'MEDIUM') delta += 0.05;
  else if (meta.textDensity === 'HIGH') delta -= 0.10;

  // UGC: autenticidade melhora performance em social/mobile
  if (meta.isUGC === true) delta += 0.10;

  // Bônus de cor contextual por categoria de negócio
  if (meta.category && meta.dominantHue) {
    if (meta.category === 'FINANCE' && meta.dominantHue === 'BLUE') delta += 0.05;
    if (meta.category === 'FOOD' && meta.dominantHue === 'RED') delta += 0.05;
    if (meta.category === 'LOCAL_BUSINESS' && meta.dominantHue === 'GREEN') delta += 0.03;
    if (meta.category === 'FASHION' && meta.dominantHue === 'BLACK') delta += 0.03;
  }

  return clamp01(0.5 + delta);
}

// =============================================================================
// 2. Score de Copy
// =============================================================================

/**
 * Calcula o score de copy baseado no tipo de caption e uso de emojis.
 *
 * Heurísticas baseadas em:
 * - LIWC studies em Instagram ads: perguntas e listas facilitam processamento
 * - Emoji sweet spot: 1-5 emojis aumentam escaneabilidade; >8 reduz credibilidade
 *
 * @param meta - Metadados do criativo
 * @returns Score em [0, 1], base 0.5
 */
export function scoreCopy(meta: CreativeMeta): number {
  let delta = 0;

  // Tipos de caption com melhor performance em ads
  if (meta.captionType === 'QUESTION') delta += 0.10;
  else if (meta.captionType === 'LIST') delta += 0.08;
  else if (meta.captionType === 'HOW_TO') delta += 0.08;

  // Emojis: sweet spot entre 1 e 5
  if (meta.emojiCount !== undefined) {
    if (meta.emojiCount === 0) {
      // neutro — sem bônus nem penalidade
    } else if (meta.emojiCount <= 5) {
      delta += 0.05;
    } else if (meta.emojiCount <= 8) {
      delta -= 0.02;
    } else {
      delta -= 0.08;
    }
  }

  return clamp01(0.5 + delta);
}

// =============================================================================
// 3. Score de Performance
// =============================================================================

/**
 * Calcula o score de performance baseado em métricas do Graph API vs benchmarks.
 *
 * Usa log2 saturation para evitar dominância de outliers extremos.
 * Fórmula: perf += weight × log2(kpi/avg + 1)
 *
 * Pesos:
 * - CTR: 0.20 (captura atenção inicial)
 * - Save Rate: 0.15 (intenção de compra futura)
 * - Comment Rate: 0.10 (engajamento profundo)
 * - ROAS: 0.20 (se disponível — resultado final)
 *
 * @param current - Stats do período atual
 * @param bench - Benchmarks de referência
 * @returns Score em [0, 1]
 */
export function scorePerformance(
  current: CreativeStats,
  bench: CreativeBenchmark
): number {
  let perf = 0.5;

  perf += 0.20 * Math.log2(relativeKpi(current.ctr, bench.avgCtr) + 1);
  perf += 0.15 * Math.log2(relativeKpi(current.saveRate, bench.avgSaveRate) + 1);
  perf += 0.10 * Math.log2(relativeKpi(current.commentRate, bench.avgCommentRate) + 1);

  if (bench.avgRoas !== undefined && current.roas !== undefined) {
    perf += 0.20 * Math.log2(relativeKpi(current.roas, bench.avgRoas) + 1);
  }

  return clamp01(perf);
}

// =============================================================================
// 4. Score de Fadiga — via STL Trend (superior a first-vs-last)
// =============================================================================

/**
 * Detecta fadiga criativa via decomposição STL da série de CTR.
 *
 * Por que STL em vez de first-vs-last:
 * A comparação direta first.ctr vs last.ctr é sensível a outliers pontuais
 * (promoção, feriado, repost viral). O stlDecompose() remove sazonalidade e
 * tendência de longo prazo, isolando o componente real de declínio.
 *
 * Critérios de fadiga:
 * - Trend STL em queda por ≥ 3 períodos consecutivos → +0.40
 * - Hook Rate absoluto cai >10pp do início ao fim (se disponível) → +0.30
 * - Spend crescente com trend decrescente → +0.20 (gasto subindo, resultado caindo)
 *
 * Requer mínimo 3 pontos na série; retorna 0 se insuficiente.
 *
 * @param serie - Série histórica do criativo
 * @returns Fadiga em [0, 1]: 0 = saudável, 1 = completamente fatigado
 */
export function scoreFatigue(serie: HistoricalSerie): number {
  const pts = serie.points;
  if (pts.length < 3) return 0;

  let fatigue = 0;

  // --- Detecção via STL na série de CTR ---
  const ctrSeries = pts.map(p => p.ctr);

  // Período = 7 (semanal) se temos dados suficientes; 3 caso contrário
  const period = pts.length >= 14 ? 7 : 3;
  const decomp = stlDecompose(ctrSeries, period);

  if (decomp.decomposed) {
    const consecutiveDecline = maxConsecutiveDecline(decomp.trend);
    if (consecutiveDecline >= 3) {
      // Ponderação progressiva: mais períodos em queda = fadiga maior
      fatigue += Math.min(0.40, 0.10 * consecutiveDecline);
    }
  } else {
    // Fallback quando STL não decompõe (< 2×period): tendência simples
    const first = pts[0].ctr;
    const last = pts[pts.length - 1].ctr;
    const ctrDrop = first > 0 ? (first - last) / first : 0;
    if (ctrDrop > 0.3) fatigue += 0.30;
    else if (ctrDrop > 0.15) fatigue += 0.15;
  }

  // --- Hook Rate: queda absoluta > 10pp ---
  const firstHook = pts[0].hookRate;
  const lastHook = pts[pts.length - 1].hookRate;
  if (firstHook !== undefined && lastHook !== undefined) {
    const hookDrop = firstHook - lastHook;
    if (hookDrop > 0.10) fatigue += 0.30;
    else if (hookDrop > 0.05) fatigue += 0.15;
  }

  // --- Spend crescente com CTR caindo (investindo mais com pior resultado) ---
  const firstSpend = pts[0].spend;
  const lastSpend = pts[pts.length - 1].spend;
  const firstCtr = pts[0].ctr;
  const lastCtr = pts[pts.length - 1].ctr;

  if (lastSpend > firstSpend && lastCtr < firstCtr * 0.85) {
    fatigue += 0.20;
  }

  return clamp01(fatigue);
}

// =============================================================================
// 5. Score Composto
// =============================================================================

/**
 * Calcula o score composto de um criativo combinando todas as dimensões.
 *
 * Pesos:
 * - Visual: 0.20 (qualidade estética — sinal fraco, difícil de controlar)
 * - Copy: 0.20 (qualidade da copy — sinal médio)
 * - Performance: 0.50 (resultado real — sinal forte, dados de verdade)
 * - Fadiga: −0.30 (penalidade por declínio — sinal de risco)
 *
 * Total ∈ [0, 1]:
 * - > 0.70: criativo saudável e performático
 * - 0.50–0.70: desempenho mediano, monitorar
 * - < 0.50: candidato a substituição ou reformulação
 *
 * @param meta - Metadados do criativo
 * @param serie - Série histórica de performance
 * @returns Score multidimensional
 */
export function scoreCreative(
  meta: CreativeMeta,
  serie: HistoricalSerie
): CreativeScore {
  const current = serie.points[serie.points.length - 1];

  const visualScore = scoreVisual(meta);
  const copyScore = scoreCopy(meta);
  const performanceScore = scorePerformance(current, serie.benchmarks);
  const fatigueScore = scoreFatigue(serie);

  const totalScore = clamp01(
    0.20 * visualScore +
    0.20 * copyScore +
    0.50 * performanceScore -
    0.30 * fatigueScore
  );

  return {
    creativeId: meta.id,
    visualScore: Math.round(visualScore * 10000) / 10000,
    copyScore: Math.round(copyScore * 10000) / 10000,
    performanceScore: Math.round(performanceScore * 10000) / 10000,
    fatigueScore: Math.round(fatigueScore * 10000) / 10000,
    totalScore: Math.round(totalScore * 10000) / 10000,
  };
}
