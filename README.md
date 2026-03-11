<div align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Prisma-5-3982CE?style=for-the-badge&logo=Prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/TypeScript-5-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Zustand-5-453F3C?style=for-the-badge" alt="Zustand" />
  <img src="https://img.shields.io/badge/Framer_Motion-12-0055FF?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/Recharts-3-22b5bf?style=for-the-badge" alt="Recharts" />
</div>

<h1 align="center">📸 Instagram Dashboard</h1>
<h3 align="center">Content Manager · Analytics Engine · Meta API Hub · Automation</h3>

<p align="center">Central de comando completa para produção de conteúdo, controle visual de agendas, inteligência analítica via Meta Graph API + Apify, análise de comentários com IA e automação de publicação no Instagram.</p>

---

## 📑 Índice Completo

1. [Navegação Global e Atalhos](#-0-navegação-global-e-atalhos)
2. [Tela Inicial: Dashboard Home](#-1-tela-inicial-dashboard-home)
3. [Storyboard (Kanban)](#-2-storyboard-kanban)
4. [Calendário Editorial](#-3-calendário-editorial)
5. [Editor de Conteúdo](#-4-editor-de-conteúdo-content-editor)
6. [Painel de Filtros Avançados](#-5-painel-de-filtros-avançados)
7. [Métricas / Analytics](#-6-métricas--analytics)
8. [Contas Instagram](#-7-contas-instagram)
9. [Coleções / Campanhas](#-8-coleções--campanhas)
10. [Intelligence Hub (Maps + Scraping)](#-9-intelligence-hub-maps--scraping)
11. [Configurações](#️-10-configurações)
12. [Banco de Dados (Prisma Schema)](#-11-banco-de-dados-prisma-schema)
13. [Estrutura de Pastas](#-12-estrutura-de-pastas)
14. [Como Instalar e Rodar](#-13-como-instalar-e-rodar)
15. [Uso com IAs de Terminal](#-14-uso-com-ias-de-terminal)

---

## 🧭 0. Navegação Global e Atalhos

O sistema inteiro é encapsulado por um **App Shell** composto por dois elementos fixos:

### Sidebar (Menu Lateral)
- Contém **8 links de navegação**: Dashboard, Storyboard, Calendário, Coleções, Contas, Métricas, Intelligence Hub e Configurações.
- Logo animada do Instagram no topo com gradiente real da marca.
- **Sidebar Colapsável:** Botão com seta (`◀ / ▶`) no rodapé da sidebar permite recolher o menu para modo mini (apenas ícones, 72px) ou expandir com nome completo (240px). A animação é suave via Framer Motion.
- **Indicador de aba ativa:** Uma barra vertical com gradiente Instagram aparece à esquerda do item selecionado, animada com spring physics.
- **Sidebar Mobile:** Em telas pequenas, o menu é substituído por um drawer lateral acessível via botão hamburger.

### Header (Cabeçalho Superior)
- **Título dinâmico da página:** Muda automaticamente conforme a rota atual.
- **Barra de Pesquisa Global (`SearchBar`):** Campo de texto para buscas rápidas dentro do contexto atual.
- **Filtro de Conta (`AccountFilter`):** Dropdown rápido no topo para filtrar todas as telas pela conta/cliente selecionado.
- **Indicador de Status de API (`ApiStatusBadge`):** Badge em tempo real mostrando `Online` (verde) ou `Warning` (amarelo), verificando se as chaves do Gemini e Apify estão configuradas no banco.
- **Theme Toggle (Lua/Sol):** Ícone no canto superior direito para alternância instantânea entre Modo Escuro e Claro. Persistido via `next-themes`.

### ⚡ Command Palette (Atalho Secreto)
Pressione **`Ctrl + K`** (Windows) ou **`Cmd + K`** (Mac) de qualquer tela do sistema. Abre um menu estilo Spotlight com 4 seções:
- **Ações Rápidas:** Criar Novo Conteúdo, Nova Coleção, Nova Conta Instagram.
- **Navegação:** Ir direto para qualquer página do dashboard.
- **Conteúdos Recentes:** Lista os 5 últimos conteúdos criados com link direto para edição.
- **Preferências:** Alternar Tema (Dark/Light) sem sair do teclado.

---

## 🏠 1. Tela Inicial: Dashboard Home

Página de boas-vindas e visão geral de toda a operação.

**4 Cards KPI superiores (animados com Framer Motion):**
- **Total de Conteúdos:** Número total de registros no banco.
- **Agendados:** Quantidade com status `scheduled`.
- **Esta Semana:** Próximos conteúdos com data futura (top 5).
- **Publicados:** Quantidade com status `published`.

**Grid "Por Status":** 5 mini-cards mostrando contagem por status: Ideia, Rascunho, Aprovado, Agendado, Publicado, Falhou. Cada um com ícone e cor distinta.

**"Próximos Conteúdos":** Lista com até 5 posts futuros com título, data formatada em PT-BR e badge colorido do tipo.

**"Ações Rápidas":** 3 botões grandes: Novo Conteúdo, Ir ao Storyboard, Ir ao Calendário.

---

## 📋 2. Storyboard (Kanban)

Engine de planejamento criativo usando `@dnd-kit/core` com drag-and-drop entre colunas.

### As 6 Colunas do Board
| Coluna | Cor | Descrição |
|--------|-----|-----------|
| **Ideia** | Cinza | Brainstorm inicial |
| **Rascunho** | Amarelo | Copy sendo trabalhada |
| **Aprovado** | Verde | Aprovado pelo diretor de arte |
| **Agendado** | Roxo | Data/hora definida |
| **Publicado** | Azul | Já foi ao ar |
| **Falhou** | Vermelho | Erro na publicação automática |

### Interações
- **Drag and Drop livre** entre todas as 6 colunas. O status do conteúdo no banco é atualizado automaticamente ao soltar.
- **Botão `+` no topo de cada coluna:** Abre o Editor com o status da coluna pré-selecionado.
- **Clique no card:** Abre o Editor completo para aquele conteúdo.
- **Informações visíveis no card:** Título, legenda truncada, tipo com badge colorido, data agendada formatada, tags de hashtag.

---

## 📅 3. Calendário Editorial

3 modos de visualização acessados por abas no cabeçalho: **Mês**, **Semana**, **Dia**.

### Visão Mensal
- Grid clássico de 30 dias com badges coloridos indicando densidade e formato dos posts por dia.

### Visão Semanal
- 7 colunas (Segunda a Domingo). Cards empilhados cronologicamente.
- **Botão `+ Adicionar`** no rodapé de cada dia, pré-selecionando a data ao abrir o Editor.

### Visão Diária
- Feed vertical grande mostrando todos os conteúdos detalhados do dia selecionado.

---

## 📝 4. Editor de Conteúdo (Content Editor)

Drawer lateral (Sheet direito) que aparece ao criar ou editar qualquer conteúdo. Possui **2 abas internas: Editar e Preview.**

### Aba "Editar"
- **Título** *(obrigatório)*, **Descrição / Legenda**, **Tipo** (Post/Story/Reel/Carrossel), **Status** (6 opções), **Conta Instagram**, **Data/Hora**, **Hashtags (`TagInput`)** interativo com chips visuais, **Coleções** (multi-select), **Upload de Mídia** (JPEG, PNG, WebP, GIF, MP4, MOV).

### Aba "Preview" (Simulador Instagram)
- Reproduz um mini feed do Instagram completo (mockup visual pixel-perfect) com header de perfil, área de imagem 4:5, barra de ações, legenda compilada automaticamente e **contador de caracteres** (`X / 2200`).

### Botões de Ação
- **Salvar**, **Duplicar**, **Excluir**, **Publicar via Robô** 🤖 (envia para fila de automação).

---

## 🔍 5. Painel de Filtros Avançados

Drawer lateral com 6 eixos de filtragem em tempo real (Storyboard e Calendário):

1. **Tipos de Conteúdo** — Post, Story, Reel, Carrossel
2. **Status do Funil** — Ideia, Rascunho, Aprovado, Agendado, Publicado, Falhou
3. **Conta Instagram**
4. **Coleção / Campanha**
5. **Período de Agendamento** — range de datas
6. **Hashtag Específica**

---

## 📈 6. Métricas / Analytics

A tela mais complexa do sistema. Possui **3 abas de visualização** no topo.

---

### Aba "Individual" — Análise via Apify (Perfis Públicos)

Análise detalhada de um único perfil Instagram via web scraping (Apify).

**Seleção de perfil:**
- **Pills de Clientes** (azuis) e **Pills de Concorrentes** (laranjas). Botão `+ Concorrente` para adicionar novos.

**Barra de Busca (`AnalyticsSearch`):** Campo para URL ou @handle. Dispara o scraping via API Apify.

**Filtros de Período:** `Todo período`, `7 dias`, `30 dias`, `60 dias`, `90 dias`, `Personalizado`.

**Componentes após carregar:**
- **KPI Cards** — Total Posts, Likes, Comentários, Views, Engajamento médio, Melhor Post
- **🏆 Melhor Post** — Card dourado em destaque
- **Insights & Análise (`InsightsPanel`)** — Relatório via Google Gemini
- **Top Engajadores (`TopEngagers`)** — Ranking dos 10 usuários que mais comentaram
- **Análise de Comentários (`CommentsAnalysis`)** — Módulo completo (ver detalhes abaixo)
- **Análise por Post (`PostCards`)** — Grid com thumbnail, métricas, tipo do post

#### Módulo de Comentários (`CommentsAnalysis`)

Análise de sentimento e geração de respostas com IA, com **2 fontes de atualização**:

| Botão | Fonte | O que faz |
|-------|-------|-----------|
| **🟠 Apify (N posts)** | Apify scraper | Busca todos os comentários de todos os N posts carregados (ideal para análise completa) |
| **🔵 Meta (só novos)** | Meta Graph API | Busca apenas comentários publicados APÓS o último já armazenado (incremental, rápido) |

**Merge aditivo:** Ambas as fontes se somam — comentários do Apify nunca são apagados ao atualizar via Meta e vice-versa.

**Filtros e ordenação:** Sentimento (Positivo/Neutro/Negativo/Marca), período (48h/7d/30d/Todos), e ordenação por data, likes ou sentimento.

**IA de Opinião:** Botão "Analisar com IA" gera uma *Opinião da IA* curta (máx 15 palavras) para cada comentário via Google Gemini.

**Sugestão de Resposta:**
- Botão "Sugerir Respostas" gera automaticamente um texto de resposta para comentários recentes não respondidos.
- A IA usa as **informações reais do negócio** (endereço, telefone, horário) cadastradas na conta para responder perguntas dos clientes sem usar placeholders.
- Cada sugestão tem um **botão `×`** para limpar e solicitar uma nova geração.
- Status da sugestão: ⏳ Pendente · ✅ Enviada · ❌ Erro

**Auto-resposta robótica:** Botão "🚀 Postar" envia as respostas pendentes via Playwright (automação local).

---

### Aba "VS" — Comparação de Concorrentes

Compara seu cliente contra 1 ou mais concorrentes lado a lado.

- **Seleção:** "⭐ Seu Cliente" (azul) e "⚔️ Concorrentes" (laranja).
- **`ComparisonView`:** Tabelas comparativas com:
  - **Médias por Post:** Likes, Comentários, Sentimento, Engajamento, Taxa de Engajamento em Reels
  - **Engajamento por Tipo de Conteúdo:** Posts/Reels/Carrosséis com setas ▲/▼ percentuais
  - **Médias Temporais:** Posts/semana, Engajamento/semana, Posts/mês, Engajamento/mês
  - **Distribuição de Conteúdo (%):** Barras empilhadas
  - **Gráficos de barras animados:** Engajamento por Post e Frequência de Postagem
- **Comparison AI Chat:** Chatbot integrado com Google Gemini usando os dados de todos os perfis como contexto.

---

### Aba "Minha Conta" — Analytics via Meta Graph API

Análise profunda dos próprios posts usando dados **privados e precisos** da Meta (alcance real, saves, shares) — métricas que o Apify não consegue acessar.

**Requisito:** Token de acesso Meta (`instagram_business_basic` + `instagram_business_manage_insights`).

**Cache automático:** Os dados são salvos no banco de dados e carregam automaticamente na próxima visita. Badge indica se está exibindo cache (`💾 Cache de DD/MM`) ou dados frescos (`🔄 Atualizado em DD/MM`).

#### 5 Abas Internas

**1. Visão Geral**
- 6 KPI Cards: Alcance Total, Total de Curtidas, Saves, Shares, Engajamento Real (%), Comentários
- 3 Cards de breakdown por tipo de conteúdo (Foto / Vídeo / Carrossel) com média de alcance

**2. Gráficos** *(powered by Recharts)*
- **Timeline de Alcance** — AreaChart com Alcance + Saves + Shares de cada post ao longo do tempo (X-axis: data `dd/MM`, tooltip com caption truncada)
- **Comparação por Tipo** — BarChart horizontal agrupado com médias de Alcance/Saves/Shares por tipo (Foto/Vídeo/Carrossel)
- **Melhor Dia da Semana** — BarChart com alcance médio por dia (Seg–Dom), destaca automaticamente o melhor dia

**3. Melhores Posts**
- 4 tabs: **Mais Alcance · Mais Saves · Mais Shares · Mais Curtidas**
- Cada tab: Top 5 posts com thumbnail, caption e métrica destacada
- Seção "Menores Performances": 3 posts com pior resultado para aprender o que evitar
- *Nota: Posts sem dados de alcance (publicados antes da conversão para conta Comercial/Criador) são excluídos com banner explicativo*

**4. Hashtags**
- Tabela de efetividade computada localmente (sem chamada de API extra):
  - Para cada hashtag: nº de posts que a usaram, média de Alcance, média de Saves
  - Ordenado por Alcance médio DESC
  - Badge de performance: 🔥 Alta (top 25%) · ⚡ Média · 💤 Baixa
  - Insight automático: "Sua hashtag #X tem Nx mais alcance que a média"

**5. Estratégia IA**
- Botão "Gerar Relatório Estratégico" → chama Gemini com todos os dados da conta
- Relatório estruturado com 5 seções: Melhor formato, Melhor dia/horário, Top hashtags, Pontos de atenção, Ações concretas para próximas 4 semanas
- Botão "Regenerar" após primeira geração

---

## 👥 7. Contas Instagram

Tela `AccountList` para gerenciar múltiplos perfis/clientes.

### Cards de Conta
Grid de cards com avatar, nome, handle `@usuario`, tipo de negócio (badge), endereço, telefone e horário de funcionamento (quando cadastrados).

### Formulário de Conta
Sheet lateral com os seguintes campos:

**Dados básicos:**
- Nome *(obrigatório)*, Handle/@  *(obrigatório)*, Avatar (upload de foto, máx 2MB), Senha do Instagram (para auto-login do robô)

**Informações do Negócio** *(usadas pela IA para responder comentários)*:

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| Tipo de negócio | Categoria da empresa | Restaurante, Clínica... |
| Endereço | Endereço físico completo | Rua das Flores, 123 – SP |
| Telefone / WhatsApp | Contato principal | (11) 99999-9999 |
| Horário de funcionamento | Dias e horários | Seg-Sex 12h–22h |
| Site / Cardápio / Link | URL do site ou cardápio digital | https://cardapio.empresa.com |
| Observações extras | Informações adicionais | Pet-friendly, aceita reservas... |

> **Como a IA usa essas informações:** Quando o robô gera sugestões de resposta para comentários (ex.: "qual o endereço?", "qual o horário?"), ele usa SOMENTE os dados reais cadastrados aqui — **nunca usa placeholders como `[endereço]`**. Se a informação não estiver cadastrada, orienta o cliente a entrar em contato pelo Direct.

**Persistência:** Todas as informações são salvas no banco de dados SQLite e carregadas automaticamente na próxima visita. Os dados estruturados são armazenados como JSON na coluna `notes` do modelo `Account`.

**Automação (Playwright):**
- Badge de status (Conectado / Aguardando Login)
- Botão "Conectar Agora" / "Reconectar" para abrir sessão Playwright

---

## 📁 8. Coleções / Campanhas

Tela `CollectionList` para criar agrupamentos temáticos.
- Grid de cards com nome, ícone, cor hexadecimal customizada e descrição.
- **Página individual da coleção** (`/dashboard/collections/[id]`): Mostra apenas os conteúdos vinculados àquela campanha específica.
- Datas de início e fim opcionais (ideal para campanhas com prazo).

---

## 🔭 9. Intelligence Hub (Maps + Scraping)

Central de pesquisa avançada com **3 abas**:

### Aba "Extrator de Maps"
Scraping completo de perfis do Google Maps usando Playwright:
- **Entrada:** URL de negócio no Google Maps
- **Processo:** Playwright navega autonomamente, extrai todos os dados da página
- **Dados coletados:** Nome, Rating, Total de avaliações, Endereço, Telefone, Categoria, Horários de funcionamento, Highlights/características, Reviews completas com texto e rating
- **Análise IA:** Gemini analisa as reviews e gera relatório de sentimento (positivo/negativo/neutro) + insights do negócio
- **Persistência:** Dados salvos no banco (`MapsBusiness` model) e recuperados automaticamente
- **Screenshots de debug:** Capturas de tela automáticas do processo (ignoradas pelo git)

### Aba "VS Maps"
Comparação lado a lado de 2 negócios do Google Maps:
- Rating comparativo, total de reviews, análise de sentimento comparada
- Insights da IA sobre os diferenciais competitivos

### Aba "Web Scraper" (FireCrawl)
Scraping de qualquer URL usando a API FireCrawl:
- Converte páginas web em Markdown estruturado
- Útil para importar dados de menus, catálogos, etc.

---

## ⚙️ 10. Configurações

Página dividida em **5 cards organizados:**

### Card 1: Aparência
- Botões `Claro` (☀️) e `Escuro` (🌙) para definir o tema do sistema.

### Card 2: Preferências
- **Visualização Padrão do Calendário:** Selector com 3 opções: Mensal, Semanal, Diário.

### Card 3: Automação do Instagram (Bot Local)
- Lista todas as contas com status de conexão em tempo real (Conectado/Desconectado).
- **Botão "Conectar Agora" / "Reconectar":** Abre o Chromium local para login do Instagram.
- A sessão é salva em `sessions/` e ``.chrome-session-maps/` (nunca comitados ao git).

### Card 4: Integrações (API Keys)
- **Google Gemini API Key** — para análise de IA (comentários, estratégia, insights)
- **Apify API Key** — para scraping de perfis públicos
- **Meta Access Token** — para acesso à Meta Graph API (métricas privadas da própria conta)
- **FireCrawl API Key** — para web scraping via FireCrawl
- Todas as chaves são salvas no banco SQLite local (sem precisar editar `.env`)

### Card 5: Gerenciamento de Dados
- **Exportar Backup (JSON):** Download de todos os dados.
- **Importar Backup:** Restaura dados de arquivo `.json`.
- **🔴 Zona de Perigo:** Botão "Resetar Tudo" com confirmação dupla.

---

## 🗄️ 11. Banco de Dados (Prisma Schema)

SQLite local gerenciado pelo Prisma ORM. **7 modelos:**

| Modelo | Campos Principais | Uso |
|--------|------------------|-----|
| **Account** | id, username, password, picture, access_token, **notes** (JSON estruturado) | Contas Instagram + info do negócio |
| **Content** | id, title, description, type, status, scheduledAt, hashtags (JSON), mediaUrls (JSON), accountId, order | Posts/Stories/Reels |
| **Collection** | id, name, description, color, icon, startDate, endDate | Campanhas |
| **Competitor** | id, name, handle, avatarUrl, metrics (JSON) | Perfis concorrentes |
| **Analytics** | id, targetId, type (`'account'`\|`'competitor'`\|`'meta'`), data (JSON), period | Cache de métricas Apify e Meta |
| **Setting** | id, key, value (JSON) | Config (API keys, preferências) |
| **MapsBusiness** | id, name, rating, totalReviews, address, phone, category, hours, highlights, rawMarkdown, reviews, aiAnalysis | Dados do Google Maps |

> **Nota sobre `Analytics.type`:** O valor `'meta'` armazena o cache dos dados da aba "Minha Conta" (Meta Graph API), incluindo todos os posts com métricas privadas (reach, saves, shares). O `targetId` é o username da conta.

> **Nota sobre `Account.notes`:** Armazena JSON com os campos estruturados do negócio (`businessType`, `address`, `phone`, `hours`, `website`, `extras`). Compatível com texto legado (string simples).

---

## 📂 12. Estrutura de Pastas

```plaintext
DASHBOARD-OSS/
├── app/
│   ├── dashboard/           # Páginas: Home, Storyboard, Calendar, Collections, Accounts, Analytics, Intelligence, Settings
│   ├── api/                 # 20 API Routes:
│   │   ├── ai-comment-analysis/   # Análise de sentimento + sugestão de resposta (Gemini)
│   │   ├── ai-import/             # Importação de dados com IA
│   │   ├── apify/                 # Integração Apify (insights, ai-analysis, ai-comparison, status)
│   │   ├── auth/instagram/        # OAuth Instagram + callback
│   │   ├── automation/            # Bot Playwright (auth, respond-comments)
│   │   ├── firecrawl/             # Web scraping via FireCrawl
│   │   ├── image-proxy/           # Proxy de imagens externas
│   │   ├── import-md/             # Importação via Markdown
│   │   ├── maps-analysis/         # Análise IA de reviews do Maps
│   │   ├── maps-scrape/           # Scraping Google Maps (Playwright)
│   │   ├── meta-ai-strategy/      # Relatório estratégico IA (Meta + Gemini)
│   │   ├── meta-comments/         # Busca de comentários via Meta Graph API
│   │   ├── meta-insights/         # Métricas privadas via Meta Graph API
│   │   └── upload/                # Upload de mídia
│   │
│   └── actions/             # 9 Server Actions:
│       ├── account.actions.ts     # CRUD de contas (com notes/business info)
│       ├── analytics.actions.ts   # Cache de métricas (Apify + Meta)
│       ├── api-status.actions.ts  # Status das integrações
│       ├── collection.actions.ts  # CRUD de coleções
│       ├── competitor.actions.ts  # CRUD de concorrentes
│       ├── content.actions.ts     # CRUD de conteúdo
│       ├── instagram.actions.ts   # Automação e publicação
│       ├── maps.actions.ts        # Operações com Google Maps
│       └── settings.actions.ts    # Persistência de configurações
│
├── features/                # Feature Modules
│   ├── accounts/
│   │   ├── components/      # AccountList, AccountFormDialog (campos estruturados)
│   │   └── schemas/         # account.schema.ts (BusinessInfo + serialização JSON)
│   │
│   ├── analytics/
│   │   └── components/
│   │       ├── analytics-search.tsx
│   │       ├── comments-analysis.tsx    # Análise de comentários + IA + Meta/Apify refresh
│   │       ├── comparison-ai-chat.tsx
│   │       ├── comparison-view.tsx
│   │       ├── insights-panel.tsx
│   │       ├── kpi-cards.tsx
│   │       ├── minha-conta-view.tsx     # Analytics Meta API (5 abas)
│   │       ├── meta-ai-strategy.tsx     # Relatório estratégico Gemini
│   │       ├── meta-content-type-chart.tsx  # BarChart por tipo de conteúdo
│   │       ├── meta-hashtag-analysis.tsx    # Análise de efetividade de hashtags
│   │       ├── meta-posting-day-chart.tsx   # BarChart melhor dia da semana
│   │       ├── meta-timeline-chart.tsx      # AreaChart timeline de alcance
│   │       ├── meta-top-posts.tsx           # Top 5 + piores por métrica
│   │       ├── post-cards.tsx
│   │       ├── posts-table.tsx
│   │       └── top-engagers.tsx
│   │
│   ├── calendar/            # MonthView, WeekView, DayView
│   ├── collections/         # CollectionList, CollectionForm
│   ├── content/             # ContentEditorDialog, TagInput, content.schema (Zod)
│   └── storyboard/          # Board, BoardColumn, ContentCard
│
├── components/
│   ├── layout/              # AppSidebar, AppHeader, AppLayout, MobileSidebar, ThemeToggle
│   ├── shared/              # CommandPalette, FilterPanel, ActiveFiltersBar, SearchBar, ApiStatusIndicator
│   └── ui/                  # Shadcn/UI components (Button, Card, Dialog, Sheet, Select, Tooltip...)
│
├── stores/                  # Zustand Slices (sem persist — dados vêm do banco SQLite)
│   ├── ui-slice.ts          # Sidebar, modais, filtros globais
│   ├── content-slice.ts     # CRUD de conteúdos
│   ├── account-slice.ts     # CRUD de contas + automação
│   ├── analytics-slice.ts   # State analytics + comentários + Meta refresh
│   ├── calendar-slice.ts    # View, data selecionada
│   ├── collection-slice.ts  # CRUD de coleções
│   ├── automation-slice.ts  # Fila de publicação do robô
│   └── settings-slice.ts    # API keys + preferências
│
├── lib/
│   ├── services/
│   │   ├── ai-adapter.ts              # Abstração multi-IA (Gemini, OpenRouter/Custom)
│   │   ├── apify.service.ts           # Cliente Apify para scraping
│   │   ├── firecrawl.service.ts       # Cliente FireCrawl
│   │   ├── instagram.service.ts       # Automação Playwright do Instagram
│   │   ├── instagram-graph.service.ts # Meta Graph API (insights, comments, token verify)
│   │   ├── maps-playwright.service.ts # Scraping Google Maps com Playwright
│   │   └── scheduler.service.ts       # Scheduler de publicação
│   ├── utils/
│   │   └── sentiment.ts               # Análise de sentimento local (sem API)
│   ├── constants.ts                   # CONTENT_STATUSES, CONTENT_TYPES, BOARD_COLUMNS
│   └── db.ts                          # Instância global Prisma Client
│
├── hooks/                   # use-filtered-contents, use-keyboard-shortcut, use-media-query, use-theme
├── types/                   # account.ts, analytics.ts, collection.ts, competitor.ts, content.ts, settings.ts
├── prisma/                  # schema.prisma (SQLite) + migrations
└── docs/                    # PRD, Architecture, User Stories
```

---

## 📦 13. Como Instalar e Rodar

### Requisitos
- **Node.js** >= 18
- **pnpm** (`npm install -g pnpm`)

### Setup
```bash
# 1. Instalar dependências
pnpm install

# 2. Criar variáveis de ambiente
cp .env.example .env
# O DATABASE_URL já vem configurado para SQLite local

# 3. Criar as tabelas no banco
npx prisma db push

# 4. Iniciar o servidor de desenvolvimento
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

### Configuração das Integrações (via UI)
Após iniciar, acesse **Configurações → Card 4** e configure:
- **Google Gemini API Key** — obrigatório para todas as funcionalidades de IA
- **Apify API Key** — para scraping de perfis públicos e concorrentes
- **Meta Access Token** — para a aba "Minha Conta" (métricas privadas do Instagram)
- **FireCrawl API Key** — para o Web Scraper do Intelligence Hub

### Playwright / Automação Local
```bash
# Instalar browsers do Playwright (necessário para automação e Maps scraping)
npx playwright install chromium
```

---

## 🤖 14. Uso com IAs de Terminal

O projeto foi desenhado para ser operado em conjunto com agentes de terminal (Claude Code, Cursor, etc). A IA pode ler o `prisma/schema.prisma`, criar scripts em `scripts/`, e popular o banco de dados diretamente. Você apenas abre o Dashboard visual, revisa no Storyboard, arrasta para Agendado e aprova.

### Segurança
- Nenhuma API key é armazenada em arquivos do projeto — todas ficam no banco SQLite local (nunca commitado)
- O arquivo `.env` contém apenas a `DATABASE_URL` (SQLite local) — seguro para versionar
- Sessões Playwright, screenshots de debug, scripts de teste com dados reais e o banco SQLite estão no `.gitignore`

---

> Construído com foco obsessivo em usabilidade, orquestração analítica e automação inteligente por baixo do capô.
> Stack: **Next.js 16** · **React 19** · **TypeScript 5** · **Tailwind 4** · **Prisma 5 (SQLite)** · **Zustand 5** · **Framer Motion** · **Recharts** · **Playwright** · **Google Gemini** · **Meta Graph API** · **Apify**
