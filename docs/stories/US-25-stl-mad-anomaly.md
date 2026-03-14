# US-25: STL Decomposition + MAD Adaptive CUSUM
**Status:** Ready
**Epic:** [EPIC-STAT-ENGINE](epics/EPIC-STAT-ENGINE.md)
**Prioridade:** 🔴 Alta
**Pontos:** 5
**Criado por:** @sm (River) | **Validado por:** @po (Pax)

---

## Descrição

O CUSUM atual (`forecasting.ts:cusumDetect`) usa threshold = 1.0 * stdDev global da série.
Problema: séries de engajamento do Instagram têm sazonalidade semanal forte (fins de semana
diferem de dias úteis). Aplicar CUSUM direto gera alarmes falsos toda semana.

A solução é decomposição STL simplificada (separa tendência + sazonalidade + resíduo) e
aplicar CUSUM apenas nos resíduos. Adicionalmente, substituir stdDev por MAD (Median
Absolute Deviation) como estimador robusto de escala.

---

## Critérios de Aceitação

**AC-1 — STL Simplificado:**
- `stlDecompose(data, period?)` retorna `{ trend, seasonal, residual, original }`
- `trend`: suavização por média móvel centrada de comprimento `period`
- `seasonal`: média dos desvios em cada posição do ciclo (ex: cada segunda-feira)
- `residual`: `original - trend - seasonal`
- Período default: 7 (sazonal semanal)
- Guard: se `data.length < 2 * period`, retorna residual = data (sem decomposição)

**AC-2 — MAD Adaptive Threshold:**
- `madScore(values)` retorna `{ mad, median, modifiedZScores[] }`
- `modified_z_i = 0.6745 * (x_i - median) / MAD`
- Threshold padrão: |modified_z| > 3.5 (Iglewicz & Hoaglin, 1993)
- `madAnomalyDetect(values, threshold?)` retorna `{ anomalies: number[], scores: number[] }`
- `anomalies`: índices onde |modified_z| > threshold

**AC-3 — CUSUM sobre resíduos:**
- `stlCusum(data, options?)` retorna `{ changePoints, decomposition, cusumPos, cusumNeg }`
- Internamente: decompõe com `stlDecompose`, aplica `cusumDetect` nos resíduos
- Threshold default: 2.5 * MAD (em vez de 1.0 * stdDev)
- `decomposition` exposto para debug/visualização

**AC-4 — Detecção multi-variada básica:**
- `multivariateAnomalyScore(metrics: Record<string, number[]>)` retorna `{ scores: number[], anomalyIndices: number[] }`
- Combina MAD scores de múltiplas séries via média geométrica
- Detecta quando MÚLTIPLAS métricas caem simultaneamente (shadow ban pattern)

---

## Scope

**IN:**
- Arquivo `lib/utils/anomaly-detection.ts`
- Funções: `stlDecompose`, `madScore`, `madAnomalyDetect`, `stlCusum`, `multivariateAnomalyScore`

**OUT:**
- Substituição do `cusumDetect` existente (não quebrar retrocompatibilidade)
- LOESS real (usa média móvel simples como proxy — suficiente para period=7)
- Isolation Forest (complexidade alta — reservado para futura story)

---

## Dependências

- Nenhuma dependência de story anterior

---

## Riscos

- Média móvel centrada perde `floor(period/2)` pontos no início e fim — documentar e preencher com NaN/último valor
- Para séries muito curtas (< 21 pontos), STL é instável — usar guard e fallback

---

## File List

- `lib/utils/anomaly-detection.ts` (CRIAR)

---

## Change Log

| Data | Agente | Ação |
|------|--------|------|
| 2026-03-14 | @sm (River) | Story criada |
| 2026-03-14 | @po (Pax) | Validada — GO (9/10) |
| 2026-03-14 | @dev (Dex) | Implementação iniciada |
