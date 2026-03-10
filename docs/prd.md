# Dashboard Instagram — Product Requirements Document (PRD)

## 1. Goals and Background Context

### 1.1 Goals

- Centralizar o planejamento, organização e agendamento de conteúdo para páginas de Instagram em um único dashboard web
- Oferecer um **Storyboard visual** para planejamento de posts, stories, reels e carrosséis
- Aumentar a produtividade de social media managers com workflows intuitivos e organização drag-and-drop
- Estabelecer a base para **automação futura** de postagens via Instagram Graph API
- Fornecer visão analítica do calendário editorial com métricas de cobertura e cadência

### 1.2 Background Context

Gerenciar conteúdo para Instagram de forma profissional exige malabarismo entre múltiplas ferramentas: planilhas para calendário editorial, Canva/Figma para criação visual, notas para roteiros e lembretes manuais para publicação. Essa fragmentação reduz a produtividade e aumenta o risco de falhas na cadência de postagem.

O **Dashboard Instagram** resolve esse problema ao consolidar o ciclo completo de planejamento de conteúdo — desde a concepção no storyboard até a organização no calendário — em uma aplicação web moderna. Na primeira versão (MVP), o foco é planejamento e organização; nas próximas iterações, o sistema evoluirá para automação de publicação e integração com a API do Instagram.

### 1.3 Change Log

| Date       | Version | Description                          | Author    |
| ---------- | ------- | ------------------------------------ | --------- |
| 2026-03-09 | 0.1     | Versão inicial do PRD                | Architect |

---

## 2. Requirements

### 2.1 Functional Requirements

1. **FR1:** O sistema deve permitir o cadastro e gerenciamento de múltiplas contas/páginas de Instagram (nome, handle, avatar, notas).
2. **FR2:** O sistema deve oferecer um **Storyboard visual** organizado em colunas/lanes (ex.: Ideia → Rascunho → Aprovado → Agendado → Publicado) com suporte a drag-and-drop.
3. **FR3:** Cada card do storyboard deve suportar: título, descrição/legenda, imagem(ns) de preview, tipo de conteúdo (Post, Story, Reel, Carrossel), hashtags, data/hora prevista de publicação e status.
4. **FR4:** O sistema deve exibir um **Calendário Editorial** (visualizações mensal, semanal e diária) mostrando os conteúdos agendados.
5. **FR5:** O sistema deve permitir a criação, edição, duplicação e exclusão de conteúdos (cards).
6. **FR6:** O sistema deve suportar upload de imagens e vídeos (preview no card) com armazenamento local ou em serviço de storage.
7. **FR7:** O sistema deve oferecer filtros e busca por: tipo de conteúdo, status, data, hashtag e conta.
8. **FR8:** O sistema deve permitir organização de conteúdos em **Coleções/Campanhas** para agrupar posts tematicamente.
9. **FR9:** O sistema deve fornecer um dashboard com métricas resumidas: total de conteúdos por status, conteúdos da semana, cobertura do calendário.
10. **FR10:** O sistema deve suportar **tema escuro e claro** com toggle no header.
11. **FR11:** O sistema deve persistir os dados localmente (localStorage/IndexedDB) no MVP, com estrutura preparada para migração futura para backend com banco de dados.
12. **FR12:** O sistema deve oferecer exportação dos dados do calendário editorial (formato JSON).

### 2.2 Non-Functional Requirements

1. **NFR1:** A aplicação deve carregar a página principal em menos de 2 segundos (LCP < 2s) em conexões 4G.
2. **NFR2:** A interface deve ser totalmente responsiva, funcional em dispositivos de 375px a 1920px+.
3. **NFR3:** O sistema deve seguir padrões de acessibilidade WCAG 2.1 nível AA.
4. **NFR4:** O código deve ser tipado com TypeScript strict mode.
5. **NFR5:** A arquitetura deve permitir adição futura de autenticação, backend e integração com Instagram Graph API sem refatoração significativa.
6. **NFR6:** O sistema deve funcionar offline após o primeiro carregamento (PWA-ready).
7. **NFR7:** Build de produção deve gerar bundles otimizados com code splitting por rota.

---

## 3. User Interface Design Goals

### 3.1 Overall UX Vision

Interface moderna, limpa e profissional inspirada em ferramentas como Notion, Linear e Trello. O foco é na **produtividade** — o usuário deve conseguir planejar uma semana inteira de conteúdo em poucos minutos. Uso extensivo de drag-and-drop, atalhos de teclado e micro-interações para uma experiência fluida e premium.

### 3.2 Key Interaction Paradigms

- **Kanban Board** (Storyboard) com drag-and-drop entre colunas de status
- **Calendário interativo** com arrastar-e-soltar para reposicionar conteúdos
- **Quick-add modals** para criação rápida de conteúdos
- **Command palette** (Ctrl+K) para navegação e ações rápidas
- **Sidebar colapsável** para navegação principal

### 3.3 Core Screens and Views

1. **Dashboard (Home)** — Visão geral com métricas, conteúdos recentes e atalhos
2. **Storyboard (Kanban)** — Board visual com colunas de status e cards de conteúdo
3. **Calendário Editorial** — Visualização mensal/semanal/diária dos conteúdos agendados
4. **Editor de Conteúdo** — Modal/página para criação e edição detalhada de um conteúdo
5. **Coleções/Campanhas** — Lista e visualização de agrupamentos temáticos
6. **Contas Instagram** — Gerenciamento das páginas/perfis vinculados
7. **Configurações** — Preferências do usuário, tema, exportação de dados

### 3.4 Accessibility

WCAG 2.1 AA — Suporte a navegação por teclado, contraste adequado, labels em formulários, aria-labels em elementos interativos.

### 3.5 Branding

- **Cores primárias:** Gradiente Instagram (rosa/roxo/laranja) usado como acentos; base em neutros escuros (dark mode padrão)
- **Tipografia:** Inter (Google Fonts) — moderna, legível, profissional
- **Ícones:** Lucide Icons (integrado com shadcn/ui)
- **Estilo visual:** Glassmorphism sutil, sombras suaves, bordas arredondadas, micro-animações

### 3.6 Target Devices and Platforms

Web Responsive — Otimizado para desktop (1280px+) com suporte a tablet (768px+) e mobile (375px+).

---

## 4. Technical Assumptions

### 4.1 Repository Structure

**Monorepo** — Todo o código em um único repositório com o Next.js App Router como framework full-stack.

### 4.2 Service Architecture

**Monolith (Next.js Full-Stack)** — Frontend e API Routes no mesmo projeto. O App Router do Next.js serve tanto as páginas (RSC + Client Components) quanto as API Routes para futuras integrações. No MVP, a persistência é client-side (localStorage/IndexedDB).

### 4.3 Testing Requirements

**Unit + Integration** — Testes unitários com Vitest para utilitários e hooks. Testes de componentes com Testing Library. Testes E2E com Playwright para fluxos críticos nas fases futuras.

### 4.4 Additional Technical Assumptions

- **Stack obrigatório:** Next.js 15 (App Router), Tailwind CSS v4, shadcn/ui
- **Linguagem:** TypeScript 5.x (strict mode)
- **Estado global:** Zustand para state management client-side
- **Drag-and-drop:** @dnd-kit/core para interações de arrastar
- **Persistência MVP:** localStorage com abstração de repositório para facilitar migração
- **Ícones:** Lucide React (incluso no shadcn/ui)
- **Animações:** Framer Motion para transições e micro-interações
- **Datas:** date-fns para manipulação de datas no calendário
- **Formulários:** React Hook Form + Zod para validação
- **Deploy inicial:** Vercel (free tier)
- **Preparação futura:** Estrutura de API Routes para receber integração com Instagram Graph API e Supabase/PostgreSQL

---

## 5. Epic List

### Epic 1: Foundation & Core Infrastructure
Estabelecer projeto Next.js com App Router, Tailwind CSS, shadcn/ui, layout base (sidebar + header), tema dark/light, e página dashboard inicial com dados mock.

### Epic 2: Storyboard & Content Management
Implementar o board Kanban com colunas de status, cards de conteúdo, drag-and-drop, criação/edição/exclusão de conteúdos, upload de mídia e persistência local.

### Epic 3: Calendar & Collections
Implementar o calendário editorial com visualizações mensal/semanal/diária, arrastar conteúdos no calendário, e sistema de coleções/campanhas.

### Epic 4: Search, Filters & Data Management
Implementar busca global, filtros avançados, command palette (Ctrl+K), gerenciamento de contas Instagram e exportação de dados.

---

## 6. Epic Details

### Epic 1: Foundation & Core Infrastructure

**Goal:** Criar a base do projeto com toda a infraestrutura técnica, sistema de design, layout principal e uma página dashboard funcional que demonstre que o stack está operacional. Ao final deste epic, o usuário terá uma aplicação navegável com visual profissional.

#### Story 1.1: Project Setup & Design System

> Como desenvolvedor,
> Quero ter o projeto Next.js configurado com Tailwind CSS e shadcn/ui,
> Para que toda a equipe tenha uma base consistente para desenvolvimento.

**Acceptance Criteria:**
1. Projeto Next.js 15 criado com App Router, TypeScript strict mode
2. Tailwind CSS v4 configurado e funcional
3. shadcn/ui inicializado com pelo menos 5 componentes base instalados (Button, Card, Input, Dialog, DropdownMenu)
4. ESLint e Prettier configurados
5. Estrutura de pastas definida (`app/`, `components/`, `lib/`, `hooks/`, `types/`, `stores/`)
6. Tema customizado com paleta de cores do projeto (variáveis CSS)
7. Google Font "Inter" configurada
8. `npm run dev` roda sem erros

#### Story 1.2: Layout Shell (Sidebar + Header)

> Como usuário,
> Quero ver uma interface com sidebar de navegação e header,
> Para que eu possa navegar entre as seções do dashboard.

**Acceptance Criteria:**
1. Sidebar com links para: Dashboard, Storyboard, Calendário, Coleções, Contas, Configurações
2. Sidebar colapsável (ícone toggle) com animação suave
3. Header com: título da página atual, toggle dark/light mode, avatar placeholder
4. Layout responsivo: sidebar vira bottom bar ou drawer em mobile
5. Dark mode como padrão, toggle funcional com persistência em localStorage
6. Ícones Lucide em todos os itens de navegação
7. Transições suaves entre estados (collapse/expand, theme toggle)

#### Story 1.3: Dashboard Home Page

> Como social media manager,
> Quero ver um dashboard com métricas resumidas e atalhos,
> Para que eu tenha uma visão geral rápida do meu planejamento.

**Acceptance Criteria:**
1. Cards de métricas: Total de conteúdos, Por Status (Ideia/Rascunho/Aprovado/Agendado/Publicado), Conteúdos desta semana
2. Seção "Próximos Conteúdos" com lista dos 5 próximos itens agendados
3. Seção "Ações Rápidas" com botões para: Novo Conteúdo, Ir ao Storyboard, Ir ao Calendário
4. Dados mock (hardcoded) demonstrando o layout
5. Design responsivo, visual premium com gradientes sutis e micro-animações
6. Zustand store inicializado com dados mock

---

### Epic 2: Storyboard & Content Management

**Goal:** Implementar o coração do sistema — o board Kanban visual para planejamento de conteúdo com drag-and-drop, CRUD completo de cards e persistência local. Ao final, o usuário poderá criar, organizar e gerenciar todo o ciclo de vida dos conteúdos.

#### Story 2.1: Storyboard Kanban Board

> Como social media manager,
> Quero visualizar meus conteúdos em um board Kanban organizado por status,
> Para que eu possa ver claramente o pipeline de produção de conteúdo.

**Acceptance Criteria:**
1. Board com 5 colunas: Ideia, Rascunho, Aprovado, Agendado, Publicado
2. Cada coluna mostra contador de cards
3. Cards exibem: título, tipo de conteúdo (ícone), thumbnail (se houver), data prevista
4. Layout horizontal com scroll horizontal caso as colunas excedam a viewport
5. Visual clean com cores diferenciadas por coluna (sutil)
6. Dados carregados do Zustand store

#### Story 2.2: Drag-and-Drop & Card Reordering

> Como social media manager,
> Quero arrastar cards entre colunas e reordenar dentro de uma coluna,
> Para que eu possa atualizar o status do conteúdo de forma visual e intuitiva.

**Acceptance Criteria:**
1. Drag-and-drop funcional entre colunas usando @dnd-kit
2. Reordenação dentro da mesma coluna
3. Feedback visual durante o arraste (placeholder, elevation)
4. Auto-atualização do status ao mover entre colunas
5. Persistência da ordem e status no Zustand store + localStorage
6. Animações suaves de entrada/saída dos cards

#### Story 2.3: Content Creation & Editing Modal

> Como social media manager,
> Quero criar e editar conteúdos em um modal detalhado,
> Para que eu possa preencher todas as informações do post.

**Acceptance Criteria:**
1. Modal/Sheet com formulário: título, descrição/legenda, tipo de conteúdo (select), hashtags (tag input), data/hora prevista (date picker), conta Instagram (select)
2. Validação com React Hook Form + Zod
3. Upload de imagem com preview (armazenamento local via base64 ou object URL)
4. Botão de salvar, cancelar e excluir
5. Modo de criação (botão "+" nas colunas e FAB) e edição (clique no card)
6. Feedback visual de sucesso ao salvar (toast notification)

#### Story 2.4: Content Persistence Layer

> Como social media manager,
> Quero que meus conteúdos sejam persistidos localmente,
> Para que meu planejamento não se perca ao fechar o navegador.

**Acceptance Criteria:**
1. Camada de repositório abstrata (`ContentRepository` interface) com implementação `LocalStorageContentRepository`
2. Zustand store com middleware `persist` para sincronização automática com localStorage
3. CRUD completo: create, read, update, delete com IDs únicos (nanoid)
4. Duplicação de conteúdo funcional
5. Dados carregados automaticamente ao iniciar a aplicação
6. Estrutura preparada para trocar a implementação por API/banco de dados

---

### Epic 3: Calendar & Collections

**Goal:** Fornecer visualização temporal do planejamento com calendário editorial interativo e agrupamento lógico de conteúdos em coleções/campanhas. Isso completa a visão de organização do produto.

#### Story 3.1: Monthly Calendar View

> Como social media manager,
> Quero ver meus conteúdos agendados em um calendário mensal,
> Para que eu possa visualizar a cobertura e distribuição de posts ao longo do mês.

**Acceptance Criteria:**
1. Calendário mensal grid com dias, mostrando conteúdos agendados como chips/badges
2. Chips mostram: tipo de conteúdo (ícone) e título truncado
3. Navegação entre meses (anterior/próximo)
4. Indicação visual do dia atual
5. Clique em um dia abre modal de criação com data pré-preenchida
6. Clique em um chip abre o editor de conteúdo

#### Story 3.2: Weekly & Daily Calendar Views

> Como social media manager,
> Quero alternar entre visualizações semanal e diária,
> Para que eu tenha mais detalhes sobre a programação de curto prazo.

**Acceptance Criteria:**
1. Toggle de visualização: Mensal / Semanal / Diária
2. Visão semanal com timeline por hora e cards posicionados
3. Visão diária com timeline detalhada
4. Drag-and-drop para reposicionar conteúdos no calendário (atualiza data/hora)
5. Indicação visual de horários de pico de engajamento (configurável)

#### Story 3.3: Collections & Campaigns

> Como social media manager,
> Quero organizar conteúdos em coleções temáticas,
> Para que eu possa agrupar posts de uma mesma campanha ou tema.

**Acceptance Criteria:**
1. CRUD de coleções: nome, descrição, cor/ícone, data de início/fim (opcional)
2. Associar conteúdos a uma ou mais coleções
3. Página de listagem de coleções com contagem de conteúdos
4. Página de detalhe da coleção mostrando seus conteúdos
5. Filtro por coleção no storyboard e calendário
6. Persistência em localStorage

---

### Epic 4: Search, Filters & Data Management

**Goal:** Completar a experiência de gerenciamento com busca avançada, filtros, command palette e gerenciamento de contas Instagram, além de exportação de dados.

#### Story 4.1: Global Search & Filters

> Como social media manager,
> Quero buscar e filtrar conteúdos por diversos critérios,
> Para que eu encontre rapidamente o que preciso em um volume grande de conteúdos.

**Acceptance Criteria:**
1. Barra de busca no header com busca por título e descrição
2. Filtros: tipo de conteúdo, status, data range, hashtag, conta, coleção
3. Filtros aplicáveis no storyboard e no calendário
4. Resultados atualizados em tempo real (debounce de 300ms)
5. Indicação visual de filtros ativos com opção de limpar

#### Story 4.2: Command Palette (Ctrl+K)

> Como power user,
> Quero um command palette acionado por Ctrl+K,
> Para que eu possa navegar e executar ações rapidamente via teclado.

**Acceptance Criteria:**
1. Command palette modal com busca fuzzy
2. Ações: navegação entre páginas, criar conteúdo, alternar tema, buscar conteúdos
3. Atalho Ctrl+K (ou Cmd+K no Mac) para abrir/fechar
4. Navegação por teclado (arrows + enter)
5. Ícones e descrições para cada ação

#### Story 4.3: Instagram Account Management

> Como social media manager,
> Quero cadastrar e gerenciar minhas páginas de Instagram,
> Para que eu possa associar conteúdos a contas específicas.

**Acceptance Criteria:**
1. Página de gerenciamento com CRUD de contas: nome, handle (@), avatar URL, notas
2. Select de conta disponível no editor de conteúdo
3. Filtro por conta no storyboard e calendário
4. Dados persistidos em localStorage
5. Preparação de estrutura para futura autenticação OAuth com Instagram

#### Story 4.4: Data Export & Settings

> Como social media manager,
> Quero exportar meus dados e configurar preferências,
> Para que eu tenha controle sobre minhas informações e personalização.

**Acceptance Criteria:**
1. Página de configurações com: tema (dark/light), preferências de visualização padrão
2. Exportação de todos os dados em formato JSON
3. Importação de dados de um arquivo JSON (com validação)
4. Botão "Resetar Dados" com confirmação
5. Informações do app: versão, links úteis

---

## 7. Next Steps

### 7.1 UX Expert Prompt

> Crie o design system e protótipos de alta fidelidade para o Dashboard Instagram usando as especificações do PRD (docs/prd.md). Foque no Storyboard Kanban e Calendário Editorial como telas principais.

### 7.2 Architect Prompt

> Crie o documento de arquitetura completo para o Dashboard Instagram usando o PRD (docs/prd.md) como base. Stack: Next.js 15 (App Router), Tailwind CSS v4, shadcn/ui. Foque na estrutura de componentes, state management com Zustand, camada de persistência e preparação para futuras integrações.
