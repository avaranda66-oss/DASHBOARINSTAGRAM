# US-33: Forecast Chart com Banda de Confiança 80%/95% nos Ads
**Status:** Ready
**Epic:** [EPIC-STAT-ENGINE](epics/EPIC-STAT-ENGINE.md)
**Prioridade:** 🟡 Média
**Pontos:** 5
**Criado por:** @sm (River) | **Validado por:** @po (Pax)

---

## Descrição

A aba GRÁFICOS dos Ads mostra histórico mas sem previsão. Adicionar gráfico de forecast
de gasto dos próximos 7 dias com bandas de confiança 80% e 95% via `holtWintersWithPI`.

O gráfico exibe dados históricos + previsão conectados visualmente, permitindo ao
gestor de tráfego ver o orçamento projetado antes que acabe.

---

## Critérios de Aceitação

**AC-1:** Novo componente `AdsForecastChart` recebe `daily: DailyAdInsight[]`
**AC-2:** Extrai série de `spend` dos dailyInsights, roda `holtWintersWithPI(series, { period: 7, h: 7 })`
**AC-3:** Combina dados históricos + 7 pontos de forecast em array unificado para o chart
**AC-4:** Recharts AreaChart com 3 layers: PI95 (mais opaco), PI80 (médio), linha de forecast
**AC-5:** Dados históricos exibidos com linha sólida, previsão com linha tracejada
**AC-6:** Tooltip diferencia "Histórico" vs "Forecast" + mostra PI bounds
**AC-7:** Mínimo de 14 pontos históricos para ativar; abaixo disso exibe mensagem
**AC-8:** Adicionado em `ads-charts.tsx` como novo `BlueprintChartContainer`

---

## Scope

**IN:**
- `features/ads/components/ads-forecast-chart.tsx` (CRIAR)
- `features/ads/components/ads-charts.tsx` (MODIFICAR — adicionar AdsForecastChart)

**OUT:** Forecast de outras métricas além de spend (na primeira versão)

---

## File List

- `features/ads/components/ads-forecast-chart.tsx` (CRIAR)
- `features/ads/components/ads-charts.tsx` (MODIFICAR)

---

## Change Log

| Data | Agente | Ação |
|------|--------|------|
| 2026-03-14 | @sm (River) | Story criada |
| 2026-03-14 | @po (Pax) | Validada — GO (10/10) |
| 2026-03-14 | @dev (Dex) | Implementação iniciada |
