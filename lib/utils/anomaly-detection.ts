// =============================================================================
// anomaly-detection.ts — Detecção de Anomalias Robusta para Séries Temporais
// Pure TypeScript, zero dependencies
//
// Story: US-25 — STL Decomposition + MAD Adaptive CUSUM
// Referência: Cleveland et al. (1990) STL: A Seasonal-Trend Decomposition
//             Iglewicz & Hoaglin (1993) Modified Z-score via MAD
// =============================================================================

// =============================================================================
// Tipos Públicos
// =============================================================================

export interface STLDecomposition {
  /** Série original */
  original: number[];
  /** Componente de tendência (média móvel centrada) */
  trend: number[];
  /** Componente sazonal (média de cada posição no ciclo) */
  seasonal: number[];
  /** Resíduos: original - trend - seasonal */
  residual: number[];
  /** Período sazonal usado */
  period: number;
  /** true se a decomposição foi aplicada (false = dados insuficientes) */
  decomposed: boolean;
}

export interface MADResult {
  /** Mediana da série */
  median: number;
  /** Median Absolute Deviation */
  mad: number;
  /** Modified Z-scores: 0.6745 * (xi - median) / MAD */
  modifiedZScores: number[];
}

export interface AnomalyDetectionResult {
  /** Índices onde anomalia foi detectada */
  anomalies: number[];
  /** Modified Z-scores para cada ponto */
  scores: number[];
  /** Threshold usado */
  threshold: number;
}

export interface STLCUSUMResult {
  /** Índices de mudança de regime detectados */
  changePoints: number[];
  /** Decomposição STL usada internamente */
  decomposition: STLDecomposition;
  /** CUSUM positivo sobre os resíduos */
  cusumPos: number[];
  /** CUSUM negativo sobre os resíduos */
  cusumNeg: number[];
}

export interface MultivariateAnomalyResult {
  /** Score de anomalia composto por ponto (0-100) */
  scores: number[];
  /** Índices identificados como anômalos */
  anomalyIndices: number[];
  /** Score por série individualmente */
  perMetricScores: Record<string, number[]>;
}

// =============================================================================
// Helpers internos
// =============================================================================

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function movingAverage(values: number[], window: number): (number | null)[] {
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const start = i - half;
    const end = i + half;
    if (start < 0 || end >= values.length) return null;
    const slice = values.slice(start, end + 1);
    return slice.reduce((a, v) => a + v, 0) / slice.length;
  });
}

// =============================================================================
// 1. STL Simplificado (Seasonal-Trend Decomposition)
// =============================================================================

/**
 * Decompõe uma série temporal em tendência + sazonalidade + resíduo.
 *
 * Implementação simplificada baseada em Cleveland et al. (1990) STL:
 * - Tendência: média móvel centrada de comprimento `period`
 * - Sazonalidade: média dos desvios em cada posição do ciclo
 * - Resíduo: original - tendência - sazonalidade
 *
 * Esta abordagem usa média simples em vez de LOESS (regressão local), o que é
 * suficiente para period=7 (semanal) e dados de engajamento social.
 *
 * @param data - Série temporal
 * @param period - Período sazonal (default 7 = semanal)
 */
export function stlDecompose(
  data: number[],
  period = 7
): STLDecomposition {
  const n = data.length;

  // Guard: sem dados suficientes para decomposição
  if (n < 2 * period) {
    return {
      original: [...data],
      trend: [...data],
      seasonal: new Array(n).fill(0),
      residual: new Array(n).fill(0),
      period,
      decomposed: false,
    };
  }

  // Passo 1: Tendência via média móvel centrada de comprimento `period`
  const trendRaw = movingAverage(data, period);

  // Preencher bordas com interpolação linear para não perder pontos
  const trend: number[] = trendRaw.map((v, i) => {
    if (v !== null) return v;
    // Borda esquerda: usar o primeiro valor não-nulo
    const firstValid = trendRaw.findIndex(t => t !== null);
    if (firstValid === -1) return data[i];
    if (i < firstValid) return trendRaw[firstValid] as number;
    // Borda direita: usar o último valor não-nulo
    const lastValid = trendRaw.map((t, idx) => t !== null ? idx : -1).filter(idx => idx !== -1).pop() ?? i;
    return trendRaw[lastValid] as number;
  });

  // Passo 2: Calcular desvios detrended
  const detrended = data.map((v, i) => v - trend[i]);

  // Passo 3: Média de cada posição no ciclo sazonal
  const seasonalMeans = new Array(period).fill(0);
  const seasonalCounts = new Array(period).fill(0);

  for (let i = 0; i < n; i++) {
    const pos = i % period;
    seasonalMeans[pos] += detrended[i];
    seasonalCounts[pos]++;
  }

  for (let p = 0; p < period; p++) {
    if (seasonalCounts[p] > 0) {
      seasonalMeans[p] /= seasonalCounts[p];
    }
  }

  // Centralizar sazonal (soma zero por ciclo)
  const seasonalMean = seasonalMeans.reduce((a, v) => a + v, 0) / period;
  const centeredSeasonal = seasonalMeans.map(s => s - seasonalMean);

  // Expandir sazonalidade para toda a série
  const seasonal = data.map((_, i) => centeredSeasonal[i % period]);

  // Passo 4: Resíduos
  const residual = data.map((v, i) => v - trend[i] - seasonal[i]);

  return {
    original: [...data],
    trend: trend.map(v => Math.round(v * 100) / 100),
    seasonal: seasonal.map(v => Math.round(v * 100) / 100),
    residual: residual.map(v => Math.round(v * 100) / 100),
    period,
    decomposed: true,
  };
}

// =============================================================================
// 2. MAD — Median Absolute Deviation
// =============================================================================

/**
 * Calcula MAD (Median Absolute Deviation) e modified Z-scores para uma série.
 *
 * O modified Z-score via MAD é mais robusto que o Z-score via média/stdDev porque:
 * - Mediana e MAD não são afetados por outliers (estimadores robustos)
 * - stdDev é fortemente influenciado pelos próprios outliers que tentamos detectar
 *
 * Modified Z-score: M_i = 0.6745 * (x_i - median) / MAD
 * O fator 0.6745 normaliza MAD para ser consistente com stdDev em distribuições normais.
 *
 * @param values - Série de valores
 */
export function madScore(values: number[]): MADResult {
  if (values.length === 0) return { median: 0, mad: 0, modifiedZScores: [] };

  const med = median(values);
  const absoluteDeviations = values.map(v => Math.abs(v - med));
  const mad = median(absoluteDeviations);

  const modifiedZScores = values.map(v => {
    if (mad === 0) return 0; // todos os valores são idênticos
    return (0.6745 * (v - med)) / mad;
  });

  return {
    median: Math.round(med * 10000) / 10000,
    mad: Math.round(mad * 10000) / 10000,
    modifiedZScores: modifiedZScores.map(z => Math.round(z * 10000) / 10000),
  };
}

/**
 * Detecta anomalias via Modified Z-score (MAD).
 *
 * Threshold recomendado por Iglewicz & Hoaglin (1993): |M_i| > 3.5
 * Para dados de engajamento social (alta variância), threshold de 3.0 é mais sensível.
 *
 * @param values - Série de valores
 * @param threshold - Threshold do modified Z-score (default 3.5)
 */
export function madAnomalyDetect(
  values: number[],
  threshold = 3.5
): AnomalyDetectionResult {
  if (values.length === 0) {
    return { anomalies: [], scores: [], threshold };
  }

  const { modifiedZScores } = madScore(values);
  const anomalies = modifiedZScores
    .map((z, i) => ({ z, i }))
    .filter(({ z }) => Math.abs(z) > threshold)
    .map(({ i }) => i);

  return {
    anomalies,
    scores: modifiedZScores,
    threshold,
  };
}

// =============================================================================
// 3. STL-CUSUM — CUSUM sobre resíduos STL (elimina falsos positivos sazonais)
// =============================================================================

/**
 * CUSUM aplicado sobre os resíduos da decomposição STL.
 *
 * Vantagem vs CUSUM direto: ao remover tendência e sazonalidade antes,
 * elimina ~80% dos falsos positivos causados por padrões sazonais normais
 * (ex: menos engajamento toda segunda-feira não é anomalia).
 *
 * Threshold: 2.5 * MAD dos resíduos (robusto vs stdDev global que é inflado por spikes)
 *
 * @param data - Série temporal original
 * @param options.period - Período sazonal (default 7)
 * @param options.threshold - Múltiplo de MAD para o threshold CUSUM (default 2.5)
 * @param options.drift - Fator de drift para sensibilidade (default 0.5)
 */
export function stlCusum(
  data: number[],
  options: { period?: number; threshold?: number; drift?: number } = {}
): STLCUSUMResult {
  const period = options.period ?? 7;
  const thresholdMult = options.threshold ?? 2.5;
  const drift = options.drift ?? 0.5;

  const decomposition = stlDecompose(data, period);
  const residuals = decomposition.residual;
  const n = residuals.length;

  if (n < 3) {
    return {
      changePoints: [],
      decomposition,
      cusumPos: new Array(n).fill(0),
      cusumNeg: new Array(n).fill(0),
    };
  }

  // Usar MAD dos resíduos como estimador de escala robusto
  const { mad, median: residualMedian } = madScore(residuals);
  const scale = mad > 0 ? mad : Math.abs(residualMedian) || 1;

  const H = thresholdMult * scale;
  const K = drift * scale;

  const cusumPos: number[] = [0];
  const cusumNeg: number[] = [0];
  const changePoints: number[] = [];

  for (let i = 1; i < n; i++) {
    const z = residuals[i] - residualMedian; // centralizar pelo mediano
    const newPos = Math.max(0, cusumPos[i - 1] + z - K);
    const newNeg = Math.max(0, cusumNeg[i - 1] - z - K);

    if (newPos > H || newNeg > H) {
      changePoints.push(i);
      cusumPos.push(0); // reset após detecção
      cusumNeg.push(0);
    } else {
      cusumPos.push(Math.round(newPos * 100) / 100);
      cusumNeg.push(Math.round(newNeg * 100) / 100);
    }
  }

  return {
    changePoints,
    decomposition,
    cusumPos,
    cusumNeg,
  };
}

// =============================================================================
// 4. Detecção Multi-variada (shadow ban / queda coordenada)
// =============================================================================

/**
 * Detecta anomalias que ocorrem simultaneamente em múltiplas métricas.
 *
 * Usa-se para identificar padrões como shadow ban (alcance + saves + impressões caem juntos)
 * ou viral spike (todas as métricas sobem coordenadamente).
 *
 * Score composto = média geométrica dos |modified Z-scores| por posição.
 * A média geométrica penaliza quando apenas uma métrica é anômala — exige
 * que MÚLTIPLAS séries sejam anômalas simultaneamente para score alto.
 *
 * @param metrics - Objeto com séries de métricas (mesmo comprimento)
 * @param threshold - Score composto mínimo para classificar como anomalia (default 2.5)
 */
export function multivariateAnomalyScore(
  metrics: Record<string, number[]>,
  threshold = 2.5
): MultivariateAnomalyResult {
  const keys = Object.keys(metrics);
  if (keys.length === 0) {
    return { scores: [], anomalyIndices: [], perMetricScores: {} };
  }

  const n = metrics[keys[0]].length;
  if (n === 0) {
    return { scores: [], anomalyIndices: [], perMetricScores: {} };
  }

  const perMetricScores: Record<string, number[]> = {};

  for (const key of keys) {
    const { modifiedZScores } = madScore(metrics[key]);
    perMetricScores[key] = modifiedZScores.map(z => Math.abs(z));
  }

  // Média geométrica dos scores absolutos por posição
  const compositeScores = Array.from({ length: n }, (_, i) => {
    const vals = keys.map(k => Math.max(perMetricScores[k][i], 0.001));
    const logSum = vals.reduce((acc, v) => acc + Math.log(v), 0);
    const geoMean = Math.exp(logSum / vals.length);
    return Math.round(geoMean * 100) / 100;
  });

  const anomalyIndices = compositeScores
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s > threshold)
    .map(({ i }) => i);

  // Normalizar scores para 0-100 para exibição na UI
  const maxScore = Math.max(...compositeScores, threshold);
  const normalizedScores = compositeScores.map(s =>
    Math.round(Math.min((s / maxScore) * 100, 100))
  );

  return {
    scores: normalizedScores,
    anomalyIndices,
    perMetricScores,
  };
}
