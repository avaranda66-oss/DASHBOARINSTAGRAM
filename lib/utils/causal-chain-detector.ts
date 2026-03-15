// =============================================================================
// causal-chain-detector.ts — Detector de Cadeias Causais
// Pure TypeScript, zero dependencies
//
// Story: US-85 — Causal Chain Detector
// Referência: Madgicx, Triple Whale, Northbeam diagnostic patterns
// =============================================================================

// =============================================================================
// Tipos Públicos
// =============================================================================

export type CausalPattern =
  | 'CREATIVE_FATIGUE'      // freq↑ + CTR↓ + CPM≈stable + CR↓
  | 'AUDIENCE_SATURATION'   // freq↑↑ + reach_stagnant + CTR↓ + CPM↑
  | 'LANDING_PAGE_ISSUE'    // CTR≈stable + CR↓ forte + CPM≈stable
  | 'HOSTILE_AUCTION'       // CPM↑↑ + CTR≈stable + CR≈stable
  | 'UNKNOWN';

export interface MetricSnapshot {
  ctr: number;              // valor atual
  ctrDelta: number;         // % mudança vs baseline (positivo = subiu)
  cpm: number;
  cpmDelta: number;
  frequency: number;
  frequencyDelta: number;
  conversionRate: number;
  conversionRateDelta: number;
  reach: number;
  reachDelta: number;       // % mudança de alcance diário
}

export interface CausalDiagnosis {
  pattern: CausalPattern;
  confidence: number;       // 0-1
  signals: string[];        // sinais que confirmam o padrão
  recommendation: string;
}

// =============================================================================
// Thresholds
// =============================================================================

const T = {
  // AUDIENCE_SATURATION
  AS_FREQ:       4.0,
  AS_REACH:     -10,   // reachDelta < -10
  AS_CTR:       -20,   // ctrDelta < -20
  AS_CPM:        15,   // cpmDelta > 15

  // CREATIVE_FATIGUE
  CF_FREQ:       3.0,
  CF_CTR:       -15,   // ctrDelta < -15
  CF_CPM:        20,   // |cpmDelta| < 20
  CF_CR_SEC:    -10,   // conversionRateDelta < -10 (secondary)

  // LANDING_PAGE_ISSUE
  LPI_CTR:       10,   // |ctrDelta| < 10
  LPI_CR:       -25,   // conversionRateDelta < -25
  LPI_CPM:       15,   // |cpmDelta| < 15

  // HOSTILE_AUCTION
  HA_CPM:        30,   // cpmDelta > 30
  HA_CTR:        15,   // |ctrDelta| < 15
  HA_CR:         15,   // |conversionRateDelta| < 15
} as const;

// =============================================================================
// Pattern detectors
// =============================================================================

function detectAudienceSaturation(m: MetricSnapshot): CausalDiagnosis | null {
  const signals: string[] = [];
  let primaryMet = 0;

  if (m.frequency > T.AS_FREQ) {
    signals.push(`Frequência ${m.frequency.toFixed(1)} > limite ${T.AS_FREQ}`);
    primaryMet++;
  }
  if (m.reachDelta < T.AS_REACH) {
    signals.push(`Alcance caiu ${Math.abs(m.reachDelta).toFixed(0)}% (limite: ${Math.abs(T.AS_REACH)}%)`);
    primaryMet++;
  }
  if (m.ctrDelta < T.AS_CTR) {
    signals.push(`CTR caiu ${Math.abs(m.ctrDelta).toFixed(0)}% (limite: ${Math.abs(T.AS_CTR)}%)`);
    primaryMet++;
  }
  if (m.cpmDelta > T.AS_CPM) {
    signals.push(`CPM subiu ${m.cpmDelta.toFixed(0)}% (limite: +${T.AS_CPM}%)`);
    primaryMet++;
  }

  if (primaryMet < 4) return null;

  return {
    pattern: 'AUDIENCE_SATURATION',
    confidence: 0.85,
    signals,
    recommendation: 'Expanda a audiência ou crie lookalike audience. Pause adsets com frequência >4.5.',
  };
}

function detectCreativeFatigue(m: MetricSnapshot): CausalDiagnosis | null {
  const signals: string[] = [];
  let primaryMet = 0;

  if (m.frequency > T.CF_FREQ) {
    signals.push(`Frequência ${m.frequency.toFixed(1)} > limite ${T.CF_FREQ}`);
    primaryMet++;
  }
  if (m.ctrDelta < T.CF_CTR) {
    signals.push(`CTR caiu ${Math.abs(m.ctrDelta).toFixed(0)}% (limite: ${Math.abs(T.CF_CTR)}%)`);
    primaryMet++;
  }
  if (Math.abs(m.cpmDelta) < T.CF_CPM) {
    signals.push(`CPM estável: variação ${m.cpmDelta.toFixed(0)}% (dentro de ±${T.CF_CPM}%)`);
    primaryMet++;
  }

  if (primaryMet < 3) return null;

  let confidence = 0.80;
  if (m.conversionRateDelta < T.CF_CR_SEC) {
    signals.push(`Taxa de conversão caiu ${Math.abs(m.conversionRateDelta).toFixed(0)}% (sinal secundário)`);
    confidence = Math.min(confidence + 0.10, 1.0);
  }

  return {
    pattern: 'CREATIVE_FATIGUE',
    confidence,
    signals,
    recommendation: 'Renove o hook e thumbnail mantendo o ângulo vencedor. Teste nova variação em 48h.',
  };
}

function detectLandingPageIssue(m: MetricSnapshot): CausalDiagnosis | null {
  const signals: string[] = [];
  let primaryMet = 0;

  if (Math.abs(m.ctrDelta) < T.LPI_CTR) {
    signals.push(`CTR estável: variação ${m.ctrDelta.toFixed(0)}% (dentro de ±${T.LPI_CTR}%)`);
    primaryMet++;
  }
  if (m.conversionRateDelta < T.LPI_CR) {
    signals.push(`Taxa de conversão caiu ${Math.abs(m.conversionRateDelta).toFixed(0)}% (limite: ${Math.abs(T.LPI_CR)}%)`);
    primaryMet++;
  }
  if (Math.abs(m.cpmDelta) < T.LPI_CPM) {
    signals.push(`CPM estável: variação ${m.cpmDelta.toFixed(0)}% (dentro de ±${T.LPI_CPM}%)`);
    primaryMet++;
  }

  if (primaryMet < 3) return null;

  return {
    pattern: 'LANDING_PAGE_ISSUE',
    confidence: 0.75,
    signals,
    recommendation: 'Audite a landing page: velocidade de carregamento, formulário, congruência com o anúncio.',
  };
}

function detectHostileAuction(m: MetricSnapshot): CausalDiagnosis | null {
  const signals: string[] = [];
  let primaryMet = 0;

  if (m.cpmDelta > T.HA_CPM) {
    signals.push(`CPM subiu ${m.cpmDelta.toFixed(0)}% (limite: +${T.HA_CPM}%)`);
    primaryMet++;
  }
  if (Math.abs(m.ctrDelta) < T.HA_CTR) {
    signals.push(`CTR estável: variação ${m.ctrDelta.toFixed(0)}% (dentro de ±${T.HA_CTR}%)`);
    primaryMet++;
  }
  if (Math.abs(m.conversionRateDelta) < T.HA_CR) {
    signals.push(`Taxa de conversão estável: variação ${m.conversionRateDelta.toFixed(0)}% (dentro de ±${T.HA_CR}%)`);
    primaryMet++;
  }

  if (primaryMet < 3) return null;

  return {
    pattern: 'HOSTILE_AUCTION',
    confidence: 0.70,
    signals,
    recommendation: 'Revise placements (exclua Audience Network). Considere redistribuir budget ou pausar temporariamente.',
  };
}

// =============================================================================
// Função principal
// =============================================================================

/**
 * Detecta o padrão causal subjacente a um conjunto de métricas de campanha.
 *
 * Avalia os 4 padrões em ordem de especificidade (maior → menor) e retorna
 * o de maior confidence. Se múltiplos padrões se qualificam, o de maior
 * confidence vence.
 *
 * @example
 * ```typescript
 * const diagnosis = detectCausalChain({
 *   ctr: 0.012, ctrDelta: -22,
 *   cpm: 18, cpmDelta: 18,
 *   frequency: 5.2, frequencyDelta: 40,
 *   conversionRate: 0.03, conversionRateDelta: -8,
 *   reach: 8000, reachDelta: -15,
 * });
 * // → { pattern: 'AUDIENCE_SATURATION', confidence: 0.85, ... }
 * ```
 */
export function detectCausalChain(metrics: MetricSnapshot): CausalDiagnosis {
  const candidates: CausalDiagnosis[] = [];

  const as = detectAudienceSaturation(metrics);
  if (as) candidates.push(as);

  const cf = detectCreativeFatigue(metrics);
  if (cf) candidates.push(cf);

  const lpi = detectLandingPageIssue(metrics);
  if (lpi) candidates.push(lpi);

  const ha = detectHostileAuction(metrics);
  if (ha) candidates.push(ha);

  if (candidates.length === 0) {
    return {
      pattern: 'UNKNOWN',
      confidence: 0.0,
      signals: [],
      recommendation: 'Monitore todas as métricas por 48h antes de tomar ação.',
    };
  }

  // Retorna o candidato com maior confidence
  return candidates.reduce((best, curr) => curr.confidence > best.confidence ? curr : best);
}
