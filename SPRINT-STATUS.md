# Sprint Status — Dashboard Instagram OSS

---

## Sprint 1 — Foundation Auth + Persistence + Meta API ✅ ENCERRADA

**Data:** 2026-03-15 | **Branch:** v2-dashboard

### Entregues

| Chat | Tarefa | Status |
|------|--------|--------|
| A | Auth UX Fix — login page redesign, NextAuth v5 Credentials provider | ✅ |
| B | Supabase Persistence — 002_allowed_users, 003_profit_configs, automation_rules | ✅ |
| C | Meta API Fixes — instagram_user_id, campos obrigatórios v25, extractRoas, CTR | ✅ |
| D | UI Shell — DashboardShell MetaConnected logic, EmptyState, MetaStatusBadge | ✅ |
| F | Export — ads-report PDF/CSV, meta-publish route | ✅ |
| G | Testes — auth-crypto (11), statistics (25), export-csv (27) = 817/817 passando | ✅ |
| H | Build Validation — 0 TypeScript errors, 0 lint errors novos, build OK 73 páginas | ✅ |

### Estado de Saúde

| Check | Resultado |
|-------|-----------|
| `npx tsc --noEmit` | ✅ ZERO erros |
| `npm run lint` (arquivos novos/modificados) | ✅ ZERO erros |
| `npm run build` | ✅ 73 páginas, Turbopack, 8.3s |

### Dívida Técnica Documentada (pré-existente, fora de escopo)

- `app/actions/*.ts` — `@typescript-eslint/no-explicit-any` (7 arquivos, não tocados nesta sprint)
- `middleware.ts` → warning de proxy no build (tarefa futura)
- `turbopack.root` config — warning de lockfile (tarefa futura)

---

## Sprint 2 — UX Logic Fixes ✅ ENCERRADA

**Data:** 2026-03-15 | **Branch:** v2-dashboard

### Entregues

| Chat | Bug | Arquivo | Status |
|------|-----|---------|--------|
| A | B-1: Sparkline createdAt→scheduledAt | `app/dashboard/page.tsx` | ✅ |
| A | B-2: Mock data guard NODE_ENV | `stores/content-slice.ts` | ✅ |
| B | B-3: Token OAuth sync → account.access_token | `lib/auth/auth.ts` | ✅ |
| C | B-4: Tunnel URL validation na server action | `content.actions.ts` + editor | ✅ |

### Bugs Corrigidos

- **Sparkline** agora conta `scheduledAt` (posts agendados por dia), não `createdAt`
- **Mock data** só seed em `NODE_ENV=development`, nunca em produção
- **Token OAuth** sincroniza automaticamente com `account.access_token` no SQLite após login Meta
- **Agendamento com mídia local** retorna erro estruturado se `tunnel_url` não configurada

---

## Backlog Priorizado — Próximas Sprints

### Alta Prioridade

- [ ] **Deduplicador de requests** — fetch duplo nos filtros de período (ads/page)
- [ ] **Calendar rescheduling** — permitir arrastar/clicar para reagendar no Calendar
- [ ] **Scheduler status** — endpoint `/api/scheduler/status` para verificar saúde do scheduler
- [ ] **Cleanup lint actions/** — tipar `any` pré-existentes em `app/actions/`

### EPIC-INTELLIGENCE-V3

- [ ] US-84: Anomaly Detection aprimorado
- [ ] US-85: Bayesian A/B Testing v2
- [ ] US-86: HW Optimizer v2
- [ ] US-87: Causal Behavioral Engine

### Módulos Estatísticos Avançados

- [ ] US-28: Isolation Forest — detecção de outliers
- [ ] US-29: Shapley + Markov — atribuição multi-touch
- [ ] US-30: Fisher + normalQuantile — significância estatística

### Infra

- [ ] Middleware → Proxy — eliminar warning no build
- [ ] Turbopack root config — eliminar warning de lockfile

---

## Stack Atual

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js | 16.1.6 |
| Runtime | React | 19 |
| Linguagem | TypeScript | 5 (strict) |
| Estilo | Tailwind CSS | 4 |
| ORM | Prisma | 5 |
| DB Content | SQLite | — |
| DB Auth/Config | Supabase (PostgreSQL) | — |
| Auth | NextAuth | v5 beta.30 |
| State | Zustand | — |
| Ads API | Meta Graph API | v25.0 |
| Analytics | Apify + Meta Insights | — |
| IA | Gemini Multimodal | — |
| Testes | Vitest + Testing Library | — |
| Build | Turbopack | — |

---

*Última atualização: 2026-03-15*
