# US-27: Granger Causality + Hook Rate + Social Proof Velocity
**Status:** Ready
**Epic:** [EPIC-STAT-ENGINE](epics/EPIC-STAT-ENGINE.md)
**Prioridade:** 🟡 Média
**Pontos:** 8
**Criado por:** @sm (River) | **Validado por:** @po (Pax)

---

## Descrição

O dashboard hoje mostra correlações mas não causalidade. Um gerente de tráfego não consegue
responder: "Anúncios pagos causam crescimento orgânico?" — apenas ver que as duas séries
sobem juntas.

Esta story adiciona:
1. **Granger Causality Test** — dado X Granger-causa Y além do que Y prevê a si mesmo?
2. **Hook Rate** — % de visualizações que passam dos 3s (proxy de retenção de Reel)
3. **Social Proof Velocity** — taxa de crescimento de comentários na janela de 2h pós-publicação
4. **Fogg Behavior Score** — pontuação B=MAP por post baseada em signals disponíveis

---

## Critérios de Aceitação

**AC-1 — Granger Causality Test:**
- `grangerTest(x, y, maxLag?)` retorna `{ fStat, pValue, significant, causalDirection, lagUsed }`
- Implementação: VAR(p=1 default, p=2 se serie longa) via dois OLS
  - Modelo restrito: `y[t] = a0 + a1*y[t-1]`
  - Modelo irrestrito: `y[t] = a0 + a1*y[t-1] + b1*x[t-1]`
  - F-stat: `((RSS_r - RSS_u) / p) / (RSS_u / (n - 2p - 1))`
- `pValue` via F-distribution CDF (approx via `normalCDF` de math-core.ts para df2 > 30)
- `causalDirection`: 'x_causes_y' | 'y_causes_x' | 'bidirectional' | 'none'
  - Testa ambas as direções automaticamente
- Guard: mínimo 20 pontos para resultado confiável

**AC-2 — Hook Rate:**
- `hookRate(videoAvgWatchTime, videoDuration)` retorna `{ hookRate, classification, benchmark }`
- `hookRate = (avg_watch_time / 3) * (1 / video_duration) * 100` — proxy via tempo médio
- Nota: sem acesso ao dado exato de "3s views", usamos watch_time como proxy
- `classification`: 'excelente' (>70%) | 'bom' (50-70%) | 'médio' (30-50%) | 'baixo' (<30%)
- `benchmark`: benchmark de referência do setor por tipo de conteúdo

**AC-3 — Social Proof Velocity:**
- `socialProofVelocity(commentTimestamps, publishedAt, windowHours?)` retorna `{ velocity, peak2hScore, classification }`
- `velocity` = comentários nas primeiras `windowHours` (default 2h) / total de comentários
- `peak2hScore` = normalizado 0-100 relativo ao histórico da conta
- `classification`: 'viral' (>60% em 2h) | 'forte' (40-60%) | 'normal' (20-40%) | 'fraco' (<20%)
- Fallback quando timestamps não disponíveis: retorna null com `dataUnavailable: true`

**AC-4 — Fogg Behavior Score:**
- `foggBehaviorScore(post)` retorna `{ motivation, ability, prompt, totalScore, classification }`
- `motivation` (0-33): sentiment positivo + buying intent + sensory language score
- `ability` (0-33): post curto/direto (≤150 chars caption) + CTA claro + formato visual
- `prompt` (0-34): urgency triggers + call-to-action detectado + horário de pico
- `totalScore` = motivation + ability + prompt (0-100)
- Reutiliza funções de `sentiment.ts` internamente

**AC-5 — Organic-Paid Halo Metric:**
- `organicPaidHalo(paidCampaignDates, organicFollowerSeries)` retorna `{ haloEffect, liftDays, significance }`
- Compara crescimento médio de seguidores em janela de 7 dias pós-campanha vs baseline
- `haloEffect` = diferença percentual vs média histórica
- `significance`: 'high' | 'medium' | 'low' baseado em consistência entre campanhas

---

## Scope

**IN:**
- Arquivo `lib/utils/causal-behavioral.ts`
- Funções: `grangerTest`, `hookRate`, `socialProofVelocity`, `foggBehaviorScore`, `organicPaidHalo`

**OUT:**
- Shapley attribution (complexidade alta — epic separado)
- Markov Chain attribution (epic separado)
- Modificação de qualquer arquivo existente

---

## Dependências

- `lib/utils/math-core.ts` (importar `olsSimple`, `normalCDF`)
- `lib/utils/sentiment.ts` (importar `detectBuyingIntent`, `detectUrgencyTriggers`, `sensoryLanguageScore`)
- US-24, US-25, US-26 não são prerequisitos

---

## Riscos

- `grangerTest` pode produzir F-stat instável para series muito curtas ou com multicolinearidade — documentar guards
- `socialProofVelocity` depende de timestamps detalhados que a Meta API pode não fornecer para posts antigos

---

## File List

- `lib/utils/causal-behavioral.ts` (CRIAR)

---

## Change Log

| Data | Agente | Ação |
|------|--------|------|
| 2026-03-14 | @sm (River) | Story criada |
| 2026-03-14 | @po (Pax) | Validada — GO (8/10) |
| 2026-03-14 | @dev (Dex) | Implementação iniciada |
