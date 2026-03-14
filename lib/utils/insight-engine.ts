// =============================================================================
// insight-engine.ts — Motor de Alertas com Priority Queue (Binary Max-Heap)
// Pure TypeScript, zero dependencies
//
// Story: US-35 — InsightEngine: Motor de Alertas com Priority Queue
// Referência: GA4 Automated Insights + Amplitude Smart Alerts patterns
// =============================================================================

import { madScore, stlCusum } from './anomaly-detection';
import { holtWintersWithPI } from './hw-optimizer';
import { bayesianAB } from './bayesian-ab';

// =============================================================================
// Tipos Públicos
// =============================================================================

/** Tipos de insight suportados pelo motor */
export type InsightType =
  | 'ANOMALY'           // KPI fora da banda esperada via MAD z-score
  | 'FORECAST_MISS'     // Valor realizado fora da banda de predição HW
  | 'AB_WINNER_DETECTED'// Experimento com P(B>A) > abThreshold
  | 'CREATIVE_FATIGUE'; // Queda anômala em métricas de um criativo específico

/** Ponto de KPI a ser processado pelo motor */
export interface KpiPoint {
  /** Identificador da métrica: ex "ctr", "roas", "hookRate" */
  kpiId: string;
  /** Entidade associada (ad set, criativo, campanha); undefined = conta global */
  entityId?: string;
  /** Timestamp em milissegundos */
  timestamp: number;
  /** Valor observado */
  value: number;
  /** Valor esperado (previsão ou média histórica) */
  expected: number;
  /** Desvio padrão histórico ou do modelo */
  stdDev: number;
  /** Revenue baseline para cálculo de impacto de negócio (opcional) */
  revenueBaseline?: number;
}

/** Severidade do insight */
export type InsightSeverity = 'INFO' | 'WARN' | 'CRITICAL';

/** Objeto de insight produzido pelo motor */
export interface Insight {
  /** ID único: key + timestamp */
  id: string;
  /** Chave de deduplicação: kpiId|entityId|type|direction */
  key: string;
  type: InsightType;
  kpiId: string;
  entityId?: string;
  timestamp: number;
  severity: InsightSeverity;
  /** Score composto (0-∞): ordena o heap */
  score: number;
  direction: 'UP' | 'DOWN';
  zScore: number;
  /** Mensagem em linguagem natural para exibição na UI */
  message: string;
}

/** Configuração do InsightEngine */
export interface EngineConfig {
  /** Z-score mínimo para emitir insight (2.0 ≈ 95%; 2.6 ≈ 99%) */
  zCritical: number;
  /** Janela de cooldown em ms (default 86_400_000 = 24h) */
  coolDownMs: number;
  /** Peso do sinal (z-score) no score composto */
  wSignal: number;
  /** Peso do impacto de negócio no score composto */
  wImpact: number;
  /** Cap para normalizar impacto: revenueImpact / impactCap (default 1_000_000) */
  impactCap: number;
  /** P(B>A) mínimo para emitir AB_WINNER_DETECTED (default 0.95) */
  abThreshold: number;
}

// =============================================================================
// Helpers de integração com módulos existentes
// =============================================================================

/**
 * Popula KpiPoint a partir de output do madScore().
 * Usa a mediana como expected e MAD × 1.4826 como stdDev equivalente.
 */
export function kpiPointFromMAD(
  kpiId: string,
  values: number[],
  entityId?: string,
  revenueBaseline?: number
): KpiPoint | null {
  if (values.length < 4) return null;

  const result = madScore(values);
  const lastValue = values[values.length - 1];

  // MAD × 1.4826 = estimativa consistente de stdDev para distribuição normal
  const stdDev = result.mad * 1.4826;

  return {
    kpiId,
    entityId,
    timestamp: Date.now(),
    value: lastValue,
    expected: result.median,
    stdDev: stdDev > 0 ? stdDev : 1,
    revenueBaseline,
  };
}

/**
 * Popula KpiPoint a partir de output do holtWintersWithPI().
 * Usa o primeiro ponto de forecast como expected e residualStdDev como stdDev.
 */
export function kpiPointFromForecast(
  kpiId: string,
  historicalValues: number[],
  currentValue: number,
  entityId?: string,
  revenueBaseline?: number
): KpiPoint | null {
  if (historicalValues.length < 14) return null;

  const result = holtWintersWithPI(historicalValues, { h: 1 });
  if (result.forecast.length === 0) return null;

  return {
    kpiId,
    entityId,
    timestamp: Date.now(),
    value: currentValue,
    expected: result.forecast[0],
    stdDev: result.residualStdDev > 0 ? result.residualStdDev : 1,
    revenueBaseline,
  };
}

/**
 * Verifica se um experimento A/B tem vencedor detectado.
 * Retorna um KpiPoint sintético para AB_WINNER_DETECTED se probBWins > abThreshold.
 */
export function kpiPointFromABTest(
  kpiId: string,
  aClicks: number,
  aImpressions: number,
  bClicks: number,
  bImpressions: number,
  entityId?: string,
  options?: { threshold?: number; seed?: number }
): KpiPoint | null {
  if (aImpressions < 100 || bImpressions < 100) return null;

  const result = bayesianAB(aClicks, aImpressions, bClicks, bImpressions, options);

  if (result.recommendation === 'inconclusive') return null;

  const ctrA = aImpressions > 0 ? aClicks / aImpressions : 0;
  const ctrB = bImpressions > 0 ? bClicks / bImpressions : 0;

  // Z-score sintético baseado na certeza bayesiana
  const certainty = result.recommendation === 'deploy_B' ? result.probBWins : 1 - result.probBWins;
  const syntheticZ = certainty > 0.5 ? (certainty - 0.5) * 10 : 0;

  return {
    kpiId,
    entityId,
    timestamp: Date.now(),
    value: ctrB,
    expected: ctrA,
    stdDev: Math.abs(ctrB - ctrA) / Math.max(syntheticZ, 0.1),
    revenueBaseline: undefined,
  };
}

/**
 * Popula KpiPoint a partir de STL-CUSUM nos resíduos da série.
 *
 * US-51: STL remove sazonalidade semanal antes do CUSUM → elimina falsos positivos
 * de fim de semana que ocorrem com CUSUM raw sobre a série bruta.
 *
 * Retorna KpiPoint sintético somente se o ÚLTIMO ponto da série trigou alarme CUSUM.
 * O "expected" é o valor ajustado (trend + seasonal) e "value" é o resíduo + expected.
 *
 * @param kpiId - Identificador da métrica
 * @param values - Série temporal (mínimo 14 pontos para decomposição robusta)
 * @param period - Período sazonal (default 7 = semanal)
 * @param entityId - Entidade opcional
 */
export function kpiPointFromSTLCUSUM(
  kpiId: string,
  values: number[],
  period: number = 7,
  entityId?: string,
): KpiPoint | null {
  // Mínimo = 2 × period para STL ter sazonalidade estimável
  if (values.length < period * 2) return null;

  const result = stlCusum(values, { period });
  const n = result.cusumPos.length;
  const lastIdx = n - 1;

  // Só emite insight se o ÚLTIMO ponto trigou alarme CUSUM
  if (!result.changePoints.includes(lastIdx)) return null;

  const decomp = result.decomposition;

  // expected = trend[t] + seasonal[t] (valor "normal" para o contexto sazonal)
  const expected = decomp.trend[lastIdx] + decomp.seasonal[lastIdx];
  const residual = decomp.residual[lastIdx];

  // stdDev via MAD dos resíduos (robusto a outliers)
  const residuals = decomp.residual.filter(r => isFinite(r));
  if (residuals.length < 4) return null;

  const sorted = [...residuals].sort((a, b) => a - b);
  const medianResidual = sorted[Math.floor(sorted.length / 2)];
  const madResiduals = sorted.map(r => Math.abs(r - medianResidual)).sort((a, b) => a - b);
  const mad = madResiduals[Math.floor(madResiduals.length / 2)];
  const stdDev = Math.max(mad * 1.4826, 0.001);

  // z-score sintético do resíduo final
  const zSynth = Math.abs(residual / stdDev);

  return {
    kpiId,
    entityId,
    timestamp: Date.now(),
    value: values[values.length - 1],
    expected,
    stdDev,
    // Revenuebaseline não disponível neste contexto
    revenueBaseline: undefined,
  };

  // Garante que z-score mínimo seja usado pelo engine (via value - expected > z * stdDev)
  void zSynth; // usado implicitamente pelo InsightEngine ao calcular z = (value-expected)/stdDev
}

// =============================================================================
// InsightQueue — Binary Max-Heap
// =============================================================================

/**
 * Fila de prioridade para insights (binary max-heap por score).
 *
 * Implementação pura sem dependências externas.
 * Operações: push O(log n), pop O(log n), peek O(1).
 */
export class InsightQueue {
  private heap: Insight[] = [];

  private compare(a: Insight, b: Insight): number {
    return b.score - a.score; // max-heap: maior score tem prioridade
  }

  push(insight: Insight): void {
    this.heap.push(insight);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): Insight | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0 && last !== undefined) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  peek(): Insight | undefined {
    return this.heap[0];
  }

  size(): number {
    return this.heap.length;
  }

  /** Retorna todos os insights sem destruir a heap (cópia ordenada por score) */
  toArray(): Insight[] {
    return [...this.heap].sort((a, b) => b.score - a.score);
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.compare(this.heap[idx], this.heap[parent]) <= 0) break;
      [this.heap[idx], this.heap[parent]] = [this.heap[parent], this.heap[idx]];
      idx = parent;
    }
  }

  private bubbleDown(idx: number): void {
    const n = this.heap.length;
    while (true) {
      let largest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      if (left < n && this.compare(this.heap[left], this.heap[largest]) > 0) {
        largest = left;
      }
      if (right < n && this.compare(this.heap[right], this.heap[largest]) > 0) {
        largest = right;
      }
      if (largest === idx) break;
      [this.heap[idx], this.heap[largest]] = [this.heap[largest], this.heap[idx]];
      idx = largest;
    }
  }
}

// =============================================================================
// InsightEngine — Motor de Scoring, Deduplicação e Priorização
// =============================================================================

/** Estado de deduplicação por key */
interface DedupeState {
  lastShownAt: number;
  lastScore: number;
}

/**
 * Motor de insights com priorização por score e deduplicação por cooldown.
 *
 * Arquitetura inspirada em GA4 Automated Insights e Amplitude Smart Alerts:
 * - Scoring: signal_strength × business_impact
 * - Deduplicação: suprime re-emissão dentro do cooldown a menos que score 2× maior
 * - Priorização: binary max-heap ordenada por score composto
 *
 * @example
 * ```typescript
 * const engine = new InsightEngine({
 *   zCritical: 2.0,
 *   coolDownMs: 86_400_000,
 *   wSignal: 0.6,
 *   wImpact: 0.4,
 *   impactCap: 1_000_000,
 *   abThreshold: 0.95,
 * });
 *
 * const point = kpiPointFromMAD('ctr', ctrTimeSeries, 'adset-123', totalRevenue);
 * if (point) engine.processPoint(point, 'ANOMALY');
 *
 * const topInsights = engine.getTopN(5);
 * ```
 */
export class InsightEngine {
  private queue = new InsightQueue();
  private dedupeMap: Map<string, DedupeState> = new Map();

  constructor(private config: EngineConfig) {}

  /**
   * Processa um KpiPoint e emite um Insight se o z-score supera o threshold.
   *
   * @param point - Ponto de KPI a analisar
   * @param type - Tipo de insight a emitir
   * @param now - Timestamp atual em ms (default Date.now(), aceita valor externo para testes)
   */
  processPoint(point: KpiPoint, type: InsightType, now?: number): void {
    if (point.stdDev <= 0) return;

    const delta = point.value - point.expected;
    const z = delta / point.stdDev;

    if (Math.abs(z) < this.config.zCritical) return;

    const direction: 'UP' | 'DOWN' = delta >= 0 ? 'UP' : 'DOWN';
    const key = this.buildKey(point, type, direction);
    const ts = now ?? Date.now();

    // Scoring
    const signalNorm = Math.min(Math.abs(z) / 5, 1);
    const revenueImpact = Math.abs(delta) * (point.revenueBaseline ?? 1);
    const impactNorm = this.normalizeImpact(revenueImpact, this.config.impactCap);
    const score = this.config.wSignal * signalNorm + this.config.wImpact * impactNorm;

    // Deduplicação
    const state = this.dedupeMap.get(key);
    if (state) {
      const elapsed = ts - state.lastShownAt;
      const withinCooldown = elapsed < this.config.coolDownMs;
      const scoreNotDoubled = score < 2 * state.lastScore;
      if (withinCooldown && scoreNotDoubled) return;
    }

    const insight: Insight = {
      id: `${key}:${ts}`,
      key,
      type,
      kpiId: point.kpiId,
      entityId: point.entityId,
      timestamp: point.timestamp,
      severity: this.classifySeverity(z, impactNorm),
      score,
      direction,
      zScore: Math.round(z * 10000) / 10000,
      message: this.buildMessage(point, z, type, direction),
    };

    this.queue.push(insight);
    this.dedupeMap.set(key, { lastShownAt: ts, lastScore: score });
  }

  /**
   * Drena os N insights de maior score da fila.
   */
  getTopN(n: number): Insight[] {
    const out: Insight[] = [];
    for (let i = 0; i < n; i++) {
      const ins = this.queue.pop();
      if (!ins) break;
      out.push(ins);
    }
    return out;
  }

  /**
   * Retorna os N insights de maior score sem removê-los da fila.
   */
  peekTopN(n: number): Insight[] {
    return this.queue.toArray().slice(0, n);
  }

  /** Número de insights na fila */
  queueSize(): number {
    return this.queue.size();
  }

  /** Limpa a fila sem resetar o mapa de deduplicação */
  clearQueue(): void {
    while (this.queue.size() > 0) {
      this.queue.pop();
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers privados
  // ---------------------------------------------------------------------------

  private normalizeImpact(revenueImpact: number, cap: number): number {
    if (cap <= 0) return 0;
    return Math.min(revenueImpact / cap, 1);
  }

  private buildKey(p: KpiPoint, type: InsightType, dir: 'UP' | 'DOWN'): string {
    return [p.kpiId, p.entityId ?? 'global', type, dir].join('|');
  }

  private classifySeverity(z: number, impactNorm: number): InsightSeverity {
    const zAbs = Math.abs(z);
    if (zAbs > 3 && impactNorm > 0.5) return 'CRITICAL';
    if (zAbs > 2.5) return 'WARN';
    return 'INFO';
  }

  private buildMessage(
    p: KpiPoint,
    z: number,
    type: InsightType,
    dir: 'UP' | 'DOWN'
  ): string {
    const dirLabel = dir === 'UP' ? 'acima' : 'abaixo';
    const entity = p.entityId ? ` (${p.entityId})` : '';

    switch (type) {
      case 'ANOMALY':
        return (
          `Anomalia em ${p.kpiId}${entity}: ` +
          `${p.value.toFixed(4)} está ${dirLabel} do esperado ` +
          `(${p.expected.toFixed(4)}), z=${z.toFixed(2)}.`
        );
      case 'FORECAST_MISS':
        return (
          `Previsão quebrada em ${p.kpiId}${entity}: ` +
          `valor ${dirLabel} da banda de confiança ` +
          `(esperado ${p.expected.toFixed(4)}, observado ${p.value.toFixed(4)}).`
        );
      case 'AB_WINNER_DETECTED':
        return dir === 'UP'
          ? `A/B: variante B${entity} supera A em ${p.kpiId} com significância estatística.`
          : `A/B: variante A${entity} supera B em ${p.kpiId} com significância estatística.`;
      case 'CREATIVE_FATIGUE':
        return (
          `Fadiga criativa${entity}: queda anômala em ${p.kpiId} ` +
          `(z=${z.toFixed(2)}, ${Math.abs(((p.value - p.expected) / p.expected) * 100).toFixed(1)}% abaixo do esperado).`
        );
    }
  }
}

// =============================================================================
// Configurações pré-definidas
// =============================================================================

/** Configuração conservadora (99% CI, cooldown 24h) — recomendado para produção */
export const CONFIG_CONSERVATIVE: EngineConfig = {
  zCritical: 2.6,
  coolDownMs: 86_400_000,
  wSignal: 0.6,
  wImpact: 0.4,
  impactCap: 1_000_000,
  abThreshold: 0.95,
};

/** Configuração sensível (95% CI, cooldown 6h) — para exploração e desenvolvimento */
export const CONFIG_SENSITIVE: EngineConfig = {
  zCritical: 2.0,
  coolDownMs: 21_600_000,
  wSignal: 0.7,
  wImpact: 0.3,
  impactCap: 1_000_000,
  abThreshold: 0.90,
};
