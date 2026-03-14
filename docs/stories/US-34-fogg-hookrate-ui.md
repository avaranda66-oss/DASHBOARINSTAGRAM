# US-34: Score Fogg no Storyboard + Hook Rate nos Reels
**Status:** Ready
**Epic:** [EPIC-STAT-ENGINE](epics/EPIC-STAT-ENGINE.md)
**Prioridade:** 🟡 Média
**Pontos:** 5
**Criado por:** @sm (River) | **Validado por:** @po (Pax)

---

## Descrição

`foggBehaviorScore` e `hookRate` existem mas não aparecem em lugar nenhum na UI.

- **Fogg Score no Storyboard**: cada ContentCard exibe um badge com o score previsto de
  impacto comportamental (0-100), calculado a partir do título/descrição e tipo de conteúdo.
  Ajuda o criador a identificar cards com baixo potencial ANTES de publicar.

- **Hook Rate nos Reels**: o MetaReelsChart exibe o hook rate médio dos reels da conta,
  calculado via `ig_reels_avg_watch_time` (dado disponível na MetaPostMetrics). Mostra
  classificação (excelente/bom/médio/baixo) e benchmark do setor.

---

## Critérios de Aceitação

**AC-1 — Fogg no Storyboard:**
- `ContentCard` importa `foggBehaviorScore` de `lib/utils/causal-behavioral.ts`
- Calcula com: `caption = content.title + ' ' + (content.description || '')`, `contentType` mapeado do `content.type`, `publishedHour` de `content.scheduledAt`
- Exibe badge pequeno no footer do card: `[FOGG: 73]` colorido por classificação
- `alto_impacto` → verde (#A3E635), `moderado` → amarelo (#FBBF24), `baixo_impacto` → cinza (#4A4A4A)
- Score computado com `useMemo` para evitar re-cálculo desnecessário

**AC-2 — Hook Rate nos Reels:**
- `MetaReelsChart` atualiza interface `MetaPost` para incluir `ig_reels_avg_watch_time?: number`
- Calcula hook rate médio dos reels usando `hookRate(avgWatchMs, 30000)` (30s = duração padrão de reel)
- Exibe badge com valor + classificação no painel de stats de reels
- Se nenhum reel tem `ig_reels_avg_watch_time`, silencia (não exibe badge)

---

## Scope

**IN:**
- `features/storyboard/components/content-card.tsx` (MODIFICAR)
- `features/analytics/components/meta-reels-chart.tsx` (MODIFICAR)

**OUT:** Integração do Fogg Score em posts publicados (dados históricos)

---

## File List

- `features/storyboard/components/content-card.tsx` (MODIFICAR)
- `features/analytics/components/meta-reels-chart.tsx` (MODIFICAR)

---

## Change Log

| Data | Agente | Ação |
|------|--------|------|
| 2026-03-14 | @sm (River) | Story criada |
| 2026-03-14 | @po (Pax) | Validada — GO (10/10) |
| 2026-03-14 | @dev (Dex) | Implementação iniciada |
