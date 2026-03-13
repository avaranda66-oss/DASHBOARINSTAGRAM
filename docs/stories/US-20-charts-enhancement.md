# US-20: Melhorias nos Graficos Existentes

**Status:** Ready
**Prioridade:** MEDIA
**Estimativa:** 2-3 horas
**Depende de:** US-15
**Branch:** v2-dashboard

---

## Descricao

Enriquecer os 3 graficos existentes (Timeline, Content Type, Posting Day) com dados extras agora disponiveis apos as correcoes da US-15, e adicionar analise de horario ideal.

---

## Acceptance Criteria

### AC-1: MetaPostingDayChart — Expandir metricas
- [ ] Adicionar toggle para trocar metrica: Reach (atual), Likes, Saves, Shares
- [ ] Adicionar segunda barra com "avg engagement" por dia
- [ ] Manter destaque do melhor dia

### AC-2: MetaTimelineChart — Adicionar metricas
- [ ] Adicionar opcao de ver Likes e Comments ao longo do tempo (toggle)
- [ ] Adicionar linha de tendencia (moving average 3 posts)
- [ ] Usar `media_product_type` para colorir pontos (FEED vs REELS)

### AC-3: Novo grafico — Best Hour to Post
- [ ] Componente `MetaBestHourChart`
- [ ] Heatmap ou bar chart com hora do dia (0-23h) vs metrica
- [ ] Extrair hora do `timestamp` de cada post
- [ ] Agrupar por hora e calcular media de reach
- [ ] Destacar melhor horario

### AC-4: Novo grafico — Reels Performance
- [ ] Componente `MetaReelsChart`
- [ ] Filtrar apenas posts com `media_product_type === 'REELS'`
- [ ] Mostrar: avg watch time, views, saves, shares
- [ ] Comparar reels vs feed posts (reach medio)

---

## Escopo

**IN:**
- Melhorias nos 3 graficos existentes
- 2 novos componentes de grafico
- Integracao na aba "Graficos" do MinhaContaView

**OUT:**
- Account-level insights graficos (US-18)
- Demographics graficos (US-18)

---

## Criterio de Done
- [ ] Posting Day chart tem toggle de metricas
- [ ] Timeline chart tem opcoes extras + trend line
- [ ] Best Hour chart renderiza com dados reais
- [ ] Reels chart mostra performance de reels
- [ ] Design V2 consistente
- [ ] `npm run build` passa

---

## File List
- [ ] `features/analytics/components/meta-posting-day-chart.tsx` — Expandir
- [ ] `features/analytics/components/meta-timeline-chart.tsx` — Expandir
- [ ] `features/analytics/components/meta-best-hour-chart.tsx` — NOVO
- [ ] `features/analytics/components/meta-reels-chart.tsx` — NOVO
- [ ] `features/analytics/components/minha-conta-view.tsx` — Adicionar novos graficos
