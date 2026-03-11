# US-22: Publicar Conteudo via API

**Status:** Draft
**Prioridade:** BAIXA
**Estimativa:** 6-8 horas
**Depende de:** US-15
**Branch:** v2-dashboard

---

## Descricao

Implementar publicacao de conteudo (imagens, carrosseis, reels) diretamente pelo Dashboard via Meta Graph API. Fluxo de 2 etapas: criar container + publicar.

**NOTA:** Esta e uma feature de escopo grande e pode ser feita em fases. Phase 1 = imagem simples, Phase 2 = carrossel, Phase 3 = reels.

---

## Acceptance Criteria

### AC-1: Phase 1 — Publicar imagem simples
- [ ] `POST /{user_id}/media` com `{ image_url, caption, access_token }` → retorna container_id
- [ ] `POST /{user_id}/media_publish` com `{ creation_id: container_id, access_token }` → publica
- [ ] Verificar status do container antes de publicar (`GET /{container_id}?fields=status_code`)
- [ ] UI: formulario simples com URL da imagem + caption + botao publicar

### AC-2: Phase 2 — Publicar carrossel
- [ ] Criar container para cada item (ate 10)
- [ ] Criar container pai tipo CAROUSEL com `children` array
- [ ] Publicar container pai
- [ ] UI: upload/URL de multiplas imagens

### AC-3: Phase 3 — Publicar reel
- [ ] Criar container com `{ video_url, caption, media_type: 'REELS' }`
- [ ] Aguardar processamento (polling de status)
- [ ] Publicar quando status = FINISHED
- [ ] UI: URL do video + caption

### AC-4: Scope para OAuth
- [ ] Adicionar `instagram_business_content_publish` ao scope do OAuth
- [ ] Usuarios existentes precisam reconectar para ter a nova permissao

---

## Escopo

**IN:**
- Service functions para publicacao
- API endpoint `/api/meta-publish`
- UI basica de publicacao
- Polling de status de container

**OUT:**
- Agendamento de posts (feature futura)
- Editor de imagem/video
- Preview de post

---

## Criterio de Done
- [ ] Publicar imagem simples funciona end-to-end
- [ ] Post aparece no Instagram apos publicacao
- [ ] Error handling adequado (imagem invalida, rate limit)
- [ ] `npm run build` passa

---

## File List
- [ ] `lib/services/instagram-graph.service.ts` — Funcoes de publicacao
- [ ] `app/api/meta-publish/route.ts` — NOVO endpoint
- [ ] `features/analytics/components/meta-publish-form.tsx` — NOVO componente
- [ ] `app/api/auth/instagram/route.ts` — Adicionar scope
