# Referencia Completa - Instagram Graph API com Instagram Login

**Versao da API:** v25.0 (atual, marco 2026)
**Ultima atualizacao:** 2026-03-11
**Tipo de Acesso:** Standard Access (Instagram API with Instagram Login)

---

## Indice

1. [Visao Geral e Arquitetura](#1-visao-geral-e-arquitetura)
2. [Autenticacao e Tokens](#2-autenticacao-e-tokens)
3. [Node: Instagram User (IG User)](#3-node-instagram-user)
4. [Node: Instagram Media (IG Media)](#4-node-instagram-media)
5. [Node: Instagram Comment (IG Comment)](#5-node-instagram-comment)
6. [Node: Instagram Container (IG Container)](#6-node-instagram-container)
7. [Insights da Conta (Account-Level)](#7-insights-da-conta)
8. [Insights de Midia (Media-Level)](#8-insights-de-midia)
9. [Business Discovery (Dados de Concorrentes)](#9-business-discovery)
10. [Publicacao de Conteudo](#10-publicacao-de-conteudo)
11. [Moderacao de Comentarios](#11-moderacao-de-comentarios)
12. [Mencoes](#12-mencoes)
13. [Webhooks](#13-webhooks)
14. [Rate Limits](#14-rate-limits)
15. [Permissoes (Scopes)](#15-permissoes)
16. [Mudancas Recentes e Depreciacoes](#16-mudancas-recentes)

---

## 1. Visao Geral e Arquitetura

### Host URLs
| Host | Autenticacao |
|------|-------------|
| `graph.instagram.com` | Instagram Login |
| `graph.facebook.com` | Facebook Login |

**Para Instagram API with Instagram Login, usar:** `graph.instagram.com`

### Capacidades Disponiveis (Standard Access)
- **Perfil do usuario** - Ler dados do perfil proprio
- **Media** - Listar e gerenciar midias publicadas
- **Insights de conta** - Analytics do perfil
- **Insights de midia** - Metricas por post/reel/story
- **Publicacao de conteudo** - Publicar imagens, carrosseis, reels, stories
- **Moderacao de comentarios** - Ler, responder, ocultar, excluir comentarios
- **Mencoes** - Rastrear @mentions por outros usuarios
- **Business Discovery** - Dados basicos de concorrentes
- **Webhooks** - Notificacoes em tempo real

### Limitacoes (Standard Access)
- SEM acesso a funcionalidades de publicidade (Ads)
- SEM operacoes de user tagging
- SEM Hashtag Search (apenas via Facebook Login)
- Mensagens requerem permissao adicional

---

## 2. Autenticacao e Tokens

### Escopos Atuais (obrigatorio desde 27/01/2025)
```
instagram_business_basic
instagram_business_content_publish
instagram_business_manage_comments
instagram_business_manage_messages
```

> **ATENCAO:** Escopos legados (`business_basic`, `business_content_publish`, etc.) foram deprecados em 27/01/2025.

### Fluxo de Obtencao de Token

#### Passo 1: Authorization Code
```
GET https://www.instagram.com/oauth/authorize
  ?client_id={APP_ID}
  &redirect_uri={REDIRECT_URI}
  &response_type=code
  &scope=instagram_business_basic,instagram_business_content_publish,instagram_business_manage_comments
```

#### Passo 2: Trocar Code por Short-Lived Token
```
POST https://api.instagram.com/oauth/access_token

Body (form-data):
  client_id={APP_ID}
  client_secret={APP_SECRET}
  grant_type=authorization_code
  redirect_uri={REDIRECT_URI}
  code={CODE}
```

**Resposta:**
```json
{
  "access_token": "IGQVJ...",
  "user_id": 17841400123456789
}
```
**Validade:** 1 hora

#### Passo 3: Trocar por Long-Lived Token
```
GET https://graph.instagram.com/access_token
  ?grant_type=ig_exchange_token
  &client_secret={APP_SECRET}
  &access_token={SHORT_LIVED_TOKEN}
```

**Resposta:**
```json
{
  "access_token": "IGQVJ...",
  "token_type": "bearer",
  "expires_in": 5184000
}
```
**Validade:** 60 dias (5.184.000 segundos)

#### Passo 4: Renovar Long-Lived Token (auto-refresh)
```
GET https://graph.instagram.com/refresh_access_token
  ?grant_type=ig_refresh_token
  &access_token={LONG_LIVED_TOKEN}
```

**Resposta:**
```json
{
  "access_token": "IGQVJ...",
  "token_type": "bearer",
  "expires_in": 5184000
}
```

**Regras de Renovacao:**
- Token deve ter **pelo menos 24 horas** de idade
- Token deve **ainda estar valido** (nao expirado)
- Usuario deve ter concedido `instagram_business_basic`
- Tokens nao renovados dentro de 60 dias expiram **permanentemente**
- Recomendacao: renovar automaticamente a cada 50 dias

#### Via App Dashboard (alternativa)
- Ir em Instagram > API setup with Instagram business login
- Clicar em "Generate token"
- Gera token long-lived direto (60 dias)

---

## 3. Node: Instagram User

### Endpoint
```
GET https://graph.instagram.com/v25.0/me
  ?fields={FIELDS}
  &access_token={TOKEN}
```

Ou com ID especifico:
```
GET https://graph.instagram.com/v25.0/{IG_USER_ID}
  ?fields={FIELDS}
  &access_token={TOKEN}
```

### Campos Disponiveis

| Campo | Tipo | Descricao | Permissao |
|-------|------|-----------|-----------|
| `id` | String | ID do usuario (app-scoped) | instagram_business_basic |
| `username` | String | Nome de usuario (@handle) | instagram_business_basic |
| `name` | String | Nome de exibicao no perfil | instagram_business_basic |
| `biography` | String | Texto da bio do perfil | instagram_business_basic |
| `followers_count` | Integer | Total de seguidores | instagram_business_basic |
| `follows_count` | Integer | Total de contas seguidas | instagram_business_basic |
| `media_count` | Integer | Total de midias publicadas | instagram_business_basic |
| `profile_picture_url` | String | URL da foto de perfil | instagram_business_basic |
| `website` | String | Website associado ao perfil | instagram_business_basic |
| `has_profile_pic` | Boolean | Se tem foto de perfil | instagram_business_basic |
| `is_published` | Boolean | Se a conta esta publicada | instagram_business_basic |
| `shopping_product_tag_eligibility` | Boolean | Elegivel para product tagging | instagram_business_basic |
| `legacy_instagram_user_id` | String | ID legado (pre-v21.0) | instagram_business_basic |

### Edges (Sub-recursos)

| Edge | Endpoint | Descricao |
|------|----------|-----------|
| `media` | `GET /{IG_USER_ID}/media` | Colecao de posts publicados |
| `stories` | `GET /{IG_USER_ID}/stories` | Stories ativos |
| `tags` | `GET /{IG_USER_ID}/tags` | Midias onde foi marcado |
| `mentions` | `POST /{IG_USER_ID}/mentions` | Responder a mencoes |
| `insights` | `GET /{IG_USER_ID}/insights` | Metricas da conta |
| `business_discovery` | `GET /{IG_USER_ID}/business_discovery` | Dados de outra conta |
| `content_publishing_limit` | `GET /{IG_USER_ID}/content_publishing_limit` | Uso do limite de publicacao |
| `media_publish` | `POST /{IG_USER_ID}/media_publish` | Publicar container |
| `connected_threads_user` | `GET /{IG_USER_ID}/connected_threads_user` | Conta Threads associada |
| `upcoming_events` | `GET /{IG_USER_ID}/upcoming_events` | Eventos organizados |

### Exemplo: Obter Perfil Completo
```bash
curl -X GET "https://graph.instagram.com/v25.0/me?fields=id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website&access_token={TOKEN}"
```

**Resposta:**
```json
{
  "id": "17841400123456789",
  "username": "minha_empresa",
  "name": "Minha Empresa",
  "biography": "Descricao do negocio",
  "followers_count": 15420,
  "follows_count": 890,
  "media_count": 342,
  "profile_picture_url": "https://...",
  "website": "https://minhaempresa.com"
}
```

### Exemplo: Listar Midias do Usuario
```bash
curl -X GET "https://graph.instagram.com/v25.0/{IG_USER_ID}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=25&access_token={TOKEN}"
```

**Resposta (paginada):**
```json
{
  "data": [
    {
      "id": "17854360229135492",
      "caption": "Post de exemplo",
      "media_type": "IMAGE",
      "media_url": "https://...",
      "permalink": "https://www.instagram.com/p/ABC123/",
      "timestamp": "2026-03-10T14:30:00+0000",
      "like_count": 245,
      "comments_count": 18
    }
  ],
  "paging": {
    "cursors": {
      "before": "...",
      "after": "..."
    },
    "next": "https://graph.instagram.com/v25.0/{IG_USER_ID}/media?fields=...&after=..."
  }
}
```

---

## 4. Node: Instagram Media

### Endpoints
```
GET  https://graph.instagram.com/v25.0/{IG_MEDIA_ID}?fields={FIELDS}&access_token={TOKEN}
POST https://graph.instagram.com/v25.0/{IG_MEDIA_ID}  (atualizar comentarios)
DELETE https://graph.facebook.com/v25.0/{IG_MEDIA_ID}  (excluir midia)
```

### Campos Disponiveis

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | String | Identificador da midia |
| `media_type` | String | Tipo: `IMAGE`, `VIDEO`, `CAROUSEL_ALBUM` |
| `media_product_type` | String | Plataforma: `AD`, `FEED`, `STORY`, `REELS` |
| `media_url` | String | URL do recurso de midia |
| `thumbnail_url` | String | URL do thumbnail (apenas video) |
| `timestamp` | ISO 8601 | Data de criacao (UTC) |
| `caption` | String | Legenda da midia |
| `alt_text` | String | Texto alternativo de acessibilidade |
| `username` | String | Username do criador |
| `owner` | Object | ID do usuario criador |
| `shortcode` | String | Shortcode da midia |
| `permalink` | String | URL permanente |
| `comments_count` | Integer | Total de comentarios |
| `like_count` | Integer | Total de curtidas (omitido se oculto) |
| `view_count` | Integer | Views de Reels (organico + pago) - **apenas via Business Discovery** |
| `is_comment_enabled` | Boolean | Se comentarios estao habilitados |
| `is_shared_to_feed` | Boolean | Se Reel aparece no Feed e aba Reels |
| `copyright_check_information` | Object | Status de verificacao de copyright |
| `boost_ads_list` | Array | Detalhes de boost ads ativos |
| `boost_eligibility_info` | Object | Info de elegibilidade para boost |
| `legacy_instagram_media_id` | String | ID legado (pre-v21.0) |

### Edges da Midia

| Edge | Endpoint | Descricao |
|------|----------|-----------|
| `children` | `GET /{IG_MEDIA_ID}/children` | Itens de um album/carrossel |
| `collaborators` | `GET /{IG_MEDIA_ID}/collaborators` | Colaboradores adicionados |
| `comments` | `GET /{IG_MEDIA_ID}/comments` | Comentarios da midia |
| `insights` | `GET /{IG_MEDIA_ID}/insights` | Metricas de desempenho |

### Atualizar Midia (Habilitar/Desabilitar Comentarios)
```bash
curl -X POST "https://graph.instagram.com/v25.0/{IG_MEDIA_ID}" \
  -d "comment_enabled=false" \
  -d "access_token={TOKEN}"
```

**Permissao:** `instagram_business_manage_comments`

**Resposta:** `{"success": true}`

### Excluir Midia
```bash
curl -X DELETE "https://graph.facebook.com/v25.0/{IG_MEDIA_ID}?access_token={TOKEN}"
```

**Midias suportadas para exclusao:** Posts sem ads, stories, reels, carrosseis (container inteiro)
**Permissao:** `instagram_basic` + `instagram_manage_contents`

**Resposta:**
```json
{
  "success": true,
  "deleted_id": "{IG_MEDIA_ID}"
}
```

### Limitacoes
- `media_url` omitido para conteudo com copyright protegido
- Live video acessivel apenas durante transmissao ativa
- Captions excluem @ a menos que o solicitante seja admin
- Carrosseis devem ser excluidos como unidade completa
- Metricas agregadas excluem interacoes geradas por ads

---

## 5. Node: Instagram Comment

### Endpoints
```
GET    https://graph.instagram.com/v25.0/{IG_MEDIA_ID}/comments    (listar comentarios)
GET    https://graph.instagram.com/v25.0/{IG_COMMENT_ID}           (ler comentario)
GET    https://graph.instagram.com/v25.0/{IG_COMMENT_ID}/replies   (listar respostas)
POST   https://graph.instagram.com/v25.0/{IG_COMMENT_ID}/replies   (responder)
POST   https://graph.instagram.com/v25.0/{IG_COMMENT_ID}           (ocultar/mostrar)
DELETE https://graph.instagram.com/v25.0/{IG_COMMENT_ID}           (excluir)
```

### Campos do Comentario

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | String | ID do comentario |
| `text` | String | Texto do comentario |
| `timestamp` | ISO 8601 | Data de criacao |
| `username` | String | Username do autor |
| `from` | Object | ID Instagram-scoped do autor |
| `parent_id` | String | ID do comentario pai (para replies) |

### Operacoes

#### Listar Comentarios de uma Midia
```bash
curl -X GET "https://graph.instagram.com/v25.0/{IG_MEDIA_ID}/comments?fields=id,text,timestamp,username&access_token={TOKEN}"
```

#### Responder a um Comentario
```bash
curl -X POST "https://graph.instagram.com/v25.0/{IG_COMMENT_ID}/replies" \
  -d "message=Obrigado pelo comentario!" \
  -d "access_token={TOKEN}"
```

#### Ocultar/Mostrar Comentario
```bash
curl -X POST "https://graph.instagram.com/v25.0/{IG_COMMENT_ID}" \
  -d "hide=true" \
  -d "access_token={TOKEN}"
```

#### Excluir Comentario
```bash
curl -X DELETE "https://graph.instagram.com/v25.0/{IG_COMMENT_ID}?access_token={TOKEN}"
```

### Permissoes Necessarias
- `instagram_business_basic`
- `instagram_business_manage_comments`

---

## 6. Node: Instagram Container

### Endpoint
```
GET https://graph.instagram.com/v25.0/{IG_CONTAINER_ID}
  ?fields=status_code
  &access_token={TOKEN}
```

### Campos

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | String | ID do container |
| `status_code` | String | Status do processamento |

### Valores de status_code

| Status | Descricao |
|--------|-----------|
| `FINISHED` | Pronto para publicar |
| `IN_PROGRESS` | Ainda processando |
| `PUBLISHED` | Publicado com sucesso |
| `ERROR` | Falha na publicacao |
| `EXPIRED` | Nao publicado dentro de 24h |

**Recomendacao:** Consultar status 1x por minuto, por no maximo 5 minutos.

---

## 7. Insights da Conta (Account-Level)

### Endpoint
```
GET https://graph.instagram.com/v25.0/{IG_USER_ID}/insights
  ?metric={METRICAS}
  &period={PERIODO}
  &metric_type={TIPO}
  &breakdown={BREAKDOWN}
  &since={UNIX_TIMESTAMP}
  &until={UNIX_TIMESTAMP}
  &timeframe={TIMEFRAME}
  &access_token={TOKEN}
```

**Permissao:** `instagram_business_basic`

### Metricas Disponiveis

#### 1. accounts_engaged
- **Descricao:** Numero de contas que interagiram com seu conteudo (incluindo ads)
- **Periodo:** `day`
- **Metric Type:** `total_value`
- **Breakdown:** Nenhum
- **Nota:** Metrica estimada

#### 2. reach
- **Descricao:** Contas unicas que viram seu conteudo pelo menos uma vez (incluindo ads)
- **Periodo:** `day`
- **Metric Type:** `total_value`, `time_series`
- **Breakdown:** `media_product_type`, `follow_type`
- **Nota:** Metrica estimada

#### 3. views (NOVO - substitui impressions)
- **Descricao:** Numero de vezes que o conteudo foi reproduzido ou exibido
- **Periodo:** `day`
- **Metric Type:** `total_value`
- **Breakdown:** `follower_type`, `media_product_type`
- **Tipos de conteudo:** Reels, posts, stories
- **Nota:** Em desenvolvimento

#### 4. total_interactions
- **Descricao:** Total de interacoes em posts, stories, reels, videos e lives (incluindo boost)
- **Periodo:** `day`
- **Metric Type:** `total_value`
- **Breakdown:** `media_product_type`

#### 5. likes
- **Descricao:** Numero de curtidas em posts, reels e videos
- **Periodo:** `day`
- **Metric Type:** `total_value`
- **Breakdown:** `media_product_type`

#### 6. comments
- **Descricao:** Numero de comentarios em posts, reels, videos e lives
- **Periodo:** `day`
- **Metric Type:** `total_value`
- **Breakdown:** `media_product_type`
- **Nota:** Em desenvolvimento

#### 7. saves
- **Descricao:** Numero de salvamentos de posts, reels e videos
- **Periodo:** `day`
- **Metric Type:** `total_value`
- **Breakdown:** `media_product_type`

#### 8. shares
- **Descricao:** Numero de compartilhamentos de posts, stories, reels, videos e lives
- **Periodo:** `day`
- **Metric Type:** `total_value`
- **Breakdown:** `media_product_type`

#### 9. replies
- **Descricao:** Numero de respostas em stories (texto e reacoes)
- **Periodo:** `day`
- **Metric Type:** `total_value`
- **Breakdown:** Nenhum

#### 10. reposts
- **Descricao:** Numero de repostagens de posts, stories, reels e videos
- **Periodo:** `day`
- **Metric Type:** `total_value`
- **Breakdown:** Nenhum

#### 11. follows_and_unfollows
- **Descricao:** Contas que seguiram e deixaram de seguir
- **Periodo:** `day`
- **Metric Type:** `total_value`
- **Breakdown:** `follow_type` (FOLLOWER, NON_FOLLOWER, UNKNOWN)
- **Minimo:** 100+ seguidores

#### 12. profile_links_taps
- **Descricao:** Toques nos botoes de endereco, ligar, email e texto
- **Periodo:** `day`
- **Metric Type:** `total_value`
- **Breakdown:** `contact_button_type` (BOOK_NOW, CALL, DIRECTION, EMAIL, INSTANT_EXPERIENCE, TEXT, UNDEFINED)

#### 13. follower_demographics
- **Descricao:** Dados demograficos dos seguidores (pais, cidades, genero, idade)
- **Periodo:** `lifetime`
- **Timeframe:** `last_14_days`, `last_30_days`, `last_90_days`, `prev_month`, `this_month`, `this_week`
- **Metric Type:** `total_value`
- **Breakdown:** `age`, `city`, `country`, `gender`
- **Minimo:** 100+ seguidores
- **Nota:** Retorna top 45 resultados

#### 14. engaged_audience_demographics
- **Descricao:** Dados demograficos da audiencia engajada
- **Periodo:** `lifetime`
- **Timeframe:** `last_14_days`, `last_30_days`, `last_90_days`, `prev_month`, `this_month`, `this_week`
- **Metric Type:** `total_value`
- **Breakdown:** `age`, `city`, `country`, `gender`
- **Minimo:** 100+ engajamentos
- **Nota:** Retorna top 45 resultados

#### 15. impressions (DEPRECADO)
- **Descricao:** Vezes que o conteudo apareceu na tela
- **Periodo:** `day`
- **Metric Type:** `total_value`, `time_series`
- **DEPRECADO em v22.0+** (obsoleto desde 21/04/2025) - **usar `views` em vez disso**

### Valores de Breakdown

| Breakdown | Valores |
|-----------|---------|
| `media_product_type` | `AD`, `FEED`, `REELS`, `STORY` |
| `follow_type` | `FOLLOWER`, `NON_FOLLOWER`, `UNKNOWN` |
| `contact_button_type` | `BOOK_NOW`, `CALL`, `DIRECTION`, `EMAIL`, `INSTANT_EXPERIENCE`, `TEXT`, `UNDEFINED` |
| `age` | Faixas etarias (ex: 18-24, 25-34, etc) |
| `city` | Nome da cidade |
| `country` | Codigo ISO do pais |
| `gender` | `M`, `F`, `U` |

### Limitacoes dos Insights de Conta
- Demograficos indisponiveis para contas com < 100 seguidores/engajamentos
- Atraso de ate **48 horas** nos dados
- Breakdowns demograficos retornam **apenas top 45** resultados
- Conjuntos vazios retornados quando dados indisponiveis (nao zero)
- Dados retidos por ate **90 dias**

### Exemplo: Metricas de Alcance e Interacoes (7 dias)
```bash
curl -X GET "https://graph.instagram.com/v25.0/{IG_USER_ID}/insights?metric=reach,total_interactions,views,follows_and_unfollows&period=day&since=1709510400&until=1710115200&access_token={TOKEN}"
```

### Exemplo: Demografia de Seguidores
```bash
curl -X GET "https://graph.instagram.com/v25.0/{IG_USER_ID}/insights?metric=follower_demographics&period=lifetime&timeframe=last_30_days&breakdown=country&metric_type=total_value&access_token={TOKEN}"
```

**Resposta:**
```json
{
  "data": [
    {
      "name": "follower_demographics",
      "period": "lifetime",
      "title": "Follower demographics",
      "total_value": {
        "breakdowns": [
          {
            "dimension_keys": ["country"],
            "results": [
              {"dimension_values": ["BR"], "value": 8500},
              {"dimension_values": ["US"], "value": 2100},
              {"dimension_values": ["PT"], "value": 890}
            ]
          }
        ]
      }
    }
  ]
}
```

---

## 8. Insights de Midia (Media-Level)

### Endpoint
```
GET https://graph.instagram.com/v25.0/{IG_MEDIA_ID}/insights
  ?metric={METRICAS}
  &period={PERIODO}
  &breakdown={BREAKDOWN}
  &access_token={TOKEN}
```

**Permissao:** `instagram_business_basic`

### Metricas Disponiveis por Tipo de Midia

#### Metricas para FEED (Imagem/Carrossel)

| Metrica | Descricao | Tipo |
|---------|-----------|------|
| `impressions` | Total de vezes que a midia foi vista | lifetime |
| `reach` | Usuarios unicos que viram a midia | lifetime |
| `views` | Total de visualizacoes | lifetime |
| `likes` | Numero de curtidas | lifetime |
| `comments` | Numero de comentarios | lifetime |
| `shares` | Numero de compartilhamentos | lifetime |
| `saved` | Numero de salvamentos | lifetime |
| `total_interactions` | Total de interacoes | lifetime |
| `follows` | Novos seguidores a partir desta midia | lifetime |
| `profile_activity` | Acoes no perfil apos engajamento | lifetime |
| `profile_visits` | Visitas ao perfil | lifetime |

#### Metricas para REELS

| Metrica | Descricao | Tipo |
|---------|-----------|------|
| `reach` | Usuarios unicos que viram o reel | lifetime |
| `views` | Total de visualizacoes | lifetime |
| `plays` | Vezes que o reel comecou a tocar apos impressao | lifetime |
| `likes` | Numero de curtidas | lifetime |
| `comments` | Numero de comentarios | lifetime |
| `shares` | Numero de compartilhamentos | lifetime |
| `saved` | Numero de salvamentos | lifetime |
| `total_interactions` | Total de interacoes | lifetime |
| `clips_replays_count` | Vezes que o reel foi reproduzido novamente | lifetime |
| `ig_reels_aggregated_all_plays_count` | Reproducoes totais (play + replay) apos impressao | lifetime |
| `ig_reels_avg_watch_time` | Tempo medio de visualizacao | lifetime |
| `ig_reels_video_view_total_time` | Tempo total de reproducao (incluindo replays) | lifetime |

#### Metricas para STORY

| Metrica | Descricao | Tipo |
|---------|-----------|------|
| `impressions` | Total de vezes que o story foi visto | lifetime |
| `reach` | Usuarios unicos que viram o story | lifetime |
| `views` | Total de visualizacoes | lifetime |
| `shares` | Numero de compartilhamentos | lifetime |
| `total_interactions` | Total de interacoes | lifetime |
| `follows` | Novos seguidores a partir deste story | lifetime |
| `navigation` | Total de acoes de navegacao | lifetime |
| `profile_activity` | Acoes no perfil apos engajamento | lifetime |
| `profile_visits` | Visitas ao perfil | lifetime |
| `replies` | Total de respostas ao story | lifetime |

### Breakdowns Disponiveis (Media Insights)

| Breakdown | Descricao | Valores |
|-----------|-----------|---------|
| `action_type` | Tipo de acao no perfil | Para `profile_activity` |
| `story_navigation_action_type` | Tipo de navegacao no story | Para `navigation` |

### Exemplo: Insights de um Reel
```bash
curl -X GET "https://graph.instagram.com/v25.0/{IG_MEDIA_ID}/insights?metric=reach,plays,likes,comments,shares,saved,ig_reels_avg_watch_time,ig_reels_video_view_total_time&access_token={TOKEN}"
```

**Resposta:**
```json
{
  "data": [
    {
      "name": "reach",
      "period": "lifetime",
      "values": [{"value": 12450}],
      "title": "Reach",
      "id": "{IG_MEDIA_ID}/insights/reach/lifetime"
    },
    {
      "name": "plays",
      "period": "lifetime",
      "values": [{"value": 8920}],
      "title": "Plays",
      "id": "{IG_MEDIA_ID}/insights/plays/lifetime"
    },
    {
      "name": "ig_reels_avg_watch_time",
      "period": "lifetime",
      "values": [{"value": 4.2}],
      "title": "Average watch time",
      "id": "{IG_MEDIA_ID}/insights/ig_reels_avg_watch_time/lifetime"
    }
  ]
}
```

### Exemplo: Insights de um Post com Breakdown
```bash
curl -X GET "https://graph.instagram.com/v25.0/{IG_MEDIA_ID}/insights?metric=profile_activity&breakdown=action_type&access_token={TOKEN}"
```

---

## 9. Business Discovery (Dados de Concorrentes)

### Endpoint
```
GET https://graph.instagram.com/v25.0/{IG_USER_ID}
  ?fields=business_discovery.fields(FIELDS).username({TARGET_USERNAME})
  &access_token={TOKEN}
```

**Permissao:** `instagram_business_basic`

### Campos Disponiveis do Perfil Alvo

| Campo | Descricao |
|-------|-----------|
| `id` | ID do Instagram do usuario descoberto |
| `username` | Username da conta |
| `name` | Nome de exibicao |
| `biography` | Bio do perfil |
| `followers_count` | Total de seguidores |
| `follows_count` | Total de seguidos |
| `media_count` | Total de midias publicadas |
| `profile_picture_url` | URL da foto de perfil |
| `website` | Website da conta |

### Campos Disponiveis das Midias do Alvo

| Campo | Descricao |
|-------|-----------|
| `id` | ID da midia |
| `caption` | Legenda |
| `media_type` | Tipo (IMAGE, VIDEO, CAROUSEL_ALBUM) |
| `media_url` | URL da midia |
| `permalink` | Link permanente |
| `timestamp` | Data de criacao |
| `like_count` | Total de curtidas |
| `comments_count` | Total de comentarios |
| `view_count` | Views (inclui organico + pago) |

### Exemplo: Perfil do Concorrente
```bash
curl -X GET "https://graph.instagram.com/v25.0/{MEU_IG_USER_ID}?fields=business_discovery.fields(id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website).username(concorrente_handle)&access_token={TOKEN}"
```

### Exemplo: Midias do Concorrente (com paginacao)
```bash
curl -X GET "https://graph.instagram.com/v25.0/{MEU_IG_USER_ID}?fields=business_discovery.fields(media.limit(10){id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count}).username(concorrente_handle)&access_token={TOKEN}"
```

**Resposta:**
```json
{
  "business_discovery": {
    "media": {
      "data": [
        {
          "id": "17854360229135492",
          "caption": "Post do concorrente",
          "media_type": "IMAGE",
          "permalink": "https://www.instagram.com/p/XYZ789/",
          "timestamp": "2026-03-09T10:00:00+0000",
          "like_count": 890,
          "comments_count": 45
        }
      ],
      "paging": {
        "cursors": {"before": "...", "after": "..."},
        "next": "..."
      }
    }
  },
  "id": "{MEU_IG_USER_ID}"
}
```

### Limitacoes do Business Discovery
- Alvo deve ser uma **conta profissional** (Business ou Creator)
- Contas com **restricao de idade** nao retornam dados
- **NAO** e possivel fazer GET direto nos IDs de midia retornados (permissao insuficiente)
- Consulta sempre via **username** (nao ID)
- Insights/metricas detalhadas do concorrente **NAO** estao disponiveis
- Sujeito aos rate limits padroes da plataforma

---

## 10. Publicacao de Conteudo

### Fluxo de 2 Etapas

**Etapa 1:** Criar Container → **Etapa 2:** Publicar Container

**Permissoes:**
- `instagram_business_basic`
- `instagram_business_content_publish`

### 10.1 Publicar Imagem Unica

#### Etapa 1: Criar Container
```bash
curl -X POST "https://graph.instagram.com/v25.0/{IG_USER_ID}/media" \
  -d "image_url=https://exemplo.com/imagem.jpg" \
  -d "caption=Legenda do post #hashtag" \
  -d "access_token={TOKEN}"
```

**Resposta:** `{"id": "{IG_CONTAINER_ID}"}`

#### Etapa 2: Publicar
```bash
curl -X POST "https://graph.instagram.com/v25.0/{IG_USER_ID}/media_publish" \
  -d "creation_id={IG_CONTAINER_ID}" \
  -d "access_token={TOKEN}"
```

**Resposta:** `{"id": "{IG_MEDIA_ID}"}`

### 10.2 Publicar Reel

#### Etapa 1: Criar Container
```bash
curl -X POST "https://graph.instagram.com/v25.0/{IG_USER_ID}/media" \
  -d "media_type=REELS" \
  -d "video_url=https://exemplo.com/reel.mp4" \
  -d "caption=Meu reel incrivel" \
  -d "access_token={TOKEN}"
```

#### Upload Resumavel (videos grandes)
```bash
# 1. Criar container com upload_type=resumable
curl -X POST "https://graph.instagram.com/v25.0/{IG_USER_ID}/media" \
  -d "media_type=REELS" \
  -d "upload_type=resumable" \
  -d "caption=Reel via upload resumavel" \
  -d "access_token={TOKEN}"

# 2. Upload do arquivo
curl -X POST "https://rupload.facebook.com/ig-api-upload/{IG_CONTAINER_ID}" \
  -H "Authorization: OAuth {TOKEN}" \
  -H "Content-Type: video/mp4" \
  --data-binary @video.mp4
```

#### Trial Reels (teste antes de publicar)
```bash
curl -X POST "https://graph.instagram.com/v25.0/{IG_USER_ID}/media" \
  -d "media_type=REELS" \
  -d "video_url=https://exemplo.com/reel.mp4" \
  -d "caption=Reel de teste" \
  -d "trial_params={\"graduation_strategy\":\"MANUAL\"}" \
  -d "access_token={TOKEN}"
```

**graduation_strategy:** `MANUAL` ou `SS_PERFORMANCE`

### 10.3 Publicar Carrossel

#### Etapa 1A: Criar Containers dos Itens
```bash
# Item 1 (imagem)
curl -X POST "https://graph.instagram.com/v25.0/{IG_USER_ID}/media" \
  -d "image_url=https://exemplo.com/foto1.jpg" \
  -d "is_carousel_item=true" \
  -d "access_token={TOKEN}"
# Resposta: {"id": "CONTAINER_1_ID"}

# Item 2 (video)
curl -X POST "https://graph.instagram.com/v25.0/{IG_USER_ID}/media" \
  -d "media_type=VIDEO" \
  -d "video_url=https://exemplo.com/video1.mp4" \
  -d "is_carousel_item=true" \
  -d "access_token={TOKEN}"
# Resposta: {"id": "CONTAINER_2_ID"}
```

#### Etapa 1B: Criar Container do Carrossel
```bash
curl -X POST "https://graph.instagram.com/v25.0/{IG_USER_ID}/media" \
  -d "media_type=CAROUSEL" \
  -d "children=CONTAINER_1_ID,CONTAINER_2_ID" \
  -d "caption=Meu carrossel" \
  -d "access_token={TOKEN}"
# Resposta: {"id": "CAROUSEL_CONTAINER_ID"}
```

#### Etapa 2: Publicar
```bash
curl -X POST "https://graph.instagram.com/v25.0/{IG_USER_ID}/media_publish" \
  -d "creation_id=CAROUSEL_CONTAINER_ID" \
  -d "access_token={TOKEN}"
```

### 10.4 Publicar Story

```bash
# Imagem
curl -X POST "https://graph.instagram.com/v25.0/{IG_USER_ID}/media" \
  -d "media_type=STORIES" \
  -d "image_url=https://exemplo.com/story.jpg" \
  -d "access_token={TOKEN}"

# Video
curl -X POST "https://graph.instagram.com/v25.0/{IG_USER_ID}/media" \
  -d "media_type=STORIES" \
  -d "video_url=https://exemplo.com/story.mp4" \
  -d "access_token={TOKEN}"
```

**Nota:** Stories retornam como IMAGE/VIDEO no campo `media_type`. Verificar `media_product_type=STORY`.

### Parametros de Criacao de Container

| Parametro | Tipo | Descricao | Obrigatorio |
|-----------|------|-----------|-------------|
| `access_token` | String | Token do usuario | Sim |
| `image_url` | String | URL publica da imagem (JPEG) | Sim (imagem) |
| `video_url` | String | URL publica do video (MP4) | Sim (video) |
| `media_type` | String | `VIDEO`, `REELS`, `STORIES`, `IMAGE`, `CAROUSEL` | Depende |
| `caption` | String | Legenda do post | Nao |
| `is_carousel_item` | Boolean | Se e item de carrossel | Para itens |
| `children` | String | IDs dos containers (separados por virgula, max 10) | Para carrossel |
| `upload_type` | String | `resumable` para upload grande | Nao |
| `user_tags` | Array | Tags de usuarios | Nao |
| `location` | String | Localizacao geografica | Nao |
| `trial_params` | JSON | Parametros de trial reel | Nao |

### Verificar Limite de Publicacao
```bash
curl -X GET "https://graph.instagram.com/v25.0/{IG_USER_ID}/content_publishing_limit?access_token={TOKEN}"
```

### Formatos Suportados
- **Imagens:** Apenas JPEG (MPO e JPS nao suportados)
- **Videos:** MP4 e formatos padrao
- **NAO suportados:** Shopping tags, branded content tags, filtros

### Limites de Publicacao
- **100 posts por periodo de 24 horas** (janela movel)
- Carrosseis contam como 1 post
- Limite aplicado no endpoint `media_publish`
- Container expira em **24 horas** se nao publicado
- Midia deve estar em servidor **publicamente acessivel** no momento da publicacao

---

## 11. Moderacao de Comentarios

### Resumo dos Endpoints

| Operacao | Metodo | Endpoint |
|----------|--------|----------|
| Listar comentarios | GET | `/{IG_MEDIA_ID}/comments` |
| Ler comentario | GET | `/{IG_COMMENT_ID}` |
| Listar respostas | GET | `/{IG_COMMENT_ID}/replies` |
| Responder | POST | `/{IG_COMMENT_ID}/replies` |
| Ocultar/Mostrar | POST | `/{IG_COMMENT_ID}` |
| Excluir | DELETE | `/{IG_COMMENT_ID}` |
| Habilitar/Desabilitar | POST | `/{IG_MEDIA_ID}` |

### Permissoes
- `instagram_business_basic`
- `instagram_business_manage_comments`

**Standard Access:** Apenas contas que voce gerencia
**Advanced Access:** Contas de terceiros

Ver detalhes completos na [Secao 5: Node Instagram Comment](#5-node-instagram-comment).

---

## 12. Mencoes

### Endpoints

#### Obter Midias Onde Foi Marcado
```bash
curl -X GET "https://graph.instagram.com/v25.0/{IG_USER_ID}/tags?fields=id,caption,media_type,media_url,permalink,timestamp&access_token={TOKEN}"
```

#### Responder a Mencao (em comentario ou legenda)
```bash
curl -X POST "https://graph.instagram.com/v25.0/{IG_USER_ID}/mentions" \
  -d "comment_id={COMMENT_ID}" \
  -d "message=Obrigado pela mencao!" \
  -d "access_token={TOKEN}"
```

### Permissoes
- `instagram_business_basic`
- `instagram_business_manage_comments`

### Limitacoes
- Mencoes em **Stories NAO sao suportadas**
- Comentar em fotos onde a conta foi tagueada **NAO e suportado**
- Webhooks de mencao **nao funcionam** se a conta originaria for privada

---

## 13. Webhooks

### Eventos Disponiveis

| Campo | Descricao | Permissao Extra |
|-------|-----------|-----------------|
| `comments` | Comentarios em midias | `instagram_business_manage_comments` |
| `live_comments` | Comentarios em lives | `instagram_business_manage_comments` |
| `mentions` | @mencoes (incluido em comments) | `instagram_business_manage_comments` |
| `messages` | Mensagens diretas | `instagram_business_manage_messages` |
| `message_echoes` | Echo de mensagens enviadas | `instagram_business_manage_messages` |
| `message_reactions` | Reacoes a mensagens | `instagram_business_manage_messages` |
| `messaging_handover` | Eventos de handover | `instagram_business_manage_messages` |
| `messaging_optins` | Opt-ins de usuarios | `instagram_business_manage_messages` |
| `messaging_postbacks` | Postbacks de mensagens | `instagram_business_manage_messages` |
| `messaging_referral` | Dados de referral | `instagram_business_manage_messages` |
| `messaging_seen` | Confirmacao de leitura | `instagram_business_manage_messages` |
| `messaging_policy_enforcement` | Violacoes de politica | `instagram_business_manage_messages` |
| `response_feedback` | Feedback de respostas | `instagram_business_manage_messages` |
| `standby` | Transicoes de standby | `instagram_business_manage_messages` |
| `story_insights` | Metricas de stories | `instagram_business_basic` |

### Configuracao

#### 1. Criar Endpoint de Verificacao
Responder a GET com `hub.challenge` quando `hub.verify_token` corresponde ao configurado.

#### 2. Subscrever aos Campos
```bash
curl -X POST "https://graph.instagram.com/v25.0/me/subscribed_apps" \
  -d "subscribed_fields=comments,mentions,story_insights" \
  -d "access_token={TOKEN}"
```

### Detalhes Tecnicos
- Assinado com **SHA256** no header `X-Hub-Signature-256`
- Maximo **1000 atualizacoes por batch**
- Retentativas por ate **36 horas** (deduplicacao recomendada)
- App deve estar com status **Live**
- Conta deve ser **publica** para notificacoes de comentarios/mencoes
- Metricas de story limitadas as **primeiras 24 horas**

---

## 14. Rate Limits

### Formula de Limite (Endpoints gerais exceto messaging)
```
Chamadas permitidas em 24h = 4.800 x Numero de Impressoes
```

"Impressoes" = numero de vezes que qualquer conteudo da conta profissional apareceu na tela de alguem nas ultimas 24 horas.

**Minimo implícito:** Contas novas/pequenas tem um limite base mesmo com poucas impressoes.

### Limites de Messaging

| Endpoint | Limite |
|----------|--------|
| Conversations API | 2 chamadas/segundo por conta |
| Private Replies (Lives) | 100 chamadas/segundo |
| Private Replies (Posts/Reels) | 750 chamadas/hora por conta |
| Send API (texto, links, reacoes) | 100 chamadas/segundo |
| Send API (audio/video) | 10 chamadas/segundo |

### Limite de Publicacao
- **100 posts** por periodo de 24 horas (janela movel)
- Carrosseis contam como 1 post

### Header de Resposta
```
X-Business-Use-Case-Usage: {
  "{business_id}": [
    {
      "type": "instagram",
      "call_count": 28,
      "total_cputime": 15,
      "total_time": 20,
      "estimated_time_to_regain_access": 0
    }
  ]
}
```

Valores sao **percentuais** (0-100). Ao atingir 100, erro `80002` e retornado.

### Como Tratar Rate Limits
1. Monitorar header `X-Business-Use-Case-Usage` em toda resposta
2. Quando `call_count` > 80%, reduzir frequencia
3. Se erro `80002`, aguardar `estimated_time_to_regain_access` segundos
4. Business Discovery e Hashtag Search seguem limites padrao da plataforma

---

## 15. Permissoes (Scopes)

### Escopos para Instagram Login

| Escopo | Funcionalidades |
|--------|----------------|
| `instagram_business_basic` | Perfil, media, insights, business discovery, tags, mentions (leitura) |
| `instagram_business_content_publish` | Publicar imagens, videos, reels, stories, carrosseis |
| `instagram_business_manage_comments` | Ler, responder, ocultar, excluir comentarios; responder a mencoes |
| `instagram_business_manage_messages` | Enviar e receber mensagens diretas |

### Niveis de Acesso

| Nivel | Contas | Requisitos |
|-------|--------|-----------|
| **Standard Access** | Apenas contas que voce possui/gerencia | App Review basico |
| **Advanced Access** | Qualquer conta profissional | App Review completo |

### Mapeamento Escopo x Funcionalidade

| Funcionalidade | Escopo Necessario | Nivel Minimo |
|----------------|-------------------|--------------|
| Ler perfil proprio | `instagram_business_basic` | Standard |
| Listar midias proprias | `instagram_business_basic` | Standard |
| Insights da conta | `instagram_business_basic` | Standard |
| Insights de midia | `instagram_business_basic` | Standard |
| Business Discovery | `instagram_business_basic` | Standard |
| Publicar conteudo | `instagram_business_content_publish` | Standard |
| Ler comentarios | `instagram_business_manage_comments` | Standard |
| Responder comentarios | `instagram_business_manage_comments` | Standard |
| Excluir comentarios | `instagram_business_manage_comments` | Standard |
| Responder mencoes | `instagram_business_manage_comments` | Standard |
| Mensagens | `instagram_business_manage_messages` | Standard |

---

## 16. Mudancas Recentes e Depreciacoes

### Versao Atual: v25.0

### Depreciacoes Importantes

| Item | Versao | Data | Acao |
|------|--------|------|------|
| Metrica `impressions` (conta) | v22.0+ | 21/04/2025 | Substituida por `views` |
| Escopos legados (`business_basic`, etc) | - | 27/01/2025 | Migrar para `instagram_business_*` |
| `legacy_instagram_user_id` | v21.0+ | - | Usar `id` novo |
| `legacy_instagram_media_id` | v21.0+ | - | Usar `id` novo |

### Novas Funcionalidades (v22.0+)

| Funcionalidade | Status |
|----------------|--------|
| Metrica `views` (conta e midia) | Em desenvolvimento (substituindo `impressions`) |
| Metrica `comments` (conta) | Em desenvolvimento |
| Trial Reels | Disponivel |
| Upload Resumavel de Video | Disponivel |
| Connected Threads User | Disponivel |
| Delete Media endpoint | Disponivel |

### Mudancas de Escopo (27/01/2025)

| Escopo Antigo | Escopo Novo |
|---------------|-------------|
| `business_basic` | `instagram_business_basic` |
| `business_content_publish` | `instagram_business_content_publish` |
| `business_manage_comments` | `instagram_business_manage_comments` |
| `business_manage_messages` | `instagram_business_manage_messages` |

---

## Apendice A: Tabela Resumo de Todos os Endpoints

| # | Metodo | Endpoint | Descricao | Permissao |
|---|--------|----------|-----------|-----------|
| 1 | GET | `/me` | Perfil do usuario autenticado | basic |
| 2 | GET | `/{IG_USER_ID}` | Perfil por ID | basic |
| 3 | GET | `/{IG_USER_ID}/media` | Listar midias | basic |
| 4 | GET | `/{IG_USER_ID}/stories` | Listar stories ativos | basic |
| 5 | GET | `/{IG_USER_ID}/tags` | Midias onde foi marcado | basic |
| 6 | GET | `/{IG_USER_ID}/insights` | Insights da conta | basic |
| 7 | GET | `/{IG_USER_ID}?fields=business_discovery...` | Dados de concorrente | basic |
| 8 | GET | `/{IG_USER_ID}/content_publishing_limit` | Limite de publicacao | basic |
| 9 | POST | `/{IG_USER_ID}/media` | Criar container de midia | content_publish |
| 10 | POST | `/{IG_USER_ID}/media_publish` | Publicar container | content_publish |
| 11 | POST | `rupload.facebook.com/ig-api-upload/{ID}` | Upload resumavel | content_publish |
| 12 | GET | `/{IG_MEDIA_ID}` | Detalhes de uma midia | basic |
| 13 | POST | `/{IG_MEDIA_ID}` | Habilitar/desabilitar comentarios | manage_comments |
| 14 | DELETE | `/{IG_MEDIA_ID}` | Excluir midia | basic |
| 15 | GET | `/{IG_MEDIA_ID}/children` | Itens do carrossel | basic |
| 16 | GET | `/{IG_MEDIA_ID}/collaborators` | Colaboradores | basic |
| 17 | GET | `/{IG_MEDIA_ID}/comments` | Comentarios da midia | manage_comments |
| 18 | GET | `/{IG_MEDIA_ID}/insights` | Insights da midia | basic |
| 19 | GET | `/{IG_CONTAINER_ID}?fields=status_code` | Status do container | basic |
| 20 | GET | `/{IG_COMMENT_ID}` | Detalhes do comentario | manage_comments |
| 21 | GET | `/{IG_COMMENT_ID}/replies` | Respostas ao comentario | manage_comments |
| 22 | POST | `/{IG_COMMENT_ID}/replies` | Responder comentario | manage_comments |
| 23 | POST | `/{IG_COMMENT_ID}` | Ocultar/mostrar comentario | manage_comments |
| 24 | DELETE | `/{IG_COMMENT_ID}` | Excluir comentario | manage_comments |
| 25 | POST | `/{IG_USER_ID}/mentions` | Responder a mencao | manage_comments |
| 26 | POST | `/me/subscribed_apps` | Subscrever webhooks | basic |
| 27 | GET | `/access_token` | Trocar short→long token | - |
| 28 | GET | `/refresh_access_token` | Renovar long-lived token | - |

**Prefixo base:** `https://graph.instagram.com/v25.0`
**Permissoes abreviadas:** `basic` = `instagram_business_basic`, `content_publish` = `instagram_business_content_publish`, `manage_comments` = `instagram_business_manage_comments`

---

## Apendice B: Implementacao de Auto-Refresh de Token

```typescript
// Estrategia recomendada para renovacao automatica
const TOKEN_REFRESH_DAYS = 50; // Renovar 10 dias antes de expirar

async function refreshInstagramToken(currentToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const response = await fetch(
    `https://graph.instagram.com/refresh_access_token` +
    `?grant_type=ig_refresh_token` +
    `&access_token=${currentToken}`
  );

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json();
}

// Agendar renovacao automatica
// - Salvar token_expires_at no banco
// - Cron job diario verificando se (now + 10 dias) > expires_at
// - Se sim, chamar refreshInstagramToken()
// - Atualizar token e expires_at no banco
```

---

*Documento gerado com base na documentacao oficial Meta Developers (marco 2026)*
*Versao da API: v25.0*
