# US-17: Overhaul dos KPI Cards (Dados Reais)

**Status:** Ready
**Prioridade:** ALTA
**Estimativa:** 3-4 horas
**Depende de:** US-15, US-16
**Branch:** v2-dashboard

---

## Descricao

Redesenhar os KPI Cards da aba "Minha Conta" para exibir dados reais e uteis em vez dos 3 cards que mostram "N/D" permanentemente. Substituir metricas fantasma (Qualified Engagement, Sentiment) por metricas reais da API (Reach, Saves, Shares, Followers, Watch Time).

---

## Acceptance Criteria

### AC-1: Novos KPI Cards (substituir os inuteis)
- [ ] **Card 1: Followers** — `followers_count` do perfil (delta vs ultimo fetch)
- [ ] **Card 2: Total Reach** — soma de `reach` de todos os posts
- [ ] **Card 3: Total Likes** — soma de `likesCount` (ja existe, manter)
- [ ] **Card 4: Total Saves** — soma de `saved` (PROMOVER de tabela para KPI)
- [ ] **Card 5: Total Shares** — soma de `shares` (PROMOVER de tabela para KPI)
- [ ] **Card 6: Total Comments** — soma de `commentsCount` (ja existe, manter)
- [ ] **Card 7: Engagement Rate** — (likes+comments+saves+shares) / reach * 100
- [ ] **Card 8: Avg Watch Time** — media de `ig_reels_avg_watch_time` (so reels, "N/D" se nao tiver reels)

### AC-2: Cada card deve ter
- [ ] Valor principal formatado (ex: "12.5K")
- [ ] Sparkline de tendencia (ultimos N posts ordenados por data)
- [ ] Delta % vs periodo anterior (se disponivel)
- [ ] Badge de performance (usando `performanceBadge` de `statistics.ts`)
- [ ] Trend indicator (usando `linearTrend` de `statistics.ts`)

### AC-3: Remover dados falsos
- [ ] Remover "Qualified Engagement" (nunca tem dados)
- [ ] Remover "Sentiment" (nunca tem dados)
- [ ] Remover "Views (Reels)" antigo (substituido pelo novo card ou views geral)

### AC-4: Responsividade
- [ ] Grid 2 colunas em mobile
- [ ] Grid 4 colunas em desktop
- [ ] Cards compactos com informacao densa

---

## Escopo

**IN:**
- Redesign do componente `kpi-cards.tsx` para dados Meta
- Novo componente ou adaptacao para receber dados de account insights
- Integracao com `statistics.ts` existente

**OUT:**
- Graficos de account insights (US-18)
- Demographics (US-18)
- Backend changes (US-15, US-16)

---

## Criterio de Done
- [ ] Todos os 8 KPIs exibem dados reais (nenhum "N/D" permanente)
- [ ] Sparklines renderizam corretamente
- [ ] Design V2 (glassmorphism) mantido
- [ ] `npm run build` passa

---

## File List
- [ ] `features/analytics/components/kpi-cards.tsx` — Overhaul completo
- [ ] `features/analytics/components/minha-conta-view.tsx` — Atualizar props passadas
