# US-21: Responder Comentarios via API (Complemento ao Playwright)

**Status:** Draft
**Prioridade:** MEDIA
**Estimativa:** 3-4 horas
**Depende de:** US-15
**Branch:** v2-dashboard

---

## Descricao

Implementar resposta a comentarios diretamente pela Meta Graph API como alternativa/complemento ao Playwright. A API e mais rapida, confiavel e nao requer browser aberto. O Playwright continua como fallback para cenarios onde a API nao funciona.

---

## Acceptance Criteria

### AC-1: Novo service function `replyToComment()`
- [ ] Chamar `POST /{comment_id}/replies` com `{ message }` no body
- [ ] Retornar ID do comentario criado
- [ ] Tratar erros (comentario deletado, permissao negada, rate limit)

### AC-2: Novo service function `hideComment()` e `deleteComment()`
- [ ] `POST /{comment_id}` com `{ hide: true }` para ocultar
- [ ] `DELETE /{comment_id}` para deletar
- [ ] Retornar sucesso/falha

### AC-3: Atualizar API endpoint `/api/meta-comments`
- [ ] Adicionar metodo PUT para reply: `{ action: 'reply', commentId, message }`
- [ ] Adicionar metodo PATCH para hide: `{ action: 'hide', commentId }`
- [ ] Adicionar metodo DELETE para delete: `{ commentId }`

### AC-4: Integracao com fluxo existente de AI reply
- [ ] Quando AI sugere resposta, oferecer opcao "Responder via API" (alem de Playwright)
- [ ] Se API falhar, fallback para Playwright automaticamente
- [ ] Indicador visual de qual metodo foi usado

---

## Escopo

**IN:**
- Service functions para CRUD de comentarios
- Atualizacao do endpoint existente
- Integracao com fluxo de AI reply

**OUT:**
- Redesign da UI de comentarios
- Remocao do Playwright (continua como fallback)

---

## Criterio de Done
- [ ] Responder comentario via API funciona
- [ ] Ocultar/deletar comentario funciona
- [ ] Fallback para Playwright quando API falha
- [ ] `npm run build` passa

---

## File List
- [ ] `lib/services/instagram-graph.service.ts` — Novas funcoes
- [ ] `app/api/meta-comments/route.ts` — Novos handlers
