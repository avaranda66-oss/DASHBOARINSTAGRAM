// =============================================================================
// causal-chain-detector.test.ts
// Story: US-85 — Causal Chain Detector
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  detectCausalChain,
  type MetricSnapshot,
} from '@/lib/utils/causal-chain-detector';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const base: MetricSnapshot = {
  ctr: 0.02,
  ctrDelta: 0,
  cpm: 15,
  cpmDelta: 0,
  frequency: 2.0,
  frequencyDelta: 0,
  conversionRate: 0.03,
  conversionRateDelta: 0,
  reach: 10000,
  reachDelta: 0,
};

const mk = (overrides: Partial<MetricSnapshot>): MetricSnapshot => ({
  ...base,
  ...overrides,
});

// ─── AUDIENCE_SATURATION ──────────────────────────────────────────────────────

describe('AUDIENCE_SATURATION', () => {
  it('caso típico: todas as condições primárias atendidas', () => {
    const result = detectCausalChain(mk({
      frequency: 5.2,
      reachDelta: -15,
      ctrDelta: -25,
      cpmDelta: 20,
    }));
    expect(result.pattern).toBe('AUDIENCE_SATURATION');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    expect(result.signals.length).toBeGreaterThanOrEqual(4);
  });

  it('limiar mínimo: valores exatamente nos limiares', () => {
    const result = detectCausalChain(mk({
      frequency: 4.1,
      reachDelta: -11,
      ctrDelta: -21,
      cpmDelta: 16,
    }));
    expect(result.pattern).toBe('AUDIENCE_SATURATION');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('frequency insuficiente: não classifica como AUDIENCE_SATURATION', () => {
    const result = detectCausalChain(mk({
      frequency: 3.8,
      reachDelta: -15,
      ctrDelta: -25,
      cpmDelta: 20,
    }));
    expect(result.pattern).not.toBe('AUDIENCE_SATURATION');
  });

  it('reach não caiu suficiente: não classifica', () => {
    const result = detectCausalChain(mk({
      frequency: 5.0,
      reachDelta: -5,
      ctrDelta: -25,
      cpmDelta: 20,
    }));
    expect(result.pattern).not.toBe('AUDIENCE_SATURATION');
  });

  it('signals incluem todas as condições atendidas', () => {
    const result = detectCausalChain(mk({
      frequency: 4.8,
      reachDelta: -18,
      ctrDelta: -22,
      cpmDelta: 19,
    }));
    expect(result.pattern).toBe('AUDIENCE_SATURATION');
    expect(result.signals.some(s => s.includes('4.8'))).toBe(true);
  });
});

// ─── CREATIVE_FATIGUE ─────────────────────────────────────────────────────────

describe('CREATIVE_FATIGUE', () => {
  it('caso típico: frequency+CTR+CPM estável', () => {
    const result = detectCausalChain(mk({
      frequency: 3.5,
      ctrDelta: -20,
      cpmDelta: 5,
    }));
    expect(result.pattern).toBe('CREATIVE_FATIGUE');
    expect(result.confidence).toBeGreaterThanOrEqual(0.80);
  });

  it('sinal secundário (CR queda) aumenta confidence', () => {
    const withoutCR = detectCausalChain(mk({
      frequency: 3.5,
      ctrDelta: -20,
      cpmDelta: 5,
    }));
    const withCR = detectCausalChain(mk({
      frequency: 3.5,
      ctrDelta: -20,
      cpmDelta: 5,
      conversionRateDelta: -15,
    }));
    expect(withCR.confidence).toBeGreaterThan(withoutCR.confidence);
    expect(withCR.confidence).toBeCloseTo(0.90, 5);
  });

  it('frequency baixa: não classifica como CREATIVE_FATIGUE', () => {
    const result = detectCausalChain(mk({
      frequency: 2.5,
      ctrDelta: -20,
      cpmDelta: 5,
    }));
    expect(result.pattern).not.toBe('CREATIVE_FATIGUE');
  });

  it('CPM instável: não classifica como CREATIVE_FATIGUE', () => {
    const result = detectCausalChain(mk({
      frequency: 3.5,
      ctrDelta: -20,
      cpmDelta: 25,   // fora do ±20 permitido
    }));
    expect(result.pattern).not.toBe('CREATIVE_FATIGUE');
  });

  it('CTR não caiu suficiente: não classifica', () => {
    const result = detectCausalChain(mk({
      frequency: 3.5,
      ctrDelta: -10,
      cpmDelta: 5,
    }));
    expect(result.pattern).not.toBe('CREATIVE_FATIGUE');
  });
});

// ─── LANDING_PAGE_ISSUE ───────────────────────────────────────────────────────

describe('LANDING_PAGE_ISSUE', () => {
  it('caso típico: CTR estável + CR queda forte + CPM estável', () => {
    const result = detectCausalChain(mk({
      ctrDelta: 2,
      conversionRateDelta: -30,
      cpmDelta: 5,
    }));
    expect(result.pattern).toBe('LANDING_PAGE_ISSUE');
    expect(result.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it('CTR variando muito: não classifica como LANDING_PAGE_ISSUE', () => {
    const result = detectCausalChain(mk({
      ctrDelta: 20,
      conversionRateDelta: -30,
      cpmDelta: 5,
    }));
    expect(result.pattern).not.toBe('LANDING_PAGE_ISSUE');
  });

  it('CR não caiu suficiente: não classifica', () => {
    const result = detectCausalChain(mk({
      ctrDelta: 2,
      conversionRateDelta: -10,
      cpmDelta: 5,
    }));
    expect(result.pattern).not.toBe('LANDING_PAGE_ISSUE');
  });

  it('CPM instável: não classifica', () => {
    const result = detectCausalChain(mk({
      ctrDelta: 2,
      conversionRateDelta: -30,
      cpmDelta: 20,   // fora do ±15 permitido
    }));
    expect(result.pattern).not.toBe('LANDING_PAGE_ISSUE');
  });
});

// ─── HOSTILE_AUCTION ──────────────────────────────────────────────────────────

describe('HOSTILE_AUCTION', () => {
  it('caso típico: CPM explodiu + CTR/CR estáveis', () => {
    const result = detectCausalChain(mk({
      cpmDelta: 35,
      ctrDelta: 5,
      conversionRateDelta: -5,
    }));
    expect(result.pattern).toBe('HOSTILE_AUCTION');
    expect(result.confidence).toBeGreaterThanOrEqual(0.70);
  });

  it('CPM leve: não classifica como HOSTILE_AUCTION', () => {
    const result = detectCausalChain(mk({
      cpmDelta: 15,
      ctrDelta: 5,
      conversionRateDelta: -5,
    }));
    expect(result.pattern).not.toBe('HOSTILE_AUCTION');
  });

  it('CTR também variou: não classifica', () => {
    const result = detectCausalChain(mk({
      cpmDelta: 35,
      ctrDelta: -20,
      conversionRateDelta: -5,
    }));
    expect(result.pattern).not.toBe('HOSTILE_AUCTION');
  });

  it('signals contêm informação do CPM', () => {
    const result = detectCausalChain(mk({
      cpmDelta: 40,
      ctrDelta: 3,
      conversionRateDelta: 2,
    }));
    expect(result.pattern).toBe('HOSTILE_AUCTION');
    expect(result.signals.some(s => s.includes('40'))).toBe(true);
  });
});

// ─── UNKNOWN ──────────────────────────────────────────────────────────────────

describe('UNKNOWN', () => {
  it('métricas normais → UNKNOWN com confidence 0', () => {
    const result = detectCausalChain(base);
    expect(result.pattern).toBe('UNKNOWN');
    expect(result.confidence).toBe(0);
    expect(result.signals).toHaveLength(0);
  });

  it('métricas contraditórias → UNKNOWN', () => {
    const result = detectCausalChain(mk({
      frequency: 1.5,
      ctrDelta: 10,
      cpmDelta: 5,
      conversionRateDelta: 5,
      reachDelta: 10,
    }));
    expect(result.pattern).toBe('UNKNOWN');
    expect(result.confidence).toBe(0);
  });
});

// ─── Prioridade ───────────────────────────────────────────────────────────────

describe('Prioridade entre padrões', () => {
  it('AUDIENCE_SATURATION vence CREATIVE_FATIGUE quando ambos se qualificam', () => {
    // Métricas que satisfazem ambos os padrões:
    // AS: freq>4 + reach<-10 + ctr<-20 + cpm>15 → confidence 0.85
    // CF: freq>3 + ctr<-15 + |cpm|<20 → confidence 0.80
    const result = detectCausalChain(mk({
      frequency: 4.5,
      reachDelta: -12,
      ctrDelta: -22,
      cpmDelta: 16,
    }));
    expect(result.pattern).toBe('AUDIENCE_SATURATION');
    expect(result.confidence).toBeGreaterThan(0.80);
  });

  it('confidence nunca excede 1.0', () => {
    // CREATIVE_FATIGUE com sinal secundário muito forte
    const result = detectCausalChain(mk({
      frequency: 3.5,
      ctrDelta: -20,
      cpmDelta: 5,
      conversionRateDelta: -50,
    }));
    expect(result.confidence).toBeLessThanOrEqual(1.0);
  });
});
