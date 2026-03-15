// =============================================================================
// statistics.ts — Modulo de Analise Estatistica para Small Data de Instagram
// Pure TypeScript, zero dependencies
// =============================================================================

/** Ponto de dado com valor numerico e metadata opcional */
export interface MetricDataPoint {
  value: number;
  date?: string;
  label?: string;
}

// =============================================================================
// Helpers internos
// =============================================================================

function sorted(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

function quantile(sortedValues: number[], q: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const pos = q * (sortedValues.length - 1);
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  if (lower === upper) return sortedValues[lower];
  const frac = pos - lower;
  return sortedValues[lower] * (1 - frac) + sortedValues[upper] * frac;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const DIAS_SEMANA = [
  'Domingo',
  'Segunda',
  'Terca',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sabado',
] as const;

// =============================================================================
// 1. Estatisticas descritivas
// =============================================================================

/**
 * Calcula estatisticas descritivas completas de um array de valores numericos.
 *
 * Inclui media, mediana, desvio padrao, quartis, IQR e coeficiente de variacao.
 * Retorna defaults seguros (zeros) para arrays vazios.
 *
 * @param values - Array de numeros para analise
 * @returns Objeto com todas as metricas descritivas
 */
export function descriptiveStats(values: number[]): {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  iqr: number;
  cv: number;
  count: number;
} {
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      cv: 0,
      count: 0,
    };
  }

  const s = sorted(values);
  const n = s.length;
  const avg = mean(values);

  // Desvio padrao amostral (Bessel's correction: n-1)
  // Para n < 2, stdDev = 0 (impossivel estimar variancia com 1 ponto)
  const variance = n < 2 ? 0 : values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / (n - 1);
  const stdDev = Math.sqrt(variance);

  const med = quantile(s, 0.5);
  const q1 = quantile(s, 0.25);
  const q3 = quantile(s, 0.75);
  const iqr = q3 - q1;
  const cv = avg !== 0 ? stdDev / Math.abs(avg) : 0;

  return {
    mean: avg,
    median: med,
    stdDev,
    min: s[0],
    max: s[n - 1],
    q1,
    q3,
    iqr,
    cv,
    count: n,
  };
}

// =============================================================================
// 2. Percentil de um valor dentro de um dataset
// =============================================================================

/**
 * Calcula o percentil rank de um valor dentro de um dataset.
 *
 * Usa o metodo "percentage of values below or equal" para determinar
 * em que posicao relativa o valor se encontra no conjunto de dados.
 *
 * @param value - Valor a ser avaliado
 * @param dataset - Conjunto de dados de referencia
 * @returns Percentil de 0 a 100
 */
export function percentileRank(value: number, dataset: number[]): number {
  if (dataset.length === 0) return 0;

  const belowOrEqual = dataset.filter((v) => v <= value).length;
  return (belowOrEqual / dataset.length) * 100;
}

// =============================================================================
// 3. Media Movel (Simple Moving Average)
// =============================================================================

/**
 * Calcula a media movel simples (SMA) de N periodos.
 *
 * Para os primeiros (window - 1) elementos, calcula a media com os dados
 * disponiveis ate aquele ponto. Isso evita perda de dados no inicio da serie.
 *
 * @param values - Serie temporal de valores
 * @param window - Tamanho da janela de periodos
 * @returns Array de medias moveis com mesmo comprimento do input
 */
export function movingAverage(values: number[], window: number): number[] {
  if (values.length === 0) return [];
  const w = Math.max(1, Math.min(window, values.length));

  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - w + 1);
    const slice = values.slice(start, i + 1);
    result.push(mean(slice));
  }
  return result;
}

// =============================================================================
// 4. Taxa de crescimento (primeiro ao ultimo valor)
// =============================================================================

/**
 * Calcula a taxa de crescimento percentual do primeiro ao ultimo valor.
 *
 * Analogo ao CAGR para periodos curtos, mas simplificado como variacao
 * percentual ponta a ponta. Util para avaliar evolucao de metricas
 * em janelas curtas de tempo.
 *
 * @param values - Serie temporal de valores
 * @returns Percentual de crescimento (positivo = cresceu, negativo = caiu)
 */
export function growthRate(values: number[]): number {
  if (values.length < 2) return 0;

  const first = values[0];
  const last = values[values.length - 1];

  if (first === 0) {
    return last > 0 ? 100 : last < 0 ? -100 : 0;
  }

  return ((last - first) / Math.abs(first)) * 100;
}

// =============================================================================
// 5. Tendencia via regressao linear simples (OLS)
// =============================================================================

/**
 * Calcula a tendencia de uma serie de valores usando regressao linear simples.
 *
 * Aplica o metodo dos minimos quadrados ordinarios (OLS) para encontrar
 * slope, intercept e R-squared. A direcao e classificada como 'stable'
 * quando o slope absoluto e menor que 5% da media dos valores.
 *
 * @param values - Serie temporal de valores (indice = tempo)
 * @returns Slope, direcao, R-squared e valores preditos pela regressao
 */
export function linearTrend(values: number[]): {
  slope: number;
  direction: 'rising' | 'falling' | 'stable';
  r2: number;
  predicted: number[];
} {
  if (values.length === 0) {
    return { slope: 0, direction: 'stable', r2: 0, predicted: [] };
  }
  if (values.length === 1) {
    return { slope: 0, direction: 'stable', r2: 1, predicted: [values[0]] };
  }

  const n = values.length;
  // x = 0, 1, 2, ..., n-1
  const xMean = (n - 1) / 2;
  const yMean = mean(values);

  let ssXY = 0;
  let ssXX = 0;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    const dx = i - xMean;
    const dy = values[i] - yMean;
    ssXY += dx * dy;
    ssXX += dx * dx;
    ssTot += dy * dy;
  }

  const slope = ssXX !== 0 ? ssXY / ssXX : 0;
  const intercept = yMean - slope * xMean;

  // R-squared
  let ssRes = 0;
  const predicted: number[] = [];
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * i;
    predicted.push(pred);
    ssRes += (values[i] - pred) ** 2;
  }
  const r2 = ssTot !== 0 ? clamp(1 - ssRes / ssTot, 0, 1) : 0;

  // Direction: stable se |slope| < 5% da media absoluta
  const threshold = Math.abs(yMean) * 0.05;
  let direction: 'rising' | 'falling' | 'stable';
  if (Math.abs(slope) < threshold) {
    direction = 'stable';
  } else {
    direction = slope > 0 ? 'rising' : 'falling';
  }

  return { slope, direction, r2, predicted };
}

// =============================================================================
// 6. Correlacao de Pearson
// =============================================================================

/**
 * Calcula o coeficiente de correlacao de Pearson entre duas series numericas.
 *
 * Mede a forca e direcao da relacao linear entre x e y.
 * Retorna valor entre -1 (correlacao negativa perfeita) e +1 (positiva perfeita).
 * Ambas as series devem ter o mesmo comprimento; usa o menor se diferirem.
 *
 * @param x - Primeira serie de valores
 * @param y - Segunda serie de valores
 * @returns Coeficiente de correlacao de -1 a +1
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const xMean = mean(x.slice(0, n));
  const yMean = mean(y.slice(0, n));

  let ssXY = 0;
  let ssXX = 0;
  let ssYY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - xMean;
    const dy = y[i] - yMean;
    ssXY += dx * dy;
    ssXX += dx * dx;
    ssYY += dy * dy;
  }

  const denom = Math.sqrt(ssXX * ssYY);
  if (denom === 0) return 0;

  return clamp(ssXY / denom, -1, 1);
}

// =============================================================================
// 7. Score composto de engajamento (0-100)
// =============================================================================

/**
 * Calcula um score composto de engajamento de 0 a 100 para um post.
 *
 * Pesos refletem a hierarquia de valor das interacoes no Instagram:
 * - Saves (35%): maior sinal de valor percebido
 * - Shares (25%): amplificacao organica
 * - Comments (20%): engajamento ativo
 * - Likes (10%): engajamento passivo
 * - Views (10%): alcance (normalizado)
 *
 * Usa transformacao logaritmica (log1p) para comprimir a escala e
 * sigmoid para mapear ao range 0-100.
 *
 * @param post - Metricas do post (likes, comments, views?, saves?, shares?)
 * @returns Score de 0 a 100
 */
export function engagementScore(
  post: {
    likes: number;
    comments: number;
    views?: number;
    saves?: number;
    shares?: number;
  },
  options?: {
    /**
     * Histórico de scores ponderados da conta para calcular midpoint dinâmico.
     * Se ausente, usa midpoint fixo = 4 (comportamento legado).
     *
     * US-50: midpoint dinâmico evita distorção entre contas pequenas e grandes.
     */
    accountHistory?: number[];
  }
): number {
  const likes = Math.max(0, post.likes || 0);
  const comments = Math.max(0, post.comments || 0);
  const views = Math.max(0, post.views || 0);
  const saves = Math.max(0, post.saves || 0);
  const shares = Math.max(0, post.shares || 0);

  // Pesos baseados em hierarquia de valor de interacao
  const weights = {
    saves: 0.35,
    shares: 0.25,
    comments: 0.20,
    likes: 0.10,
    views: 0.10,
  };

  // Log transform para comprimir escala (small data de Instagram)
  const logLikes = Math.log1p(likes);
  const logComments = Math.log1p(comments);
  const logViews = Math.log1p(views) * 0.1; // views sao ordens de grandeza maiores
  const logSaves = Math.log1p(saves);
  const logShares = Math.log1p(shares);

  const weighted =
    logLikes * weights.likes +
    logComments * weights.comments +
    logViews * weights.views +
    logSaves * weights.saves +
    logShares * weights.shares;

  // Sigmoid para mapear ao range 0-100
  // k calibrado para que um post "medio" fique ~50
  const k = 0.5;

  // US-50: midpoint dinâmico baseado na mediana da conta.
  // Garante que contas pequenas (weighted ~1) e grandes (weighted ~8)
  // tenham scores relativos, não absolutos.
  // Fallback: 4 (valor legado compatível com comportamento anterior).
  const hist = options?.accountHistory;
  const midpoint = (hist && hist.length >= 3)
    ? sorted(hist)[Math.floor(hist.length / 2)]
    : 4;

  const score = 100 / (1 + Math.exp(-k * (weighted - midpoint)));

  return Math.round(clamp(score, 0, 100) * 100) / 100;
}

// =============================================================================
// 8. Deteccao de outliers (metodo IQR)
// =============================================================================

/**
 * Detecta outliers em um dataset usando o metodo IQR (Interquartile Range).
 *
 * Limites calculados como Q1 - 1.5*IQR (lower) e Q3 + 1.5*IQR (upper).
 * Valores fora destes limites sao classificados como outliers altos ou baixos.
 *
 * @param values - Array de valores numericos
 * @returns Outliers encontrados (com indice, valor e tipo) e os limites usados
 */
export function detectOutliers(values: number[]): {
  outliers: { index: number; value: number; type: 'high' | 'low' }[];
  bounds: { lower: number; upper: number };
} {
  if (values.length < 4) {
    return {
      outliers: [],
      bounds: { lower: 0, upper: 0 },
    };
  }

  const s = sorted(values);
  const q1 = quantile(s, 0.25);
  const q3 = quantile(s, 0.75);
  const iqr = q3 - q1;

  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;

  const outliers: { index: number; value: number; type: 'high' | 'low' }[] = [];

  for (let i = 0; i < values.length; i++) {
    if (values[i] > upper) {
      outliers.push({ index: i, value: values[i], type: 'high' });
    } else if (values[i] < lower) {
      outliers.push({ index: i, value: values[i], type: 'low' });
    }
  }

  return { outliers, bounds: { lower, upper } };
}

// =============================================================================
// 9. Performance badge baseado em percentil
// =============================================================================

/**
 * Atribui um badge de performance baseado na posicao percentil do valor no dataset.
 *
 * Faixas:
 * - exceptional (>= 90th): desempenho excepcional
 * - above_average (>= 70th): acima da media
 * - average (>= 40th): na media
 * - below_average (>= 20th): abaixo da media
 * - underperforming (< 20th): desempenho fraco
 *
 * @param value - Valor a ser classificado
 * @param dataset - Conjunto de dados de referencia
 * @returns Badge, percentil, emoji e cor Tailwind
 */
export function performanceBadge(
  value: number,
  dataset: number[]
): {
  badge:
    | 'exceptional'
    | 'above_average'
    | 'average'
    | 'below_average'
    | 'underperforming';
  percentile: number;
  emoji: string;
  color: string;
} {
  if (dataset.length === 0) {
    return {
      badge: 'average',
      percentile: 50,
      emoji: '~',
      color: 'text-zinc-400',
    };
  }

  const pct = percentileRank(value, dataset);

  if (pct >= 90) {
    return {
      badge: 'exceptional',
      percentile: pct,
      emoji: '🏆',
      color: 'text-emerald-400',
    };
  }
  if (pct >= 70) {
    return {
      badge: 'above_average',
      percentile: pct,
      emoji: '📈',
      color: 'text-sky-400',
    };
  }
  if (pct >= 40) {
    return {
      badge: 'average',
      percentile: pct,
      emoji: '➡️',
      color: 'text-amber-400',
    };
  }
  if (pct >= 20) {
    return {
      badge: 'below_average',
      percentile: pct,
      emoji: '📉',
      color: 'text-orange-400',
    };
  }
  return {
    badge: 'underperforming',
    percentile: pct,
    emoji: '⚠️',
    color: 'text-red-400',
  };
}

// =============================================================================
// 10. Resumo executivo de uma serie de metricas
// =============================================================================

/**
 * Gera um resumo executivo completo de uma serie temporal de metricas.
 *
 * Combina estatisticas descritivas, analise de tendencia e classificacao
 * de volatilidade para produzir um insight textual em PT-BR que descreve
 * o comportamento recente da metrica.
 *
 * @param values - Serie temporal de valores (mais antigo primeiro)
 * @param metricName - Nome da metrica para uso no insight (ex: "curtidas")
 * @returns Resumo com valor atual, media, tendencia, volatilidade e insight
 */
export function metricSummary(
  values: number[],
  metricName: string
): {
  current: number;
  average: number;
  trend: 'rising' | 'falling' | 'stable';
  trendStrength: number;
  volatility: 'high' | 'medium' | 'low';
  bestValue: number;
  worstValue: number;
  insight: string;
} {
  if (values.length === 0) {
    return {
      current: 0,
      average: 0,
      trend: 'stable',
      trendStrength: 0,
      volatility: 'low',
      bestValue: 0,
      worstValue: 0,
      insight: `Sem dados suficientes para analisar ${metricName}.`,
    };
  }

  const stats = descriptiveStats(values);
  const trend = linearTrend(values);
  const current = values[values.length - 1];

  // Classificacao de volatilidade pelo coeficiente de variacao
  let volatility: 'high' | 'medium' | 'low';
  if (stats.cv > 0.5) {
    volatility = 'high';
  } else if (stats.cv > 0.2) {
    volatility = 'medium';
  } else {
    volatility = 'low';
  }

  // Gerar insight em PT-BR
  const trendText =
    trend.direction === 'rising'
      ? 'em tendencia de alta'
      : trend.direction === 'falling'
        ? 'em tendencia de queda'
        : 'estavel';

  const strengthText =
    trend.r2 > 0.7 ? 'com forte consistencia' : trend.r2 > 0.4 ? 'com consistencia moderada' : 'com comportamento irregular';

  const volText =
    volatility === 'high'
      ? 'A volatilidade esta alta, indicando variacao significativa entre posts.'
      : volatility === 'medium'
        ? 'A volatilidade esta moderada.'
        : 'A volatilidade esta baixa, indicando estabilidade.';

  const currentVsAvg = stats.mean !== 0 ? ((current - stats.mean) / Math.abs(stats.mean)) * 100 : 0;
  const compareText =
    Math.abs(currentVsAvg) < 5
      ? `O valor atual esta alinhado com a media`
      : currentVsAvg > 0
        ? `O valor atual esta ${Math.abs(Math.round(currentVsAvg))}% acima da media`
        : `O valor atual esta ${Math.abs(Math.round(currentVsAvg))}% abaixo da media`;

  const insight = `${metricName} esta ${trendText} ${strengthText}. ${compareText}. ${volText}`;

  return {
    current,
    average: stats.mean,
    trend: trend.direction,
    trendStrength: trend.r2,
    volatility,
    bestValue: stats.max,
    worstValue: stats.min,
    insight,
  };
}

// =============================================================================
// 11. Comparador de dois periodos
// =============================================================================

/**
 * Compara duas janelas temporais de uma metrica (ex: ultimos 7d vs 7d anteriores).
 *
 * Calcula a diferenca absoluta e percentual entre as medias dos periodos.
 * Avalia a significancia estatistica usando Cohen's d (effect size):
 * - >= 0.8: significativo
 * - >= 0.3: marginal
 * - < 0.3: negligivel
 *
 * @param current - Valores do periodo atual
 * @param previous - Valores do periodo anterior
 * @returns Medias, variacao, direcao e significancia estatistica
 */
export function periodComparison(
  current: number[],
  previous: number[]
): {
  currentAvg: number;
  previousAvg: number;
  change: number;
  changePercent: number;
  direction: 'up' | 'down' | 'stable';
  significance: 'significant' | 'marginal' | 'negligible';
} {
  if (current.length === 0 && previous.length === 0) {
    return {
      currentAvg: 0,
      previousAvg: 0,
      change: 0,
      changePercent: 0,
      direction: 'stable',
      significance: 'negligible',
    };
  }

  const currentAvg = mean(current);
  const previousAvg = mean(previous);
  const change = currentAvg - previousAvg;
  const changePercent =
    previousAvg !== 0 ? (change / Math.abs(previousAvg)) * 100 : change > 0 ? 100 : change < 0 ? -100 : 0;

  // Direcao com threshold de 2% para considerar estavel
  let direction: 'up' | 'down' | 'stable';
  if (Math.abs(changePercent) < 2) {
    direction = 'stable';
  } else {
    direction = change > 0 ? 'up' : 'down';
  }

  // Significancia via Cohen's d (effect size)
  const currentStats = descriptiveStats(current);
  const previousStats = descriptiveStats(previous);

  // Pooled standard deviation
  const nC = current.length;
  const nP = previous.length;
  let pooledStd: number;

  if (nC + nP < 2) {
    pooledStd = 0;
  } else {
    const pooledVar =
      ((nC > 0 ? currentStats.stdDev ** 2 * nC : 0) +
        (nP > 0 ? previousStats.stdDev ** 2 * nP : 0)) /
      (nC + nP);
    pooledStd = Math.sqrt(pooledVar);
  }

  const cohensD = pooledStd !== 0 ? Math.abs(change) / pooledStd : 0;

  let significance: 'significant' | 'marginal' | 'negligible';
  if (cohensD >= 0.8) {
    significance = 'significant';
  } else if (cohensD >= 0.3) {
    significance = 'marginal';
  } else {
    significance = 'negligible';
  }

  return {
    currentAvg,
    previousAvg,
    change,
    changePercent,
    direction,
    significance,
  };
}

// =============================================================================
// 12. Melhor dia/horario para postar
// =============================================================================

/**
 * Analisa o historico de posts para identificar o melhor e pior dia da semana
 * para publicacao, baseado no engajamento medio.
 *
 * Agrupa posts por dia da semana (baseado no campo date ISO) e calcula
 * a media de engajamento para cada dia. Retorna ranking completo e
 * destaque para melhor e pior dias.
 *
 * @param posts - Array de posts com data ISO e valor de engajamento
 * @returns Melhor dia, pior dia e breakdown completo por dia da semana
 */
export function bestTimeToPost(
  posts: { date: string; engagement: number }[]
): {
  bestDay: string;
  bestDayAvg: number;
  worstDay: string;
  dayBreakdown: { day: string; avgEngagement: number; count: number }[];
} {
  if (posts.length === 0) {
    return {
      bestDay: '-',
      bestDayAvg: 0,
      worstDay: '-',
      dayBreakdown: [],
    };
  }

  // Agrupar por dia da semana
  const buckets: Map<number, number[]> = new Map();

  for (const post of posts) {
    try {
      const d = new Date(post.date);
      if (isNaN(d.getTime())) continue;
      const dayIndex = d.getDay(); // 0=Domingo ... 6=Sabado
      if (!buckets.has(dayIndex)) {
        buckets.set(dayIndex, []);
      }
      buckets.get(dayIndex)!.push(post.engagement);
    } catch {
      continue;
    }
  }

  if (buckets.size === 0) {
    return {
      bestDay: '-',
      bestDayAvg: 0,
      worstDay: '-',
      dayBreakdown: [],
    };
  }

  const breakdown: { day: string; avgEngagement: number; count: number; dayIndex: number }[] = [];

  for (const [dayIndex, engagements] of buckets) {
    breakdown.push({
      day: DIAS_SEMANA[dayIndex],
      avgEngagement: mean(engagements),
      count: engagements.length,
      dayIndex,
    });
  }

  // Ordenar por dia da semana para consistencia
  breakdown.sort((a, b) => a.dayIndex - b.dayIndex);

  // Encontrar melhor e pior
  let best = breakdown[0];
  let worst = breakdown[0];

  for (const item of breakdown) {
    if (item.avgEngagement > best.avgEngagement) best = item;
    if (item.avgEngagement < worst.avgEngagement) worst = item;
  }

  return {
    bestDay: best.day,
    bestDayAvg: best.avgEngagement,
    worstDay: worst.day,
    dayBreakdown: breakdown.map(({ day, avgEngagement, count }) => ({
      day,
      avgEngagement,
      count,
    })),
  };
}

// =============================================================================
// 13. Score de engajamento para dados Apify (sem saves/shares)
// =============================================================================

/**
 * Score composto de engajamento adaptado para dados publicos (Apify).
 * Sem saves/shares, redistribui pesos: Comments 45%, Likes 30%, Views 25%.
 * Usa log transform + sigmoid identico ao engagementScore original.
 */
export function apifyEngagementScore(post: {
  likes: number;
  comments: number;
  views?: number;
}): number {
  const likes = Math.max(0, post.likes || 0);
  const comments = Math.max(0, post.comments || 0);
  const views = Math.max(0, post.views || 0);

  const logLikes = Math.log1p(likes);
  const logComments = Math.log1p(comments);
  const logViews = Math.log1p(views) * 0.1;

  const weighted =
    logLikes * 0.30 +
    logComments * 0.45 +
    logViews * 0.25;

  // Sigmoid com midpoint ajustado para dados sem saves/shares
  const k = 0.6;
  const score = 100 / (1 + Math.exp(-k * (weighted - 3)));

  return Math.round(clamp(score, 0, 100) * 100) / 100;
}

// =============================================================================
// 14. Eficiencia de hashtags
// =============================================================================

/**
 * Agrupa posts por hashtags e calcula o engajamento medio por hashtag.
 * Retorna array ordenado por avgEngagement (maior primeiro).
 */
export function hashtagEfficiency(
  posts: { hashtags: string[]; likesCount: number; commentsCount: number }[]
): { hashtag: string; avgEngagement: number; count: number }[] {
  const map = new Map<string, number[]>();

  for (const post of posts) {
    const eng = post.likesCount + post.commentsCount;
    for (const tag of post.hashtags ?? []) {
      const normalized = tag.toLowerCase().replace(/^#/, '');
      if (!normalized) continue;
      if (!map.has(normalized)) map.set(normalized, []);
      map.get(normalized)!.push(eng);
    }
  }

  const results: { hashtag: string; avgEngagement: number; count: number }[] = [];
  for (const [hashtag, engagements] of map) {
    if (engagements.length < 2) continue; // Precisa de pelo menos 2 posts
    results.push({
      hashtag,
      avgEngagement: Math.round(mean(engagements)),
      count: engagements.length,
    });
  }

  return results.sort((a, b) => b.avgEngagement - a.avgEngagement);
}

// =============================================================================
// 15. Analise de Legenda por Segmento (substitui correlacao de Pearson)
// =============================================================================

/**
 * Analisa o engajamento medio por segmento de tamanho de legenda.
 * Substituiu captionLengthCorrelation porque Pearson assume relacao linear,
 * mas legendas de Instagram nao tem relacao linear com engajamento.
 * Segmentos permitem identificar qual FAIXA funciona melhor.
 */
export function captionSegmentAnalysis(
  posts: { caption: string; engagement: number }[]
): {
  segments: { label: string; range: string; avgEngagement: number; count: number; pctOfTotal: number }[];
  bestSegment: string;
  insight: string;
} {
  const SEGMENTS = [
    { label: 'Sem legenda', min: 0, max: 0, range: '0 chars' },
    { label: 'Ultra-curta', min: 1, max: 50, range: '1-50 chars' },
    { label: 'Curta', min: 51, max: 150, range: '51-150 chars' },
    { label: 'Média', min: 151, max: 500, range: '151-500 chars' },
    { label: 'Longa', min: 501, max: 1000, range: '501-1000 chars' },
    { label: 'Muito longa', min: 1001, max: Infinity, range: '1000+ chars' },
  ];

  if (posts.length < 3) {
    return { segments: [], bestSegment: '-', insight: 'Dados insuficientes para analise de legenda.' };
  }

  const segments = SEGMENTS.map(seg => {
    const matching = posts.filter(p => {
      const len = (p.caption ?? '').length;
      return len >= seg.min && len <= seg.max;
    });
    return {
      label: seg.label,
      range: seg.range,
      avgEngagement: matching.length > 0 ? Math.round(mean(matching.map(p => p.engagement))) : 0,
      count: matching.length,
      pctOfTotal: Math.round((matching.length / posts.length) * 100),
    };
  }).filter(s => s.count > 0);

  const best = segments.length > 0
    ? segments.reduce((a, b) => (b.avgEngagement > a.avgEngagement && b.count >= 2) ? b : a, segments[0])
    : null;

  const bestSegment = best?.label ?? '-';

  let insight: string;
  if (!best) {
    insight = 'Sem dados suficientes para recomendacao.';
  } else if (best.label === 'Sem legenda') {
    insight = 'Posts sem legenda performam melhor. O visual fala por si.';
  } else if (best.label === 'Ultra-curta') {
    insight = 'Micro-copy (emojis, CTAs curtos) gera mais engajamento. Menos e mais.';
  } else if (best.label === 'Curta') {
    insight = 'CTAs diretos e curtos (51-150 chars) funcionam melhor para esta conta.';
  } else if (best.label === 'Média') {
    insight = 'Storytelling curto (151-500 chars) e o sweet spot desta conta.';
  } else if (best.label === 'Longa') {
    insight = 'Storytelling completo (501-1000 chars) engaja mais. O publico le legendas longas.';
  } else {
    insight = 'Legendas estilo blog-post (1000+ chars) performam melhor. Conteudo educativo/profundo ressoa.';
  }

  return { segments, bestSegment, insight };
}

// =============================================================================
// 16. Indice de consistencia de publicacao
// =============================================================================

/**
 * Calcula o indice de consistencia de publicacao combinando:
 * 1. Frequencia (posts por semana) — quem posta mais e mais ativo
 * 2. Regularidade (CV dos intervalos) — quem posta em ritmo constante e mais regular
 *
 * Score final (0-100): 60% frequencia + 40% regularidade.
 * Isso evita que alguem que posta 5x/semana apareca como "irregular"
 * so porque os intervalos variam um pouco.
 */
export function postingConsistencyIndex(
  posts: { timestamp: string }[],
  options?: {
    /**
     * Meta de posts por semana para calcular freqScore.
     * US-52: configurável por nicho — B2B=1, geral=3, entretenimento=7.
     * Default: 3 (meta equilibrada para a maioria das contas).
     * Antes hardcoded: postsPerWeek * 20 (equivalente a target=5).
     */
    targetPostsPerWeek?: number;
  }
): {
  cv: number;
  avgIntervalDays: number;
  postsPerWeek: number;
  score: number;
  classification: 'muito consistente' | 'consistente' | 'irregular' | 'muito irregular';
} {
  const timestamps = posts
    .map(p => new Date(p.timestamp).getTime())
    .filter(t => !isNaN(t))
    .sort((a, b) => a - b);

  if (timestamps.length < 3) {
    return { cv: 0, avgIntervalDays: 0, postsPerWeek: 0, score: 0, classification: 'irregular' };
  }

  // Intervalos entre posts consecutivos (em dias)
  const intervals: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    intervals.push((timestamps[i] - timestamps[i - 1]) / (1000 * 60 * 60 * 24));
  }

  const stats = descriptiveStats(intervals);
  const spanDays = Math.max((timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60 * 24), 1);
  const postsPerWeek = (timestamps.length / spanDays) * 7;

  // US-52: freqScore configurável por targetPostsPerWeek.
  // (postsPerWeek / target) * 100 — atingir a meta = 100 pontos.
  // Antes hardcoded: postsPerWeek * 20 → implicava target=5 (5*20=100).
  const target = Math.max(1, options?.targetPostsPerWeek ?? 3);
  const freqScore = clamp((postsPerWeek / target) * 100, 0, 100);

  // Score de regularidade (0-100): CV 0 = 100pts (perfeito), CV 1+ = 0pts
  const regScore = clamp((1 - stats.cv) * 100, 0, 100);

  // Score combinado: 60% frequencia + 40% regularidade
  const combinedScore = Math.round(freqScore * 0.6 + regScore * 0.4);

  let classification: 'muito consistente' | 'consistente' | 'irregular' | 'muito irregular';
  if (combinedScore >= 70) classification = 'muito consistente';
  else if (combinedScore >= 45) classification = 'consistente';
  else if (combinedScore >= 25) classification = 'irregular';
  else classification = 'muito irregular';

  return {
    cv: Math.round(stats.cv * 100) / 100,
    avgIntervalDays: Math.round(stats.mean * 10) / 10,
    postsPerWeek: Math.round(postsPerWeek * 10) / 10,
    score: combinedScore,
    classification,
  };
}

// =============================================================================
// 17. Z-Score por post
// =============================================================================

/**
 * Calcula o Z-Score de cada valor em relacao ao dataset.
 * Z-Score = (valor - media) / desvio_padrao.
 * Permite identificar quao "fora do normal" cada post esta.
 */
export function zScores(values: number[]): number[] {
  if (values.length < 2) return values.map(() => 0);
  const stats = descriptiveStats(values);
  if (stats.stdDev === 0) return values.map(() => 0);
  return values.map(v => Math.round(((v - stats.mean) / stats.stdDev) * 100) / 100);
}

// =============================================================================
// 18. Analise de Pareto (80/20)
// =============================================================================

/**
 * Identifica quais posts geram a maior parte do engajamento total.
 * Retorna a % de posts que geram 80% do engajamento e quais sao.
 */
export function paretoAnalysis(
  posts: { id: string; engagement: number }[]
): {
  percentOfPosts: number;
  topPostIds: string[];
  topPostsEngagement: number;
  totalEngagement: number;
  ratio: string;
} {
  if (posts.length === 0) {
    return { percentOfPosts: 0, topPostIds: [], topPostsEngagement: 0, totalEngagement: 0, ratio: '0/0' };
  }

  const total = sum(posts.map(p => p.engagement));
  if (total === 0) {
    return { percentOfPosts: 0, topPostIds: [], topPostsEngagement: 0, totalEngagement: 0, ratio: '0/0' };
  }

  const sortedPosts = [...posts].sort((a, b) => b.engagement - a.engagement);
  const threshold = total * 0.8;

  let accumulated = 0;
  const topPostIds: string[] = [];

  for (const post of sortedPosts) {
    accumulated += post.engagement;
    topPostIds.push(post.id);
    if (accumulated >= threshold) break;
  }

  const percentOfPosts = Math.round((topPostIds.length / posts.length) * 100);

  return {
    percentOfPosts,
    topPostIds,
    topPostsEngagement: Math.round(accumulated),
    totalEngagement: Math.round(total),
    ratio: `${topPostIds.length}/${posts.length}`,
  };
}

// =============================================================================
// 19. Content Velocity Score
// =============================================================================

/**
 * Mede o "momentum" de uma conta: frequencia de posting * engajamento medio.
 * Score normalizado 0-100 via sigmoid.
 */
export function contentVelocityScore(
  posts: { timestamp: string; engagement: number }[]
): {
  score: number;
  postsPerWeek: number;
  avgEngagement: number;
  classification: 'alto momentum' | 'momentum moderado' | 'baixo momentum' | 'inativo';
} {
  if (posts.length < 2) {
    return { score: 0, postsPerWeek: 0, avgEngagement: 0, classification: 'inativo' };
  }

  const timestamps = posts
    .map(p => new Date(p.timestamp).getTime())
    .filter(t => !isNaN(t))
    .sort((a, b) => a - b);

  if (timestamps.length < 2) {
    return { score: 0, postsPerWeek: 0, avgEngagement: 0, classification: 'inativo' };
  }

  const spanDays = Math.max((timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60 * 24), 1);
  const postsPerWeek = (timestamps.length / spanDays) * 7;
  const avgEngagement = mean(posts.map(p => p.engagement));

  // Velocity = posts/semana * avg engagement (log scale)
  const rawVelocity = postsPerWeek * Math.log1p(avgEngagement);
  // Sigmoid normalizado: midpoint ~15 (3 posts/semana * log(150) ~= 15)
  const score = Math.round(100 / (1 + Math.exp(-0.3 * (rawVelocity - 15))));

  let classification: 'alto momentum' | 'momentum moderado' | 'baixo momentum' | 'inativo';
  if (score >= 70) classification = 'alto momentum';
  else if (score >= 40) classification = 'momentum moderado';
  else if (score >= 15) classification = 'baixo momentum';
  else classification = 'inativo';

  return {
    score: clamp(score, 0, 100),
    postsPerWeek: Math.round(postsPerWeek * 10) / 10,
    avgEngagement: Math.round(avgEngagement),
    classification,
  };
}

// =============================================================================
// 20. Peak Engagement Window (por hora)
// =============================================================================

/**
 * Identifica a janela de 2h com maior engajamento medio.
 * Mais granular que bestTimeToPost (por dia).
 */
export function peakEngagementWindow(
  posts: { date: string; engagement: number }[]
): {
  peakHourStart: number;
  peakHourEnd: number;
  peakAvgEngagement: number;
  hourBreakdown: { hour: number; avgEngagement: number; count: number }[];
} {
  if (posts.length === 0) {
    return { peakHourStart: 0, peakHourEnd: 0, peakAvgEngagement: 0, hourBreakdown: [] };
  }

  const buckets: Map<number, number[]> = new Map();

  for (const post of posts) {
    try {
      const d = new Date(post.date);
      if (isNaN(d.getTime())) continue;
      const hour = d.getHours();
      if (!buckets.has(hour)) buckets.set(hour, []);
      buckets.get(hour)!.push(post.engagement);
    } catch {
      continue;
    }
  }

  if (buckets.size === 0) {
    return { peakHourStart: 0, peakHourEnd: 0, peakAvgEngagement: 0, hourBreakdown: [] };
  }

  // Breakdown por hora
  const hourBreakdown: { hour: number; avgEngagement: number; count: number }[] = [];
  for (let h = 0; h < 24; h++) {
    const engagements = buckets.get(h);
    if (engagements && engagements.length > 0) {
      hourBreakdown.push({ hour: h, avgEngagement: Math.round(mean(engagements)), count: engagements.length });
    }
  }

  // Janela de 2h com maior media (sliding window circular)
  let bestStart = 0;
  let bestAvg = 0;

  for (let start = 0; start < 24; start++) {
    const end = (start + 1) % 24;
    const h1 = buckets.get(start) ?? [];
    const h2 = buckets.get(end) ?? [];
    const combined = [...h1, ...h2];
    if (combined.length === 0) continue;
    const avg = mean(combined);
    if (avg > bestAvg) {
      bestAvg = avg;
      bestStart = start;
    }
  }

  return {
    peakHourStart: bestStart,
    peakHourEnd: (bestStart + 2) % 24,
    peakAvgEngagement: Math.round(bestAvg),
    hourBreakdown,
  };
}

// =============================================================================
// 21. Reciprocity Index
// =============================================================================

/**
 * Mede o indice de reciprocidade: quantos comentarios a marca respondeu
 * vs total de comentarios recebidos. Gatilho psicologico de reciprocidade (Cialdini).
 */
export function reciprocityIndex(
  posts: { ownerUsername: string; latestComments: { ownerUsername: string }[] }[]
): {
  repliesCount: number;
  totalComments: number;
  ratio: number;
  classification: 'excelente' | 'bom' | 'pode melhorar' | 'fraco';
} {
  let repliesCount = 0;
  let totalComments = 0;

  for (const post of posts) {
    for (const comment of post.latestComments ?? []) {
      if (comment.ownerUsername === post.ownerUsername) {
        repliesCount++;
      } else {
        totalComments++;
      }
    }
  }

  const ratio = totalComments > 0 ? Math.round((repliesCount / totalComments) * 10000) / 100 : 0;

  let classification: 'excelente' | 'bom' | 'pode melhorar' | 'fraco';
  if (ratio >= 50) classification = 'excelente';
  else if (ratio >= 30) classification = 'bom';
  else if (ratio >= 10) classification = 'pode melhorar';
  else classification = 'fraco';

  return { repliesCount, totalComments, ratio, classification };
}

// =============================================================================
// 22. Social Proof Score (Cialdini)
// =============================================================================

/**
 * Mede acoes de validacao social (shares+saves) vs acoes de baixo compromisso (likes+comments).
 * Alto score = conteudo que pessoas compartilham para se associar a marca.
 */
export function socialProofScore(
  posts: { likes: number; comments: number; saves?: number; shares?: number }[]
): {
  score: number;
  highProofPosts: number;
  totalPosts: number;
  classification: 'alto proof' | 'moderado' | 'baixo proof';
} {
  if (posts.length === 0) {
    return { score: 0, highProofPosts: 0, totalPosts: 0, classification: 'baixo proof' };
  }

  let totalProof = 0;
  let totalBase = 0;
  let highProofPosts = 0;

  for (const post of posts) {
    const proof = (post.saves ?? 0) + (post.shares ?? 0);
    const base = post.likes + post.comments;
    totalProof += proof;
    totalBase += base;
    if (base > 0 && (proof / base) > 0.1) highProofPosts++;
  }

  const ratio = totalBase > 0 ? (totalProof / totalBase) * 100 : 0;
  // Normalizar para 0-100 (ratio de 20%+ = score 100)
  const score = Math.round(clamp(ratio * 5, 0, 100));

  let classification: 'alto proof' | 'moderado' | 'baixo proof';
  if (score >= 60) classification = 'alto proof';
  else if (score >= 30) classification = 'moderado';
  else classification = 'baixo proof';

  return { score, highProofPosts, totalPosts: posts.length, classification };
}

// =============================================================================
// 23. [REMOVIDO] conversionProxyScore — pesos arbitrarios sem validacao
// =============================================================================

// =============================================================================
// 24. Brand Equity Score (Lindstrom)
// =============================================================================

/**
 * Mede a forca da marca comparando engajamento de posts SEM hashtags vs COM hashtags.
 * Ratio > 1.0 = marca forte (engajam pelo conteudo, nao pela descoberta).
 * Ratio < 0.5 = dependente de hashtags.
 */
export function brandEquityScore(
  posts: { hashtags: string[]; engagement: number }[]
): {
  score: number;
  ratio: number;
  withHashtags: { count: number; avgEngagement: number };
  withoutHashtags: { count: number; avgEngagement: number };
  classification: 'marca forte' | 'marca em construcao' | 'dependente de hashtags';
} {
  const withHashtags = posts.filter(p => p.hashtags.length > 0);
  const withoutHashtags = posts.filter(p => p.hashtags.length === 0);

  const avgWith = withHashtags.length > 0 ? mean(withHashtags.map(p => p.engagement)) : 0;
  const avgWithout = withoutHashtags.length > 0 ? mean(withoutHashtags.map(p => p.engagement)) : 0;

  const ratio = avgWith > 0 ? avgWithout / avgWith : 0;

  // Score 0-100: ratio 0 = 0, ratio 1 = 50, ratio 2+ = 100
  const score = Math.round(clamp(ratio * 50, 0, 100));

  let classification: 'marca forte' | 'marca em construcao' | 'dependente de hashtags';
  if (ratio >= 1.0) classification = 'marca forte';
  else if (ratio >= 0.5) classification = 'marca em construcao';
  else classification = 'dependente de hashtags';

  return {
    score,
    ratio: Math.round(ratio * 100) / 100,
    withHashtags: { count: withHashtags.length, avgEngagement: Math.round(avgWith) },
    withoutHashtags: { count: withoutHashtags.length, avgEngagement: Math.round(avgWithout) },
    classification,
  };
}

// =============================================================================
// 25. Content Mix Score
// =============================================================================

/**
 * Avalia se a distribuicao de tipos de conteudo esta otimizada.
 * Compara a distribuicao atual com a distribuicao ideal baseada no engajamento medio por tipo.
 */
export function contentMixScore(
  posts: { type: string; engagement: number }[]
): {
  score: number;
  currentMix: { type: string; pct: number; avgEngagement: number }[];
  bestType: string;
  recommendation: string;
} {
  if (posts.length === 0) {
    return { score: 0, currentMix: [], bestType: '-', recommendation: 'Sem dados para analise.' };
  }

  const typeMap = new Map<string, { count: number; engagements: number[] }>();
  for (const post of posts) {
    const t = post.type || 'Unknown';
    if (!typeMap.has(t)) typeMap.set(t, { count: 0, engagements: [] });
    const entry = typeMap.get(t)!;
    entry.count++;
    entry.engagements.push(post.engagement);
  }

  const currentMix: { type: string; pct: number; avgEngagement: number }[] = [];
  let bestType = '';
  let bestAvg = 0;

  for (const [type, data] of typeMap) {
    const avg = mean(data.engagements);
    currentMix.push({
      type,
      pct: Math.round((data.count / posts.length) * 100),
      avgEngagement: Math.round(avg),
    });
    if (avg > bestAvg) {
      bestAvg = avg;
      bestType = type;
    }
  }

  currentMix.sort((a, b) => b.avgEngagement - a.avgEngagement);

  // Score: quao alinhada a distribuicao atual esta com a distribuicao "ideal" (mais do tipo que performa melhor)
  const bestTypePct = currentMix.find(m => m.type === bestType)?.pct ?? 0;
  const score = Math.round(clamp(bestTypePct * 1.5, 0, 100));

  const recommendation = bestType
    ? `O tipo "${bestType}" tem o maior engajamento medio (${Math.round(bestAvg)}). Considere aumentar sua frequencia (atualmente ${bestTypePct}% dos posts).`
    : 'Sem dados suficientes para recomendacao.';

  return { score, currentMix, bestType, recommendation };
}

// =============================================================================
// 26. Hook Quality Score (Schwartz — Awareness)
// =============================================================================

/**
 * Avalia a qualidade do "hook" (primeiros 50 chars da legenda) vs engajamento.
 * Hooks bons capturam atencao imediata. Agrupa por tipo de abertura e compara.
 */
export function hookQualityScore(
  posts: { caption: string; engagement: number }[]
): {
  score: number;
  hookTypes: { type: string; avgEngagement: number; count: number }[];
  bestHookType: string;
  insight: string;
} {
  if (posts.length < 3) {
    return { score: 0, hookTypes: [], bestHookType: '-', insight: 'Dados insuficientes.' };
  }

  const typeMap = new Map<string, number[]>();

  for (const post of posts) {
    const hook = (post.caption ?? '').slice(0, 50).trim();
    let hookType: string;

    if (!hook) hookType = 'sem legenda';
    else if (/^[A-Z\s]{5,}/.test(hook)) hookType = 'CAPS (urgência)';
    else if (/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(hook)) hookType = 'emoji lead';
    else if (/\?/.test(hook)) hookType = 'pergunta';
    else if (/^[\d]|^\d/.test(hook)) hookType = 'número/lista';
    else if (/!/.test(hook)) hookType = 'exclamação';
    else hookType = 'narrativo';

    if (!typeMap.has(hookType)) typeMap.set(hookType, []);
    typeMap.get(hookType)!.push(post.engagement);
  }

  const hookTypes: { type: string; avgEngagement: number; count: number }[] = [];
  let bestType = '';
  let bestAvg = 0;

  for (const [type, engagements] of typeMap) {
    const avg = mean(engagements);
    hookTypes.push({ type, avgEngagement: Math.round(avg), count: engagements.length });
    if (avg > bestAvg && engagements.length >= 2) {
      bestAvg = avg;
      bestType = type;
    }
  }

  hookTypes.sort((a, b) => b.avgEngagement - a.avgEngagement);

  const overallAvg = mean(posts.map(p => p.engagement));
  const score = overallAvg > 0 ? Math.round(clamp((bestAvg / overallAvg) * 50, 0, 100)) : 0;

  const insight = bestType
    ? `Hooks do tipo "${bestType}" tem ${Math.round(bestAvg)} eng medio vs ${Math.round(overallAvg)} geral.`
    : 'Sem dados suficientes.';

  return { score, hookTypes, bestHookType: bestType || '-', insight };
}

// =============================================================================
// 27. Investment Depth Score (Nir Eyal — Hook Model)
// =============================================================================

/**
 * Mede a "profundidade de investimento" do publico: ratio de comentarios longos
 * (>5 palavras) vs curtos. Comentarios longos = audiencia investida no conteudo.
 */
export function investmentDepthScore(
  posts: { latestComments: { text: string; ownerUsername: string }[]; ownerUsername: string }[]
): {
  score: number;
  longComments: number;
  shortComments: number;
  ratio: number;
  avgWords: number;
  classification: 'alto investimento' | 'moderado' | 'baixo investimento';
} {
  let longComments = 0;
  let shortComments = 0;
  let totalWords = 0;
  let totalComments = 0;

  for (const post of posts) {
    for (const comment of post.latestComments ?? []) {
      if (comment.ownerUsername === post.ownerUsername) continue;
      const words = (comment.text ?? '').split(/\s+/).filter(w => w.length > 0).length;
      totalWords += words;
      totalComments++;
      if (words > 5) longComments++;
      else shortComments++;
    }
  }

  const ratio = totalComments > 0 ? Math.round((longComments / totalComments) * 100) : 0;
  const avgWords = totalComments > 0 ? Math.round((totalWords / totalComments) * 10) / 10 : 0;
  const score = Math.round(clamp(ratio * 1.5, 0, 100));

  let classification: 'alto investimento' | 'moderado' | 'baixo investimento';
  if (ratio >= 40) classification = 'alto investimento';
  else if (ratio >= 20) classification = 'moderado';
  else classification = 'baixo investimento';

  return { score, longComments, shortComments, ratio, avgWords, classification };
}

// =============================================================================
// 28. Content ROI Score (Hormozi — Equacao de Valor)
// =============================================================================

/**
 * Estima o ROI de conteudo: engajamento gerado vs esforco estimado de producao.
 * Esforco: Image=1, Carousel/Sidecar=2, Video=3.
 * ROI alto = muito engajamento com pouco esforco.
 */
export function contentROIScore(
  posts: { type: string; engagement: number }[]
): {
  score: number;
  avgROI: number;
  bestROIType: string;
  typeROI: { type: string; avgROI: number; count: number }[];
} {
  if (posts.length === 0) {
    return { score: 0, avgROI: 0, bestROIType: '-', typeROI: [] };
  }

  const effortMap: Record<string, number> = { Image: 1, Sidecar: 2, Video: 3 };
  const typeMap = new Map<string, number[]>();
  let totalROI = 0;

  for (const post of posts) {
    const effort = effortMap[post.type] ?? 2;
    const roi = post.engagement / effort;
    totalROI += roi;
    const t = post.type || 'Unknown';
    if (!typeMap.has(t)) typeMap.set(t, []);
    typeMap.get(t)!.push(roi);
  }

  const avgROI = Math.round(totalROI / posts.length);
  const typeROI: { type: string; avgROI: number; count: number }[] = [];
  let bestROIType = '';
  let bestAvg = 0;

  for (const [type, rois] of typeMap) {
    const avg = mean(rois);
    typeROI.push({ type, avgROI: Math.round(avg), count: rois.length });
    if (avg > bestAvg) { bestAvg = avg; bestROIType = type; }
  }

  typeROI.sort((a, b) => b.avgROI - a.avgROI);
  const score = Math.round(clamp(Math.log1p(avgROI) * 15, 0, 100));

  return { score, avgROI, bestROIType: bestROIType || '-', typeROI };
}

// =============================================================================
// 29. Content Identity Score (Lindstrom — SMASH)
// =============================================================================

/**
 * Mede a consistencia da identidade de conteudo via CV do content mix.
 * Baixo CV = publicacao equilibrada entre tipos = identidade forte.
 * Alto CV = conteudo erratico = identidade fraca.
 */
export function contentIdentityScore(
  posts: { type: string }[]
): {
  score: number;
  typeDistribution: { type: string; count: number; pct: number }[];
  classification: 'identidade forte' | 'identidade moderada' | 'identidade fraca';
} {
  if (posts.length < 5) {
    return { score: 0, typeDistribution: [], classification: 'identidade fraca' };
  }

  const typeMap = new Map<string, number>();
  for (const post of posts) {
    const t = post.type || 'Unknown';
    typeMap.set(t, (typeMap.get(t) ?? 0) + 1);
  }

  const counts = Array.from(typeMap.values());
  const stats = descriptiveStats(counts);

  // CV baixo = boa distribuicao. Invertemos para score
  const score = Math.round(clamp((1 - Math.min(stats.cv, 1.5) / 1.5) * 100, 0, 100));

  const typeDistribution = Array.from(typeMap.entries()).map(([type, count]) => ({
    type,
    count,
    pct: Math.round((count / posts.length) * 100),
  })).sort((a, b) => b.count - a.count);

  let classification: 'identidade forte' | 'identidade moderada' | 'identidade fraca';
  if (score >= 60) classification = 'identidade forte';
  else if (score >= 35) classification = 'identidade moderada';
  else classification = 'identidade fraca';

  return { score, typeDistribution, classification };
}

// =============================================================================
// 30. Variable Reward Score (Nir Eyal — Hook Model)
// =============================================================================

/**
 * Mede a variabilidade do engajamento. Audiencias que voltam por "recompensa variavel"
 * tem CV moderado (0.3-0.7). Muito baixo = previsivel/chato. Muito alto = inconsistente.
 */
export function variableRewardScore(values: number[]): {
  score: number;
  cv: number;
  classification: 'recompensa variavel ideal' | 'previsivel' | 'inconsistente';
} {
  if (values.length < 5) {
    return { score: 0, cv: 0, classification: 'previsivel' };
  }

  const stats = descriptiveStats(values);
  const cv = stats.cv;

  // Sweet spot: CV entre 0.3 e 0.7 (alguma variacao, mas nao caos)
  let score: number;
  if (cv >= 0.3 && cv <= 0.7) {
    score = Math.round(80 + (1 - Math.abs(cv - 0.5) / 0.2) * 20);
  } else if (cv < 0.3) {
    score = Math.round(cv / 0.3 * 60);
  } else {
    score = Math.round(Math.max(0, 80 - (cv - 0.7) * 100));
  }

  score = clamp(score, 0, 100);

  let classification: 'recompensa variavel ideal' | 'previsivel' | 'inconsistente';
  if (cv >= 0.3 && cv <= 0.7) classification = 'recompensa variavel ideal';
  else if (cv < 0.3) classification = 'previsivel';
  else classification = 'inconsistente';

  return { score: Math.round(score), cv: Math.round(cv * 100) / 100, classification };
}

// =============================================================================
// 31. Persuasion Trigger Count (Cialdini — 6 Principios)
// =============================================================================

/**
 * Conta TODOS os gatilhos de persuasao no caption: urgencia, autoridade,
 * escassez, prova social textual. Soma de todos os triggers detectados.
 */
export function persuasionTriggerCount(caption: string): {
  total: number;
  urgency: number;
  authority: number;
  scarcity: number;
  hasPersuasion: boolean;
} {
  if (!caption) return { total: 0, urgency: 0, authority: 0, scarcity: 0, hasPersuasion: false };

  const urgencyMatches = caption.match(/\b([úu]ltimas? vagas?|s[oó] hoje|limitado|acaba|esgotando|[úu]ltimas? unidades?|desconto|promo[çc][ãa]o|por tempo limitado|corre|aproveite?|n[ãa]o perca|imperd[ií]vel|exclusiv[oa])\b/gi);
  const authorityMatches = caption.match(/\b(\d+\s*%|\d+\s*anos?|estudo|pesquisa|ci[eê]ncia|cient[ií]fico|comprovad[oa]|certificad[oa]|especialista|expert|profissional|refer[eê]ncia|pr[eê]mio|reconhecid[oa])\b/gi);
  const scarcityMatches = caption.match(/\b(vagas? limitadas?|[úu]ltim[oa]s?|acabando|esgot|rest[ao]m? pouc[oa]s?|somente \d+|apenas \d+)\b/gi);

  const urgency = urgencyMatches?.length ?? 0;
  const authority = authorityMatches?.length ?? 0;
  const scarcity = scarcityMatches?.length ?? 0;
  const total = urgency + authority + scarcity;

  return { total, urgency, authority, scarcity, hasPersuasion: total > 0 };
}

// =============================================================================
// 32. Temporal Period Comparison (melhoria do periodComparison)
// =============================================================================

/**
 * Comparacao temporal inteligente: usa posts dos ultimos 30 dias vs 30 dias anteriores.
 * Se nao tiver 30 dias de dados, fallback para split 50/50.
 * Retorna Cohen's d + taxa de crescimento.
 */
export function temporalPeriodComparison(
  posts: { timestamp: string; engagement: number }[]
): {
  recentAvg: number;
  previousAvg: number;
  changePercent: number;
  cohensD: number;
  direction: 'up' | 'down' | 'stable';
  significance: 'significant' | 'marginal' | 'negligible';
  method: '30d' | '14d' | 'split';
} {
  if (posts.length < 4) {
    return { recentAvg: 0, previousAvg: 0, changePercent: 0, cohensD: 0, direction: 'stable', significance: 'negligible', method: 'split' };
  }

  const sortedPosts = [...posts].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const now = new Date(sortedPosts[sortedPosts.length - 1].timestamp).getTime();
  const DAY = 86400000;

  // Tentar split 30d vs 30d
  let recent = sortedPosts.filter(p => now - new Date(p.timestamp).getTime() <= 30 * DAY);
  let previous = sortedPosts.filter(p => {
    const t = now - new Date(p.timestamp).getTime();
    return t > 30 * DAY && t <= 60 * DAY;
  });
  let method: '30d' | '14d' | 'split' = '30d';

  // Fallback 14d se nao tiver dados suficientes
  if (recent.length < 3 || previous.length < 3) {
    recent = sortedPosts.filter(p => now - new Date(p.timestamp).getTime() <= 14 * DAY);
    previous = sortedPosts.filter(p => {
      const t = now - new Date(p.timestamp).getTime();
      return t > 14 * DAY && t <= 28 * DAY;
    });
    method = '14d';
  }

  // Fallback split 50/50
  if (recent.length < 3 || previous.length < 3) {
    const mid = Math.floor(sortedPosts.length / 2);
    previous = sortedPosts.slice(0, mid);
    recent = sortedPosts.slice(mid);
    method = 'split';
  }

  const recentValues = recent.map(p => p.engagement);
  const previousValues = previous.map(p => p.engagement);

  const comp = periodComparison(recentValues, previousValues);

  // Calculate Cohen's d manually (periodComparison uses it internally but doesn't return it)
  const recentStats = descriptiveStats(recentValues);
  const prevStats = descriptiveStats(previousValues);
  const nR = recentValues.length;
  const nP = previousValues.length;
  let pooledStd = 0;
  if (nR + nP >= 2) {
    const pooledVar = ((nR > 0 ? recentStats.stdDev ** 2 * nR : 0) + (nP > 0 ? prevStats.stdDev ** 2 * nP : 0)) / (nR + nP);
    pooledStd = Math.sqrt(pooledVar);
  }
  const cohensD = pooledStd !== 0 ? Math.abs(recentStats.mean - prevStats.mean) / pooledStd : 0;

  return {
    recentAvg: Math.round(comp.currentAvg),
    previousAvg: Math.round(comp.previousAvg),
    changePercent: Math.round(comp.changePercent),
    cohensD: Math.round(cohensD * 100) / 100,
    direction: comp.direction,
    significance: comp.significance,
    method,
  };
}

// =============================================================================
// 33. Post Sentiment Ranking (sentimento por post)
// =============================================================================

/**
 * Rankeia posts por nivel de sentimento, interesse e interesse ativo nos comentarios.
 * - Sentimental: posts que despertaram mais emocao (positiva ou negativa)
 * - Interesse: posts com mais comentarios relativos ao total
 * - Interesse ativo: posts com comentarios longos (investimento real)
 */
export function postSentimentRanking(
  posts: {
    id: string;
    caption?: string;
    likesCount: number;
    commentsCount: number;
    latestComments?: { text: string; ownerUsername: string }[];
    ownerUsername?: string;
  }[]
): {
  mostEmotional: { id: string; score: number; positiveWords: number; negativeWords: number }[];
  mostInterest: { id: string; commentRate: number; commentsCount: number }[];
  mostActiveInterest: { id: string; longCommentRatio: number; avgWordsPerComment: number }[];
} {
  if (posts.length === 0) {
    return { mostEmotional: [], mostInterest: [], mostActiveInterest: [] };
  }

  const POSITIVE_RE = /\b(parab[ée]ns|incr[ií]vel|lind[ao]+s?|to+p|amei+|sho+w|maravilh[ao]+s?|perfeit[ao]+s?|sensacional|arras[ao]u?|demais|excelente|[óo]timo|del[ií]cia|fant[áa]stico|adoro+|amo+|espetacular|sucesso|recomendo|melhor)\b/gi;
  const NEGATIVE_RE = /\b(ruim|horr[ií]vel|p[ée]ssim[ao]|decepcionante|fraco|pior|[óo]dio|lixo|nojento)\b/gi;

  const emotional: { id: string; score: number; positiveWords: number; negativeWords: number }[] = [];
  const interest: { id: string; commentRate: number; commentsCount: number }[] = [];
  const activeInterest: { id: string; longCommentRatio: number; avgWordsPerComment: number }[] = [];

  const totalEng = sum(posts.map(p => p.likesCount + p.commentsCount));
  const avgEng = totalEng / posts.length;

  for (const post of posts) {
    const comments = (post.latestComments ?? []).filter(c => c.ownerUsername !== post.ownerUsername);
    let posWords = 0;
    let negWords = 0;
    let totalWords = 0;
    let longComments = 0;

    for (const c of comments) {
      const text = c.text ?? '';
      posWords += (text.match(POSITIVE_RE) || []).length;
      negWords += (text.match(NEGATIVE_RE) || []).length;
      const wc = text.split(/\s+/).filter(w => w.length > 0).length;
      totalWords += wc;
      if (wc > 5) longComments++;
    }

    emotional.push({ id: post.id, score: posWords + negWords, positiveWords: posWords, negativeWords: negWords });

    const commentRate = avgEng > 0 ? (post.commentsCount / avgEng) * 100 : 0;
    interest.push({ id: post.id, commentRate: Math.round(commentRate), commentsCount: post.commentsCount });

    const longRatio = comments.length > 0 ? (longComments / comments.length) * 100 : 0;
    const avgWpc = comments.length > 0 ? totalWords / comments.length : 0;
    activeInterest.push({ id: post.id, longCommentRatio: Math.round(longRatio), avgWordsPerComment: Math.round(avgWpc * 10) / 10 });
  }

  return {
    mostEmotional: emotional.sort((a, b) => b.score - a.score).slice(0, 10),
    mostInterest: interest.sort((a, b) => b.commentRate - a.commentRate).slice(0, 10),
    mostActiveInterest: activeInterest.sort((a, b) => b.longCommentRatio - a.longCommentRatio).slice(0, 10),
  };
}

// =============================================================================
// 34. Shannon Entropy — Content Mix Diversity
// =============================================================================

/**
 * Calcula a entropia de Shannon para medir diversidade de um mix de conteudo.
 *
 * Valores proximos de 0 = mix homogeneo (pouca diversidade).
 * Valores proximos de log2(n) = mix equilibrado (maxima diversidade).
 *
 * Retorna valor normalizado entre 0 e 1 (dividido por log2(n)).
 *
 * @param categories - Map de categoria para contagem (ex: { reels: 10, carousel: 5, static: 3 })
 * @returns { entropy, normalizedEntropy, maxEntropy, dominantCategory, categoryShares }
 */
export function shannonEntropy(categories: Record<string, number>): {
  entropy: number;
  normalizedEntropy: number;
  maxEntropy: number;
  dominantCategory: string;
  categoryShares: Record<string, number>;
} {
  const entries = Object.entries(categories).filter(([, count]) => count > 0);
  const k = entries.length;

  if (k === 0) {
    return { entropy: 0, normalizedEntropy: 0, maxEntropy: 0, dominantCategory: '', categoryShares: {} };
  }

  if (k === 1) {
    const [cat] = entries[0];
    return { entropy: 0, normalizedEntropy: 0, maxEntropy: 0, dominantCategory: cat, categoryShares: { [cat]: 1 } };
  }

  const total = entries.reduce((acc, [, c]) => acc + c, 0);
  const shares: Record<string, number> = {};
  let H = 0;

  for (const [cat, count] of entries) {
    const p = count / total;
    shares[cat] = Math.round(p * 10000) / 10000; // 4 decimal places
    if (p > 0) {
      H -= p * Math.log2(p);
    }
  }

  const maxH = Math.log2(k);
  const dominant = entries.reduce((best, curr) => curr[1] > best[1] ? curr : best)[0];

  return {
    entropy: Math.round(H * 10000) / 10000,
    normalizedEntropy: Math.round((H / maxH) * 10000) / 10000,
    maxEntropy: Math.round(maxH * 10000) / 10000,
    dominantCategory: dominant,
    categoryShares: shares,
  };
}

// =============================================================================
// 35. Tendência ponderada por recência — WLS (US-71)
// =============================================================================

/**
 * Regressão linear ponderada (WLS) com decaimento exponencial por recência.
 *
 * w_t = e^(-λ(T-t)) onde λ = ln(2) / halflife
 * → Pontos mais recentes têm mais peso. Ontem importa mais que 30 dias atrás.
 *
 * Retorna mesma interface de `linearTrend()` para compatibilidade.
 *
 * US-71: substitui `linearTrend()` nos KPI cards — trend mais preciso em séries
 * com shift recente (ex: campanha que piorou nos últimos 5 dias mas veio de um bom mês).
 *
 * @param values - Série temporal (índice 0 = mais antigo)
 * @param halflife - Meia-vida em dias (default 14)
 */
export function weightedRecentTrend(
  values: number[],
  halflife: number = 14
): {
  slope: number;
  direction: 'rising' | 'falling' | 'stable';
  r2: number;
  predicted: number[];
} {
  if (values.length === 0) return { slope: 0, direction: 'stable', r2: 0, predicted: [] };
  if (values.length === 1) return { slope: 0, direction: 'stable', r2: 1, predicted: [values[0]] };

  const n = values.length;
  const T = n - 1; // índice do ponto mais recente

  // λ = ln(2) / halflife — decaimento exponencial
  const lambda = Math.LN2 / Math.max(halflife, 1);

  // Pesos: w_t = e^(-λ(T-t)), normalizados para soma = 1
  const w: number[] = new Array(n);
  let wSum = 0;
  for (let t = 0; t < n; t++) {
    w[t] = Math.exp(-lambda * (T - t));
    wSum += w[t];
  }
  for (let t = 0; t < n; t++) w[t] /= wSum;

  // Médias ponderadas
  let xWMean = 0;
  let yWMean = 0;
  for (let t = 0; t < n; t++) {
    xWMean += w[t] * t;
    yWMean += w[t] * values[t];
  }

  // WLS: β = Σ(w_i(x_i - x̄_w)(y_i - ȳ_w)) / Σ(w_i(x_i - x̄_w)²)
  let ssWXY = 0;
  let ssWXX = 0;
  for (let t = 0; t < n; t++) {
    const dx = t - xWMean;
    ssWXY += w[t] * dx * (values[t] - yWMean);
    ssWXX += w[t] * dx * dx;
  }

  if (ssWXX === 0) return { slope: 0, direction: 'stable', r2: 0, predicted: values.slice() };

  const slope = ssWXY / ssWXX;
  const intercept = yWMean - slope * xWMean;

  // Predicted values
  const predicted = values.map((_, t) => intercept + slope * t);

  // R² ponderado
  let ssTot = 0;
  let ssRes = 0;
  for (let t = 0; t < n; t++) {
    ssTot += w[t] * (values[t] - yWMean) ** 2;
    ssRes += w[t] * (values[t] - predicted[t]) ** 2;
  }
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  // Classificação: stable se |slope| < 5% da média ponderada
  const threshold = Math.abs(yWMean) * 0.05;
  const direction: 'rising' | 'falling' | 'stable' =
    Math.abs(slope) < threshold ? 'stable' : slope > 0 ? 'rising' : 'falling';

  return {
    slope: Math.round(slope * 1000000) / 1000000,
    direction,
    r2: Math.round(r2 * 10000) / 10000,
    predicted: predicted.map(v => Math.round(v * 10000) / 10000),
  };
}

// =============================================================================
// 36. Viral Potential Index (US-55)
// =============================================================================

/**
 * Índice de potencial viral baseado em sinais de engajamento qualificado.
 *
 * Para campanhas de Ads, usa proxy via engagement rate (totalEngagements / impressions),
 * shares e saves quando disponíveis. A hierarquia de valor segue estudos de viralidade:
 *   shares(45%) > saves(35%) > comments qualificados(20%)
 *
 * Quando apenas engagementRate disponível (caso típico de Ads), usa ponderação única.
 *
 * US-55: exibido no ads-kpi-cards.tsx como KPI de destaque.
 *
 * @param data - Métricas de engajamento normalizadas por impressão
 * @returns Score 0-100 e classificação VIRAL/ALTO/MODERADO/BAIXO
 */
export function viralPotentialIndex(data: {
  /** Engajamentos totais / impressões (obrigatório) */
  engagementRate: number;
  /** Shares / impressões (opcional — peso 45% se presente) */
  shareRate?: number;
  /** Saves / impressões (opcional — peso 35% se presente) */
  saveRate?: number;
  /** Comments / impressões (opcional — peso 20% se presente) */
  commentRate?: number;
  /** CTR como sinal auxiliar de relevância (opcional) */
  ctr?: number;
}): {
  score: number;
  classification: 'VIRAL' | 'ALTO' | 'MODERADO' | 'BAIXO';
  drivers: string[];
} {
  const { engagementRate, shareRate, saveRate, commentRate, ctr } = data;

  // Log-normalização para comprimir escalas (mesma técnica de engagementScore)
  const logEngage = Math.log1p(engagementRate * 10000); // amplifica para escala útil

  let score: number;
  const drivers: string[] = [];

  if (shareRate !== undefined || saveRate !== undefined || commentRate !== undefined) {
    // Modo rico: ponderação explícita shares/saves/comments
    const s = shareRate ?? 0;
    const sv = saveRate ?? 0;
    const c = commentRate ?? 0;

    const logShares   = Math.log1p(s * 10000);
    const logSaves    = Math.log1p(sv * 10000);
    const logComments = Math.log1p(c * 10000);

    // k calibrado para engagement rate ~0.05 (5%) = midpoint
    const weighted = logShares * 0.45 + logSaves * 0.35 + logComments * 0.20;
    const k = 0.4;
    const midpoint = Math.log1p(500); // ~5% engagement = 50 pts
    score = 100 / (1 + Math.exp(-k * (weighted - midpoint)));

    if (s > 0.01) drivers.push(`shares ${(s * 100).toFixed(2)}%`);
    if (sv > 0.005) drivers.push(`saves ${(sv * 100).toFixed(2)}%`);
    if (c > 0.002) drivers.push(`comments ${(c * 100).toFixed(2)}%`);
  } else {
    // Modo proxy: apenas engagementRate + CTR opcional
    const ctrBoost = ctr !== undefined ? Math.log1p(ctr * 1000) * 0.2 : 0;
    const k = 0.35;
    const midpoint = Math.log1p(300); // ~3% engagement = 50 pts
    score = 100 / (1 + Math.exp(-k * (logEngage - midpoint))) + ctrBoost;
    score = clamp(score, 0, 100);

    if (engagementRate > 0.03) drivers.push(`engajamento ${(engagementRate * 100).toFixed(1)}%`);
    if (ctr !== undefined && ctr > 0.02) drivers.push(`CTR ${(ctr * 100).toFixed(2)}%`);
  }

  score = Math.round(clamp(score, 0, 100) * 10) / 10;

  const classification: 'VIRAL' | 'ALTO' | 'MODERADO' | 'BAIXO' =
    score >= 75 ? 'VIRAL' :
    score >= 50 ? 'ALTO' :
    score >= 25 ? 'MODERADO' : 'BAIXO';

  return { score, classification, drivers };
}
