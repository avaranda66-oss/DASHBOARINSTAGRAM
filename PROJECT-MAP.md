# PROJECT-MAP.md — DASHBOARD-OSS

> Guia de navegação do projeto. Leia isso primeiro.
> Stack: Next.js · React 19 · TypeScript · Tailwind v4 · Prisma/SQLite · Zustand · Meta Graph API

---

## O que é este projeto

Dashboard profissional para gestão de Instagram e Meta Ads. Permite gerenciar contas,
agendar e publicar conteúdo, analisar métricas, monitorar concorrentes e criar campanhas
de anúncios com inteligência artificial.

---

## Mapa de Pastas

### ZONA 1 — Aplicação (o que faz o projeto rodar)

| Pasta | Equivalente clássico | O que tem dentro |
|-------|---------------------|-----------------|
| `app/` | `pages/` | Páginas do dashboard + rotas de API (Next.js App Router) |
| `app/api/` | `pages/api/` | ~30 endpoints: Meta Graph API, Ads, upload, scraping |
| `app/actions/` | — | Server Actions: operações diretas no banco de dados |
| `components/` | `pages/components/` | Componentes reutilizáveis: layout, UI, filtros |
| `features/` | — | 7 módulos por domínio: accounts, ads, analytics, calendar, collections, content, storyboard |
| `lib/` | `models/` | Serviços, integrações de API, utilitários, banco de dados |
| `lib/services/` | `models/` | Instagram, Meta Ads, Apify, FireCrawl, Scheduler, AI |
| `lib/utils/` | — | Motor estatístico: estatísticas, forecasting, sentimento |
| `lib/db.ts` | `infra/database.js` | Conexão com banco de dados (Prisma singleton) |
| `hooks/` | — | Custom React hooks |
| `stores/` | — | Estado global Zustand (por domínio) |
| `types/` | — | Tipagens TypeScript |
| `prisma/` | `infra/migrations/` | Schema do banco + migrações automáticas |
| `prisma/schema.prisma` | `infra/database.sql` | 7 modelos: Account, Content, Collection, Competitor, Analytics, Setting, MapsBusiness |
| `public/` | `public/` | Assets estáticos, uploads de imagens, criativos |
| `scripts/` | — | 5 scripts ativos: agendador, publicação, login, tunnel |

### ZONA 2 — Suporte (ao redor do projeto, não necessário para rodar)

| Pasta/Arquivo | O que tem dentro |
|---------------|-----------------|
| `docs/` | Toda a documentação |
| `docs/architecture.md` | Arquitetura técnica do sistema |
| `docs/prd.md` | Documento de requisitos do produto |
| `docs/INSTAGRAM-API-REFERENCE.md` | Referência da Meta Graph API |
| `docs/screenshots/` | 13 capturas de tela do dashboard |
| `docs/stories/` | 24 user stories do projeto (US-01 a US-19) |
| `docs/research/` | Análises técnicas de API, relatórios de reanalise |
| `docs/design/` | Referências visuais, paleta de cores, componentes de design |
| `docs/qa/` | Relatórios de QA gerados pelo agente @qa |
| `archive/` | Scripts históricos — NÃO importar |
| `archive/scripts-deprecated/` | 73 scripts de desenvolvimento Meta Ads (referência histórica) |
| `.github/agents/` | Definições dos 12 agentes de IA |
| `.github/AGENTS.md` | Guia de ativação dos agentes |
| `.aios/` | Estado dos agentes IA (gitignored, local) |
| `squads/` | Squad AIOS de analytics (gitignored, local) |
| `sessions/` | Sessões de browser do Instagram (gitignored, sensível) |

---

## Arquivos de Configuração na Raiz

| Arquivo | Para que serve |
|---------|---------------|
| `next.config.ts` | Configuração do Next.js |
| `tsconfig.json` | TypeScript — alias `@/` aponta para a raiz |
| `tailwind.config.js` | Tailwind CSS v4 |
| `components.json` | shadcn/ui — registra componentes em `components/` |
| `package.json` | Dependências e scripts npm |
| `eslint.config.mjs` | Regras de linting |
| `.prettierrc` | Formatação de código |
| `.env` | Secrets: Meta API, Gemini, Apify, Firecrawl (nunca commitar) |
| `.gitignore` | Exclusões do git |

---

## Banco de Dados

- **Tipo:** SQLite (arquivo `prisma/dev.db`)
- **ORM:** Prisma
- **Modelos:**
  - `Account` — Contas Instagram conectadas com tokens Meta API
  - `Content` — Posts, stories, reels (agendamento, status, mídias)
  - `Collection` — Agrupamentos/campanhas de conteúdo
  - `Competitor` — Concorrentes monitorados
  - `Analytics` — Cache de métricas por conta+tipo
  - `Setting` — Configurações chave-valor (tunnel_url, api keys)
  - `MapsBusiness` — Dados raspados do Google Maps

---

## Comandos Essenciais

```bash
npm run dev        # Inicia servidor de desenvolvimento
npm run build      # Build de produção
npm run lint       # Verificação de código (ESLint)
npm run tunnel     # Expõe localhost via Cloudflared (necessário para Meta API)
```

---

## Regras para Agentes IA (@dev, @qa, @analyst, etc.)

| O que fazer | Onde |
|-------------|------|
| Ativar agente | `@dev`, `@qa`, `@architect`, `@analyst`, `@pm`, `@po`, `@sm` |
| Trabalhar a partir de stories | `docs/stories/` |
| Escrever relatórios de QA | `docs/qa/` |
| Logs de sessão de agentes | `.aios/dashboard/sessions/` (gitignored) |
| Logs de decisão (@dev YOLO) | `.aios/dashboard/decisions/` (gitignored) |
| Definições dos agentes | `.github/agents/` |
| Nunca tocar | `node_modules/`, `.next/`, `pnpm-lock.yaml` |
| Nunca commitar | `.env`, `sessions/`, `prisma/dev.db` |

---

## Notas Importantes da Meta API

- **Versão atual:** v25.0
- **Campo correto:** `instagram_user_id` (NÃO usar `instagram_actor_id` — depreciado em v22+)
- **Campos obrigatórios v25:** `is_adset_budget_sharing_enabled`, `targeting_automation`, `bid_strategy`
- **Agendamento nativo:** NÃO existe para Instagram via API (apenas Facebook Pages)
- **Imagens:** A API aceita aspect ratios de 4:5 até 1.91:1 — não forçar crop
- **Tokens:** Curtos (~1h) → trocar por longos (~60 dias) no OAuth callback
- **Referência completa:** `docs/INSTAGRAM-API-REFERENCE.md`

---

## Fluxo de Publicação de Posts

```
UI (storyboard) → content.actions.ts → banco SQLite
                                           ↓
                              scheduler.service.ts (checa a cada 1min)
                                           ↓
                              instagram-graph.service.ts → Meta API v25
                                           ↓
                              status: scheduled → published/failed
```

---

*Última atualização: 2026-03-13*
