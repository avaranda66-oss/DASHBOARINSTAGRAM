# Meta Instagram Graph API — Gap Analysis & Relatorio Completo

**Data:** 11 de marco de 2026
**Branch:** v2-dashboard
**Orquestrado por:** @aios-master
**Agentes:** @dev (audit), @architect (schema/UI), @analyst (API reference)

---

## RESUMO EXECUTIVO

O Dashboard OSS usa apenas **~20% da capacidade** do Standard Access da Instagram Graph API. A auditoria identificou **6 erros criticos**, **12 gaps de dados**, e **8 oportunidades de melhoria** que podem ser implementadas SEM App Review.

### Numeros da Auditoria

| Metrica | Atual | Disponivel | Aproveitamento |
|---------|-------|-----------|----------------|
| Endpoints usados | 5 | 28+ | 18% |
| Campos do perfil | 2 | 13 | 15% |
| Metricas de media | 5 | 14+ | 36% |
| Metricas de conta | 0 | 15 | 0% |
| KPIs exibidos (uteis) | 3/6 | 10+ | 30% |
| Funcionalidades | 3 | 10+ | 30% |

---

## ERROS CRITICOS ENCONTRADOS

### ERRO 1: Versao da API desatualizada
- **Usando:** `v21.0`
- **Atual:** `v25.0`
- **Impacto:** `impressions` deprecado na v22, `views` e a nova metrica unificada. Metricas podem parar de funcionar a qualquer momento
- **Fix:** Trocar constante `GRAPH_VERSION` para `v25.0`

### ERRO 2: Perfil busca apenas 2 campos de 13 disponiveis
- **Buscando:** `username, profile_picture_url`
- **Disponivel:** `username, name, biography, followers_count, follows_count, media_count, profile_picture_url, website, ig_id`
- **Impacto:** Dashboard nao mostra bio, seguidores, seguindo, total de posts

### ERRO 3: Sem refresh automatico de token
- Token expira em 60 dias
- **Nao ha renovacao automatica**
- Usuario precisa reconectar manualmente
- **Endpoint disponivel:** `GET /refresh_access_token?grant_type=ig_refresh_token&access_token={token}` renova por mais 60 dias

### ERRO 4: Insights de conta nunca sao buscados
- Endpoint `GET /{user_id}/insights` **nunca e chamado**
- Perdendo: reach diario, engagement diario, follows/unfollows, demografias
- Tudo disponivel com Standard Access

### ERRO 5: KPI Cards exibem dados errados
- 3 dos 6 KPIs mostram "N/D" permanentemente (Qualified Engagement, Sentiment, Views)
- **Reach, Saves, Shares** NAO aparecem como KPIs apesar de serem as metricas privadas mais valiosas
- KPI de "Views" mostra "N/D" porque so conta reels, nao usa `views` da API

### ERRO 6: Bug na URL de OAuth
- Linha 18 do auth route: `?client_id=` deveria ser `&client_id=` (tem dois `?` na URL)
- Pode causar falha no login em alguns navegadores

---

## GAP ANALYSIS COMPLETO

### DADOS QUE BUSCAMOS vs DADOS DISPONIVEIS

#### Perfil do Usuario (`GET /me`)

| Campo | Buscamos? | Exibimos? | Prioridade |
|-------|-----------|-----------|------------|
| `username` | SIM | SIM | - |
| `profile_picture_url` | SIM | SIM | - |
| `name` | NAO | NAO | ALTA |
| `biography` | NAO | NAO | ALTA |
| `followers_count` | NAO | NAO | CRITICA |
| `follows_count` | NAO | NAO | ALTA |
| `media_count` | NAO | NAO | ALTA |
| `website` | NAO | NAO | MEDIA |
| `ig_id` | NAO | NAO | BAIXA |

#### Media/Posts (`GET /me/media`)

| Campo | Buscamos? | Exibimos? | Prioridade |
|-------|-----------|-----------|------------|
| `id` | SIM | NAO (interno) | - |
| `caption` | SIM | SIM | - |
| `media_type` | SIM | SIM | - |
| `media_url` | SIM | SIM | - |
| `thumbnail_url` | SIM | SIM | - |
| `permalink` | SIM | SIM | - |
| `timestamp` | SIM | SIM | - |
| `like_count` | SIM | SIM | - |
| `comments_count` | SIM | SIM | - |
| `username` | SIM | SIM | - |
| `media_product_type` | NAO | NAO | ALTA (diferencia FEED/REELS/STORY) |
| `shortcode` | NAO | NAO (calcula via regex) | MEDIA |
| `is_shared_to_feed` | NAO | NAO | BAIXA |

#### Insights de Media (`GET /{media_id}/insights`)

| Metrica | Buscamos? | Exibimos? | Prioridade |
|---------|-----------|-----------|------------|
| `reach` | SIM | Tabela (nao KPI) | CORRIGIR |
| `saved` | SIM | Tabela (nao KPI) | CORRIGIR |
| `shares` | SIM | Tabela (nao KPI) | CORRIGIR |
| `total_interactions` | SIM | NAO | MEDIA |
| `views` | SIM (so video) | "N/D" no KPI | CORRIGIR |
| `likes` | NAO (usa like_count) | SIM | OK |
| `comments` | NAO (usa comments_count) | SIM | OK |
| `follows` | NAO | NAO | ALTA |
| `profile_visits` | NAO | NAO | ALTA |
| `profile_activity` | NAO | NAO | MEDIA |
| `ig_reels_avg_watch_time` | NAO | NAO | ALTA |
| `ig_reels_video_view_total_time` | NAO | NAO | MEDIA |
| `navigation` (stories) | NAO | NAO | MEDIA |
| `replies` (stories) | NAO | NAO | BAIXA |

#### Insights de CONTA (`GET /{user_id}/insights`) — 0% IMPLEMENTADO

| Metrica | Disponivel? | Prioridade | Valor |
|---------|-------------|------------|-------|
| `reach` (diario) | SIM | CRITICA | Tendencia de alcance da conta |
| `views` (diario) | SIM | CRITICA | Impressoes totais |
| `accounts_engaged` | SIM | ALTA | Engajamento real |
| `total_interactions` | SIM | ALTA | Interacoes agregadas |
| `likes` (diario) | SIM | ALTA | Tendencia de likes |
| `comments` (diario) | SIM | ALTA | Tendencia de comentarios |
| `saves` (diario) | SIM | ALTA | Tendencia de saves |
| `shares` (diario) | SIM | ALTA | Tendencia de shares |
| `follows_and_unfollows` | SIM | CRITICA | Crescimento de seguidores |
| `profile_links_taps` | SIM | MEDIA | Cliques no perfil |
| `replies` (stories) | SIM | BAIXA | Respostas a stories |
| `reposts` | SIM | BAIXA | Repostagens |
| `follower_demographics` | SIM (100+ followers) | CRITICA | Idade, cidade, pais, genero |
| `engaged_audience_demographics` | SIM (100+ followers) | ALTA | Demografias do publico engajado |

#### Business Discovery (`GET /{user_id}?fields=business_discovery.fields(...)`) — 0% IMPLEMENTADO

| Dado | Disponivel? | Prioridade |
|------|-------------|------------|
| Perfil do concorrente (bio, followers, media_count) | SIM | ALTA |
| Posts do concorrente (caption, likes, comments, timestamp) | SIM | ALTA |
| Metricas publicas do concorrente | SIM | MEDIA |

#### Content Publishing (`POST /{user_id}/media` + `POST /{user_id}/media_publish`) — 0% IMPLEMENTADO

| Funcionalidade | Disponivel? | Prioridade |
|----------------|-------------|------------|
| Publicar imagem | SIM | MEDIA |
| Publicar carrossel (ate 10 itens) | SIM | MEDIA |
| Publicar reel | SIM | MEDIA |
| Publicar story (imagem) | SIM | BAIXA |

#### Funcionalidades Extras — 0% IMPLEMENTADO

| Funcionalidade | Disponivel? | Prioridade |
|----------------|-------------|------------|
| Mencoes (@mentions) | SIM | BAIXA |
| Webhooks (notificacoes real-time) | SIM | BAIXA |
| Responder comentarios via API | SIM | MEDIA |

---

## IMPACTO NO DASHBOARD ATUAL

### KPI Cards — Antes vs Depois

**ATUAL (6 cards, 3 inuteis):**
1. Total Likes ✅
2. Total Comments ✅
3. Views (Reels) — "N/D" na maioria ❌
4. Engagement Rate — "N/D" ❌
5. Qualified Engagement — NUNCA funciona ❌
6. Sentiment — NUNCA funciona ❌

**PROPOSTO (8-10 cards, todos funcionais):**
1. Followers Count (do perfil) — NOVO
2. Total Reach (soma dos posts)
3. Total Likes
4. Total Saves — PROMOVIDO de tabela para KPI
5. Total Shares — PROMOVIDO de tabela para KPI
6. Total Comments
7. Engagement Rate (likes+comments/reach)
8. Avg Watch Time (reels) — NOVO
9. Follows from Content — NOVO
10. Profile Visits from Content — NOVO

### Graficos — Antes vs Depois

**ATUAL (3 graficos):**
1. Timeline: Reach + Saves + Shares ao longo do tempo
2. Content Type: Medias de Reach/Saves/Shares/Likes por tipo
3. Posting Day: Reach medio por dia da semana

**PROPOSTO (6+ graficos):**
1. Timeline: Reach + Saves + Shares (existente, melhorado)
2. Content Type (existente)
3. Posting Day: Expandir para Likes/Saves/Shares por dia
4. **Account Reach/Views Diario** — NOVO (tendencia da conta)
5. **Follower Growth** — NOVO (follows/unfollows por dia)
6. **Audience Demographics** — NOVO (idade, genero, cidade)
7. **Reels Performance** — NOVO (watch time, completion rate)

### Novas Secoes/Abas

1. **Audiencia** — Demographics, growth, engaged audience
2. **Concorrentes** — Business Discovery comparison (via API, sem Apify)
3. **Stories/Reels** — Metricas especificas por formato

---

## RELACAO COM FEATURES EXISTENTES (Playwright/Apify)

**NADA sera removido.** As novas implementacoes COMPLEMENTAM:

| Feature | Fonte Atual | Complemento API |
|---------|------------|-----------------|
| Scraping Apify (Individual) | Apify Actor | Business Discovery pode substituir parcialmente |
| Scraping Apify (VS) | Apify Actor | Business Discovery para comparacao basica |
| Playwright comments | Browser automation | API comments (mais confiavel, sem browser) |
| Playwright auto-reply | Browser automation | API comment reply (mais rapido, sem browser) |
| Maps scraper | Playwright | Nao afetado |

**A API e COMPLEMENTAR ao Playwright/Apify, nao substitui.**

---

## PROXIMOS PASSOS

Ver arquivo de Stories para implementacao priorizada.
