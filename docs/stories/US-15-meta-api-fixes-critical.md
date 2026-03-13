# US-15: Correcoes Criticas da Meta Graph API

**Status:** Ready
**Prioridade:** CRITICA
**Estimativa:** 2-3 horas
**Depende de:** Nenhuma
**Branch:** v2-dashboard

---

## Descricao

Corrigir os 6 erros criticos encontrados na auditoria da integracao com a Meta Graph API. Essas correcoes sao pre-requisito para todas as outras stories de melhoria.

---

## Acceptance Criteria

### AC-1: Atualizar versao da API
- [ ] Trocar `GRAPH_VERSION` de `v21.0` para `v25.0` em `instagram-graph.service.ts`
- [ ] Verificar que todos os endpoints continuam funcionando com v25.0
- [ ] Atualizar metrica `views` conforme nova semantica (substitui `impressions`)

### AC-2: Corrigir bug na URL de OAuth
- [ ] Corrigir `?client_id=` para `&client_id=` em `app/api/auth/instagram/route.ts` (linha 18 — segundo `?` deveria ser `&`)
- [ ] Testar fluxo de login completo

### AC-3: Buscar perfil completo
- [ ] Expandir fields de `GET /me` para incluir: `username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website`
- [ ] Salvar novos campos no banco (Account model)
- [ ] Atualizar Prisma schema se necessario (adicionar campos `name`, `biography`, `followers_count`, `follows_count`, `media_count`, `website`)

### AC-4: Implementar refresh automatico de token
- [ ] Criar funcao `refreshMetaToken(token)` que chama `GET /refresh_access_token?grant_type=ig_refresh_token&access_token={token}`
- [ ] Chamar refresh quando token estiver a menos de 7 dias de expirar
- [ ] Atualizar `expires_at` no banco apos refresh
- [ ] Log de sucesso/falha do refresh

### AC-5: Buscar `media_product_type` nos posts
- [ ] Adicionar `media_product_type` aos fields de `GET /me/media`
- [ ] Usar para diferenciar FEED vs REELS vs STORY (em vez de adivinhar pelo media_type)

### AC-6: Buscar metricas extras de insights
- [ ] Adicionar `follows,profile_visits` ao fetch de insights por media
- [ ] Adicionar `ig_reels_avg_watch_time` para REELS
- [ ] Tratar gracefully quando metrica nao esta disponivel para o tipo de media

---

## Escopo

**IN:**
- Correcoes no service layer (`instagram-graph.service.ts`)
- Correcoes no auth flow (`auth/instagram/route.ts`, `callback/route.ts`)
- Atualizacao do Prisma schema (novos campos Account)
- Migration do banco

**OUT:**
- Alteracoes de UI (stories separadas)
- Novos endpoints de API
- Account-level insights (story separada)

---

## Criterio de Done
- [ ] `npm run build` passa sem erros
- [ ] Login OAuth funciona com URL corrigida
- [ ] Perfil retorna todos os campos novos
- [ ] Token refresh funciona (testar com token proximo de expirar)
- [ ] Insights retornam metricas extras (follows, profile_visits, watch_time)

---

## File List
- [ ] `lib/services/instagram-graph.service.ts` — Correcoes principais
- [ ] `app/api/auth/instagram/route.ts` — Fix URL bug
- [ ] `app/api/auth/instagram/callback/route.ts` — Buscar perfil completo
- [ ] `prisma/schema.prisma` — Novos campos Account
- [ ] Migration Prisma
