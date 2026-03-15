# US-35: InsightEngine — Motor de Alertas com Priority Queue

**Status:** Done
**Epic:** [EPIC-STAT-ENGINE](epics/EPIC-STAT-ENGINE.md)
**Prioridade:** 🔴 Alta
**Pontos:** 8
**Criado por:** @sm (River) | **Validado por:** @po (Pax) | **Analisado por:** @aios-master (Orion)

---

## Descrição

O sistema atual detecta anomalias (stlDecompose, madScore) e prevê séries (holtWintersWithPI),
mas **não tem camada de priorização, deduplicação ou entrega** de insights. Cada KPI dispara
seus próprios alertas de forma independente — sem ranking por impacto de negócio, sem cooldown
para suprimir repetição, sem fila ordenada por criticidade.

Esta story implementa o `InsightEngine`: uma priority queue (binary max-heap) + motor de
scoring que consome saídas dos módulos existentes e produz `Insight[]` rankeados, deduplicados
e prontos para exibição na UI.

Baseado na análise da pesquisa Perplexity (score 68/100), com correções arquiteturais:
- `normalizeImpact` recebe `cap` como parâmetro (não hardcoded)
- `processPoint` aceita `now?: number` para testabilidade determinística
- `AB_WINNER_DETECTED` integra com `bayesianAB` de `bayesian-ab.ts`
- `FORECAST_MISS` integra com `holtWintersWithPI` de `hw-optimizer.ts`
- `ANOMALY` integra com `madScore` de `anomaly-detection.ts`

---

## Critérios de Aceitação

**AC-1:** `InsightQueue` implementa binary max-heap sem dependências externas:
- `push(insight)`, `pop(): Insight | undefined`, `peek(): Insight | undefined`, `size(): number`
- Ordenação por `score` decrescente
- Métodos privados `bubbleUp` e `bubbleDown` corretamente implementados

**AC-2:** `processPoint(point, type, now?)` — `now` é opcional (default `Date.now()`) para testabilidade:
- Se `point.stdDev <= 0`, retorna sem ação
- Calcula z-score: `(value - expected) / stdDev`
- Descarta se `|z| < config.zCritical`
- Calcula `signalNorm = min(|z| / 5, 1)`
- Calcula `impactNorm = normalizeImpact(|delta| * (revenueBaseline ?? 1), config.impactCap)`

**AC-3:** Deduplicação por cooldown:
- Mantém `Map<string, number>` de `{key → lastShownAt}`
- Suprime insight se `(now - last) < coolDownMs` E `score < 2 × recentScore(key)`
- Chave: `[kpiId, entityId ?? 'global', type, direction].join('|')`

**AC-4:** Classificação de severidade:
- `CRITICAL`: `|z| > 3` e `impactNorm > 0.5`
- `WARN`: `|z| > 2.5`
- `INFO`: demais

**AC-5:** Tipos de insight integrados com módulos existentes:
- `ANOMALY` → consumir output de `madScore()` de `anomaly-detection.ts`
- `FORECAST_MISS` → consumir output de `holtWintersWithPI()` de `hw-optimizer.ts`
- `AB_WINNER_DETECTED` → consumir output de `bayesianAB()` de `bayesian-ab.ts` quando `posteriorProbB > config.abThreshold` (default 0.95)
- `CREATIVE_FATIGUE` → score via `scoreFatigue()` de `creative-scorer.ts` (US-36, dep opcional)

**AC-6:** `getTopN(n: number): Insight[]` — drena os N maiores do heap

**AC-7:** `EngineConfig` tipado com todos os campos obrigatórios:
```typescript
interface EngineConfig {
  zCritical: number;       // ex: 2.0 ≈ 95%, 2.6 ≈ 99%
  coolDownMs: number;      // ex: 86_400_000 (24h)
  wSignal: number;         // peso do sinal (0-1)
  wImpact: number;         // peso do impacto (0-1)
  impactCap: number;       // ex: 1_000_000 (R$1M configurável)
  abThreshold: number;     // ex: 0.95 para AB_WINNER
}
```

**AC-8:** Zero uso de `Math.random()`, zero dependências externas

**AC-9:** TypeScript estrito — zero `any` implícito, todas as funções com tipos de retorno explícitos

**AC-10:** Arquivo exporta: `InsightQueue`, `InsightEngine` e todos os tipos de interface

---

## Scope

**IN:**
- `lib/utils/insight-engine.ts` (CRIAR)

**OUT:**
- Integração na UI (stories US-31 a US-34 cobrem isso)
- Persistência em banco de dados
- Envio por e-mail/Slack/webhook

---

## Dependências

| Módulo | Função | Como Usar |
|--------|--------|-----------|
| `anomaly-detection.ts` | `madScore()` | Popular `KpiPoint.stdDev` e `zScore` para tipo `ANOMALY` |
| `hw-optimizer.ts` | `holtWintersWithPI()` | Popular `KpiPoint.expected`, `lower`, `upper` para tipo `FORECAST_MISS` |
| `bayesian-ab.ts` | `bayesianAB()` | Disparar `AB_WINNER_DETECTED` quando `posteriorProbB > abThreshold` |

---

## Notas de Implementação

### Correções vs pesquisa original
1. `normalizeImpact(revenue, cap)` — `cap` como parâmetro em `EngineConfig`, não hardcoded
2. `processPoint(..., now?: number)` — aceita timestamp externo para testes determinísticos
3. Duas Maps redundantes (`lastShown` + `recentScores`) unificadas em `Map<string, {lastShownAt: number; score: number}>`
4. `AB_WINNER_DETECTED` conecta ao `bayesianAB()` real — não apenas um tipo simbólico

### Integração futura
O `InsightEngine` é instanciado no server-side (route handler ou `lib/services/`) e os
insights resultantes são passados para componentes de UI como props. A UI reativa (US-31 a
US-34) consome `Insight[]` — não o engine diretamente.

---

## File List

- `lib/utils/insight-engine.ts` (CRIAR)

---

## Change Log

| Data | Agente | Ação |
|------|--------|------|
| 2026-03-14 | @aios-master (Orion) | Análise crítica — score 68/100, aprovado |
| 2026-03-14 | @sm (River) | Story criada |
| 2026-03-14 | @po (Pax) | Validada — GO |
| 2026-03-14 | @dev (Dex) | Implementado: `lib/utils/insight-engine.ts` |
| 2026-03-14 | @qa (Quinn) | QA Gate PASS — TSC: 0 erros, ESLint: 0 warnings |
