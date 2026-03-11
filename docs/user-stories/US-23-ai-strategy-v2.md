# US-23: AI Strategy V2 (Com Dados Completos)

**Status:** Draft
**Prioridade:** MEDIA
**Estimativa:** 2-3 horas
**Depende de:** US-15, US-16
**Branch:** v2-dashboard

---

## Descricao

Atualizar o relatorio de estrategia AI (MetaAiStrategy + endpoint) para incluir os novos dados disponiveis: demographics, account trends, reels watch time, follows from content. O relatorio atual usa apenas dados de post-level; com account-level insights o Gemini pode gerar analises muito mais ricas.

---

## Acceptance Criteria

### AC-1: Enriquecer prompt do Gemini
- [ ] Incluir dados de account insights (reach diario, engagement trend)
- [ ] Incluir demographics summary (top idade, top cidade, genero split)
- [ ] Incluir follower growth (net growth ultimos 30 dias)
- [ ] Incluir reels vs feed performance comparison
- [ ] Incluir follows from content (quais posts geram seguidores)

### AC-2: Expandir secoes do relatorio
- [ ] Adicionar secao: "Quem e seu publico" (baseado em demographics)
- [ ] Adicionar secao: "Tendencia da conta" (crescendo/estagnado/caindo)
- [ ] Adicionar secao: "Reels vs Feed" (qual formato performa melhor e por que)
- [ ] Manter secoes existentes (melhor formato, melhor dia, hashtags, acoes)

### AC-3: Atualizar endpoint `/api/meta-ai-strategy`
- [ ] Aceitar dados extras no body: `{ posts, summary, accountInsights?, demographics? }`
- [ ] Adaptar prompt baseado nos dados disponiveis
- [ ] Se demographics nao disponivel, omitir secao (graceful degradation)

---

## Escopo

**IN:**
- Atualizacao do prompt Gemini
- Atualizacao do endpoint
- Atualizacao do componente para enviar dados extras

**OUT:**
- Novas funcionalidades de AI (chat, Q&A)
- Salvamento de relatorios historicos

---

## Criterio de Done
- [ ] Relatorio inclui analise de demographics quando disponivel
- [ ] Relatorio inclui tendencia da conta
- [ ] Prompt nao quebra se dados extras nao estao disponiveis
- [ ] `npm run build` passa

---

## File List
- [ ] `app/api/meta-ai-strategy/route.ts` — Atualizar prompt e input
- [ ] `features/analytics/components/meta-ai-strategy.tsx` — Enviar dados extras
- [ ] `features/analytics/components/minha-conta-view.tsx` — Passar dados extras
