<div align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Zustand-453F3C?style=for-the-badge" alt="Zustand" />
  <img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion" />
</div>

<h1 align="center">📸 Instagram Dashboard</h1>
<h3 align="center">Content Manager · Analytics Engine · Automation Hub</h3>

<p align="center">O manual completo, exaustivo e verificado linha-a-linha da central de comando para produção de conteúdo, controle visual de agendas, inteligência analítica e automação de publicação no Instagram.</p>

---

## 📑 Índice Completo

1. [Navegação Global e Atalhos](#-0-navegação-global-e-atalhos)
2. [Tela Inicial: Dashboard Home](#-1-tela-inicial-dashboard-home)
3. [Storyboard (Kanban)](#-2-storyboard-kanban)
4. [Calendário Editorial](#-3-calendário-editorial)
5. [Editor de Conteúdo (Content Editor)](#-4-editor-de-conteúdo-content-editor)
6. [Painel de Filtros Avançados](#-5-painel-de-filtros-avançados)
7. [Métricas / Analytics](#-6-métricas--analytics)
8. [Contas Instagram](#-7-contas-instagram)
9. [Coleções / Campanhas](#-8-coleções--campanhas)
10. [Configurações](#️-9-configurações)
11. [Banco de Dados (Prisma Schema)](#-10-banco-de-dados-prisma-schema)
12. [Estrutura de Pastas](#-11-estrutura-de-pastas)
13. [Como Instalar e Rodar](#-12-como-instalar-e-rodar)
14. [Uso com IAs de Terminal](#-13-uso-com-ias-de-terminal)

---

## 🧭 0. Navegação Global e Atalhos

O sistema inteiro é encapsulado por um **App Shell** composto por dois elementos fixos:

### Sidebar (Menu Lateral)
- Contém **7 links de navegação**: Dashboard, Storyboard, Calendário, Coleções, Contas, Métricas e Configurações.
- Logo animada do Instagram no topo com gradiente real da marca.
- **Sidebar Colapsável:** Botão com seta (`◀ / ▶`) no rodapé da sidebar permite recolher o menu para modo mini (apenas ícones, 72px) ou expandir com nome completo (240px). A animação é suave via Framer Motion.
- **Indicador de aba ativa:** Uma barra vertical com gradiente Instagram aparece à esquerda do item selecionado, animada com spring physics.
- **Sidebar Mobile:** Em telas pequenas, o menu é substituído por um drawer lateral acessível via botão hamburger.

### Header (Cabeçalho Superior)
- **Título dinâmico da página:** Muda automaticamente conforme a rota atual ("Storyboard", "Calendário Editorial", etc).
- **Barra de Pesquisa Global (`SearchBar`):** Campo de texto para buscas rápidas dentro do contexto atual.
- **Filtro de Conta (`AccountFilter`):** Dropdown rápido no topo para filtrar todas as telas pela conta/cliente selecionado.
- **Indicador de Status de API (`ApiStatusBadge`):** Badge em tempo real mostrando `Online` (verde) ou `Warning` (amarelo), verificando se as chaves do Gemini e Apify estão configuradas no banco.
- **Theme Toggle (Lua/Sol):** Ícone no canto superior direito para alternância instantânea entre Modo Escuro e Claro. Persistido via `next-themes`.
- **Ícone de Usuário:** Botão circular à direita.

### ⚡ Command Palette (Atalho Secreto)
Pressione **`Ctrl + K`** (Windows) ou **`Cmd + K`** (Mac) de qualquer tela do sistema. Abre um menu estilo Spotlight com 4 seções:
- **Ações Rápidas:** Criar Novo Conteúdo, Nova Coleção, Nova Conta Instagram.
- **Navegação:** Ir direto para Dashboard, Storyboard, Calendário, Coleções, Contas, Configurações.
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

**Grid "Por Status":** 5 mini-cards mostrando contagem por status: Ideia (cinza), Rascunho (amarelo), Aprovado (verde), Agendado (roxo), Publicado (azul), Falhou (vermelho). Cada um com ícone e cor distinta.

**"Próximos Conteúdos":** Lista com até 5 posts futuros, mostrando: título truncado, data formatada em PT-BR (ex: "Sex, 15 Mar · 09:00"), badge colorido do tipo (Post/Story/Reel/Carrossel).

**"Ações Rápidas":** 3 botões grandes:
- `Novo Conteúdo` (gradiente Instagram, abre o Editor).
- `Ir ao Storyboard`
- `Ir ao Calendário`

---

## 📋 2. Storyboard (Kanban)

Engine de planejamento criativo usando `@hello-pangea/dnd`.

### As 6 Colunas do Board
| Coluna | Cor | Ícone | Descrição |
|--------|-----|-------|-----------|
| **Ideia** | Cinza `#94A3B8` | 💡 Lightbulb | Brainstorm inicial |
| **Rascunho** | Amarelo `#F59E0B` | ✏️ FileEdit | Copy sendo trabalhada |
| **Aprovado** | Verde `#10B981` | ✅ CheckCircle2 | Aprovado pelo diretor de arte |
| **Agendado** | Roxo `#6366F1` | 🕐 Clock | Data/hora definida |
| **Publicado** | Azul `#8B5CF6` | 📤 Send | Já foi ao ar |
| **Falhou** | Vermelho `#EF4444` | ⚠️ AlertCircle | Erro na publicação automática |

### Interações
- **Drag and Drop livre** entre todas as 6 colunas. O status do conteúdo no banco é atualizado automaticamente ao soltar.
- **Botão `+` no topo de cada coluna:** Abre o Editor com o status da coluna pré-selecionado (ex: clicar no `+` da coluna Rascunho cria um card já com `status: draft`).
- **Clique no card:** Abre o Editor completo para aquele conteúdo.
- **Informações visíveis no card:** Título, legenda truncada, tipo com ícone e badge colorido, data agendada formatada, tags de hashtag.

---

## 📅 3. Calendário Editorial

3 modos de visualização acessados por abas no cabeçalho: **Mês**, **Semana**, **Dia**.

### Visão Mensal
- Grid clássico de 30 dias com badges coloridos indicando densidade e formato dos posts por dia.

### Visão Semanal (Agenda Flex)
- 7 colunas (Segunda a Domingo) em Flexbox. Cards empilhados cronologicamente sem buracos de horário vazio.
- **Botão `+ Adicionar`** no rodapé de cada dia, já pré-selecionando a data ao abrir o Editor.

### Visão Diária
- Feed vertical grande mostrando todos os conteúdos detalhados do dia selecionado.
- **Botão `+ Agendar Novo Conteúdo`** pontilhado, abre o Editor já travado naquele dia.

---

## 📝 4. Editor de Conteúdo (Content Editor)

Drawer lateral (Sheet direito) que aparece ao criar ou editar qualquer conteúdo. Possui **2 abas internas: Editar e Preview.**

### Aba "Editar"
- **Título** *(obrigatório)*: Input de texto para nome interno.
- **Descrição / Legenda**: Textarea com múltiplas linhas para a copy completa do post.
- **Tipo** *(obrigatório)*: Dropdown com 4 opções: `Post`, `Story`, `Reel`, `Carrossel`.
- **Status** *(obrigatório)*: Dropdown com 6 opções: `Ideia`, `Rascunho`, `Aprovado`, `Agendado`, `Publicado`, `Falhou`.
- **Conta Instagram**: Dropdown com todas as contas cadastradas (ou "Nenhuma Conta").
- **Data/Hora**: Input `datetime-local` para agendamento.
- **Hashtags (`TagInput`)**: Campo interativo. Digite uma hashtag, pressione Enter, e ela vira um chip visual removível. Múltiplas hashtags.
- **Coleções (Multi-Select Chips)**: Lista de todas as coleções cadastradas como botões redondos. Clique para ativar/desativar a associação. Suporta múltiplas coleções por conteúdo. Mostra ícone e cor da coleção.
- **Mídia (Upload de Imagens e Vídeos)**: Área de upload com drop zone. Aceita: JPEG, PNG, WebP, GIF, MP4, MOV. Mostra preview visual da mídia enviada com botão de remover. Upload via API route `/api/upload`.

### Aba "Preview" (Simulador Instagram)
- Reproduz um **mini feed do Instagram** completo (mockup visual pixel-perfect):
  - Header com avatar circular, nome da conta e ícone `...`.
  - Área de imagem com aspect ratio 4:5, com indicador de carrossel `1/N`.
  - Barra de ações (Like, Comment, Share, Bookmark).
  - "1.042 curtidas" simulado.
  - Legenda compilada automaticamente (Título + Descrição + Hashtags).
  - **Contador de caracteres** (`X / 2200`) com alerta vermelho se exceder o limite do Instagram.

### Botões de Ação
- **Salvar** (gradiente Instagram): Salva ou cria o conteúdo no banco.
- **Duplicar**: Cria uma cópia exata do conteúdo (apenas em modo edição).
- **Excluir**: Remove permanentemente o conteúdo (apenas em modo edição).
- **Publicar via Robô** 🤖: Envia o conteúdo para a **fila de automação** do sistema. O botão mostra estados: "Publicar via Robô" → "Na fila de espera..." → "Postando agora...". Quando na fila, aparece uma animação pulsante informando que o robô processará o post automaticamente. Requer um bot local configurado (ver Configurações).

---

## 🔍 5. Painel de Filtros Avançados

Drawer lateral (Sheet direito) com 6 eixos de filtragem aplicados em tempo real ao Storyboard e Calendário:

1. **Tipos de Conteúdo**: Checkboxes para Post, Story, Reel, Carrossel.
2. **Status do Funil**: Checkboxes para Ideia, Rascunho, Aprovado, Agendado, Publicado, Falhou.
3. **Conta Instagram**: Dropdown com todas as contas (ou "Todas as contas").
4. **Coleção / Campanha**: Dropdown com todas as coleções (ou "Qualquer coleção").
5. **Período de Agendamento**: Dois campos `datetime-local` (Início e Fim) para filtrar por range de data.
6. **Hashtag Específica**: Input de texto para filtrar por hashtag (ex: `#promo`).

**Rodapé**: Botões "Limpar Todos" (desativa todos os filtros) e "Visualizar Resultados" (fecha o painel).

---

## 📈 6. Métricas / Analytics

A tela mais complexa do sistema. Possui **2 modos de visualização** alternáveis no topo:

### Modo Individual
Análise detalhada de um único perfil Instagram.

**Seleção de perfil:**
- **Pills de Clientes:** Lista todos os perfis da aba "Contas" como pills azuis clicáveis.
- **Pills de Concorrentes:** Lista concorrentes em pills laranjas. Botão `+ Concorrente` para adicionar novos via handle/URL. Botão `X` no hover para remover.

**Barra de Busca (`AnalyticsSearch`):** Campo para inserir URL ou @handle do Instagram. Ativa o scraping via API Apify.

**Filtros de Período:** Pills clicáveis: `Todo período`, `7 dias`, `30 dias`, `60 dias`, `90 dias`, `Personalizado`. O modo Personalizado abre dois inputs de data (início e fim).

**Após carregar os dados:**
- **Cabeçalho do perfil:** Avatar circular, nome `@usuario`, contagem de posts e última atualização. Botões `Atualizar` (busca últimos 10 posts) e `Limpar`.
- **KPI Cards:** Cards animados com métricas resumidas (Total Posts, Likes, Comentários, Views, Engajamento médio, Melhor Post).
- **🏆 Melhor Post:** Card dourado em destaque mostrando a legenda (truncada), likes e comentários do post de maior performance.
- **Insights & Análise (`InsightsPanel`):** Painel de inteligência que pode gerar relatórios via IA (Google Gemini) através do botão de carregar.
- **Top Engajadores (`TopEngagers`):** Ranking dos 10 perfis que mais comentaram na página analisada.
- **Análise de Comentários (`CommentsAnalysis`):** Módulo com análise de sentimento (Positivo/Neutro/Negativo) dos comentários coletados, com gráfico de barra visual e métricas percentuais. Integrado ao Google Gemini.
- **Análise por Post (`PostCards`):** Grid de cards individuais para cada post, com thumbnail, métricas de likes/comments/views, e tipo do post.

### Modo VS (Comparação de Concorrentes)
Compara seu cliente contra 1 ou mais concorrentes lado a lado.
- **Seleção:** Escolha "⭐ Seu Cliente" (azul) e "⚔️ Concorrentes" (laranja) entre todos os handles disponíveis.
- **Botão "Comparar @cliente VS N concorrentes":** Dispara a análise comparativa.
- **`ComparisonView`:** Tabelas comparativas completas com:
  - Avatares dos perfis com botão de refresh individual.
  - **Médias por Post:** Likes/Post, Comentários/Post, Sentimento (barra verde/cinza/vermelha), Engajamento/Post, Engajamento Qualificado, Taxa de Engajamento em Reels (%), Views/Reel.
  - **Engajamento por Tipo de Conteúdo:** Breakdown por Posts (imagem), Reels (vídeo), Carrosséis, com setas comparativas (▲/▼ percentual contra o cliente).
  - **Médias Temporais:** Posts/Semana, Engajamento/Semana, Likes/Semana, Comentários/Semana, Posts/Mês, Engajamento/Mês, Likes/Mês, Comentários/Mês.
  - **Distribuição de Conteúdo (%):** Barras empilhadas mostrando o mix de Posts/Reels/Carrosséis.
  - **Gráficos de barras animados:** Engajamento por Post e Frequência de Postagem.
- **Comparison AI Chat:** Chatbot integrado com Google Gemini que recebe os dados de todos os perfis como contexto. Permite perguntar livremente (ex: "Por que meu engajamento caiu contra o concorrente?") e recebe respostas consultivas.

---

## 👥 7. Contas Instagram

Tela `AccountList` para gerenciar múltiplos perfis/clientes.
- Grid de cards com avatar, nome, handle `@usuario`.
- **Botão `+ Nova Conta`:** Formulário para adicionar um novo perfil.
- Após cadastro, a conta aparece em todos os filtros do sistema (Storyboard, Calendário, Analytics, Editor).

---

## 📁 8. Coleções / Campanhas

Tela `CollectionList` para criar agrupamentos temáticos.
- Grid de cards com nome, ícone, cor hexadecimal customizada e descrição.
- **Página individual da coleção** (`/dashboard/collections/[id]`): Mostra apenas os conteúdos vinculados àquela campanha específica.
- Datas de início e fim opcionais (ideal para campanhas com prazo).

---

## ⚙️ 9. Configurações

Página dividida em **5 cards organizados:**

### Card 1: Aparência
- Botões `Claro` (☀️) e `Escuro` (🌙) para definir o tema do sistema.

### Card 2: Preferências
- **Visualização Padrão do Calendário:** Selector com 3 opções: Mensal, Semanal, Diário. Define qual visão abre por padrão na aba Calendário.

### Card 3: Automação do Instagram (Bot Local)
- Lista todas as contas cadastradas com:
  - Avatar, nome, handle `@`.
  - **Status de conexão em tempo real:** Badge `Conectado` (verde pulsante) ou `Desconectado` (amarelo).
  - **Botão "Verificar":** Checa se a sessão Playwright está ativa.
  - **Botão "Conectar Agora" / "Reconectar"** (gradiente Instagram): Abre o navegador Chromium local para login humano do Instagram. Ao fechar, o status é atualizado automaticamente.
- Nota de rodapé: *"A automação local utiliza Chromium na sua máquina para simular ações humanas reais com segurança."*

### Card 4: Integrações Locais (API Keys)
- **Google Gemini API Key:** Input mascarado (`type="password"`) com placeholder `AIzaSy...`. Descrição: "Chave necessária para gerar imagens, stories montados e legendas com IA."
- **Apify API Key:** Input mascarado com placeholder `apify_api_...`. Descrição: "Opcional. Usado por automações em background que raspam dados não estruturados."
- **Botão "Salvar Chaves de API":** Persiste as chaves no banco SQLite local — sem precisar editar `.env`.

### Card 5: Gerenciamento de Dados
- **Exportar Backup (JSON):** Botão que gera o download de um arquivo `ig-dashboard-export-YYYY-MM-DD.json` contendo todos os conteúdos, coleções e contas.
- **Importar Backup:** Seletor de arquivo `.json`. Confirma antes de substituir os dados atuais. Após importação, contagem dos itens importados é exibida e a página recarrega.
- **🔴 Zona de Perigo:** Card vermelho com botão "Resetar Tudo" que apaga todos os dados do localStorage permanentemente, com confirmação dupla.

### Rodapé
- Versão do sistema (v1.0.0), stack tecnológica e link para o repositório GitHub.

---

## 🗄️ 10. Banco de Dados (Prisma Schema)

O banco SQLite possui **6 modelos:**

| Modelo | Campos Principais | Uso |
|--------|------------------|-----|
| **Account** | id, username, password, picture, access_token | Contas Instagram |
| **Content** | id, title, description, type, status, scheduledAt, hashtags (JSON), mediaUrls (JSON), accountId, order | Posts/Stories/Reels |
| **Collection** | id, name, description, color, icon, startDate, endDate | Campanhas |
| **Competitor** | id, name, handle, avatarUrl, metrics (JSON) | Perfis concorrentes |
| **Analytics** | id, targetId, type, data (JSON), period | Cache de métricas |
| **Setting** | id, key, value (JSON) | Config (API keys etc) |

---

## 📂 11. Estrutura de Pastas

```plaintext
DASHBOARD-OSS/
├── app/
│   ├── dashboard/           # Páginas: Home, Storyboard, Calendar, Collections, Accounts, Analytics, Settings
│   ├── api/                 # 8 API Routes: ai-comment-analysis, ai-import, apify, auth, automation, image-proxy, import-md, upload
│   └── actions/             # 8 Server Actions: account, analytics, api-status, collection, competitor, content, instagram, settings
│
├── features/                # Feature Modules (Feature-Sliced Design)
│   ├── accounts/            # AccountList, AccountFilter, AccountForm
│   ├── analytics/           # KpiCards, PostCards, PostsTable, ComparisonView, ComparisonAIChat, InsightsPanel, TopEngagers, CommentsAnalysis, AnalyticsSearch
│   ├── calendar/            # MonthView, WeekView, DayView
│   ├── collections/         # CollectionList, CollectionForm
│   ├── content/             # ContentEditorDialog, TagInput, content.schema (Zod)
│   └── storyboard/          # Board, BoardColumn, ContentCard
│
├── components/
│   ├── layout/              # AppSidebar, AppHeader, AppLayout, MobileSidebar, ThemeToggle
│   ├── shared/              # CommandPalette, FilterPanel, ActiveFiltersBar, SearchBar, ApiStatusIndicator
│   └── ui/                  # 13 Shadcn/UI components (Button, Card, Dialog, Sheet, Select, Tooltip...)
│
├── stores/                  # 8 Zustand Slices
│   ├── ui-slice.ts          # Sidebar, modais, filtros globais
│   ├── content-slice.ts     # CRUD de conteúdos
│   ├── account-slice.ts     # CRUD de contas + automação
│   ├── analytics-slice.ts   # Cache e state analytics
│   ├── calendar-slice.ts    # View, data selecionada
│   ├── collection-slice.ts  # CRUD de coleções
│   ├── automation-slice.ts  # Fila de publicação do robô
│   └── settings-slice.ts    # API keys
│
├── hooks/                   # 4 Custom Hooks
│   ├── use-filtered-contents.ts  # Filtragem reativa de conteúdos
│   ├── use-keyboard-shortcut.ts  # Suporte Ctrl+K, atalhos
│   ├── use-media-query.ts        # Responsividade
│   └── use-theme.ts              # Tema dark/light
│
├── lib/
│   ├── services/            # apify.service.ts, instagram.service.ts, scheduler.service.ts
│   ├── repository/          # database.repository.ts, local-storage.repository.ts (dual storage)
│   ├── utils/               # sentiment.ts (análise de sentimento local)
│   ├── constants.ts         # CONTENT_STATUSES, CONTENT_TYPES, BOARD_COLUMNS, TYPE_BADGE_COLORS
│   └── db.ts                # Instância global Prisma Client
│
├── scripts/                 # 33 scripts standalone (automação, testes, injeção de dados, scheduler, publish-worker)
├── prisma/                  # schema.prisma (SQLite) + migrations
├── types/                   # TypeScript types (Account, Analytics, Collection, Competitor, Content, Settings)
└── docs/                    # PRD (prd.md), Architecture (architecture.md), User Stories
```

---

## 📦 12. Como Instalar e Rodar

### Requisitos
- **Node.js** >= 18
- **pnpm** (`npm install -g pnpm`)

### Setup
```bash
# 1. Instalar dependências
pnpm install

# 2. Criar variáveis de ambiente
cp .env.example .env
# Edite o .env com seu DATABASE_URL (SQLite já vem configurado)

# 3. Gerar Prisma Client e criar tabelas
npx prisma generate
npx prisma db push

# 4. Iniciar o servidor
pnpm dev
```
Abra [http://localhost:3000](http://localhost:3000) no navegador.

---

## 🤖 13. Uso com IAs de Terminal

O projeto foi desenhado para ser operado em conjunto com agentes de terminal (Antigravity, Cursor, Claude Code, etc). A IA pode ler o `prisma/schema.prisma`, criar scripts em `scripts/`, e popular o banco de dados diretamente. Você apenas abre o Dashboard visual, revisa no Storyboard, arrasta para Agendado e aprova.

---

> Construído com foco obsessivo em usabilidade, orquestração analítica e automação inteligente por baixo do capô.
