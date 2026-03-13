# Meta API Standard Access — Roadmap de Implementacao

**Data:** 11 de marco de 2026
**Branch:** v2-dashboard

---

## VISAO GERAL

```
SPRINT 1 (Correcoes)     SPRINT 2 (Dados)       SPRINT 3 (UI)          SPRINT 4 (Extras)
┌─────────────────┐      ┌─────────────────┐     ┌─────────────────┐    ┌─────────────────┐
│ US-15            │      │ US-16            │     │ US-17            │    │ US-21            │
│ Fixes Criticos   │─────>│ Account Insights │────>│ KPI Overhaul     │    │ Comment Reply    │
│ 2-3h             │      │ 4-5h             │     │ 3-4h             │    │ 3-4h             │
└─────────────────┘      └─────────────────┘     ├─────────────────┤    ├─────────────────┤
                                                  │ US-18            │    │ US-22            │
                                                  │ Audience Dash    │    │ Publishing       │
                                                  │ 5-6h             │    │ 6-8h             │
                                                  ├─────────────────┤    ├─────────────────┤
                                                  │ US-20            │    │ US-23            │
                                                  │ Charts Enhanced  │    │ AI Strategy V2   │
                                                  │ 2-3h             │    │ 2-3h             │
                                                  └─────────────────┘    └─────────────────┘
                                                  │ US-19            │
                                                  │ Biz Discovery    │
                                                  │ 4-5h             │
                                                  └─────────────────┘
```

---

## PRIORIDADE E DEPENDENCIAS

| # | Story | Prioridade | Horas | Depende de | Status |
|---|-------|-----------|-------|-----------|--------|
| **US-15** | Correcoes Criticas da API | CRITICA | 2-3h | — | Ready |
| **US-16** | Account-Level Insights | CRITICA | 4-5h | US-15 | Ready |
| **US-17** | KPI Cards Overhaul | ALTA | 3-4h | US-15, US-16 | Ready |
| **US-18** | Dashboard de Audiencia | ALTA | 5-6h | US-16 | Ready |
| **US-19** | Business Discovery | MEDIA | 4-5h | US-15 | Ready |
| **US-20** | Melhorias nos Graficos | MEDIA | 2-3h | US-15 | Ready |
| **US-21** | Comment Reply via API | MEDIA | 3-4h | US-15 | Draft |
| **US-22** | Content Publishing | BAIXA | 6-8h | US-15 | Draft |
| **US-23** | AI Strategy V2 | MEDIA | 2-3h | US-15, US-16 | Draft |

---

## ESTIMATIVA TOTAL

| Fase | Stories | Horas | Descricao |
|------|---------|-------|-----------|
| Sprint 1 | US-15 | 2-3h | Pre-requisito — correcoes sem mudanca de UI |
| Sprint 2 | US-16 | 4-5h | Backend — novos dados disponiveis |
| Sprint 3 | US-17, US-18, US-19, US-20 | 14-18h | Frontend — exibir dados novos |
| Sprint 4 | US-21, US-22, US-23 | 11-15h | Extras — publicacao, reply, AI melhorada |
| **TOTAL** | **9 stories** | **31-41h** | — |

---

## ORDEM RECOMENDADA DE EXECUCAO

### Fase 1: Fundacao (FAZER PRIMEIRO)
1. **US-15** — Correcoes criticas (API version, OAuth bug, perfil, token refresh)
2. **US-16** — Account-level insights (novos dados da conta)

### Fase 2: Impacto Visual (MAIOR ROI)
3. **US-17** — KPI Cards overhaul (eliminar cards "N/D")
4. **US-18** — Dashboard de audiencia (demographics, growth)
5. **US-20** — Melhorias nos graficos (best hour, reels chart)

### Fase 3: Funcionalidades Extras
6. **US-19** — Business Discovery (concorrentes via API)
7. **US-23** — AI Strategy V2 (relatorio enriquecido)
8. **US-21** — Comment reply via API

### Fase 4: Publicacao (Quando Necessario)
9. **US-22** — Content publishing (pode ser feita depois)

---

## O QUE NAO MUDA

| Feature Existente | Status |
|---|---|
| Scraping Apify (Individual + VS) | MANTIDO — nao afetado |
| Playwright automation (comments, login) | MANTIDO — API e complemento, nao substituto |
| Maps scraper | MANTIDO — nao afetado |
| Intelligence Hub | MANTIDO — nao afetado |
| AI Strategy (Gemini) | MANTIDO — sera enriquecido na US-23 |
| Design V2 (glassmorphism) | MANTIDO — novas UIs seguem mesmo padrao |

---

## METRICAS DE SUCESSO

Apos implementacao completa:

| Metrica | Antes | Depois |
|---------|-------|--------|
| Endpoints API usados | 5 | 15+ |
| Campos do perfil | 2/13 | 9/13 |
| KPIs funcionais | 3/6 | 8/8 |
| Metricas de media | 5/14 | 11/14 |
| Insights de conta | 0/15 | 12/15 |
| Token auto-refresh | NAO | SIM |
| Demographics | NAO | SIM |
| Follower growth | NAO | SIM |
| Business Discovery | NAO | SIM |
| Comment reply via API | NAO | SIM |
| Aproveitamento Standard Access | ~20% | ~85% |
