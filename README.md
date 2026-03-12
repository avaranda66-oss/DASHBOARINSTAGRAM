<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Gemini%20AI-Multimodal-4285F4?style=for-the-badge&logo=google" alt="Gemini" />
  <img src="https://img.shields.io/badge/Meta%20Graph%20API-Integrated-0866FF?style=for-the-badge&logo=meta" alt="Meta API" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

<h1 align="center">Instagram Dashboard OSS</h1>
<h3 align="center">Content Manager &middot; Analytics Engine &middot; AI Intelligence &middot; Automation</h3>

<p align="center">
  Dashboard profissional completo para gerenciamento de contas Instagram.<br/>
  Gestao de conteudo, analytics com IA multimodal, automacao de publicacao e inteligencia competitiva.
</p>

<p align="center">
  <strong>Construido por Humano + IA (Claude Code / Anthropic)</strong><br/>
  <em>Todo o codigo, arquitetura, design de UI e logica de negocios foram desenvolvidos<br/>em parceria entre um humano e Claude Code (Anthropic), demonstrando o potencial<br/>da colaboracao humano-IA no desenvolvimento de software profissional.</em>
</p>

---

## Indice

1. [Sobre o Projeto](#sobre-o-projeto)
2. [Screenshots](#screenshots)
3. [Navegacao Global e Atalhos](#navegacao-global-e-atalhos)
4. [Dashboard Home](#dashboard-home)
5. [Storyboard Kanban](#storyboard-kanban)
6. [Calendario Editorial](#calendario-editorial)
7. [Editor de Conteudo](#editor-de-conteudo)
8. [Filtros Avancados](#filtros-avancados)
9. [Analytics e Metricas](#analytics-e-metricas)
10. [Inteligencia Artificial](#inteligencia-artificial-google-gemini)
11. [Feed Preview](#feed-preview)
12. [Contas Instagram](#contas-instagram)
13. [Colecoes e Campanhas](#colecoes-e-campanhas)
14. [Intelligence Hub](#intelligence-hub)
15. [Configuracoes](#configuracoes)
16. [Automacao e Publicacao](#automacao-e-publicacao)
17. [Arquitetura Tecnica](#arquitetura-tecnica)
18. [Banco de Dados](#banco-de-dados)
19. [Estrutura de Pastas](#estrutura-de-pastas)
20. [Instalacao](#instalacao)
21. [Seguranca](#seguranca)
22. [Creditos](#creditos)
23. [Licenca](#licenca)

---

## Sobre o Projeto

O **Instagram Dashboard OSS** e uma plataforma completa para gerenciamento profissional de contas Instagram. Combina gestao de conteudo, analytics avancados, inteligencia artificial multimodal (Google Gemini) e automacao de publicacao em uma interface moderna com design glassmorphism.

### Destaques

- **Analytics em 3 camadas**: Apify (scraping publico), Meta Graph API (dados privados), IA (insights estrategicos)
- **IA Multimodal**: Google Gemini analisa visualmente o grid do feed, sugere ordem de publicacao e gera estrategias
- **Automacao completa**: Publicacao automatizada via Meta API ou Playwright (browser automation)
- **Inteligencia competitiva**: Compare seu perfil com concorrentes lado a lado
- **Feed Preview**: Visualize como seu feed ficara no celular antes de publicar
- **Kanban Storyboard**: Gerencie o ciclo de vida do conteudo (Ideia -> Publicado)
- **Agendamento inteligente**: IA sugere dias e horarios otimos para publicacao
- **Dark mode premium**: Design glassmorphism com tema escuro profissional

---

## Screenshots

### Central de Comando (Dashboard Home)

<p align="center">
  <img src="docs/screenshots/01-dashboard-home.png" alt="Dashboard Home" width="800" />
</p>

> KPIs em tempo real: total de conteudos, agendados, publicados, distribuicao por status e tipo, proximos conteudos e acoes rapidas.

---

### Analytics — Busca de Perfil (Apify)

<p align="center">
  <img src="docs/screenshots/02-analytics.png" alt="Analytics Search" width="800" />
</p>

> Analise qualquer perfil publico do Instagram. Insira a URL ou @handle, configure numero de posts e periodo, e clique "Analisar". Clientes em azul, concorrentes em laranja.

---

### Analytics — Minha Conta: Visao Geral (Meta API)

<p align="center">
  <img src="docs/screenshots/tab-visao-geral.png" alt="Minha Conta - Visao Geral" width="800" />
</p>

> Dados **privados exclusivos** via Meta Graph API: alcance real, saves, compartilhamentos. KPIs com sparklines, top posts em destaque, tabela completa com metricas detalhadas.

---

### Analytics — Minha Conta: Metricas Completas

<p align="center">
  <img src="docs/screenshots/minha-conta-loaded.png" alt="Metricas Completas" width="800" />
</p>

> Visao completa com todos os posts carregados: likes, comentarios, alcance, impressoes, taxa de engajamento, e tabela com colunas ordenaveis (Reach, Saves, Shares, Likes, Comments).

---

### Analytics — Graficos e Tendencias

<p align="center">
  <img src="docs/screenshots/04-graficos-tab.png" alt="Graficos e Charts" width="800" />
</p>

> Timeline de Alcance (AreaChart), Desempenho por Tipo (BarChart), Melhor Dia da Semana, Melhor Horario, e Performance de Reels vs Feed.

---

### Analytics — Business Discovery (Concorrentes)

<p align="center">
  <img src="docs/screenshots/concorrentes-tab.png" alt="Concorrentes via Meta API" width="800" />
</p>

> Busque dados publicos de qualquer conta Business ou Creator do Instagram diretamente pela API oficial do Meta — sem scraping, dados confiaveis.

---

## Navegacao Global e Atalhos

### Sidebar (Menu Lateral)
- **8 links de navegacao**: Dashboard, Storyboard, Calendario, Colecoes, Contas, Metricas, Intelligence Hub, Configuracoes
- Logo animada do Instagram no topo com gradiente real da marca
- **Colapsavel**: Modo mini (apenas icones, 72px) ou expandido (240px) com animacao suave
- **Indicador de aba ativa**: Barra vertical com gradiente Instagram animada com spring physics
- **Mobile**: Drawer lateral acessivel via botao hamburger

### Header (Cabecalho Superior)
- Titulo dinamico da pagina
- Barra de pesquisa global
- Filtro de conta (dropdown rapido)
- Indicadores de status de API (Gemini OK, Apify OK, Firecrawl OK)
- Theme Toggle (Dark/Light)

### Command Palette (`Ctrl+K` / `Cmd+K`)
Abre de qualquer tela com 4 secoes:
- **Acoes Rapidas**: Novo Conteudo, Nova Colecao, Nova Conta
- **Navegacao**: Ir direto para qualquer pagina
- **Conteudos Recentes**: Ultimos 5 criados com link direto
- **Preferencias**: Alternar tema sem sair do teclado

---

## Dashboard Home

Pagina de boas-vindas e visao geral da operacao:

- **4 Cards KPI** (animados): Total de Conteudos, Agendados, Esta Semana, Publicados
- **Grid por Status**: 6 mini-cards (Ideia, Rascunho, Aprovado, Agendado, Publicado, Falhou)
- **Distribuicao por Tipo**: Post, Story, Reel, Carrossel com barras percentuais
- **Proximos Conteudos**: Lista dos 5 proximos posts com titulo, data e badge de tipo
- **Acoes Rapidas**: Novo Conteudo, Storyboard, Calendario, Metricas

---

## Storyboard Kanban

Board de planejamento criativo com drag-and-drop (`@dnd-kit`):

| Coluna | Cor | Descricao |
|--------|-----|-----------|
| **Ideia** | Cinza | Brainstorm inicial |
| **Rascunho** | Amarelo | Copy sendo trabalhada |
| **Aprovado** | Verde | Aprovado pelo diretor de arte |
| **Agendado** | Roxo | Data/hora definida |
| **Publicado** | Azul | Ja foi ao ar |
| **Falhou** | Vermelho | Erro na publicacao automatica |

- Drag-and-drop livre entre colunas (status atualiza automaticamente)
- Botao `+` no topo de cada coluna (abre editor com status pre-selecionado)
- Cards com titulo, legenda, tipo, data e hashtags

---

## Calendario Editorial

3 visualizacoes acessiveis por abas:

- **Mes**: Grid classico de 30 dias com badges de densidade
- **Semana**: 7 colunas (Seg-Dom) com cards empilhados + botao "+ Adicionar"
- **Dia**: Feed vertical detalhado do dia selecionado

---

## Editor de Conteudo

Drawer lateral com **2 abas** (Editar + Preview):

### Aba Editar
- Titulo, Descricao/Legenda, Tipo (Post/Story/Reel/Carrossel)
- Status (6 opcoes do workflow)
- Conta Instagram, Data/Hora de agendamento
- Hashtags interativas com chips visuais (`TagInput`)
- Colecoes (multi-select)
- Upload de midia (JPEG, PNG, WebP, GIF, MP4, MOV)

### Aba Preview
- Mockup visual pixel-perfect do Instagram
- Header de perfil, area de imagem 4:5, barra de acoes
- Legenda compilada com contador de caracteres (`X / 2200`)

### Acoes
- **Salvar**, **Duplicar**, **Excluir**, **Publicar via Meta API** ou **Publicar via Bot**

---

## Filtros Avancados

Drawer lateral com 6 eixos de filtragem em tempo real:

1. **Tipos de Conteudo** — Post, Story, Reel, Carrossel
2. **Status do Funil** — Ideia a Falhou
3. **Conta Instagram**
4. **Colecao / Campanha**
5. **Periodo de Agendamento** — range de datas
6. **Hashtag Especifica**

---

## Analytics e Metricas

A tela mais complexa do sistema. Possui **3 abas** no topo:

### Aba "Individual" — Analise via Apify (Perfis Publicos)

- **Pills de Clientes** (azuis) e **Concorrentes** (laranjas)
- Busca por URL ou @handle
- Filtros de periodo: Todo, 7d, 30d, 60d, 90d, Personalizado
- **KPI Cards**: Total Posts, Likes, Comentarios, Views, Engajamento, Melhor Post
- **Insights IA**: Relatorio gerado pelo Gemini
- **Top Engajadores**: Ranking dos 10 que mais comentaram
- **Analise de Comentarios**: Sentimento + sugestoes de resposta (detalhes abaixo)
- **Cards de Post**: Grid com thumbnail, metricas e tipo

#### Modulo de Comentarios

| Botao | Fonte | Funcao |
|-------|-------|--------|
| **Apify (N posts)** | Web scraping | Todos os comentarios de N posts |
| **Meta (so novos)** | Graph API | Incremental, apenas novos desde ultimo fetch |

- **Merge aditivo**: Ambas as fontes se somam
- **Filtros**: Sentimento, periodo, ordenacao
- **IA de Opiniao**: Analise curta (max 15 palavras) por comentario
- **Sugestao de Resposta**: Texto gerado usando dados reais do negocio (endereco, telefone, horario)
- **Auto-resposta**: Envio em lote via Playwright

---

### Aba "VS" — Comparacao de Concorrentes

- Tabelas comparativas: medias por post, engajamento por tipo, frequencia
- Graficos de barras animados
- **Chatbot IA**: Converse com Gemini sobre os dados comparativos

---

### Aba "Minha Conta" — Meta Graph API

Dados **privados e precisos** (alcance real, saves, shares). Cache automatico com badge de status.

#### 8 Sub-abas:

**1. Visao Geral**
- 6 KPIs: Alcance, Curtidas, Saves, Shares, Engajamento, Comentarios
- Breakdown por tipo (Foto/Video/Carrossel)

**2. Graficos** (Recharts)
- Timeline de Alcance (AreaChart)
- Comparacao por Tipo (BarChart)
- Melhor Dia da Semana
- Melhor Horario para Postar
- Performance de Reels vs Feed

**3. Melhores Posts**
- Top 5 por: Alcance, Saves, Shares, Curtidas
- Bottom 3 para aprender o que evitar

**4. Hashtags**
- Efetividade computada localmente (sem API extra)
- Badges: Alta (top 25%), Media, Baixa
- Insight: "Hashtag #X tem Nx mais alcance que a media"

**5. Estrategia IA**
- Relatorio estrategico completo via Gemini
- 5 secoes: Formato, Dia/Horario, Hashtags, Atencao, Acoes para 4 semanas

**6. Audiencia**
- Demografia: cidade, faixa etaria, genero
- Crescimento de seguidores

**7. Concorrentes (Business Discovery)**
- Busca de dados publicos de contas Business/Creator via API oficial

**8. Feed Preview** (ver secao abaixo)

---

## Inteligencia Artificial (Google Gemini)

O dashboard integra o Google Gemini como motor de IA multimodal:

| Funcionalidade | Descricao |
|----------------|-----------|
| **Analise Visual do Feed** | IA recebe imagem composta do grid (via Sharp), pontua harmonia visual, consistencia de marca, diversidade e apelo visual (0-10) |
| **Paleta de Cores** | Detecta cores predominantes e sugere paleta otimizada |
| **Posts Problematicos** | Identifica posts que quebram a harmonia visual (max 4, respeita pinned) |
| **Bio Sugerida** | Gera bio otimizada com emojis e CTA |
| **Destaques Sugeridos** | Sugere categorias de Highlights |
| **Recomendacoes** | Lista de acoes especificas e acionaveis |
| **IA Organizar Feed** | Reorganiza ordem de publicacao para coesao visual por linha do grid (3 colunas) |
| **Agendamento Inteligente** | Sugere datas/horarios otimos: 11:30 (almoco), 18:00 (fim de tarde), 20:00 (noite) — distribuidos ao longo dos dias, sem domingos |
| **Estrategia Completa** | Relatorio com insights demograficos, melhores formatos, horarios e acoes |
| **Sentimento de Comentarios** | Analise automatica com sugestoes de resposta usando dados reais do negocio |
| **Intencao de Compra** | Detecta comentarios com intencao comercial |
| **Comparacao VS** | Chatbot para explorar diferencas entre perfis |

---

## Feed Preview

Funcionalidade avancada para visualizar o feed antes de publicar:

- **Phone Mockup**: Simula celular mostrando grid com posts agendados + existentes
- **Posts Fixados**: Suporte a pinned posts no topo
- **Criativos Agendados**: Insere agendados no preview para ver resultado
- **Drag-and-Drop**: Reordene a sequencia de publicacao
- **Highlights Reais**: Exibe destaques do perfil via scraping
- **IA Organizar**: Otimiza ordem para harmonia visual por linha do grid
- **Datas Sugeridas**: IA sugere calendario de publicacao otimo
- **Salvar Ordem + Datas**: Persiste nova ordem e datas no banco

---

## Contas Instagram

Gerencie multiplos perfis/clientes:

### Card de Conta
Avatar, nome, handle, tipo de negocio, endereco, telefone e horario

### Formulario
**Dados basicos**: Nome, Handle, Avatar, Senha

**Informacoes do Negocio** (usadas pela IA para responder comentarios):

| Campo | Descricao | Exemplo |
|-------|-----------|---------|
| Tipo de negocio | Categoria | Restaurante, Clinica... |
| Endereco | Endereco fisico | Rua das Flores, 123 |
| Telefone/WhatsApp | Contato principal | (11) 99999-9999 |
| Horario | Funcionamento | Seg-Sex 12h-22h |
| Site/Cardapio | URL | https://cardapio.empresa.com |
| Observacoes | Info extra | Pet-friendly, aceita reservas |

> **Como a IA usa**: Ao gerar respostas para comentarios ("qual o endereco?"), usa SOMENTE dados reais cadastrados — nunca placeholders.

**Automacao Playwright**: Badge de status (Conectado/Aguardando Login) + botao para abrir sessao

---

## Colecoes e Campanhas

Agrupamentos tematicos com:
- Nome, icone, cor hexadecimal customizada, descricao
- Datas de inicio e fim opcionais (campanhas com prazo)
- Pagina individual com posts filtrados da colecao

---

## Intelligence Hub

Central de pesquisa com **3 abas**:

### Extrator de Maps
- Scraping completo de negocios no Google Maps via Playwright
- Dados: nome, rating, reviews, endereco, telefone, horarios, highlights
- Analise IA de sentimento das reviews

### VS Maps
- Comparacao lado a lado de 2 negocios do Google Maps

### Web Scraper (FireCrawl)
- Converte qualquer URL em Markdown estruturado

---

## Configuracoes

5 secoes organizadas:

1. **Aparencia**: Dark/Light mode
2. **Preferencias**: Visualizacao padrao do calendario
3. **Automacao**: Status de conexao de cada conta + login Playwright
4. **Integracoes (API Keys)**: Gemini, Apify, Meta, FireCrawl — salvas no banco local
5. **Dados**: Exportar/Importar backup JSON + Reset completo

---

## Automacao e Publicacao

| Canal | Metodo | Descricao |
|-------|--------|-----------|
| **Meta API** | Automatico | Publica imagens, videos, carrosseis, stories pela API oficial |
| **Playwright** | Semi-automatico | Automacao de browser quando API nao disponivel |
| **Fila** | Background | Queue com retry automatico para publicacoes agendadas |
| **Comentarios** | Batch | Respostas IA enviadas em lote via automacao |
| **Sessao** | Persistente | Playwright salva sessao para evitar login repetido |

---

## Arquitetura Tecnica

### Stack

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| **UI** | Shadcn/UI, Framer Motion, Recharts, Lucide Icons |
| **State** | Zustand 5 (stores tipados) |
| **Backend** | Next.js API Routes + Server Actions |
| **Database** | SQLite via Prisma 5 ORM |
| **IA** | Google Gemini (multimodal — texto + imagem) |
| **APIs** | Meta Graph API, Apify, FireCrawl |
| **Automacao** | Playwright (browser automation) |
| **Imagem** | Sharp (composicao, resize, thumbnails) |

### API Routes (20+)

| Rota | Funcao |
|------|--------|
| `POST /api/meta-insights` | Metricas privadas da conta (token refresh + circuit breaker) |
| `POST /api/meta-publish` | Publicacao via Meta API |
| `POST /api/meta-discovery` | Business Discovery de concorrentes |
| `POST /api/meta-comments` | Comentarios recentes |
| `POST /api/meta-ai-strategy` | Estrategia IA com Gemini |
| `POST /api/meta-account-insights` | Metricas detalhadas da conta |
| `POST /api/meta-online-followers` | Seguidores online |
| `POST /api/meta-carousel-children` | Slides de carrossel |
| `POST /api/meta-tagged-media` | Midias taggeadas |
| `POST /api/apify` | Start scraper Apify |
| `POST /api/apify/status` | Status do actor run |
| `POST /api/apify/ai-analysis` | Insights IA dos posts scraped |
| `POST /api/apify/ai-comparison` | Comparacao IA entre perfis |
| `POST /api/feed-visual-analysis` | Analise visual multimodal do grid |
| `POST /api/feed-ai-reorder` | Reordenacao IA + agendamento inteligente |
| `POST /api/ai-comment-analysis` | Sentimento + respostas IA |
| `POST /api/maps-scrape` | Scraping Google Maps |
| `POST /api/maps-analysis` | Analise IA de reviews |
| `POST /api/firecrawl` | Web scraping |
| `POST /api/image-proxy` | Proxy de imagens externas |
| `POST /api/upload` | Upload de midia |
| `GET /api/instagram-highlights` | Highlights do perfil |
| `POST /api/auth/instagram` | OAuth Instagram |
| `GET /api/auth/instagram/callback` | Callback OAuth |

### Server Actions (9)

| Action | Funcao |
|--------|--------|
| `content.actions.ts` | CRUD de conteudo + reordenacao + reagendamento |
| `account.actions.ts` | CRUD de contas + login + publicacao |
| `analytics.actions.ts` | Cache de metricas (Apify + Meta) |
| `instagram.actions.ts` | Automacao e publicacao |
| `collection.actions.ts` | CRUD de colecoes |
| `competitor.actions.ts` | CRUD de concorrentes |
| `settings.actions.ts` | Persistencia de configuracoes |
| `maps.actions.ts` | Operacoes Google Maps |
| `api-status.actions.ts` | Status das integracoes |

---

## Banco de Dados

SQLite local via Prisma ORM. **7 modelos:**

| Modelo | Descricao |
|--------|-----------|
| **Account** | Contas Instagram + info de negocio (endereco, telefone, horarios como JSON) |
| **Content** | Posts, Stories, Reels, Carrosseis com workflow de 6 status |
| **Collection** | Campanhas/temas com cor, icone e periodo |
| **Competitor** | Perfis concorrentes salvos com metricas |
| **Analytics** | Cache de metricas (Apify + Meta) em JSON. `type='meta'` = dados privados |
| **Setting** | Configuracoes key-value (API keys, preferencias) |
| **MapsBusiness** | Dados Google Maps (reviews, analise IA) |

---

## Estrutura de Pastas

```
instagram-dashboard/
├── app/
│   ├── dashboard/                # Paginas do dashboard
│   │   ├── page.tsx              # Home (Central de Comando)
│   │   ├── storyboard/           # Kanban Board
│   │   ├── calendar/             # Calendario
│   │   ├── analytics/            # Analytics (3 abas)
│   │   ├── accounts/             # Gestao de contas
│   │   ├── collections/          # Colecoes/Campanhas
│   │   ├── intelligence/         # Hub de Inteligencia
│   │   └── settings/             # Configuracoes
│   ├── api/                      # 20+ API Routes
│   └── actions/                  # 9 Server Actions
├── features/                     # Modulos de funcionalidade
│   ├── analytics/components/     # 30+ componentes de analytics
│   ├── content/components/       # Editor + TagInput
│   ├── storyboard/components/    # Board + Cards draggable
│   ├── calendar/components/      # Month/Week/Day views
│   ├── collections/components/   # List + Form
│   └── accounts/components/      # List + Form com business info
├── lib/services/                 # Servicos de backend
│   ├── instagram-graph.service.ts  # Meta Graph API completa
│   ├── instagram.service.ts        # Playwright automation
│   ├── apify.service.ts            # Scraping Apify
│   ├── ai-adapter.ts              # Gemini/OpenRouter adapter
│   ├── maps-playwright.service.ts  # Google Maps scraper
│   └── scheduler.service.ts        # Fila de publicacao
├── stores/                       # Zustand (8 slices)
├── components/                   # UI (Shadcn/UI) + Layout + Shared
├── hooks/                        # Custom hooks
├── types/                        # TypeScript interfaces
├── prisma/schema.prisma          # Schema SQLite
└── docs/                         # Screenshots + documentacao
```

---

## Instalacao

### Pre-requisitos

- **Node.js** 18+ (recomendado 20+)
- **pnpm** (ou npm/yarn)

### Setup

```bash
# 1. Clone o repositorio
git clone https://github.com/avaranda66-oss/DASHBOARINSTAGRAM.git
cd DASHBOARINSTAGRAM

# 2. Instale as dependencias
pnpm install

# 3. Copie o arquivo de ambiente
cp .env.example .env

# 4. Gere o cliente Prisma e crie o banco
npx prisma generate
npx prisma db push

# 5. (Opcional) Instale browsers do Playwright para automacao
npx playwright install chromium

# 6. Inicie o servidor de desenvolvimento
pnpm dev
```

Abra `http://localhost:3000` no navegador.

### Configuracao de APIs (via UI)

Apos iniciar, va em **Configuracoes** e configure as chaves:

| API | Onde obter | Para que serve |
|-----|-----------|----------------|
| **Google Gemini** | [Google AI Studio](https://aistudio.google.com/) | Todas as funcionalidades de IA |
| **Apify** | [apify.com](https://apify.com/) | Scraping de perfis publicos |
| **Meta Graph API** | [Meta for Developers](https://developers.facebook.com/) | Dados privados (alcance, saves, shares) |
| **FireCrawl** | [firecrawl.dev](https://firecrawl.dev/) | Web scraping |

> **Nota:** O dashboard funciona sem nenhuma API configurada. Cada funcionalidade que requer API mostrara indicadores visuais no header (Gemini OK, Apify OK, etc.).

### Meta Graph API (Dados Privados)

Para acessar dados privados da sua conta:

1. Crie um App no [Meta for Developers](https://developers.facebook.com/)
2. Adicione o produto "Instagram Graph API"
3. Conecte sua conta Instagram Business ou Creator
4. Gere um Long-Lived Token
5. Cole o token na pagina de Contas do dashboard

O dashboard gerencia refresh automatico do token e usa circuit breaker para rate limiting.

---

## Seguranca

- **Nenhuma API key e armazenada em arquivos** — todas ficam no banco SQLite local
- **Banco de dados (`.db`) e gitignored** — nunca commitado
- **Sessoes Playwright** salvas localmente em `sessions/` (gitignored)
- **Nenhum dado e enviado a terceiros** exceto as APIs que voce configurou
- **Senhas de Instagram** armazenadas em plaintext no SQLite local — recomendamos usar tokens de API quando possivel
- `.gitignore` extenso cobrindo: banco, sessoes, uploads, screenshots, scripts de teste

---

## Creditos

### Desenvolvimento
- **Humano + [Claude Code](https://claude.ai/claude-code)** (Anthropic) — Todo o codigo, arquitetura e design

### Tecnologias
- [Next.js](https://nextjs.org/) — Framework React
- [Tailwind CSS](https://tailwindcss.com/) — Estilizacao
- [Prisma](https://www.prisma.io/) — ORM
- [Shadcn/UI](https://ui.shadcn.com/) — Componentes UI
- [Recharts](https://recharts.org/) — Graficos
- [Framer Motion](https://www.framer.com/motion/) — Animacoes
- [Zustand](https://zustand-demo.pmnd.rs/) — State management
- [Google Gemini](https://ai.google.dev/) — IA multimodal
- [Meta Graph API](https://developers.facebook.com/docs/instagram-api/) — Dados Instagram
- [Apify](https://apify.com/) — Web scraping
- [Playwright](https://playwright.dev/) — Browser automation
- [Sharp](https://sharp.pixelplumbing.com/) — Processamento de imagem

---

## Licenca

Distribuido sob a licenca MIT. Veja `LICENSE` para mais informacoes.

---

<p align="center">
  <strong>Instagram Dashboard OSS</strong><br/>
  <em>Desenvolvido por Humano + IA (Claude Code / Anthropic)</em><br/>
  Next.js 16 &middot; React 19 &middot; TypeScript 5 &middot; Tailwind 4 &middot; Prisma 5 &middot; Google Gemini &middot; Meta Graph API
</p>
