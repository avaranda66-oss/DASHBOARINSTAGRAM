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
| `app/api/` | `pages/api/` | 45 endpoints: Meta Graph API, Ads, demographics, multi-account, upload, scraping |
| `app/actions/` | — | Server Actions: operações diretas no banco de dados |
| `components/` | `pages/components/` | Componentes reutilizáveis: layout, UI, filtros |
| `features/` | — | 7 módulos por domínio: accounts, ads (22 componentes), analytics, calendar, collections, content, storyboard |
| `lib/` | `models/` | Serviços, integrações de API, utilitários, banco de dados |
| `lib/services/` | `models/` | Instagram, Meta Ads, Apify, FireCrawl, Scheduler, AI |
| `lib/utils/` | — | Motor estatístico: 18 módulos, 7.728 LOC (Bayesian A/B, HW, Isolation Forest, Shapley, MMM, CUSUM, cache, CSV export) |
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
- **Campo correto para breakdowns:** `platform_position` (NÃO `platform_placement`)
- **Multi-account:** `GET /me/adaccounts` — token único funciona para todas as contas
- **Account status:** 1=ACTIVE, 2=DISABLED, 3=UNSETTLED, 101=CLOSED (filtrar)
- **Agendamento nativo:** NÃO existe para Instagram via API (apenas Facebook Pages)
- **Imagens:** A API aceita aspect ratios de 4:5 até 1.91:1 — não forçar crop
- **Tokens:** Curtos (~1h) → trocar por longos (~60 dias) no OAuth callback
- **Referência completa:** `docs/INSTAGRAM-API-REFERENCE.md`

---

## Frontend vs Backend — Onde está cada coisa

### FRONTEND — O que o usuário vê e clica no browser
```
app/dashboard/*/page.tsx     ← Telas: analytics, storyboard, ads, calendar...
components/layout/           ← Navbar, Sidebar, Header, menu mobile
components/ui/               ← Botões, cards, inputs, modais (shadcn/ui)
components/shared/           ← Filtros, busca, paleta de comandos
features/*/components/       ← Componentes específicos de cada tela
features/*/hooks/            ← Lógica de interação (cliques, formulários)
stores/                      ← Estado visual: o que está aberto, filtros ativos
app/globals.css              ← Estilos globais
```

### BACKEND — Roda no servidor, usuário nunca vê diretamente
```
app/api/*/route.ts           ← APIs: recebem requisições, chamam serviços
app/actions/                 ← Server Actions: operações diretas no banco
lib/services/                ← Integrações: Meta API, Gemini AI, Apify, Playwright
lib/utils/                   ← Motor estatístico e matemático
lib/db.ts                    ← Conexão com banco de dados
prisma/                      ← Schema e banco SQLite
scripts/                     ← Workers: agendador, publicação automática
```

### Zona cinzenta do Next.js (depende do contexto)
```
features/*/schemas/          ← Validação de formulários (client + server)
lib/constants.ts             ← Constantes compartilhadas entre os dois
types/                       ← Tipagens TypeScript (compilação apenas)
```

---

## Como Dados Sensíveis São Guardados

O projeto usa **dois lugares** para guardar segredos — veja a lógica:

### Lugar 1: Arquivo `.env` (apenas o mínimo de infraestrutura)
```env
DATABASE_URL="file:./dev.db"          # Caminho do banco — necessário para iniciar
INSTAGRAM_APP_ID=                     # ID do App no Meta Developer (OAuth)
INSTAGRAM_APP_SECRET=                 # Secret do App no Meta Developer (OAuth)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # URL pública do app
```
Esses dois campos do Meta ficam aqui porque são necessários **antes** do usuário fazer login — são usados para iniciar o fluxo OAuth do Instagram.

### Lugar 2: Banco de Dados SQLite — `prisma/dev.db` (a maioria dos segredos)
Os demais tokens e chaves ficam **dentro do banco**, configurados pela interface gráfica:

| Onde configurar na UI | Chave no banco | O que guarda |
|----------------------|----------------|-------------|
| Gerenciar Contas → Editar | `Account.access_token` | Token Meta API (~60 dias) |
| Gerenciar Contas → Editar | `Account.ads_token` | Token Meta Ads |
| Gerenciar Contas → Editar | `Account.ads_account_id` | ID da conta de anúncios |
| Configurações → Geral | `Setting['global-settings']` | Chaves Gemini, Apify, Firecrawl |
| Configurações → Tunnel | `Setting['tunnel_url']` | URL do Cloudflared tunnel |

### Por que esse design?
- `.env` é para o **sistema funcionar** (banco, OAuth)
- O banco é para **dados de usuário** (tokens das contas, API keys dos serviços)
- Assim você configura tudo pela **interface gráfica** sem precisar editar arquivos

### ⚠️ Risco atual: tokens sem criptografia
Os tokens ficam em **texto puro** no SQLite. Para uso local isso é aceitável. Para produção/nuvem, precisaria criptografar antes de salvar.

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

## Estatísticas do Projeto (2026-03-14)

| Categoria | Quantidade | LOC |
|-----------|-----------|-----|
| API Endpoints | 45 | ~5.000 |
| Ads Components | 22 | 6.473 |
| Statistical Utils | 18 | 7.728 |
| Services | 9 | 4.492 |
| Zustand Stores | 10 | 1.895 |
| Types | 7 | 522 |
| Hooks | 5 | 279 |
| **TOTAL** | **~169 arquivos** | **~25.000+** |

---

*Última atualização: 2026-03-14*
