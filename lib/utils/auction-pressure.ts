// =============================================================================
// auction-pressure.ts — Diagnóstico de Pressão de Leilão no Meta Ads
//
// Abordagem: classifica a causa do aumento de CPM por padrão de sinais,
// sem um índice único especulativo.
// =============================================================================

export interface AuctionSignals {
  cpm: number;
  ctr: number;
  frequency: number;
  qualityRanking?: string;
  /** Média da conta no mesmo período */
  accountAvgCpm: number;
  accountAvgCtr: number;
}

export type PressureSignal =
  | 'competition'
  | 'creative_fatigue'
  | 'audience_saturation'
  | 'healthy'
  | 'insufficient_data';

export interface PressureAnalysis {
  signal: PressureSignal;
  confidence: 'high' | 'medium' | 'low';
  /** Sinais individuais detectados */
  indicators: string[];
  recommendation: string;
}

/**
 * Analisa pressão de leilão a partir de sinais de performance.
 *
 * Padrões classificados:
 * - competition: CPM alto + CTR ok + baixa frequência + qualidade boa
 * - creative_fatigue: CPM alto + CTR baixo + qualidade degradada
 * - audience_saturation: CPM alto + frequência alta + CTR baixo
 * - healthy: CPM dentro do esperado
 * - insufficient_data: dados zerados ou ausentes
 */
export function analyzeAuctionPressure(signals: AuctionSignals): PressureAnalysis {
  const { cpm, ctr, frequency, qualityRanking, accountAvgCpm, accountAvgCtr } = signals;

  if (accountAvgCpm <= 0 || cpm <= 0) {
    return {
      signal: 'insufficient_data',
      confidence: 'low',
      indicators: ['CPM ou média de conta ausente'],
      recommendation: 'Aguardar mais dados para diagnóstico.',
    };
  }

  const cpmAboveAvg = cpm > accountAvgCpm * 1.25;
  const ctrAboveAvg = ctr >= accountAvgCtr * 0.9;
  const highFrequency = frequency > 3.5;
  const qualityDegraded =
    qualityRanking != null && qualityRanking.includes('BELOW');

  if (!cpmAboveAvg) {
    return {
      signal: 'healthy',
      confidence: 'high',
      indicators: [`CPM R$${cpm.toFixed(2)} abaixo de +25% da média (R$${accountAvgCpm.toFixed(2)})`],
      recommendation: 'Performance dentro do esperado. Manter estratégia.',
    };
  }

  // CPM acima da média — identificar causa
  const indicators: string[] = [
    `CPM R$${cpm.toFixed(2)} vs média R$${accountAvgCpm.toFixed(2)} (+${(((cpm / accountAvgCpm) - 1) * 100).toFixed(0)}%)`,
  ];

  // Padrão 1: competition
  if (ctrAboveAvg && !highFrequency && !qualityDegraded) {
    indicators.push(`CTR ${ctr.toFixed(2)}% está ok (≥90% da média)`);
    if (!highFrequency) indicators.push(`Frequência ${frequency.toFixed(1)} dentro do limite`);
    return {
      signal: 'competition',
      confidence: 'high',
      indicators,
      recommendation: 'CPM elevado mas criativo performando bem — leilão caro. Considere ampliar audience ou testar novos formatos.',
    };
  }

  // Padrão 2: creative_fatigue
  if (!ctrAboveAvg && qualityDegraded) {
    indicators.push(`CTR ${ctr.toFixed(2)}% abaixo da média`);
    indicators.push(`Quality ranking degradado: ${qualityRanking}`);
    return {
      signal: 'creative_fatigue',
      confidence: 'high',
      indicators,
      recommendation: 'Fadiga criativa detectada. Renovar criativos e testar novos hooks.',
    };
  }

  // Padrão 3: audience_saturation
  if (highFrequency && !ctrAboveAvg) {
    indicators.push(`Frequência alta: ${frequency.toFixed(1)} (limite: 3.5)`);
    indicators.push(`CTR ${ctr.toFixed(2)}% abaixo da média`);
    return {
      signal: 'audience_saturation',
      confidence: 'high',
      indicators,
      recommendation: 'Saturação de audiência. Expandir público-alvo ou excluir segmentos já convertidos.',
    };
  }

  // Sinal misto — confidence medium
  if (highFrequency) indicators.push(`Frequência alta: ${frequency.toFixed(1)}`);
  if (!ctrAboveAvg) indicators.push(`CTR ${ctr.toFixed(2)}% abaixo da média`);
  if (qualityDegraded) indicators.push(`Quality ranking: ${qualityRanking}`);

  const dominantSignal: PressureSignal = highFrequency
    ? 'audience_saturation'
    : qualityDegraded
    ? 'creative_fatigue'
    : 'competition';

  return {
    signal: dominantSignal,
    confidence: 'medium',
    indicators,
    recommendation: 'Sinais mistos — monitorar evolução e avaliar renovação criativa.',
  };
}

/** Calcula médias de CPM e CTR a partir de um conjunto de campanhas/adsets */
export function computeAccountAverages(
  items: Array<{ cpm?: number; ctr?: number }>
): { avgCpm: number; avgCtr: number } {
  const valid = items.filter(i => (i.cpm ?? 0) > 0);
  if (valid.length === 0) return { avgCpm: 0, avgCtr: 0 };
  const avgCpm = valid.reduce((s, i) => s + (i.cpm ?? 0), 0) / valid.length;
  const avgCtr = valid.reduce((s, i) => s + (i.ctr ?? 0), 0) / valid.length;
  return { avgCpm, avgCtr };
}
