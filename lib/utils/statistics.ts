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

  // Desvio padrao populacional (small data, nao amostral)
  const variance = values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / n;
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
export function engagementScore(post: {
  likes: number;
  comments: number;
  views?: number;
  saves?: number;
  shares?: number;
}): number {
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
  const score = 100 / (1 + Math.exp(-k * (weighted - 4)));

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
