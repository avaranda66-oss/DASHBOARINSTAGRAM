// =============================================================================
// causal-behavioral.ts — Causalidade e Indicadores Comportamentais
// Pure TypeScript, zero dependencies
//
// Story: US-27 — Granger Causality + Hook Rate + Social Proof Velocity + Fogg Score
// Referências:
//   Granger (1969) — Investigating Causal Relations by Econometric Models. Econometrica.
//   Fogg (2009) — A Behavior Model for Persuasive Design. Persuasive Technology.
//   Cialdini (1984) — Influence: The Psychology of Persuasion.
// =============================================================================

import { olsSimple, normalCDF } from './math-core';
import { detectBuyingIntent, detectUrgencyTriggers, sensoryLanguageScore } from './sentiment';

// =============================================================================
// Tipos Públicos
// =============================================================================

export interface GrangerResult {
  /** Estatística F do teste de Granger */
  fStat: number;
  /** p-value aproximado */
  pValue: number;
  /** true se X Granger-causa Y (pValue < alpha) */
  significant: boolean;
  /** Direção causal identificada após testar ambas as direções */
  causalDirection: 'x_causes_y' | 'y_causes_x' | 'bidirectional' | 'none';
  /** Lag usado no modelo VAR */
  lagUsed: number;
  /** Interpretação legível */
  interpretation: string;
  /** Aviso se dados insuficientes */
  warning?: string;
}

export interface HookRateResult {
  /** Hook rate estimado (0-100) */
  hookRate: number;
  /** Classificação qualitativa */
  classification: 'excelente' | 'bom' | 'medio' | 'baixo';
  /** Benchmark de referência para o tipo de conteúdo */
  benchmark: string;
  /** true se o cálculo foi estimado (proxy) vs dados diretos */
  isEstimate: boolean;
}

export interface SocialProofVelocityResult {
  /** % de comentários que chegaram nas primeiras X horas */
  velocity: number;
  /** Classificação baseada na velocidade */
  classification: 'viral' | 'forte' | 'normal' | 'fraco';
  /** Janela de tempo analisada em horas */
  windowHours: number;
  /** true quando timestamps não estavam disponíveis */
  dataUnavailable?: boolean;
}

export interface FoggBehaviorScore {
  /** Componente Motivação (0-33): sentiment + intent + sensory */
  motivation: number;
  /** Componente Habilidade (0-33): clareza + brevidade + formato */
  ability: number;
  /** Componente Gatilho (0-34): urgência + CTA + timing */
  prompt: number;
  /** Score total B = M * A * T normalizado (0-100) */
  totalScore: number;
  /** Classificação */
  classification: 'alto_impacto' | 'moderado' | 'baixo_impacto';
  /** Maior oportunidade de melhoria */
  topOpportunity: 'motivation' | 'ability' | 'prompt';
}

export interface OrganicPaidHaloResult {
  /** Lift de crescimento de seguidores pós-campanha vs baseline (%) */
  haloEffect: number;
  /** Janela em dias onde o efeito foi observado */
  liftDays: number;
  /** Nível de evidência baseado em consistência entre campanhas */
  significance: 'high' | 'medium' | 'low';
  /** Crescimento médio pós-campanha (seguidores/dia) */
  avgPostCampaignGrowth: number;
  /** Baseline histórico de crescimento (seguidores/dia) */
  baselineGrowth: number;
}

// =============================================================================
// Helpers internos
// =============================================================================

/** Aproximação da CDF F com df2 > 30 via normalCDF. Para df2 <= 30, usa tabela aproximada. */
function fCDFApprox(fStat: number, df1: number, df2: number): number {
  if (fStat <= 0) return 0.5;

  // Para df2 > 30, a distribuição F converge para chi²/df1
  // p-value = P(F > f) = P(chi²(df1) > f * df1)
  if (df2 > 30) {
    const chiSq = fStat * df1;
    // P(chi²(df1) > x) ≈ 1 - normalCDF( sqrt(2x) - sqrt(2*df1 - 1) ) (Wilson-Hilferty)
    const z = Math.sqrt(2 * chiSq) - Math.sqrt(2 * df1 - 1);
    return 1 - normalCDF(z);
  }

  // Para df2 <= 30, tabela de valores críticos para α=0.05 com df1=1
  // F crítico para α=0.05, df1=1, df2=5,10,15,20,25,30
  const fCritical05: Record<number, number> = {
    5: 6.61, 8: 5.32, 10: 4.96, 12: 4.75, 15: 4.54,
    20: 4.35, 25: 4.24, 30: 4.17,
  };

  // Encontrar df2 mais próximo
  const keys = Object.keys(fCritical05).map(Number).sort((a, b) => a - b);
  let closest = keys[keys.length - 1];
  for (const k of keys) {
    if (df2 <= k) { closest = k; break; }
  }

  const fcrit = fCritical05[closest] ?? 4.17;
  if (fStat > fcrit * 2) return 0.01;
  if (fStat > fcrit) return 0.04;
  if (fStat > fcrit * 0.75) return 0.08;
  return 0.20;
}

/** Alinha séries para VAR: remove os `lag` primeiros pontos da série dependente */
function alignForVAR(y: number[], x: number[], lag: number): { yAligned: number[]; yLag: number[]; xLag: number[] } {
  const n = y.length;
  const yAligned = y.slice(lag);
  const yLag = y.slice(0, n - lag);
  const xLag = x.slice(0, n - lag);
  return { yAligned, yLag, xLag };
}

/** OLS múltiplo (2 regressores via equações normais) */
function olsMultiple(
  y: number[], x1: number[], x2: number[]
): { alpha: number; beta1: number; beta2: number; rss: number } {
  const n = y.length;
  if (n < 4 || x1.length !== n || x2.length !== n) {
    return { alpha: 0, beta1: 0, beta2: 0, rss: Infinity };
  }

  // Centrar via médias e resolver sistema 2x2 por equações normais
  let sy = 0, sx1 = 0, sx2 = 0;

  for (let i = 0; i < n; i++) {
    sy += y[i];
    sx1 += x1[i];
    sx2 += x2[i];
  }

  // Centrar variáveis (equivale a incluir intercepto)
  const mx1 = sx1 / n, mx2 = sx2 / n, my = sy / n;
  const cx1 = x1.map(v => v - mx1);
  const cx2 = x2.map(v => v - mx2);
  const cy = y.map(v => v - my);

  // Sistema 2x2: [[Σcx1², Σcx1cx2], [Σcx1cx2, Σcx2²]] * [b1,b2]' = [Σcx1cy, Σcx2cy]
  let a11 = 0, a12 = 0, a22 = 0, b1r = 0, b2r = 0;
  for (let i = 0; i < n; i++) {
    a11 += cx1[i] * cx1[i];
    a12 += cx1[i] * cx2[i];
    a22 += cx2[i] * cx2[i];
    b1r += cx1[i] * cy[i];
    b2r += cx2[i] * cy[i];
  }

  const det = a11 * a22 - a12 * a12;
  if (Math.abs(det) < 1e-10) {
    return { alpha: my, beta1: 0, beta2: 0, rss: cy.reduce((a, v) => a + v * v, 0) };
  }

  const beta1 = (a22 * b1r - a12 * b2r) / det;
  const beta2 = (a11 * b2r - a12 * b1r) / det;
  const alpha = my - beta1 * mx1 - beta2 * mx2;

  const rss = y.reduce((acc, yi, i) => {
    const pred = alpha + beta1 * x1[i] + beta2 * x2[i];
    return acc + (yi - pred) ** 2;
  }, 0);

  return { alpha, beta1, beta2, rss };
}

// =============================================================================
// 1. Granger Causality Test
// =============================================================================

/**
 * Teste de Causalidade de Granger (1969).
 *
 * Testa se X tem poder preditivo sobre Y além do que Y prediz a si mesmo.
 * Metodologia:
 *   1. Modelo restrito: Y[t] = a0 + a1*Y[t-1]  (Y só prediz Y)
 *   2. Modelo irrestrito: Y[t] = a0 + a1*Y[t-1] + b1*X[t-1]
 *   3. F-stat = ((RSS_r - RSS_u) / p) / (RSS_u / (n - 2p - 1))
 *
 * Testa automaticamente ambas as direções (X→Y e Y→X).
 *
 * Aplicações práticas:
 * - "Investimento em Ads Granger-causa crescimento orgânico?"
 * - "Saves Granger-causam aumento de alcance?"
 *
 * @param x - Série X (possível causa)
 * @param y - Série Y (possível efeito)
 * @param options.maxLag - Lags a testar (1 ou 2, default auto baseado em tamanho)
 * @param options.alpha - Nível de significância (default 0.05)
 */
export function grangerTest(
  x: number[],
  y: number[],
  options: { maxLag?: number; alpha?: number } = {}
): GrangerResult {
  const alpha = options.alpha ?? 0.05;
  const n = Math.min(x.length, y.length);
  const xSeries = x.slice(0, n);
  const ySeries = y.slice(0, n);

  const insufficient: GrangerResult = {
    fStat: 0, pValue: 1, significant: false,
    causalDirection: 'none', lagUsed: 1,
    interpretation: 'Dados insuficientes — mínimo 20 observações necessárias',
    warning: `Série tem ${n} pontos, mínimo é 20`,
  };

  if (n < 20) return insufficient;

  const lag = options.maxLag ?? (n >= 50 ? 2 : 1);

  // Testar X → Y
  const { yAligned, yLag, xLag } = alignForVAR(ySeries, xSeries, lag);
  const nAligned = yAligned.length;

  // Modelo restrito: Y ~ Y_lag
  const restricted = olsSimple(yLag, yAligned);
  const rssR = restricted.residuals.reduce((a, r) => a + r * r, 0);

  // Modelo irrestrito: Y ~ Y_lag + X_lag
  const unrestricted = olsMultiple(yAligned, yLag, xLag);
  const rssU = unrestricted.rss;

  const df1 = lag;
  const df2 = nAligned - 2 * lag - 1;

  let fStatXY = 0;
  let pValueXY = 1;

  if (df2 > 0 && rssU > 0 && rssR > rssU) {
    fStatXY = ((rssR - rssU) / df1) / (rssU / df2);
    pValueXY = fCDFApprox(fStatXY, df1, df2);
  }

  // Testar Y → X (direção inversa)
  const { yAligned: xAligned2, yLag: xLag2, xLag: yLag2 } = alignForVAR(xSeries, ySeries, lag);

  const restrictedYX = olsSimple(xLag2, xAligned2);
  const rssRyx = restrictedYX.residuals.reduce((a, r) => a + r * r, 0);
  const unrestrictedYX = olsMultiple(xAligned2, xLag2, yLag2);
  const rssUyx = unrestrictedYX.rss;

  let fStatYX = 0;
  let pValueYX = 1;

  if (df2 > 0 && rssUyx > 0 && rssRyx > rssUyx) {
    fStatYX = ((rssRyx - rssUyx) / df1) / (rssUyx / df2);
    pValueYX = fCDFApprox(fStatYX, df1, df2);
  }

  const xySignif = pValueXY < alpha;
  const yxSignif = pValueYX < alpha;

  let causalDirection: GrangerResult['causalDirection'];
  if (xySignif && yxSignif) causalDirection = 'bidirectional';
  else if (xySignif) causalDirection = 'x_causes_y';
  else if (yxSignif) causalDirection = 'y_causes_x';
  else causalDirection = 'none';

  let interpretation: string;
  switch (causalDirection) {
    case 'x_causes_y':
      interpretation = `X tem poder preditivo sobre Y (F=${fStatXY.toFixed(2)}, p=${pValueXY.toFixed(3)}). Passado de X melhora previsão de Y além do que Y prevê a si mesmo.`;
      break;
    case 'y_causes_x':
      interpretation = `Y tem poder preditivo sobre X (F=${fStatYX.toFixed(2)}, p=${pValueYX.toFixed(3)}). Causalidade inversa detectada.`;
      break;
    case 'bidirectional':
      interpretation = `Causalidade bidirecional: X→Y (F=${fStatXY.toFixed(2)}) e Y→X (F=${fStatYX.toFixed(2)}). Pode indicar feedback loop ou variável confundidora.`;
      break;
    default:
      interpretation = 'Sem causalidade Granger detectada. As séries não têm poder preditivo mútuo além da autocorrelação.';
  }

  return {
    fStat: Math.round(fStatXY * 100) / 100,
    pValue: Math.round(pValueXY * 10000) / 10000,
    significant: xySignif,
    causalDirection,
    lagUsed: lag,
    interpretation,
  };
}

// =============================================================================
// 2. Hook Rate (Retenção de Reels nos primeiros 3s)
// =============================================================================

/**
 * Calcula Hook Rate — proxy de retenção nos primeiros 3 segundos de um Reel.
 *
 * Hook Rate ideal = views_3s / total_reach * 100
 * Como a Meta API v22+ não expõe views_3s diretamente, calculamos via:
 *   proxy = (avg_watch_time_ms / 3000) * (min(reach, plays) / reach)
 *
 * Benchmarks do setor (Socialinsider, 2024):
 * - Excelente: > 70% de retenção no 3s
 * - Bom: 50-70%
 * - Médio: 30-50%
 * - Baixo: < 30%
 *
 * @param avgWatchTimeMs - Tempo médio de visualização em milissegundos
 * @param videoDurationMs - Duração total do vídeo em milissegundos
 * @param contentType - Tipo de conteúdo para benchmark específico
 */
export function hookRate(
  avgWatchTimeMs: number,
  videoDurationMs: number,
  contentType: 'reel' | 'video' | 'story' = 'reel'
): HookRateResult {
  if (videoDurationMs <= 0 || avgWatchTimeMs <= 0) {
    return {
      hookRate: 0,
      classification: 'baixo',
      benchmark: 'Dados insuficientes',
      isEstimate: true,
    };
  }

  // Hook rate = tempo médio relativo aos primeiros 3s
  const watchRatio = Math.min(avgWatchTimeMs / videoDurationMs, 1);
  // Estimativa: se assistiu em média X% do vídeo, ~X*videoLen/3000 dos 3s foram assistidos
  const estimatedHookPct = Math.min((avgWatchTimeMs / 3000) * 100, 100);
  // Mas normalizar pelo tamanho do vídeo (vídeos muito curtos distorcem)
  const normalizedHook = Math.min(watchRatio * 100 * (Math.min(videoDurationMs, 10000) / 10000), 100);
  const hookRateValue = Math.round(((estimatedHookPct * 0.6) + (normalizedHook * 0.4)) * 10) / 10;

  let classification: HookRateResult['classification'];
  if (hookRateValue >= 70) classification = 'excelente';
  else if (hookRateValue >= 50) classification = 'bom';
  else if (hookRateValue >= 30) classification = 'medio';
  else classification = 'baixo';

  const benchmarks: Record<string, string> = {
    reel: 'Benchmark Reels: >70% = excelente, 50-70% = bom (Socialinsider 2024)',
    video: 'Benchmark Video: >65% = excelente, 45-65% = bom',
    story: 'Benchmark Story: >80% = excelente, 60-80% = bom (swipe-through inverso)',
  };

  return {
    hookRate: hookRateValue,
    classification,
    benchmark: benchmarks[contentType] ?? benchmarks.reel,
    isEstimate: true, // proxy via avg_watch_time
  };
}

// =============================================================================
// 3. Social Proof Velocity
// =============================================================================

/**
 * Mede a velocidade de acumulação de prova social nas primeiras horas pós-publicação.
 *
 * Posts que acumulam comentários rapidamente sinalizam ao algoritmo do Instagram
 * alta relevância, resultando em distribuição orgânica maior.
 *
 * Regra geral: se 40-60% dos comentários chegam nas primeiras 2h, o post tem
 * forte velocity — indicador de conteúdo de alto interesse.
 *
 * @param commentTimestamps - Array de timestamps ISO dos comentários
 * @param publishedAt - Timestamp ISO de quando o post foi publicado
 * @param windowHours - Janela de análise em horas (default 2)
 */
export function socialProofVelocity(
  commentTimestamps: string[],
  publishedAt: string,
  windowHours = 2
): SocialProofVelocityResult {
  if (!publishedAt || commentTimestamps.length === 0) {
    return {
      velocity: 0,
      classification: 'fraco',
      windowHours,
      dataUnavailable: true,
    };
  }

  let publishedTime: number;
  try {
    publishedTime = new Date(publishedAt).getTime();
    if (isNaN(publishedTime)) throw new Error('invalid date');
  } catch {
    return { velocity: 0, classification: 'fraco', windowHours, dataUnavailable: true };
  }

  const windowMs = windowHours * 60 * 60 * 1000;
  const total = commentTimestamps.length;

  let inWindow = 0;
  for (const ts of commentTimestamps) {
    try {
      const t = new Date(ts).getTime();
      if (!isNaN(t) && t - publishedTime <= windowMs && t >= publishedTime) {
        inWindow++;
      }
    } catch {
      // timestamp inválido — ignorar
    }
  }

  const velocity = Math.round((inWindow / total) * 10000) / 100;

  let classification: SocialProofVelocityResult['classification'];
  if (velocity >= 60) classification = 'viral';
  else if (velocity >= 40) classification = 'forte';
  else if (velocity >= 20) classification = 'normal';
  else classification = 'fraco';

  return { velocity, classification, windowHours };
}

// =============================================================================
// 4. Fogg Behavior Score — B = Motivação × Habilidade × Gatilho
// =============================================================================

/**
 * Pontua um post segundo o Fogg Behavior Model: B = MAP (Motivation × Ability × Prompt).
 *
 * As três dimensões são calculadas a partir de sinais já disponíveis na plataforma:
 *
 * MOTIVAÇÃO (0-33): quão motivante é o conteúdo?
 *   - Sentiment positivo dos comentários
 *   - Presença de buying intent (Cialdini: desejo)
 *   - Linguagem sensorial no caption (Lindstrom: apelo multissensorial)
 *
 * HABILIDADE (0-33): quão fácil é para o usuário agir?
 *   - Caption curto e direto (≤150 chars = fácil processar)
 *   - CTA explícito presente ("clique", "acesse", "link na bio")
 *   - Formato visual adequado (reel/carousel > text post)
 *
 * GATILHO/PROMPT (0-34): o quê dispara a ação agora?
 *   - Urgência e escassez (Cialdini: "últimas vagas")
 *   - Horário de publicação no pico da audiência
 *   - Autoridade e credibilidade no caption
 *
 * @param post - Objeto com dados do post
 */
export function foggBehaviorScore(post: {
  caption: string;
  contentType: 'post' | 'reel' | 'carousel' | 'story';
  commentsText?: string[];
  publishedHour?: number; // 0-23
  ownerUsername?: string;
  commentOwners?: string[];
}): FoggBehaviorScore {
  const caption = post.caption ?? '';
  const contentType = post.contentType;

  // ==================== MOTIVAÇÃO (0-33) ====================
  let motivation = 0;

  // Comprar intent dos comentários (+0 a 15)
  if (post.commentsText && post.commentsText.length > 0) {
    const comments = post.commentsText.map(text => ({
      id: '', text, ownerUsername: post.commentOwners?.[0] ?? '',
    }));
    const intentResult = detectBuyingIntent(comments);
    motivation += Math.min(intentResult.intentRate * 0.15, 15);
  }

  // Linguagem sensorial no caption (+0 a 10)
  const sensory = sensoryLanguageScore(caption);
  motivation += Math.min(sensory.score * 0.10, 10);

  // Palavras de desejo e benefício no caption (+0 a 8)
  const desireWords = /\b(transform|muda|resultado|conquist|realiz|melhor|incrív|imagin|sonho|quer)\w*/gi;
  const desireMatches = (caption.match(desireWords) ?? []).length;
  motivation += Math.min(desireMatches * 2, 8);

  motivation = Math.min(Math.round(motivation), 33);

  // ==================== HABILIDADE (0-33) ====================
  let ability = 0;

  // Caption curto (≤150 chars = fácil processar) (+0 a 13)
  const captionLen = caption.length;
  if (captionLen <= 80) ability += 13;
  else if (captionLen <= 150) ability += 10;
  else if (captionLen <= 300) ability += 6;
  else ability += 2;

  // CTA explícito (+0 a 10)
  const ctaRegex = /\b(clique|acesse|link na bio|link no perfil|saiba mais|compre|peça|reserve|cadastre|inscreva)\b/gi;
  const hasCTA = ctaRegex.test(caption);
  ability += hasCTA ? 10 : 0;

  // Formato de alto engajamento (+0 a 10)
  const formatScores: Record<string, number> = {
    reel: 10, carousel: 8, post: 6, story: 7,
  };
  ability += formatScores[contentType] ?? 6;

  ability = Math.min(Math.round(ability), 33);

  // ==================== GATILHO / PROMPT (0-34) ====================
  let prompt = 0;

  // Urgência e escassez (+0 a 15)
  const urgency = detectUrgencyTriggers(caption);
  if (urgency.hasUrgency) {
    prompt += Math.min(urgency.count * 5, 15);
  }

  // Autoridade (+0 a 9)
  const authorityRegex = /\b(\d+\s*%|\d+\s*anos?|comprovad|certificad|especialista|expert|pesquisa|estudo)\b/gi;
  const authMatches = (caption.match(authorityRegex) ?? []).length;
  prompt += Math.min(authMatches * 3, 9);

  // Horário de publicação no pico (+0 a 10)
  if (post.publishedHour !== undefined) {
    const peakHours = [7, 8, 9, 12, 13, 18, 19, 20, 21];
    prompt += peakHours.includes(post.publishedHour) ? 10 : 4;
  } else {
    prompt += 5; // neutro quando horário desconhecido
  }

  prompt = Math.min(Math.round(prompt), 34);

  // ==================== TOTAL ====================
  const totalScore = motivation + ability + prompt;

  let classification: FoggBehaviorScore['classification'];
  if (totalScore >= 70) classification = 'alto_impacto';
  else if (totalScore >= 40) classification = 'moderado';
  else classification = 'baixo_impacto';

  // Dimensão com maior oportunidade de melhoria (mais distante do máximo)
  const gaps = {
    motivation: 33 - motivation,
    ability: 33 - ability,
    prompt: 34 - prompt,
  };
  const topOpportunity = (Object.keys(gaps) as Array<keyof typeof gaps>)
    .reduce((a, b) => gaps[a] > gaps[b] ? a : b);

  return { motivation, ability, prompt, totalScore, classification, topOpportunity };
}

// =============================================================================
// 5. Organic-Paid Halo Effect
// =============================================================================

/**
 * Mede o efeito "halo" — crescimento orgânico de seguidores que ocorre
 * nos dias seguintes a campanhas pagas ativas.
 *
 * Metodologia: para cada campanha, compara o crescimento médio de seguidores
 * na janela pós-campanha vs baseline histórico. O halo effect é a média
 * dos lifts entre todas as campanhas analisadas.
 *
 * @param campaignEndDates - Datas ISO de término de cada campanha
 * @param followerTimeSeries - Série de crescimento diário de seguidores (em ordem cronológica)
 * @param firstDate - Data ISO do primeiro ponto da série
 * @param windowDays - Janela de análise pós-campanha (default 7 dias)
 */
export function organicPaidHalo(
  campaignEndDates: string[],
  followerTimeSeries: number[],
  firstDate: string,
  windowDays = 7
): OrganicPaidHaloResult {
  const defaultResult: OrganicPaidHaloResult = {
    haloEffect: 0, liftDays: windowDays,
    significance: 'low', avgPostCampaignGrowth: 0, baselineGrowth: 0,
  };

  if (followerTimeSeries.length < 14 || campaignEndDates.length === 0) {
    return defaultResult;
  }

  let firstDateMs: number;
  try {
    firstDateMs = new Date(firstDate).getTime();
    if (isNaN(firstDateMs)) return defaultResult;
  } catch {
    return defaultResult;
  }

  const dayMs = 24 * 60 * 60 * 1000;

  // Baseline: crescimento médio geral
  const baselineGrowth = followerTimeSeries.reduce((a, v) => a + v, 0) / followerTimeSeries.length;

  // Calcular lift por campanha
  const lifts: number[] = [];

  for (const endDate of campaignEndDates) {
    try {
      const endMs = new Date(endDate).getTime();
      if (isNaN(endMs)) continue;

      const startIdx = Math.round((endMs - firstDateMs) / dayMs);
      if (startIdx < 0 || startIdx + windowDays >= followerTimeSeries.length) continue;

      const window = followerTimeSeries.slice(startIdx, startIdx + windowDays);
      const avgPost = window.reduce((a, v) => a + v, 0) / window.length;

      if (baselineGrowth !== 0) {
        lifts.push((avgPost - baselineGrowth) / Math.abs(baselineGrowth) * 100);
      }
    } catch {
      continue;
    }
  }

  if (lifts.length === 0) return defaultResult;

  const avgHalo = lifts.reduce((a, v) => a + v, 0) / lifts.length;
  const avgPostGrowth = lifts.reduce((a, v) => a + (baselineGrowth * (1 + v / 100)), 0) / lifts.length;

  // Consistência entre campanhas determina a significância
  const positiveLifts = lifts.filter(l => l > 0).length;
  const consistencyRatio = positiveLifts / lifts.length;

  let significance: OrganicPaidHaloResult['significance'];
  if (lifts.length >= 3 && consistencyRatio >= 0.8) significance = 'high';
  else if (lifts.length >= 2 && consistencyRatio >= 0.6) significance = 'medium';
  else significance = 'low';

  return {
    haloEffect: Math.round(avgHalo * 100) / 100,
    liftDays: windowDays,
    significance,
    avgPostCampaignGrowth: Math.round(avgPostGrowth * 100) / 100,
    baselineGrowth: Math.round(baselineGrowth * 100) / 100,
  };
}
