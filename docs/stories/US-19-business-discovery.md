# US-19: Business Discovery (Dados de Concorrentes via API)

**Status:** Ready
**Prioridade:** MEDIA
**Estimativa:** 4-5 horas
**Depende de:** US-15
**Branch:** v2-dashboard

---

## Descricao

Implementar Business Discovery da Instagram Graph API para buscar dados publicos de concorrentes diretamente pela API (sem Apify). Isso complementa a aba "Individual" (Apify) com uma alternativa gratuita e mais confiavel para dados basicos de concorrentes.

---

## Acceptance Criteria

### AC-1: Novo service function `fetchBusinessDiscovery()`
- [ ] Chamar `GET /{user_id}?fields=business_discovery.fields(username,name,biography,followers_count,follows_count,media_count,profile_picture_url,media.limit(25){id,caption,media_type,like_count,comments_count,timestamp,permalink,media_url})`
- [ ] Parametro `business_discovery` usa o username do concorrente
- [ ] Tratar erro quando concorrente nao e conta Business/Creator
- [ ] Retornar dados estruturados

### AC-2: Novo API endpoint `/api/meta-discovery`
- [ ] POST handler recebe `{ token, targetUsername }`
- [ ] Validacao de token
- [ ] Chama `fetchBusinessDiscovery()`
- [ ] Retorna `{ success, profile, posts, fetchedAt }`

### AC-3: Componente `MetaDiscoveryCard`
- [ ] Card com perfil do concorrente (foto, nome, bio, followers, following, posts)
- [ ] Mini-tabela com ultimos 25 posts (likes, comments, date)
- [ ] Calculo local de avg likes, avg comments, engagement estimate
- [ ] Comparacao lado-a-lado com sua conta (se dados disponiveis)

### AC-4: Integracao na aba VS ou nova secao
- [ ] Adicionar opcao de buscar concorrente via API (alem do Apify existente)
- [ ] Badge indicando fonte: "Meta API" vs "Apify"
- [ ] Se Apify nao esta configurado, usar Business Discovery como fallback

---

## Limitacoes Conhecidas

- Business Discovery so retorna dados de contas **Business** ou **Creator** (nao pessoais)
- So retorna dados **publicos** (likes, comments, nao insights privados)
- Rate limited junto com outras chamadas
- Nao retorna stories ou reels insights

---

## Escopo

**IN:**
- Service function para Business Discovery
- API endpoint
- Componente de UI para exibir dados do concorrente
- Integracao basica com aba existente

**OUT:**
- Substituir Apify completamente (Apify continua para dados mais ricos)
- Historico de dados de concorrentes
- Comparacao avancada multi-concorrente

---

## Criterio de Done
- [ ] Buscar dados publicos de qualquer conta Business/Creator pelo username
- [ ] Exibir perfil + posts do concorrente
- [ ] Calcular metricas basicas (avg likes, avg comments)
- [ ] `npm run build` passa

---

## File List
- [ ] `lib/services/instagram-graph.service.ts` — Nova funcao
- [ ] `app/api/meta-discovery/route.ts` — NOVO endpoint
- [ ] `features/analytics/components/meta-discovery-card.tsx` — NOVO componente
- [ ] `features/analytics/components/minha-conta-view.tsx` ou VS view — Integracao
