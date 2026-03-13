# Relatorio de Re-Analise — Dashboard Analytics V2

**Data:** 2026-03-12
**Versao:** 2.0
**Autores:** QA Squad + Squad Especialista em Dados + Consultores MindClone
**Branch:** `feat/meta-api-upgrade`

---

## 1. Resumo Executivo

### Estado Atual

O Dashboard Analytics opera em 3 modos com 2 fontes de dados:

| Modo | Fonte | Funcionalidades |
|------|-------|----------------|
| **Individual** | Apify (scraping publico) | KPIs, scores, hashtags, tendencias, outliers |
| **VS/Comparacao** | Apify | Comparacao lado a lado com indicadores estatisticos |
| **Minha Conta** | Meta Graph API v25 | KPIs exclusivos (reach/saves/shares), demographics, trends, publicacao |

### O Que Foi Implementado

- **16 funcoes** em `lib/utils/statistics.ts` (descriptiveStats, percentileRank, movingAverage, growthRate, linearTrend, pearsonCorrelation, engagementScore, detectOutliers, performanceBadge, metricSummary, periodComparison, bestTimeToPost, apifyEngagementScore, hashtagEfficiency, captionLengthCorrelation, postingConsistencyIndex)
- **ApifyStatsPanel** — Painel completo com KPIs, coeficiente viral, melhor dia, evolucao, correlacao legenda, scores por post, eficiencia de hashtags
- **4 Meta KPIs exclusivos** — Save Rate, Share Rate, Depth Score, Melhor Tipo
- **Indicadores VS** — Consistencia, Volatilidade, Tendencia, Melhor Dia
- **Indicadores Avancados Minha Conta** — Comparacao de periodo, eficiencia por tipo, depth scores, metric summaries
- **25 componentes** em `features/analytics/components/`
- **23 API routes** em `app/api/`

### Gaps Identificados

1. Sentiment analysis basico (regex only) — sem deteccao de sarcasmo, negacao, spam
2. 7 endpoints Meta API nao explorados
3. Sem dedup de posts no store
4. Sem caching de respostas API
5. Sem error boundaries nos componentes
6. 8 metricas calculaveis com dados existentes nao implementadas
7. Sem heatmap de engajamento, funnel, calendar view
8. Sem export de relatorios

---

## 2. Auditoria QA — Qualidade de Dados

### P0 — Critico (corrigir imediatamente)

| # | Issue | Arquivo | Impacto |
|---|-------|---------|---------|
| 1 | **Sem dedup de posts no store** — `fetchAndMerge` faz dedup por `shortCode` mas `setPostsFromMeta` nao. Se chamar Meta API 2x, posts duplicam. | `stores/analytics-slice.ts:309` | KPIs com valores dobrados |
| 2 | **`(p as any).reach`** — Cast `as any` em 3 locais no `computeSummary`. Se o tipo mudar, erros silenciosos. | `stores/analytics-slice.ts:89-93` | Calculos incorretos silenciosos |
| 3 | **Engagement Rate = 0 para posts sem views/reach** — Posts Image (sem videoViewCount e sem reach) sao ignorados no calculo de ER. | `stores/analytics-slice.ts:88-99` | ER subestimado para contas com muitas imagens |

### P1 — Alto (corrigir no proximo sprint)

| # | Issue | Arquivo | Impacto |
|---|-------|---------|---------|
| 4 | **Sem validacao de timestamp** — `new Date(timestamp)` pode gerar `Invalid Date` que nao e filtrado. | `stores/analytics-slice.ts:65` | Posts fantasmas no filtro de periodo |
| 5 | **Sem circuit breaker global** — `fetchWithRetry` e por-request. Se a API estiver fora, cada post gera 3 retries (50 posts = 150 requests falhos). | `instagram-graph.service.ts:38` | Timeout de 25+ segundos |
| 6 | **Sem caching de respostas** — Cada reload faz 50+ chamadas a Meta API. Sem cache local ou stale-while-revalidate. | `instagram-graph.service.ts:84` | Rate limit, UX lenta |
| 7 | **`media_product_type` inconsistente** — Fallback `VIDEO -> REELS` na linha 110 pode classificar erroneamente IGTV como REELS. | `instagram-graph.service.ts:110` | Metricas por tipo incorretas |

### P2 — Medio (backlog)

| # | Issue | Arquivo | Impacto |
|---|-------|---------|---------|
| 8 | **Sem error boundaries** — Se `apify-stats-panel` crashar, toda a pagina cai. | `app/dashboard/analytics/page.tsx` | UX quebrada |
| 9 | **Sentiment regex-only** — Sem deteccao de sarcasmo ("que lindo hein"), negacao ("nao gostei"), spam (emojis repetidos). | `lib/utils/sentiment.ts` | Falsos positivos ~15-25% |
| 10 | **`totalCommentWords` nunca incrementado** — Variavel declarada mas nunca usada no loop. `avgWordsPerComment` sempre = 0. | `lib/utils/sentiment.ts:63,111` | `communityBonus` sempre = 0 |

### P3 — Baixo (nice to have)

| # | Issue | Arquivo | Impacto |
|---|-------|---------|---------|
| 11 | **Console.warn em producao** — `fetchWithRetry` e `fetchPostComments` usam console.warn/error sem guard. | Multiplos | Logs poluidos |
| 12 | **Sem paginacao de posts Meta** — `limit=50` fixo. Contas com 200+ posts nao trazem historico completo. | `instagram-graph.service.ts:89` | Analises incompletas |
| 13 | **`since` default 48h para comments** — Se nao houver timestamp, busca apenas ultimas 48h. Primeira carga perde historico. | `instagram-graph.service.ts:262` | Comentarios perdidos na primeira carga |
| 14 | **Sem rate limit no client-side** — Usuario pode clicar "Atualizar" repetidamente, disparando multiplas chamadas simultaneas. | `stores/analytics-slice.ts` | Requests duplicados |

---

## 3. Analise Estatistica — Gaps & Oportunidades

### A) Metricas Calculaveis com Dados Existentes

Estas metricas podem ser implementadas **hoje** usando apenas os dados ja disponveis em `InstagramPostMetrics[]`:

| # | Metrica | Descricao | Funcoes Existentes que Ajudam |
|---|---------|-----------|-------------------------------|
| 1 | **Z-Score por Post** | Quantifica quantos desvios-padrao um post esta da media. Mais preciso que outlier IQR para ranking. | `descriptiveStats` (mean, stdDev) |
| 2 | **Pareto Analysis (80/20)** | Identifica quais 20% dos posts geram 80% do engajamento total. | `sorted`, `sum` (helpers internos) |
| 3 | **Content Velocity Score** | `postsPerWeek * avgEngagement` — mede o momentum geral da conta. | `postingConsistencyIndex`, `descriptiveStats` |
| 4 | **Peak Engagement Window** | Janela de 2-4h com maior media de engajamento. Mais granular que `bestTimeToPost` (por dia). | `bestTimeToPost` (adaptar para horas) |
| 5 | **Engagement Decay Estimation** | Taxa de queda de engajamento baseada na posicao temporal. Posts mais antigos com mais likes = conteudo evergreen. | `linearTrend`, `pearsonCorrelation` |
| 6 | **Content Mix Score** | Score 0-100 que avalia se a distribuicao de tipos (Image/Video/Sidecar) esta otimizada com base nos dados historicos. | `descriptiveStats` por tipo |
| 7 | **Week-over-Week Growth** | Crescimento composto semanal de likes+comments. Mostra momentum recente. | `periodComparison` (adaptar para semanas) |
| 8 | **Follower Engagement Ratio** | `avgEngagement / followersCount * 100` — benchmark real. Problema: `followersCount` so disponivel via Meta API. | `descriptiveStats` |

### B) Metricas que Precisam de Dados Novos

| # | Metrica | Dado Necessario | Fonte |
|---|---------|----------------|-------|
| 9 | **Sentiment Analysis Avancado** | Comentarios com contexto completo | NLP API (Claude/OpenAI) ou modelo local |
| 10 | **Comment Intent Detection** | Classificacao: pergunta/elogio/reclamacao/spam/compra | NLP API |
| 11 | **Hashtag-Reach Correlation** | `reach` por post + hashtags | Meta API (ja temos para Minha Conta) |
| 12 | **Audience Growth Rate** | `followers_count` historico | Meta API + storage temporal |
| 13 | **Story Metrics** | `stories` endpoint | Meta API (nao implementado) |
| 14 | **Carousel Per-Slide Performance** | `children` endpoint | Meta API (nao implementado) |
| 15 | **Online Followers** | `online_followers` endpoint | Meta API (nao implementado) |

### C) Funcoes Existentes Subutilizadas

| Funcao | Usada Em | Poderia Ser Usada Em |
|--------|----------|---------------------|
| `movingAverage` | Nenhum componente | Sparklines de KPIs, timeline charts |
| `growthRate` | Nenhum componente | KPI cards (delta vs periodo anterior) |
| `percentileRank` | Apenas via `performanceBadge` | Rankings diretos na tabela de posts |
| `pearsonCorrelation` | Apenas via `captionLengthCorrelation` | Correlacao hashtags vs engagement, hora vs engagement |
| `detectOutliers` | `apify-stats-panel` (viral) | Alert system, minha-conta-view |

---

## 4. Instagram API Standard Access — Endpoints Nao Utilizados

### Endpoints Disponveis e Nao Explorados

| # | Endpoint | Status | Dados Retornados | Valor para o Dashboard |
|---|----------|--------|-----------------|----------------------|
| 1 | `GET /{media-id}/children` | **Nao usado** | Items individuais de carousel (imagem, video) | Analise per-slide: qual slide gera mais engagement? |
| 2 | `GET /{user-id}/stories` | **Nao usado** | Stories ativas (expira em 24h) | Metricas de Stories (se business/creator account) |
| 3 | `GET /{user-id}/tags` | **Nao usado** | Posts onde a conta foi taggeada | UGC (User Generated Content) tracking |
| 4 | `GET /{media-id}/comments?replies` | **Parcial** | Replies de replies (threads completas) | Profundidade de conversacao, sentiment em threads |
| 5 | `online_followers` insight | **Nao usado** | Horarios que seguidores estao online (ultimos 30d) | Best time to post real (nao baseado em historico) |
| 6 | `audience_city/country` | **Implementado** | Geo dos seguidores | Segmentacao geografica (ja temos via demographics) |
| 7 | `GET /{user-id}/live_media` | **Nao usado** | Lives realizadas | Metricas de Lives |

### Endpoints Ja Implementados (Referencia)

| Endpoint | Arquivo | Funcao |
|----------|---------|--------|
| `me/media` + `{id}/insights` | `instagram-graph.service.ts:84` | `fetchInstagramInsights` |
| `{id}/comments` | `instagram-graph.service.ts:224` | `fetchPostComments` |
| `me?fields=username,followers_count` | `instagram-graph.service.ts:311` | `verifyMetaToken` |
| `refresh_access_token` | `instagram-graph.service.ts:330` | `refreshMetaToken` |
| `{userId}/insights?period=day` | `instagram-graph.service.ts:387` | `fetchAccountInsights` |
| `follower_demographics/engaged_audience_demographics` | `instagram-graph.service.ts:459` | `fetchAudienceDemographics` |
| `business_discovery` | `instagram-graph.service.ts:532` | `fetchBusinessDiscovery` |
| `{commentId}/replies` (POST) | `instagram-graph.service.ts:567` | `replyToComment` |
| `{commentId}?hide=true` | `instagram-graph.service.ts:588` | `hideComment` |
| `{commentId}` (DELETE) | `instagram-graph.service.ts:600` | `deleteComment` |
| `{userId}/media` (POST) | `instagram-graph.service.ts:627` | `publishImage` |

### Recomendacao de Priorizacao

**Sprint 1:** `online_followers` (best time real) + `{media}/children` (carousel analysis)
**Sprint 2:** `comments?replies` (threads para sentiment) + `tags` (UGC)
**Sprint 3:** `stories` + `live_media` (se aplicavel)

---

## 5. Perspectivas dos Consultores MindClone

### Alex Hormozi — Monetizacao & Valor

**Filosofia:** "O que nao pode ser medido nao pode ser otimizado. O que nao gera receita nao vale a pena medir."

**Recomendacoes:**

1. **Valor por Seguidor (VPS)**
   - Formula: `(total saves + total shares) / followers_count`
   - Saves e shares sao proxies de intencao de compra/conversao
   - Um seguidor que salva conteudo vale 10x mais que um que da like
   - **Implementacao:** Card KPI em Minha Conta com sparkline temporal

2. **Lead Intent Score por Post**
   - Classificar comentarios com intent de compra: "onde compro", "quanto custa", "tem para vender", "quero", "encomenda", "link"
   - Regex de buying intent PT-BR no `sentiment.ts`
   - Score: qtd de comentarios com buying intent / total comentarios * 100
   - **Implementacao:** Nova funcao `buyingIntentScore` em `statistics.ts` + badge no post

3. **Conversion Proxy Score**
   - `(saves * 3 + shares * 2 + comments_com_intent * 5) / reach * 1000`
   - Mede "quanto este conteudo VENDE" vs "quanto este conteudo ENTRETEEM"
   - **Implementacao:** Coluna na tabela de posts + ranking

4. **Content ROI Estimator**
   - Estimar custo de producao (baseado em tipo: Image < Carousel < Video < Reels editado)
   - Estimar valor gerado (saves + shares + buying intent comments)
   - Score: valor_gerado / custo_estimado
   - **Implementacao:** Tab "Monetizacao" em Minha Conta

### Robert Cialdini — Psicologia de Engajamento

**Filosofia:** "Engajamento nao e aleatorio. E a resposta previsivel a gatilhos psicologicos especificos."

**Recomendacoes:**

1. **Reciprocity Index (Reciprocidade)**
   - `replies_da_marca / total_comentarios_recebidos * 100`
   - Mede se a conta RESPONDE os seguidores (gatilho de reciprocidade)
   - Marcas que respondem >30% dos comentarios tem 2-5x mais engajamento futuro
   - **Implementacao:** KPI card com benchmark (bom: >30%, otimo: >50%)

2. **Social Proof Score (Prova Social)**
   - `(shares + saves) / (likes + comments) * 100`
   - Mede "acoes de validacao social" vs "acoes de baixo compromisso"
   - Alto score = conteudo que pessoas compartilham para se associar
   - **Implementacao:** Gauge visual em Minha Conta

3. **Scarcity & Urgency Detection (Escassez)**
   - Detectar palavras-chave de urgencia no caption: "ultimas vagas", "so hoje", "limitado", "acaba", "últimas unidades", "desconto", "agora"
   - Correlacionar com engagement — validar se urgencia funciona para a conta
   - **Implementacao:** `urgencyKeywordDetection` em statistics.ts + correlacao

4. **Authority Signals**
   - Detectar no caption: numeros/estatisticas, citacoes, mentions de marcas/pessoas, certificacoes
   - Posts com "authority signals" tendem a ter mais saves (conteudo de referencia)
   - **Implementacao:** Badge "authority" no post + correlacao com saves

### Martin Lindstrom — Brand Building

**Filosofia:** "Uma marca forte se constroi por consistencia sensorial e emocional, nao por hacks de crescimento."

**Recomendacoes:**

1. **Brand Equity Score**
   - `engagement_sem_hashtags / engagement_com_hashtags`
   - Ratio > 1.0 = marca forte (pessoas engajam pelo conteudo, nao por descoberta)
   - Ratio < 0.5 = dependente de hashtags (descoberta > fidelidade)
   - **Implementacao:** Novo indicador usando `hashtagEfficiency` invertido + posts sem hashtags

2. **Emotional Consistency Index**
   - Analisar variacao de sentimento entre posts (CV do sentiment score)
   - Marca com tom emocional consistente = identidade forte
   - Alta variacao = personalidade de marca confusa
   - **Implementacao:** `descriptiveStats` nos sentiment scores dos posts

3. **Sensory Language Score**
   - Detectar palavras sensoriais no caption:
     - Visual: "veja", "imagine", "brilhante", "cores"
     - Auditivo: "ouça", "som", "musica", "silencio"
     - Cinestesico: "sinta", "toque", "suave", "quente", "frio"
     - Gustativo: "sabor", "delicioso", "doce", "amargo"
     - Olfativo: "aroma", "perfume", "cheiro"
   - Posts com linguagem multisensorial geram mais saves (memorabilidade)
   - **Implementacao:** Regex de palavras sensoriais + correlacao com saves

4. **Posting Rhythm Brand Score**
   - Nao e so consistencia de frequencia, mas consistencia de "personalidade":
     - Horarios semelhantes = ritmo previsivel
     - Tipos semelhantes = identidade visual consistente
     - Tom similar = voz de marca
   - **Implementacao:** Combinar `postingConsistencyIndex` + content mix CV + sentiment CV

---

## 6. Componentes UI Ausentes

### Alta Prioridade

| # | Componente | Descricao | Complexidade | Dependencias |
|---|-----------|-----------|-------------|-------------|
| 1 | **Engagement Heatmap** | Calendario tipo GitHub contributions com intensidade de engajamento por dia. Cores: cinza (sem post) a verde (alto eng). | Media | Recharts `ResponsiveContainer` + dados existentes |
| 2 | **Sentiment Gauge Aprimorado** | Gauge radial tipo velocimetro mostrando sentiment geral. Ponteiro com zona verde/amarela/vermelha. | Baixa | `analyzeCommentsSentiment` existente |
| 3 | **Alert/Anomaly Panel** | Cards de alerta: "Post viral detectado", "Queda de engajamento -30%", "Melhor dia mudou". Baseado em `detectOutliers` + `periodComparison`. | Media | Funcoes statistics.ts existentes |
| 4 | **Buying Intent Feed** | Lista de comentarios com intencao de compra detectada. Permite responder diretamente. | Media | Nova funcao de deteccao + sistema de reply existente |

### Media Prioridade

| # | Componente | Descricao | Complexidade | Dependencias |
|---|-----------|-----------|-------------|-------------|
| 5 | **Funnel Chart** | Reach -> Impressions -> Engagement -> Saves -> Shares. Visualiza a "jornada" de cada post. | Media | Dados Meta existentes |
| 6 | **Carousel Slide Analysis** | Mostra performance per-slide de carousels. Qual slide gera mais engagement? | Alta | Endpoint `children` (nao implementado) |
| 7 | **Competitor Timeline** | Timeline comparativa de posting entre contas. Quem posta quando e com que resultado. | Media | Dados VS existentes |
| 8 | **Content Calendar** | Visualizacao de posts em formato calendario mensal. Preview do post no hover. | Media | Dados existentes |

### Baixa Prioridade

| # | Componente | Descricao | Complexidade | Dependencias |
|---|-----------|-----------|-------------|-------------|
| 9 | **Export/Report PDF** | Gerar relatorio PDF com KPIs, graficos e insights para download. | Alta | Biblioteca de PDF (jsPDF ou similar) |
| 10 | **A/B Content Tracker** | Comparar 2 posts similares (mesmo tipo, periodo proximo) para identificar o que funcionou melhor. | Baixa | `periodComparison` existente |

---

## 7. Inteligencia de Mercado — Analise Competitiva

### Features de Dashboards Lideres que Faltam

| # | Feature | Encontrada Em | Dificuldade | Valor |
|---|---------|--------------|------------|-------|
| 1 | **Auto-scheduling** com sugestao de horario otimo | Hootsuite, Later, Buffer | Alta | Alto |
| 2 | **Inbox unificado** (comentarios + DMs em um lugar) | Sprout Social | Muito Alta | Alto |
| 3 | **Relatorios white-label** exportaveis (PDF com logo do cliente) | Sprout Social, Iconosquare | Alta | Medio |
| 4 | **Industry Benchmarking** (comparar com media do setor) | Sprout Social, Rival IQ | Media | Alto |
| 5 | **Hashtag tracking** ao longo do tempo (tendencia de uso + performance) | Later, Iconosquare | Media | Medio |
| 6 | **Branded content tagging** performance | Meta Business Suite | Baixa | Baixo |
| 7 | **Social listening** (mencoes sem tag direto) | Hootsuite, Brandwatch | Muito Alta | Alto |
| 8 | **ROI tracking** (conectar engagement com vendas) | Sprout Social | Muito Alta | Alto |
| 9 | **Competitor alerts** (notificacao quando concorrente posta) | Rival IQ | Media | Medio |
| 10 | **AI content suggestions** (sugerir temas baseado em performance) | Later, Hootsuite AI | Alta | Alto |

### Diferenciais que JA Temos

| Feature | Concorrentes | Nos |
|---------|-------------|-----|
| Analise estatistica profissional (16 funcoes) | Basico (media, total) | Avancado (Pearson, Cohen's d, IQR, Z-score) |
| Apify + Meta API combinados | Apenas 1 fonte | 2 fontes com merge inteligente |
| AI comment analysis + auto-reply | Nao existe | Implementado |
| VS mode com indicadores estatisticos | Basico | Avancado |
| Sentiment analysis em PT-BR | Ingles only | PT-BR nativo |

### Gap Analysis — O Que Priorizar

**Alto Impacto + Baixa Dificuldade (fazer AGORA):**
- Industry Benchmarking (usar `business_discovery` ja implementado + medias hardcoded)
- Hashtag tracking temporal (armazenar `hashtagEfficiency` historico)
- AI content suggestions (ja temos insights API, expandir)

**Alto Impacto + Media Dificuldade (proximo sprint):**
- Auto-scheduling (Publishing API ja parcialmente implementado)
- Competitor alerts (`periodComparison` em cron job)

**Alto Impacto + Alta Dificuldade (roadmap futuro):**
- Social listening, ROI tracking, Inbox unificado

---

## 8. Roadmap de Implementacao Sugerido

### Sprint 1 — Quick Wins (dados ja disponiveis, ~3 dias)

| # | Item | Tipo | Arquivo(s) | Estimativa |
|---|------|------|-----------|-----------|
| 1 | Z-Score + Pareto Analysis | Funcao | `statistics.ts` | 2h |
| 2 | Content Velocity Score | Funcao | `statistics.ts` | 1h |
| 3 | Peak Engagement Window (por hora) | Funcao | `statistics.ts` | 2h |
| 4 | Buying Intent Detection (regex PT-BR) | Funcao | `sentiment.ts` ou nova | 3h |
| 5 | Fix `totalCommentWords` bug | Bug | `sentiment.ts:63` | 30min |
| 6 | Dedup `setPostsFromMeta` | Bug | `analytics-slice.ts:309` | 1h |
| 7 | Engagement Heatmap component | UI | Novo componente | 4h |
| 8 | Reciprocity Index (replies ratio) | Funcao + KPI | `statistics.ts` + `kpi-cards.tsx` | 2h |
| 9 | `movingAverage` em sparklines | UI | `apify-stats-panel.tsx`, `kpi-cards.tsx` | 2h |
| 10 | Error boundaries nos componentes | Infra | `page.tsx` | 1h |

### Sprint 2 — API Enhancements (~5 dias)

| # | Item | Tipo | Arquivo(s) | Estimativa |
|---|------|------|-----------|-----------|
| 1 | `online_followers` endpoint | API | `instagram-graph.service.ts` + nova rota | 3h |
| 2 | `{media}/children` endpoint (carousel) | API | `instagram-graph.service.ts` + nova rota | 4h |
| 3 | Carousel Slide Analysis component | UI | Novo componente | 6h |
| 4 | Sentiment Analysis via AI (Claude API) | API | Nova rota + update `sentiment.ts` | 8h |
| 5 | Comment Intent Classification | API + UI | Nova funcao + Buying Intent Feed component | 6h |
| 6 | Caching layer para Meta API | Infra | `instagram-graph.service.ts` | 4h |
| 7 | Circuit breaker global | Infra | `instagram-graph.service.ts` | 2h |
| 8 | Brand Equity Score | Funcao + UI | `statistics.ts` + Minha Conta | 3h |

### Sprint 3 — Intelligence Layer (~5 dias)

| # | Item | Tipo | Arquivo(s) | Estimativa |
|---|------|------|-----------|-----------|
| 1 | Conversion Proxy Score (Hormozi) | Funcao + UI | `statistics.ts` + tab Monetizacao | 4h |
| 2 | Social Proof Score (Cialdini) | Funcao + UI | `statistics.ts` + gauge | 3h |
| 3 | Urgency/Scarcity Detection (Cialdini) | Funcao | `sentiment.ts` | 3h |
| 4 | Sensory Language Score (Lindstrom) | Funcao | Nova utilidade | 3h |
| 5 | Alert/Anomaly Panel | UI | Novo componente | 6h |
| 6 | Content Calendar view | UI | Novo componente | 6h |
| 7 | Industry Benchmarking | Dados + UI | Hardcoded benchmarks + UI | 4h |
| 8 | Competitor Timeline | UI | Novo componente | 4h |

### Sprint 4 — Advanced (~7 dias)

| # | Item | Tipo | Arquivo(s) | Estimativa |
|---|------|------|-----------|-----------|
| 1 | Full NLP Sentiment (multi-language) | API + UI | Nova rota Claude API | 8h |
| 2 | Funnel Chart (Reach->Eng->Save) | UI | Novo componente + Recharts | 4h |
| 3 | Export PDF/CSV | Feature | Nova lib (jsPDF) + UI | 8h |
| 4 | Auto-scheduling suggestions | Feature + API | Publishing API expansion | 8h |
| 5 | Hashtag tracking temporal | Feature + DB | Storage + UI | 6h |
| 6 | A/B Content Tracker | UI | Novo componente | 4h |
| 7 | Audience Growth timeline | API + DB | `online_followers` + historico | 6h |

---

## 9. Riscos e Consideracoes

### Rate Limits (Critico)

| Operacao | Chamadas | Limite Standard Access |
|----------|---------|----------------------|
| Fetch 50 posts + insights | ~51 | 200/hora |
| Fetch comments (50 posts) | ~50 | 200/hora |
| Demographics (8 breakdowns) | 8 | 200/hora |
| Account Insights (30 dias) | 1 | 200/hora |
| **Total por reload completo** | **~110** | **200/hora** |

**Risco:** Adicionar `online_followers` + `children` + threads pode ultrapassar 200/hora em reloads frequentes.
**Mitigacao:** Implementar caching com TTL de 1h para demographics e online_followers. Insights de posts mudam lentamente — cache de 6h.

### Custo de NLP (Medio)

| Abordagem | Custo | Qualidade | Latencia |
|-----------|-------|-----------|---------|
| Regex atual | $0 | 60-70% acuracia | <1ms |
| Claude Haiku (batch) | ~$0.002/100 comentarios | 90-95% acuracia | 2-5s |
| Modelo local (transformers.js) | $0 (CPU) | 80-85% acuracia | 5-15s |

**Recomendacao:** Usar Claude Haiku via API para batches de 50 comentarios. Custo negligivel, qualidade excelente.

### Privacidade (LGPD)

- Dados demograficos (idade, genero, cidade) sao dados pessoais agregados — OK para analytics
- Comentarios com nomes de usuarios — garantir que nao sao exportados sem consentimento
- Token Meta — ja no header (nao na URL), armazenado em localStorage com flag `httpOnly` ausente
- **Recomendacao:** Mover token para cookie httpOnly ou variavel de ambiente server-side

### Performance

- 25 componentes + 16 funcoes estatisticas = muitos recalculos em mudanca de filtro
- **Recomendacao:** `useMemo` em todos os calculos pesados (ja parcialmente implementado), React.memo nos componentes, virtualizar tabelas com >100 posts

---

## 10. Conclusao e Proximos Passos

### Impacto Esperado por Sprint

| Sprint | Funcoes Novas | Componentes Novos | Bugs Corrigidos | Valor de Negocio |
|--------|--------------|------------------|----------------|-----------------|
| 1 | 5 | 1 | 3 | Alto (quick wins visiveis) |
| 2 | 3 | 2 | 2 | Alto (dados novos da API) |
| 3 | 4 | 3 | 0 | Muito Alto (inteligencia) |
| 4 | 2 | 3 | 0 | Alto (features avancadas) |

### Decisoes Necessarias do Produto

1. **Sentiment via AI:** Usar Claude Haiku API ou manter regex-only? (custo vs qualidade)
2. **Tab Monetizacao:** Adicionar como tab separada em Minha Conta ou integrar nos KPIs existentes?
3. **Export PDF:** Investir em export PDF (complexo) ou focar em melhorar a experiencia no dashboard?
4. **Auto-scheduling:** Expandir Publishing API para sugerir horarios automaticamente?
5. **Prioridade Sprint 1:** Confirmar quais dos 10 items iniciar primeiro.

---

*Relatorio gerado em 2026-03-12 | Dashboard Analytics V2 | Branch: feat/meta-api-upgrade*
