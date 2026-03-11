# US-18: Dashboard de Audiencia (Demographics + Growth)

**Status:** Ready
**Prioridade:** ALTA
**Estimativa:** 5-6 horas
**Depende de:** US-16
**Branch:** v2-dashboard

---

## Descricao

Criar nova aba/secao "Audiencia" na Minha Conta com graficos de crescimento de seguidores, demographics (idade, genero, cidade, pais) e tendencia de reach/engagement da conta ao longo do tempo. Usa dados de account-level insights (US-16).

---

## Acceptance Criteria

### AC-1: Nova aba "Audiencia" no MinhaContaView
- [ ] Adicionar tab "Audiencia" ao tab bar existente (apos "Estrategia IA")
- [ ] Tab renderiza novos componentes quando selecionada

### AC-2: Componente `MetaAccountTrends`
- [ ] Grafico AreaChart (recharts) com metricas diarias da conta
- [ ] Toggle entre: Reach, Views, Engagement, Likes, Saves, Shares
- [ ] X-axis: datas (ultimos 30 dias)
- [ ] Y-axis: valor da metrica selecionada
- [ ] Tooltip com valor exato + data
- [ ] Design V2 (glassmorphism)

### AC-3: Componente `MetaFollowerGrowth`
- [ ] Grafico BarChart mostrando follows/unfollows diarios
- [ ] Bars verdes (follows) e vermelhas (unfollows)
- [ ] Linha de tendencia net growth
- [ ] Total de crescimento no periodo como KPI

### AC-4: Componente `MetaAudienceDemographics`
- [ ] 4 sub-graficos:
  - **Genero:** PieChart (Masculino/Feminino/Outro)
  - **Idade:** BarChart horizontal (faixas etarias)
  - **Top Cidades:** BarChart horizontal (top 10)
  - **Top Paises:** BarChart horizontal (top 10)
- [ ] Toggle entre "Seguidores" e "Publico Engajado"
- [ ] Mostrar mensagem amigavel se conta tem <100 followers

### AC-5: Fetch de dados
- [ ] Chamar `/api/meta-account-insights` ao entrar na aba
- [ ] Cache local (nao refetch se ja tem dados recentes)
- [ ] Loading skeleton durante fetch
- [ ] Error state com retry

---

## Escopo

**IN:**
- 3 novos componentes de UI
- Nova aba no MinhaContaView
- Integracao com endpoint `/api/meta-account-insights`

**OUT:**
- Backend (US-16)
- Business Discovery (US-19)

---

## Criterio de Done
- [ ] Aba "Audiencia" aparece e renderiza graficos
- [ ] Dados reais da conta sao exibidos
- [ ] Demographics mostra genero, idade, cidades, paises
- [ ] Growth chart mostra follows/unfollows
- [ ] Design V2 consistente
- [ ] `npm run build` passa

---

## File List
- [ ] `features/analytics/components/meta-account-trends.tsx` — NOVO
- [ ] `features/analytics/components/meta-follower-growth.tsx` — NOVO
- [ ] `features/analytics/components/meta-audience-demographics.tsx` — NOVO
- [ ] `features/analytics/components/minha-conta-view.tsx` — Adicionar aba
