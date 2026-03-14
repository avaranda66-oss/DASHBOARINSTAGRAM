# DASHBOARD OSS — MASTER PLAN V2
**Orquestrado por:** Orion (AIOS Master)
**Data:** 2026-03-14 | **Última atualização:** 2026-03-14 (pós-sprint US-50→US-71)
**Branch:** v2-dashboard
**Status do projeto:** FASE 1 CONCLUÍDA — Motor estatístico + indicadores avançados + UI integrada. Próxima fase: EPIC-REALTIME + EPIC-EXPORT

---

## 0. SPRINT CONCLUÍDA — FASE 1 COMPLETA (commit 8deeb86)

| Story | Descrição | Status | Commit |
|-------|-----------|--------|--------|
| US-50 | engagementScore midpoint dinâmico | ✅ DONE | 8deeb86 |
| US-51 | STL-CUSUM na InsightEngine (B-03 fix) | ✅ DONE | 8deeb86 |
| US-52 | postingConsistencyIndex target configurável | ✅ DONE | 8deeb86 |
| US-53 | Ads Efficiency Panel (Michaelis-Menten) | ✅ DONE | 8deeb86 |
| US-54 | Creative Half-Life badge | ✅ DONE | 8deeb86 |
| US-55 | Viral Potential Index KPI card | ✅ DONE | 8deeb86 |
| US-71 | weightedRecentTrend WLS por recência | ✅ DONE | 8deeb86 |
| B-03 | STL-CUSUM bridge (falsos positivos fix) | ✅ DONE | 8deeb86 |
| B-05 | Budget display em centavos | ✅ NÃO ERA BUG (já divide /100) | — |

**Build:** ✅ Zero erros | **TypeScript:** ✅ Zero erros | **Arquivos alterados:** 7 (+759 linhas)

---

## 1. ESTADO ATUAL — INVENTÁRIO COMPLETO

### 1.1 Motor Estatístico (lib/utils/) — 16 arquivos, 7.239 linhas

| Arquivo | Funções principais | Conectado à UI? |
|---------|-------------------|----------------|
| `statistics.ts` | 34 funções: engagement, trends, consistency | ✅ Parcial |
| `bayesian-ab.ts` | Beta-Binomial, Chi², SPRT, Fisher | ✅ ads-ab-test-card |
| `attribution.ts` | Shapley Values + Markov Chain | ✅ ads-attribution-section |
| `hw-optimizer.ts` | Grid 729 params, aditivo/multiplicativo, PI 80%/95% | ✅ ads-forecast-chart |
| `insight-engine.ts` | Binary max-heap, dedup, scoring composto | ✅ ads-insights-feed |
| `anomaly-detection.ts` | MAD z-score, outliers | ✅ ads-anomaly-multivariate |
| `isolation-forest.ts` | Isolation Forest multivariado | ✅ ads-anomaly-multivariate |
| `causal-behavioral.ts` | Modelos causais comportamentais | ✅ Parcial |
| `creative-scorer.ts` | Score criativo multi-dimensional | ✅ ads-creative-performance |
| `mmm.ts` | Marketing Mix Model, Adstock | ✅ ads-mmm-section |
| `incrementality.ts` | ITS, bootstrap diff means | ✅ ads-incrementality-section |
| `budget-optimizer.ts` | Markowitz-like allocation | ✅ ads-budget-allocation |
| `sentiment.ts` | Análise de sentimento PT-BR | ✅ Parcial |
| `forecasting.ts` | Holt-Winters, CUSUM | ✅ via hw-optimizer |
| `math-core.ts` | normalCDF, bootstrapCI, OLS | Interno |
| `advanced-indicators.ts` | Elasticidade, meia-vida, Michaelis-Menten | ❌ NÃO CONECTADO |

### 1.2 UI Components (features/ads/components/) — 18 arquivos

| Componente | Story | Status |
|-----------|-------|--------|
| `ads-intelligence-panel-v2.tsx` | Core | ✅ v2 HUD |
| `ads-insights-feed.tsx` | US-42 | ✅ InsightEngine conectado |
| `ads-ab-test-card.tsx` | US-24 | ✅ |
| `ads-anomaly-multivariate.tsx` | US-44 | ✅ |
| `ads-attribution-section.tsx` | US-45 | ✅ Shapley |
| `ads-video-metrics-section.tsx` | **US-38** | ✅ NOVO |
| `ads-quality-rankings-section.tsx` | **US-39** | ✅ NOVO |
| `ads-charts.tsx` | Core | ✅ |
| `ads-creative-performance.tsx` | Core | ✅ |
| `ads-forecast-chart.tsx` | US-26 | ✅ |
| `ads-budget-allocation.tsx` | Core | ✅ |
| `ads-mmm-section.tsx` | Core | ✅ |
| `ads-incrementality-section.tsx` | Core | ✅ |
| `ads-ai-panel.tsx` | Core | ✅ |
| `ads-kpi-cards.tsx` | Core | ✅ |
| `campaigns-table.tsx` | Core | ✅ |
| `creatives-gallery.tsx` | Core | ✅ |

### 1.3 Service Layer

| Arquivo | LOC | Status |
|---------|-----|--------|
| `lib/services/facebook-ads.service.ts` | 934 | ✅ 7 fixes v25 aplicados (2026-03-14) |
| `types/ads.ts` | 315 | ✅ tipos v25 adicionados |

**Fixes aplicados (commit b784ece):**
- `act_` prefix duplication em /reachestimate (CRÍTICO)
- `purchase_roas[0]` sem filtro → `extractRoas()` prioriza `omni_purchase`
- `outbound_clicks_ctr[0]` sem filtro → `extractOutboundCtr()`
- AdSets v25: `bid_strategy`, `targeting_automation`, `is_adset_budget_sharing_enabled`
- Video metrics + quality rankings em `INSIGHTS_FIELDS`
- Tipos `AdInsight` e `AdSet` expandidos

---

## 2. BUGS CONHECIDOS (priorizados)

### ✅ RESOLVIDOS (sprint 2026-03-14)

| # | Bug | Resolução |
|---|-----|-----------|
| B-01 | `engagementScore` midpoint fixo | ✅ US-50: midpoint dinâmico via `accountHistory[]` |
| B-02 | `postingConsistencyIndex` hardcoded | ✅ US-52: `options.targetPostsPerWeek` configurável |
| B-03 | CUSUM na série bruta | ✅ US-51: STL-CUSUM via `kpiPointFromSTLCUSUM()` |
| B-04 | `advanced-indicators.ts` não conectado | ✅ US-53+54: `ads-efficiency-panel.tsx` + half-life badge |
| B-05 | Budget display em centavos | ✅ NÃO ERA BUG — `campaigns-table.tsx:113` já divide /100 |

### 🟡 PENDENTES

| # | Bug | Arquivo | Impacto |
|---|-----|---------|---------|
| B-06 | Lead dual-tracking sem documentação | `facebook-ads.service.ts:~680` | Pode double-count em contas híbridas |
| B-07 | `reachestimate` v25 deprecation | `facebook-ads.service.ts:584` | Endpoint pode ser removido em v26+ |

---

## 3. PLANO DE ÉPICOS — PRÓXIMO NÍVEL (2000-3000% melhoria)

---

### EPIC-STAT-FIX — Motor Estatístico: Correções de Precisão
**Prioridade:** CRÍTICA | **Esforço:** ~1 dia
**Objetivo:** Corrigir os 3 bugs confirmados no motor que distorcem análises

#### US-50 — engagementScore midpoint dinâmico
**AC:**
- Calcular `midpoint = median(allWeightedValues)` do histórico da conta
- Sigmoid usa midpoint dinâmico em vez de fixo=4
- Função aceita `accountHistory?: number[]` opcional; se ausente, usa 4 como fallback
- Testes unitários: conta pequena vs conta grande devem receber score proporcional

#### US-51 — STL Decomposition + CUSUM nos resíduos
**AC:**
- Implementar `stlDecompose(data, period)` em `forecasting.ts`
- Retorna `{ trend, seasonal, residual }`
- Implementar `cusumOnResiduals(data, period, options)`
- Atualizar `ads-insights-feed.tsx` para usar `cusumOnResiduals` em vez de `cusumDetect` raw
- Falsos positivos de fim de semana devem desaparecer

#### US-52 — postingConsistencyIndex target configurável
**AC:**
- Adicionar `options.targetPostsPerWeek?: number` (default 3)
- `freqScore = clamp((postsPerWeek / target) * 100, 0, 100)`
- Target configurável por tipo de conta (B2B=1, entretenimento=7, etc.)

---

### EPIC-ADVANCED-INDICATORS — Conectar Indicadores Avançados à UI
**Prioridade:** ALTA | **Esforço:** ~2 dias
**Objetivo:** `advanced-indicators.ts` (elasticidade, meia-vida, Michaelis-Menten) está implementado mas INVISÍVEL para o usuário

#### US-53 — Ads Efficiency Panel: Elasticidade + Diminishing Returns
**AC:**
- Novo componente `ads-efficiency-panel.tsx`
- Gráfico de curva Michaelis-Menten (spend × ROAS) por campanha
- Display: "Saturação em X% do budget atual"
- Ponto ótimo de budget destacado na curva
- Integrado no Intelligence Panel após Budget Allocation

#### US-54 — Creative Half-Life Display
**AC:**
- Na `ads-creative-performance.tsx`, adicionar coluna "Meia-Vida"
- Usar `creativeHalfLife()` de `advanced-indicators.ts`
- Badge: "⚡ FRESCO" / "⚠️ ENVELHECENDO" / "🔴 ESGOTADO"
- Threshold: <3 dias = fresco, 3-7 = envelhecendo, >7 = esgotado

#### US-55 — New KPI: Viral Potential Index
**AC:**
- Implementar `viralPotentialIndex()` em `statistics.ts`
- Pesos: shares(45%) + saves(35%) + comments qualificados(20%)
- Exibir no `ads-kpi-cards.tsx` como KPI de destaque
- Badge: VIRAL / ALTO / MODERADO / BAIXO

---

### EPIC-REALTIME — Live Data & Auto-Refresh
**Prioridade:** ALTA | **Esforço:** ~3 dias
**Objetivo:** Dashboard atualiza automaticamente sem F5

#### US-56 — Auto-Refresh com Polling Inteligente
**AC:**
- Configuração: intervalo de refresh (5min / 15min / 30min / manual)
- Indicador visual de "última atualização há X minutos"
- Pausa automática ao perder foco da aba (não desperdiça requests)
- Toast discreto quando novos dados chegam
- Persiste preferência em localStorage

#### US-57 — Request Deduplication (debounce + cache)
**AC:**
- Deduplicador de requests simultâneos idênticos
- Cache com TTL configurable por endpoint (campanhas=5min, insights=15min)
- Indicador de "dados do cache" vs "dados ao vivo"
- Botão de "forçar refresh" individual por seção

---

### EPIC-EXPORT — Relatórios e Exportação
**Prioridade:** ALTA | **Esforço:** ~3 dias
**Objetivo:** Clientes/agência podem exportar relatórios profissionais

#### US-58 — Export CSV por Seção
**AC:**
- Botão "Exportar CSV" em: Campanhas, Insights, Performance
- Inclui todas as colunas visíveis + metadados (período, filtros aplicados)
- Nome do arquivo: `dashboard-{data}-{seção}.csv`

#### US-59 — PDF Report Generator
**AC:**
- Endpoint `/api/ads-report` gera PDF com Puppeteer
- Inclui: KPIs, top campanhas, gráficos, insights do feed
- Layout em estilo relatório de agência (logo, data, filtros)
- Download direto do browser

#### US-60 — Scheduled Reports (email)
**AC:**
- Configuração de frequência: diário / semanal / mensal
- Envia PDF via email (usar Resend ou SendGrid)
- Preview do que será enviado antes de agendar

---

### EPIC-MULTIACCOUNTS — Multi-Conta
**Prioridade:** MÉDIA-ALTA | **Esforço:** ~4 dias
**Objetivo:** Gerenciar múltiplas contas de anúncio no mesmo dashboard

#### US-61 — Account Switcher
**AC:**
- Dropdown de contas no header
- Switch instantâneo sem reload de página
- Indicador de conta ativa com nome e moeda
- Histórico das últimas 5 contas visitadas

#### US-62 — Multi-Account Overview
**AC:**
- View "All Accounts": tabela com KPIs aggregados de todas as contas
- Filtro por conta, período, status
- Spend total consolidado
- ROAS médio ponderado

---

### EPIC-AUTOMATION — Regras Automáticas
**Prioridade:** MÉDIA | **Esforço:** ~5 dias
**Objetivo:** Pausar/escalar campanhas automaticamente via regras

#### US-63 — Budget Pacing Alerts
**AC:**
- Cálculo de pacing: budget_restante / dias_restantes vs gasto_médio_diário
- Alert: "Campanha X vai estourar o budget em 2 dias se mantiver o ritmo"
- Alert: "Campanha Y está subgastando — apenas 40% do budget usado"

#### US-64 — Automated Rules Engine
**AC:**
- Interface para criar regras: IF {métrica} {operador} {valor} THEN {ação}
- Ações disponíveis: pausar campanha, aumentar/diminuir budget %, notificar
- Histórico de regras executadas
- Simulação "o que aconteceria se" antes de ativar

---

### EPIC-CAPI — Conversions API Integration
**Prioridade:** MÉDIA | **Esforço:** ~4 dias
**Objetivo:** CAPI aumenta precisão de conversões em ~30% (iOS privacy)

#### US-65 — CAPI Setup Wizard
**AC:**
- Interface para configurar CAPI endpoint da Meta
- Validação de eventos recebidos vs pixel (deduplicação)
- Score de saúde CAPI (cobertura de eventos)
- Diagnóstico de lacunas

---

### EPIC-ATTRIBUTION-WINDOW — Janelas de Atribuição
**Prioridade:** MÉDIA | **Esforço:** ~2 dias
**Objetivo:** Comparar conversões por janela (1d/7d/28d click, 1d view)

#### US-66 — Attribution Window Selector
**AC:**
- Seletor de janela: 1d_click, 7d_click, 28d_click, 1d_view
- Tabela de campanhas mostra conversões por janela lado a lado
- Delta "diferença entre janelas" para entender atribuição

---

### EPIC-CREATIVE-LIBRARY — Biblioteca de Criativos
**Prioridade:** MÉDIA | **Esforço:** ~5 dias
**Objetivo:** Central de análise e gestão de criativos com AI

#### US-67 — Creative Library v2
**AC:**
- Grid de criativos com filtros: campanha, período, performance, formato
- Tags automáticas por AI: hook type, sentiment, call-to-action detected
- "Top performers" vs "Bottom performers" com visual diff
- Comparação lado a lado de 2 criativos

#### US-68 — AI Creative Suggestions
**AC:**
- Baseado nos top performers, AI sugere variações
- "Este criativo tem hook de pergunta — gera 2.3x mais CTR na sua conta"
- Integra com GPT-4o Vision para análise visual

---

### EPIC-DEMOGRAPHICS — Breakdown Demográfico
**Prioridade:** MÉDIA | **Esforço:** ~3 dias
**Objetivo:** Entender quem converte, não só quanto

#### US-69 — Age & Gender Breakdown
**AC:**
- Gráfico de performance por faixa etária (18-24, 25-34, 35-44, 45-54, 55+)
- Heatmap de combinação age×gender
- ROAS, CPC, CTR por segmento
- "Segmento de ouro": combinação com melhor ROAS

#### US-70 — Placement Analysis
**AC:**
- Performance por placement: Feed, Stories, Reels, Audience Network
- Custo por resultado por placement
- Sugestão: "Desativar placements de baixo ROAS"

---

### EPIC-WEIGHTED-TREND — Trend Ponderada por Recência
**Prioridade:** BAIXA-MÉDIA | **Esforço:** ~1 dia
**Objetivo:** `linearTrend` trata todos os pontos igualmente. Ontem importa mais que 30 dias atrás.

#### US-71 — weightedRecentTrend (WLS por recência)
**AC:**
- Implementar `weightedRecentTrend()` em `statistics.ts`
- Peso exponencial: `w_t = e^(-λ(T-t))`, halflife=14 dias
- WLS: `β = Σ(w_i * (x_i - x̄_w)(y_i - ȳ_w)) / Σ(w_i * (x_i - x̄_w)²)`
- Substituir `linearTrend()` nos KPI cards e dashboard principal

---

## 4. MAPA DE PRIORIZAÇÃO EXECUTIVA

```
FASE 1 — Precisão ✅ CONCLUÍDA (commit 8deeb86, 2026-03-14)
├── EPIC-STAT-FIX (US-50, 51, 52)     → ✅ DONE
├── EPIC-ADVANCED-INDICATORS (US-53, 54, 55) → ✅ DONE
└── US-71 (weightedRecentTrend)        → ✅ DONE

FASE 2 — Produtividade ← PRÓXIMA
├── EPIC-REALTIME (US-56, 57)          → dashboard vivo (polling + cache)
├── EPIC-EXPORT (US-58, 59, 60)        → relatórios para clientes (CSV + PDF)
└── EPIC-ATTRIBUTION-WINDOW (US-66)    → decisão de atribuição

FASE 3 — Agência
├── EPIC-MULTIACCOUNTS (US-61, 62)     → multi-cliente
├── EPIC-AUTOMATION (US-63, 64)        → regras automáticas
├── EPIC-DEMOGRAPHICS (US-69, 70)      → inteligência de audiência
└── EPIC-CREATIVE-LIBRARY (US-67, 68)  → biblioteca criativa AI

FASE 4 — Enterprise
├── EPIC-CAPI (US-65)                  → CAPI integration
├── Granger Causality                  → causalidade real
└── LTV Prediction                     → coort analysis
```

---

## 5. PERPLEXITY RESEARCH PROMPTS (para cada epic)

### Para EPIC-STAT-FIX

```
Meta Ads Dashboard 2025: best practices for engagement score normalization
across accounts with different audience sizes. How do top analytics platforms
(Supermetrics, Funnel.io, Triple Whale) normalize engagement metrics to be
comparable across small and large accounts? What midpoint calculation methods
are used in production dashboards?
```

```
STL decomposition for Instagram and Facebook Ads time series in JavaScript/TypeScript.
What are the production implementations? How does Statsmodels STL compare to
simple moving-average decomposition for weekly seasonality in social media data?
Best practices for period selection (7 days) and robust trend estimation.
```

### Para EPIC-REALTIME

```
Next.js 14 App Router real-time dashboard with polling vs WebSocket vs SSE.
Best practices for:
1. Intelligent polling (pause on tab blur, exponential backoff)
2. Request deduplication for concurrent identical API calls
3. Stale-while-revalidate pattern with Meta Ads API rate limits
4. Cache invalidation strategy for campaign data (5min) vs insights (15min)
```

### Para EPIC-EXPORT

```
PDF report generation in Next.js 14: Puppeteer vs React-PDF vs @react-pdf/renderer
vs Playwright.
Requirements:
- Dashboard screenshots + data tables
- Custom branding (logo, colors)
- Generated server-side via API route
- File size optimization
- Production deployment on Vercel
Which approach works best in 2025?
```

### Para EPIC-MULTIACCOUNTS

```
Meta Ads API v25: accessing multiple ad accounts from single Business Manager.
Best practices for:
1. Listing all accounts a user has access to (/me/adaccounts)
2. Token scoping per account vs single business token
3. Rate limit management across multiple accounts
4. Caching strategy for multi-account dashboards
```

### Para EPIC-AUTOMATION

```
Meta Ads API v25: automated rules and campaign management via API.
1. Can you pause/activate campaigns via API? What endpoints?
2. Budget modification endpoints and constraints
3. Rate limits for write operations vs read operations
4. Best practices for budget pacing calculation
5. Webhook/callback support for campaign events?
```

### Para EPIC-CAPI

```
Meta Conversions API (CAPI) v22+ complete implementation guide 2025.
1. Server-side event sending: required fields, deduplication with pixel
2. Event match quality score — what factors affect it?
3. iOS 17+ impact on attribution: how much lift does CAPI provide?
4. Implementation in Next.js API routes
5. Testing CAPI events without affecting production data
```

### Para EPIC-DEMOGRAPHICS

```
Meta Ads API v25: age, gender, placement breakdowns in insights.
1. How to request age/gender breakdown: action_breakdowns parameter
2. Available breakdown combinations and API limitations
3. Placement breakdown: full list of placement values in v25
4. Combining multiple breakdowns in single request vs separate calls
5. Rate limit impact of breakdown requests
```

---

## 6. HANDOFF DOCUMENT — Para novos chats

### Contexto técnico rápido

**Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Zustand, Meta Graph API v25
**Design:** bg-[#0A0A0A], font-mono, verde #A3E635, sem Lucide (custom glyphs)
**Branch:** v2-dashboard (V1 intacta na main)

**Motor estatístico:** 16 utils em `lib/utils/`, todos conectados à UI
**Last commit:** b784ece — US-38 + US-39 + 7 Meta API v25 fixes

### Para cada novo chat, enviar:

```
## Contexto do projeto
Branch: v2-dashboard
Last commit: b784ece (US-38 video funnel + US-39 quality matrix + 7 API fixes)
Motor estatístico: lib/utils/ — 16 arquivos, 7.239 linhas, todos conectados
Design: bg-[#0A0A0A], font-mono, verde #A3E635, ZERO Lucide

## Próxima tarefa: [DESCREVER]
[COLAR PESQUISA PERPLEXITY SE TIVER]

Leia APENAS os arquivos necessários antes de codar.
```

### Arquivos críticos para referência

| Propósito | Arquivo |
|-----------|---------|
| Página principal | `app/dashboard/ads/page.tsx` |
| Serviço Meta API | `lib/services/facebook-ads.service.ts` |
| Tipos | `types/ads.ts` |
| Painel de inteligência | `features/ads/components/ads-intelligence-panel-v2.tsx` |
| Motor de alertas | `lib/utils/insight-engine.ts` |
| Motor de previsão | `lib/utils/hw-optimizer.ts` |

---

## 7. CHECKLIST PRÉ-DEPLOY (QA Gate)

```
[ ] npm run build — zero erros
[ ] tsc --noEmit — zero erros TypeScript
[ ] Testar no browser: /dashboard/ads
[ ] Verificar KPI cards com dados reais
[ ] Verificar Intelligence Panel — todas as seções carregam
[ ] Testar filtros de período
[ ] Testar filtros de status (ACTIVE/PAUSED/ALL)
[ ] Verificar sem token (estado vazio gracioso)
[ ] Mobile: layout não quebra em 375px
[ ] Network: sem requests duplicados no DevTools
[ ] Console: sem erros JavaScript
```

---

*Master Plan V2 — gerado por Orion (AIOS Master) — 2026-03-14*
*Próxima revisão: após FASE 1 completa*
