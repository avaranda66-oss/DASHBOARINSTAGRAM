<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Gemini%20AI-Multimodal-4285F4?style=for-the-badge&logo=google" alt="Gemini" />
  <img src="https://img.shields.io/badge/Meta%20Graph%20API-v25.0-0866FF?style=for-the-badge&logo=meta" alt="Meta API" />
  <img src="https://img.shields.io/badge/Meta%20Ads%20API-Integrated-00C853?style=for-the-badge&logo=meta" alt="Meta Ads" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

<h1 align="center">Instagram Dashboard OSS</h1>
<h3 align="center">Content Manager &middot; Analytics Engine &middot; Ads Manager &middot; AI Intelligence &middot; Statistical Engine &middot; Automation</h3>

<p align="center">
  Dashboard profissional completo para gerenciamento de contas Instagram.<br/>
  Gestao de conteudo, analytics com IA multimodal, gerenciamento de campanhas Meta Ads,<br/>
  motor estatistico avancado (Bayesian A/B, Holt-Winters, Isolation Forest, Shapley, MMM)<br/>
  automacao de publicacao e inteligencia competitiva.
</p>

<p align="center">
  <strong>Construido por Humano + IA (Claude Code / Anthropic)</strong><br/>
  <em>Todo o codigo, arquitetura, design de UI e logica de negocios foram desenvolvidos<br/>em parceria entre um humano e Claude Code (Anthropic), demonstrando o potencial<br/>da colaboracao humano-IA no desenvolvimento de software profissional.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Branch_Ativa-v2--dashboard-A3E635?style=for-the-badge" alt="Branch v2-dashboard" />
  <img src="https://img.shields.io/badge/Motor_Estatístico-v3.0-8B5CF6?style=for-the-badge" alt="Statistical Engine v3" />
  <img src="https://img.shields.io/badge/TypeScript-0_erros-00C853?style=for-the-badge&logo=typescript" alt="TypeScript 0 errors" />
  <img src="https://img.shields.io/badge/ESLint-0_warnings-00C853?style=for-the-badge" alt="ESLint 0 warnings" />
</p>

> **Branch `v2-dashboard`** — Esta e a versao ativa do projeto. O design system foi completamente reescrito (V2 Industrial HUD), o Meta Ads Manager recebeu um motor estatistico avancado com 18 modulos puros em TypeScript (~7.728 LOC) e 22 componentes de UI conectados. Inclui: Bayesian A/B Testing, Holt-Winters Forecasting, Isolation Forest, Shapley Attribution, Marketing Mix Modeling, Demographics Breakdown, Multi-Account Management, Auto-Refresh, CSV/PDF Export e Attribution Windows. Branch `main` = V1 (versao estavel anterior).

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
9. [Meta Ads Manager](#meta-ads-manager)
10. [Analytics e Metricas](#analytics-e-metricas)
11. [Motor Estatistico Avancado](#motor-estatistico-avancado)
12. [Inteligencia Artificial](#inteligencia-artificial-google-gemini)
13. [Feed Preview](#feed-preview)
14. [Contas Instagram](#contas-instagram)
15. [Colecoes e Campanhas](#colecoes-e-campanhas)
16. [Intelligence Hub](#intelligence-hub)
17. [Configuracoes](#configuracoes)
18. [Automacao e Publicacao](#automacao-e-publicacao)
19. [Arquitetura Tecnica](#arquitetura-tecnica)
20. [Banco de Dados](#banco-de-dados)
21. [Estrutura de Pastas](#estrutura-de-pastas)
22. [Instalacao](#instalacao)
23. [Seguranca](#seguranca)
24. [Creditos](#creditos)
25. [Licenca](#licenca)

---

## Sobre o Projeto

O **Instagram Dashboard OSS** e uma plataforma completa para gerenciamento profissional de contas Instagram. Combina gestao de conteudo, analytics avancados, gerenciamento de campanhas Meta Ads, inteligencia artificial multimodal (Google Gemini) e automacao de publicacao em uma interface moderna com design glassmorphism.

### Destaques

- **Meta Ads Manager**: Painel completo de campanhas com KPIs, graficos, criativos visuais e IA de otimizacao
- **Galeria de Criativos**: Visualize todos os criativos dos anuncios com metricas por ad (Gasto, CTR, CPC)
- **Analytics em 3 camadas**: Apify (scraping publico), Meta Graph API (dados privados), IA (insights estrategicos)
- **IA Multimodal**: Google Gemini analisa visualmente o grid do feed, sugere ordem de publicacao e gera estrategias
- **Automacao completa**: Publicacao automatizada via Meta API ou Playwright (browser automation)
- **Inteligencia competitiva**: Compare seu perfil com concorrentes lado a lado
- **Feed Preview**: Visualize como seu feed ficara no celular antes de publicar
- **Kanban Storyboard**: Gerencie o ciclo de vida do conteudo (Ideia -> Publicado) — agora com tipo "Campanha"
- **Agendamento inteligente**: IA sugere dias e horarios otimos para publicacao
- **Dark mode premium**: Design glassmorphism com tema escuro profissional

---

## Screenshots

### 1. Central de Comando (Dashboard Home)

<p align="center">
  <img src="docs/screenshots/01-dashboard-home.png" alt="Dashboard Home" width="800" />
</p>

> **Central de Comando** — Pagina principal com visao completa da operacao. No topo: 4 cards KPI animados (Total de Conteudos, Agendados, Esta Semana com variacao %, Publicados) com sparklines de tendencia. Abaixo a esquerda: grid de **6 status** (Ideia, Rascunho, Aprovado, Agendado, Publicado, Falhou) com contadores e barras de progresso coloridas. A direita: **Distribuicao por Tipo** com barras percentuais (Post 58%, Campanha 32%, Carrossel 11%, Story, Reel). No rodape: **Proximos Conteudos** com os 5 posts agendados (titulo, data, horario, badge de tipo) e **Acoes Rapidas** com botoes para Novo Conteudo, Storyboard, Calendario e Metricas. Header superior com barra de busca global (Cmd+K), seletor de conta, e indicadores de status das APIs (Gemini OK, Apify OK, Firecrawl OK).

---

### 2. Storyboard Kanban

<p align="center">
  <img src="docs/screenshots/02-storyboard-kanban.png" alt="Storyboard Kanban" width="800" />
</p>

> **Storyboard Kanban** — Board de planejamento visual com drag-and-drop (@dnd-kit). 6 colunas representando o workflow: **Ideia** (cinza), **Rascunho** (amarelo), **Aprovado** (verde), **Agendado** (roxo), **Publicado** (azul), **Falhou** (vermelho). Cada coluna tem contador de cards e botao "+" para adicionar direto naquele status. Cards mostram badge de tipo colorido (Post azul, Campanha verde, Carrossel laranja), titulo, descricao truncada, data/hora de agendamento e hashtags. Botao "Filtros" no topo para filtrar por tipo, conta ou colecao. No rodape: botoes "Arquivos MD" e "Importar Pasta" para importacao em massa de conteudo.

---

### 3. Calendario Editorial

<p align="center">
  <img src="docs/screenshots/03-calendario-editorial.png" alt="Calendario Editorial" width="800" />
</p>

> **Calendario Editorial** — 3 visualizacoes (Mensal, Semanal, Diario) acessiveis por abas. Grid classico de 30 dias com navegacao por setas e botao "Hoje". Cada dia mostra os conteudos agendados com badges coloridos por tipo: azul (Post), laranja (Campanha/Carrossel), verde (Campanha). Contador de density no canto superior direito de cada celula (ex: "2", "3"). Clique em qualquer dia para ver detalhes ou adicionar conteudo. Design dark com bordas sutis separando cada celula do calendario.

---

### 4. Colecoes e Campanhas

<p align="center">
  <img src="docs/screenshots/04-colecoes.png" alt="Colecoes" width="800" />
</p>

> **Colecoes** — Agrupe conteudos em categorias ou campanhas tematicas. Cada colecao tem nome, icone personalizado, cor hexadecimal, descricao e periodo opcional (inicio/fim). Botao "+ Nova Colecao" com gradiente Instagram no canto superior direito. Estado vazio com call-to-action claro para criar a primeira colecao.

---

### 5. Contas Instagram

<p align="center">
  <img src="docs/screenshots/05-contas.png" alt="Contas Instagram" width="800" />
</p>

> **Contas Instagram** — Gerencie multiplos perfis. Cada card mostra avatar circular, nome da conta, @handle com gradiente Instagram, badge de status da automacao (verde "AUTOMACAO OK" = sessao Playwright ativa), e contador de conteudos ativos. Botao "+ Nova Conta" no topo. Ao clicar em uma conta, abre formulario completo com: dados basicos, tokens de API (Meta Graph, Facebook Ads, Ad Account ID), informacoes do negocio (endereco, telefone, horario, site) usadas pela IA para respostas contextualizadas a comentarios.

---

### 6. Analytics — Metricas Individuais (Apify + Meta API)

<p align="center">
  <img src="docs/screenshots/06-analytics-busca.png" alt="Analytics Individual" width="800" />
</p>

> **Analytics Individual** — Tela de analise com 3 abas no topo (Individual, VS, Minha Conta). Area de busca com campo para URL/@ do Instagram, seletor de numero de posts e filtro de historico. Pills de **Clientes** (azuis) e **Concorrentes** (laranjas) para acesso rapido a perfis salvos. Abaixo: 12 cards KPI com sparklines — Seguidores, Alcance Total, Total Likes, Total Saves, Total Shares, Total Comentarios, Eng. Rate, Avg Watch Time, Save Rate, Share Rate, Depth Score (score ponderado 0-100), e Melhor Tipo de conteudo. Cada card mostra tendencia (Estavel, Caindo, Subindo) com seta colorida. Banner "Metricas Privadas (Meta API)" com botao "Enriquecer" para carregar dados exclusivos do Meta.

---

### 7. Minha Conta — Visao Geral (Meta API)

<p align="center">
  <img src="docs/screenshots/07-minha-conta-visao-geral.png" alt="Minha Conta Visao Geral" width="800" />
</p>

> **Minha Conta — Visao Geral** — Dados **privados exclusivos** via Meta Graph API v25.0. Seletor de conta no topo com badge "META API" e indicador de cache (data/hora da ultima atualizacao). 9 sub-abas: Visao Geral, Graficos, Melhores Posts, Hashtags, Estrategia IA, Audiencia, Concorrentes, Publicar, Feed Preview. Os mesmos 12 KPIs com sparklines, mas alimentados por dados reais do Meta (alcance real, saves, shares — metricas que scraping nao consegue). Breakdown por tipo de conteudo (Foto, Video, Carrossel) com alcance medio de cada um. Cards de destaque: "Maior Alcance" e "Mais Curtido" com preview da legenda.

---

### 8. Minha Conta — Graficos e Tendencias

<p align="center">
  <img src="docs/screenshots/08-minha-conta-graficos.png" alt="Graficos e Tendencias" width="800" />
</p>

> **Graficos e Tendencias** — 6 graficos interativos (Recharts): **1)** Timeline de Alcance + Saves + Shares com linha de tendencia tracejada (AreaChart dual-axis), toggle Alcance & Saves / Likes & Comentarios, legenda com indicadores Reels vs Feed. **2)** Desempenho por Tipo de Conteudo (BarChart agrupado: Carrossel, Foto, Video x Alcance, Likes, Saves, Shares). **3)** Alcance Medio por Dia da Semana (BarChart com toggle Alcance/Likes/Saves/Shares + barra de Engajamento). **4)** Melhor Horario para Postar (BarChart vertical com destaque do horario otimo: "Melhor Horario: 08h — Media de 2.1K alcance"). **5)** Performance de Reels (Total de Reels, Engajamento Reels, grafico Reels VS Feed/Carrossel por alcance medio).

---

### 9. Meta Ads Manager — Campanhas

<p align="center">
  <img src="docs/screenshots/09-ads-setup.png" alt="Meta Ads Manager" width="800" />
</p>

> **Meta Ads Manager** — Painel completo de campanhas Meta Ads integrado via API v25.0. No topo: titulo com nome da conta e Ad Account ID, timestamp da ultima atualizacao, botao Atualizar. **Filtros**: Periodo (Hoje, Ontem, 7d, 14d, 30d, 90d, Este Mes, Mes Passado, Personalizado), Status (Todas, Ativas, Pausadas, Arquivadas), Campanha especifica. **8 KPIs**: Gasto Total, Impressoes, Cliques, CTR, CPC Medio, Alcance, Conversoes, ROAS — cada um com icone colorido. **4 sub-abas**: Campanhas (tabela), Criativos (galeria), Graficos, Inteligencia. Tabela de campanhas com colunas ordenaveis: nome, status (badge Ativa/Pausada), objetivo, orcamento/dia, gasto, impressoes, cliques, CTR, CPC e botao de acao (Pausar/Ativar).

---

### 10. Galeria de Criativos

<p align="center">
  <img src="docs/screenshots/10-ads-criativos.png" alt="Galeria de Criativos" width="800" />
</p>

> **Galeria de Criativos** — Grid visual responsivo com thumbnails dos criativos de anuncios. Header com contador ("6 criativos, 4 ativos, 6 com imagem"), barra de busca, filtro por status (Todos, Ativos, Pausados, Camp. Pausada, Conj. Pausado), ordenacao (Maior gasto, Mais impressoes, Maior CTR, Maior CPC, Nome A-Z) e toggle Grid/Lista. Cada card mostra: imagem do criativo com badge de status (verde "Ativo", amarelo "Em Analise"), nome do ad, conta vinculada, texto do criativo, e 4 metricas individuais (Gasto, Impressoes, Cliques, CTR). Botao de analise IA por criativo no hover da imagem. Imagens carregadas via proxy para evitar CORS.

---

### 11. Inteligencia de Ads (Intelligence Panel v2)

<p align="center">
  <img src="docs/screenshots/11-ads-inteligencia.png" alt="Inteligencia de Ads" width="800" />
</p>

> **Inteligencia de Ads** — Painel de analytics avancado com metricas calculadas automaticamente. **Saude da Conta**: Score circular 0-100 (amarelo "Atencao" = 46) com 4 barras de progresso (Fadiga Criativa Media, Score ROAS, Saturacao Media, Utilizacao de Budget). **Saturacao de Audiencia**: Card por conjunto de anuncios mostrando frequencia atual vs ideal (1.35 / 3.0), badge "Subexplorado", indice de saturacao (0.45x), alcance em %, e recomendacao ("Expandir — publico sub-explorado"). **Comparacao com Benchmark** (Food & Beverage): Tabela com metricas (CTR, CPC, CPM, CPA, ROAS) comparando Cliente vs Benchmark da industria, indice relativo (ex: 0.39x) com seta de tendencia, e status colorido (Verde "Acima", Vermelho "Abaixo", Amarelo "Na Media"). Toggle Setor/Historico.

---

### 12. Intelligence Hub

<p align="center">
  <img src="docs/screenshots/12-intelligence-hub.png" alt="Intelligence Hub" width="800" />
</p>

> **Intelligence Hub** — Central de pesquisa competitiva com 2 modulos: **Metricas Google Maps** (scraping de negocios via Playwright com rating, reviews, endereco, telefone, horarios, highlights, analise IA de sentimento) e **Scraper Universal** (FireCrawl — converte URLs em Markdown). Sub-abas: Pesquisar, Salvos (para comparar depois), VS Comparativo (lado a lado). Campo de busca com placeholder "Restaurante Centro SP" e botao Pesquisar.

---

### 13. Configuracoes

<p align="center">
  <img src="docs/screenshots/13-configuracoes.png" alt="Configuracoes" width="800" />
</p>

> **Configuracoes** — 6 secoes organizadas: **Aparencia** (toggle Claro/Escuro), **Preferencias** (visualizacao padrao do calendario: Mensal/Semanal/Diario), **Automacao do Instagram** (status de sessao Playwright por conta, botoes Verificar/Reconectar com badges CONECTADO), **Meta API Oficial** (token long-lived com validade, conexao OAuth, checklist de metricas exclusivas vs Apify), **Integracoes Locais** (API Keys: Gemini, Apify, Firecrawl + seletor de provedor IA Google Gemini/OpenRouter com dropdown de modelos: Gemini 2.0 Flash ate 3.1 Pro Preview), **Gerenciamento de Dados** (Exportar/Importar backup JSON + Zona de Perigo com botao Resetar Tudo). Rodape com versao e link para repositorio.

---

## Screenshots V2 — Branch `v2-dashboard`

> As screenshots abaixo sao da branch ativa `v2-dashboard` com o novo **Industrial HUD Design System** e o **Motor Estatistico v3.0** completo.

### 14. V2 Dashboard HUD — Visao Geral

<p align="center">
  <img src="docs/screenshots/v2-01-overview.png" alt="V2 Dashboard Overview" width="800" />
</p>

> **V2 Central de Comando** — Nova interface com design Industrial HUD. KPI cards com bordas neon, badges de status em tempo real (19 conteudos, 7 agendados), grid de status por cor com contadores visuais, proximos agendamentos com hora e tipo. Tipografia monospace, paleta escura com acentos em verde lima e azul eletrico. Header com indicadores de API e timestamp de frescor dos dados.

---

### 15. V2 Storyboard Kanban

<p align="center">
  <img src="docs/screenshots/v2-02-storyboard.png" alt="V2 Storyboard" width="800" />
</p>

> **V2 Storyboard** — Kanban com novo design HUD. Cards com borda colorida por tipo, badges neon, metricas compactas. Drag-and-drop entre colunas preservado. Filtros avancados com dropdown estilizado no topo.

---

### 16. V2 Ads Manager — KPI HUD com Dados Reais

<p align="center">
  <img src="docs/screenshots/v2-07-ads-kpis.png" alt="V2 Ads KPIs" width="800" />
</p>

> **V2 Ads Manager — KPI HUD** — Painel de anuncios com dados reais da Meta Ads API. KPI cards estilo HUD industrial: Gasto Total (BRL 57), Impressoes, CTR (0.16%), CPC, Alcance, ROAS. Cada card exibe delta contextual vs periodo anterior (seta verde/vermelha). Badge de frescor dos dados (ex: "15min atras"). Filtros de periodo com destaque neon na selecao ativa. Signal Alerts integrados no header quando anomalias sao detectadas.

---

### 17. V2 Ads — Motor Estatistico: Creative Ranking

<p align="center">
  <img src="docs/screenshots/v2-10-ads-criativos-ranking.png" alt="V2 Creative Ranking" width="800" />
</p>

> **V2 Creative Performance Ranking** — Ranking de criativos por score composto (Creative Scorer: CTR 35% + CPM 25% + Eng. Rate 20% + Tendencia 20%). Top criativo: "Ad - Sabor do Mar" com score 77/100 (badge verde "Good"). Grid com score visual, metricas por ad, badge de Lifecycle Stage (Fresh / Aging / Fatigued) e indicador de tendencia (subindo/caindo). Algoritmo de Isolation Forest detecta criativos anomalos (outliers de performance).

---

### 18. V2 Ads — Inteligencia (Signal Alerts + A/B + Benchmark)

<p align="center">
  <img src="docs/screenshots/v2-09-ads-insights-intelligence.png" alt="V2 Ads Intelligence" width="800" />
</p>

> **V2 Ads Intelligence Panel** — Central de inteligencia estatistica em tempo real. **Signal_Alerts_Feed**: alertas Z-score (WARN/CRIT) com metricas especificas e valores absolutos. **Binary_Verification_Kernels**: detector automatico de A/B tests (Bayesian + Z-test), declaracao de vencedor com significancia estatistica e lift percentual. **Ecosystem_Calibration**: benchmark Food & Beverage com toggle SECTOR_HUB (benchmark do setor) / HIST_CORE (comparacao vs periodo anterior) — cada modo mostra baseline diferente. **Multivariate_Coherence_Probe**: score SYSTEM_NOMINAL indica quando multiplas metricas se movem coerentemente.

---

## Navegacao Global e Atalhos

### Sidebar (Menu Lateral)
- **9 links de navegacao**: Dashboard, Storyboard, Calendario, Ads, Colecoes, Contas, Metricas, Intelligence Hub, Configuracoes
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
- **Distribuicao por Tipo**: Post, Story, Reel, Carrossel, Campanha com barras percentuais
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

### Tipos de Conteudo

| Tipo | Icone | Cor | Descricao |
|------|-------|-----|-----------|
| **Post** | Image | Azul | Publicacao no feed |
| **Story** | Circle | Roxo | Story de 24h |
| **Reel** | Film | Rosa | Video curto |
| **Carrossel** | Layers | Laranja | Multiplas imagens |
| **Campanha** | Megaphone | Verde | Criativo de campanha de ads |

- Drag-and-drop livre entre colunas (status atualiza automaticamente)
- Botao `+` no topo de cada coluna (abre editor com status pre-selecionado)
- Cards com titulo, legenda, tipo, data e hashtags
- **Filtro por tipo**: Diferencia conteudos organicos de criativos de campanha

---

## Calendario Editorial

3 visualizacoes acessiveis por abas:

- **Mes**: Grid classico de 30 dias com badges de densidade
- **Semana**: 7 colunas (Seg-Dom) com cards empilhados + botao "+ Adicionar"
- **Dia**: Feed vertical detalhado do dia selecionado

Cards com cores por tipo (incluindo verde para Campanha) e badges de status.

---

## Editor de Conteudo

Drawer lateral com **2 abas** (Editar + Preview):

### Aba Editar
- Titulo, Descricao/Legenda, Tipo (Post / Story / Reel / Carrossel / Campanha)
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

1. **Tipos de Conteudo** — Post, Story, Reel, Carrossel, Campanha
2. **Status do Funil** — Ideia a Falhou
3. **Conta Instagram**
4. **Colecao / Campanha**
5. **Periodo de Agendamento** — range de datas
6. **Hashtag Especifica**

---

## Meta Ads Manager

Painel completo para gerenciamento de campanhas Meta Ads (Facebook/Instagram) integrado via **Meta Graph API v25.0**.

### Como Acessar

1. Va em **Contas** e cadastre seu **Token Facebook Ads** + **Ad Account ID**
2. Acesse a aba **Ads** na sidebar
3. Os dados carregam automaticamente

### Filtros Disponíveis

- **Periodo**: Hoje, Ontem, 7d, 14d, 30d, 90d, Este Mes, Mes Passado, Personalizado
- **Status**: Todas, Ativas, Pausadas, Arquivadas
- **Campanha especifica**: Dropdown com todas as campanhas

### 4 Sub-abas

#### 1. Campanhas (Tabela)
- Lista de todas as campanhas com metricas agregadas
- **Toggle de status**: Ative/Pause campanhas direto pela interface
- Expanda para ver AdSets de cada campanha
- Metricas: Gasto, Impressoes, Cliques, CTR, CPC, Alcance

#### 2. Criativos (Galeria Visual)
Esta e a nova aba de **Storyboard de Campanhas**:

- **Grid visual**: Thumbnails dos criativos em grade responsiva (2-5 colunas)
- **View lista**: Visualizacao compacta com metricas lado a lado
- **Metricas por criativo**: Gasto, Impressoes, Cliques, CTR, CPC individuais
- **Status badge**: Ativo, Pausado, Campanha Pausada, Reprovado, Em Analise
- **Busca**: Pesquise por nome, titulo ou texto do criativo
- **Filtro por status**: Todos, Ativos, Pausados, Campanha Pausada
- **Ordenacao**: Maior gasto, Mais impressoes, Maior CTR, Maior CPC, Nome A-Z
- **Toggle Grid/Lista**: Alterne entre visualizacoes
- **Link externo**: Hover no criativo mostra link de destino do anuncio
- **Image proxy**: Imagens via proxy para evitar CORS

> Os criativos sao carregados sob demanda ao clicar na aba — clique "Carregar Criativos" na primeira vez.

#### 3. Graficos
- Timeline de gastos diarios (AreaChart)
- Impressoes e cliques por dia
- Comparacao de performance entre campanhas

#### 4. Inteligencia (IA + Estatistica Avancada)
- Analise automatica dos dados de campanha via Gemini
- Recomendacoes de otimizacao de budget
- Insights de performance por campanha
- **Fadiga Criativa**: Score por anuncio com deteccao de esgotamento (exponential decay)
- **Saturacao de Audiencia**: Indice de frequencia vs benchmark por vertical
- **Saude da Conta**: Score 0-100 com CTR, CPC, frequencia e diversidade
- **A/B Testing**: Deteccao automatica de testes com significancia estatistica (Z-test)
- **Benchmark Comparativo**: Performance vs benchmarks da industria (Food & Beverage)

### Features Recentes (V2 Sprint — 2026-03-14)

#### Auto-Refresh Inteligente (US-56)
- Intervalo configurável: 5min / 15min / 30min / manual
- Pausa automática quando aba perde foco (Page Visibility API)
- Countdown visual na interface
- Persistência de preferência via localStorage

#### Request Cache + Deduplicação (US-57)
- Cache com TTL por endpoint (campanhas=5min, insights=15min)
- Deduplicação de requests in-flight idênticos
- Badge visual "[CACHE]" vs dados ao vivo
- Botão de forçar refresh

#### Export CSV (US-58)
- Exportação de campanhas e insights diários para CSV
- BOM (\\uFEFF) para compatibilidade Excel
- Formatação de moeda, percentuais e ROAS

#### PDF Report (US-59 MVP)
- Endpoint `/api/ads-report` gera HTML completo
- window.print() para salvar como PDF
- Layout de relatório de agência (KPIs, campanhas, insights)

#### Attribution Window Selector (US-66)
- Seletor: PADRÃO, 1D CLICK, 7D CLICK, 28D CLICK, 1D VIEW
- End-to-end: UI → Store → API → Meta API `action_attribution_windows`

#### Demographics Breakdown (US-69 + US-70)
- Heatmap age×gender com segmento de ouro (melhor ROAS)
- Tabela de placement por platform×position
- Breakdown via Meta API v25 (campo `platform_position`)

#### Multi-Account Management (US-61 + US-62)
- Account Switcher: dropdown no header com histórico das últimas 5 contas
- Multi-Account Overview: grid spend+ROAS das top-5 contas
- Promise.all com concorrência máx 3 (respeita rate limit por conta)
- ROAS colorido: verde ≥2x, amarelo ≥1x, vermelho <1x

#### Motor Estatístico Avançado (US-50 a US-55, US-71)
- engagementScore com midpoint dinâmico via histórico da conta
- STL-CUSUM bridge para InsightEngine (elimina falsos positivos de sazonalidade)
- postingConsistencyIndex com target configurável por tipo de conta
- Ads Efficiency Panel com curva Michaelis-Menten (spend×ROAS)
- Creative Half-Life badge (FRESCO / ENVELHECENDO / ESGOTADO)
- Viral Potential Index (sigmoid com classificação VIRAL/ALTO/MODERADO/BAIXO)
- weightedRecentTrend com WLS e decaimento exponencial (halflife=14d)

### Infraestrutura Tecnica de Ads

| Feature | Implementacao |
|---------|---------------|
| **API** | Meta Graph API v25.0 |
| **Cache** | 5 minutos TTL em memoria |
| **Circuit Breaker** | Protecao contra rate limiting (5 falhas = pausa 60s) |
| **Paginacao** | Automatica para contas com muitas campanhas |
| **Rate Limiting** | 200ms delay entre paginas |

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

## Motor Estatistico Avancado

O dashboard possui um motor de analytics proprio — **Statistical Engine v3.0** — implementado em TypeScript puro (zero dependencias externas), com 18 modulos de nivel academico para analise de dados de marketing digital (7.728 linhas de codigo).

### Modulos Core (`lib/utils/`)

#### `math-core.ts` — Primitivas matematicas reutilizaveis

| Funcao | Descricao |
|--------|-----------|
| `normalCDF(z)` | CDF da normal padrao (Abramowitz & Stegun, erro < 7.5e-8) |
| `normalQuantile(p)` | Quantil da distribuicao normal (inversa da CDF) |
| `bootstrapCI(values, options)` | Intervalo de confianca via bootstrap (percentile method, B=1000) |
| `olsSimple(x, y)` | Regressao linear OLS com alpha, beta, R-squared e residuos |

#### `bayesian-ab.ts` — A/B Testing Bayesiano (US-24)

Teste A/B com inferencia Bayesiana + Z-test frequentista:

| Funcao | Descricao |
|--------|-----------|
| `bayesianABTest(control, treatment)` | Beta-Binomial conjugada, calcula P(B>A), lift esperado e IC 95% |
| `zTestProportions(pA, pB, nA, nB)` | Z-test de proporcoes com two-sided p-value |
| `detectABTests(campaigns)` | Auto-deteccao de testes por padroes de nomenclatura de campanha |
| Declaracao de vencedor | Bayesian: P(B>A) >= 95% — Frequentista: p < 0.05 |

#### `anomaly-detection.ts` — Deteccao de Anomalias STL + MAD (US-25)

Detecta anomalias em series temporais de metricas de ads:

| Funcao | Descricao |
|--------|-----------|
| `stlDecompose(series)` | Decomposicao STL simplificada (tendencia + sazonalidade + residuo) |
| `madAnomalyDetect(series, options)` | Z-score robusto via MAD (Median Absolute Deviation) — resistente a outliers |
| `detectSignalAlerts(kpiHistory)` | Gera Signal_Alerts_Feed com severity WARN/CRIT e Z-scores |
| `multivariateCoherence(alerts)` | Multivariate_Coherence_Probe — detecta se multiplas metricas se movem juntas (SYSTEM_NOMINAL vs anomalia genuina) |

#### `hw-optimizer.ts` — Holt-Winters Autotuning (US-26)

Previsao de series temporais com autotuning de hiperparametros:

| Funcao | Descricao |
|--------|-----------|
| `holtWinters(data, params)` | Triple Exponential Smoothing com tendencia + sazonalidade |
| `autotuneHW(series)` | Grid search em alpha/beta/gamma — minimiza RMSE via leave-one-out |
| `forecastNext7Days(metric)` | Previsao dos proximos 7 dias com intervalo de confianca |
| `cusumDetect(data, options)` | Deteccao de change-points (mudanca de regime) via CUSUM |

#### `causal-behavioral.ts` — Analise Causal + Comportamental (US-27)

Modelos de causalidade e comportamento de usuario:

| Funcao | Descricao |
|--------|-----------|
| `grangerCausality(x, y, lag)` | Teste de causalidade de Granger entre duas series (ex: spend -> conversoes) |
| `foggBehaviorModel(motivation, ability, trigger)` | Modelo de Fogg — score de probabilidade de acao (0-1) |
| `hookRateAnalysis(impressions, clicks, conversions)` | Taxa de engajamento por etapa do funil (Hook Rate, Hold Rate, Convert Rate) |
| `attentionDecayModel(ctr_series)` | Modelo de decaimento exponencial de atencao ao criativo |

#### `isolation-forest.ts` — Deteccao de Anomalias Multivariada (US-28)

Isolation Forest para detectar campanhas e criativos anomalos:

| Funcao | Descricao |
|--------|-----------|
| `isolationForest(data, options)` | Algoritmo Isolation Forest — anomaly score por ponto (0-1) |
| `detectAnomalousCampaigns(campaigns)` | Score de anormalidade para cada campanha (CTR, CPC, CPM, ROAS multivariado) |
| `detectAnomalousCreatives(ads)` | Identifica criativos outliers de performance |

#### `attribution.ts` — Modelos de Atribuicao (US-29 / Shapley)

Atribuicao de valor por canal e etapa do funil:

| Funcao | Descricao |
|--------|-----------|
| `shapleyAttribution(channels, conversions)` | Valor de Shapley — distribui credito justo entre canais/campanhas |
| `markovChainAttribution(paths)` | Cadeias de Markov para atribuicao multicanal |
| `firstLastLinearAttribution(touchpoints)` | Modelos classicos: first-touch, last-touch, linear, time-decay |

#### `mmm.ts` — Media Mix Modeling (MMM)

Modela contribuicao de cada canal de midia no resultado:

| Funcao | Descricao |
|--------|-----------|
| `mediaMixModel(channels, revenue)` | Regressao OLS com adstock (efeito residual de midia) |
| `adstockTransform(spends, decay)` | Transformacao adstock — modela "memoria" da publicidade |
| `roasDecomposition(mmm_result)` | Decompoe ROAS por canal com contribuicao relativa |

#### `budget-optimizer.ts` — Otimizador de Budget

Alocacao otima de orcamento entre campanhas/canais:

| Funcao | Descricao |
|--------|-----------|
| `optimizeBudget(campaigns, totalBudget)` | Alocacao proporcional ao ROAS ajustado por potencial de escala |
| `diminishingReturnsModel(spend, result)` | Curva de Michaelis-Menten — retornos decrescentes |
| `marginalROAS(spend_series, result_series)` | ROAS marginal em cada ponto da curva de spend |

#### `creative-scorer.ts` — Score de Qualidade de Criativos

Ranking de criativos por performance composta:

| Funcao | Descricao |
|--------|-----------|
| `scoreCreative(ad_metrics)` | Score 0-100: CTR (35%) + CPM eficiencia (25%) + Eng. Rate (20%) + Tendencia (20%) |
| `lifecycleStage(ctr_series)` | Classifica ciclo de vida: Fresh / Aging / Fatigued / Dead |
| `rankCreatives(ads)` | Ranking ordenado com scores, badges e recomendacoes |

#### `insight-engine.ts` — Motor de Insights Automaticos

Gera insights narrativos automaticamente a partir dos dados:

| Funcao | Descricao |
|--------|-----------|
| `generateInsights(kpi, benchmark, alerts)` | Narrativas automaticas: "Seu CTR esta 2.3x abaixo do benchmark de mercado" |
| `prioritizeInsights(insights)` | Ordena insights por impacto potencial no negocio |
| `insightToRecommendation(insight)` | Converte insight em acao especifica recomendada |

#### `incrementality.ts` — Testes de Incrementalidade

Mede o impacto real (incremental) dos anuncios:

| Funcao | Descricao |
|--------|-----------|
| `incrementalityTest(test_group, control_group)` | Differenece-in-differences para medir lift real |
| `syntheticControl(treated, donors)` | Controle sintetico via combinacao de series temporais |
| `measureTrueROAS(spend, conversions, baseline)` | ROAS incremental (descontando conversoes organicas) |

### Intelligence Panel v2 — UI Integrada

22 componentes de UI conectados ao motor estatistico:

| Componente | Modulo | Descricao |
|------------|--------|-----------|
| `Signal_Alerts_Feed` | anomaly-detection | Feed de alertas Z-score em tempo real (WARN/CRIT) |
| `Binary_Verification_Kernels` | bayesian-ab | Painel A/B com Bayesian + Z-test, declaracao de vencedor |
| `Ecosystem_Calibration` | attribution | Benchmark SECTOR_HUB vs HIST_CORE (periodo anterior) |
| `Multivariate_Coherence_Probe` | anomaly-detection | Score SYSTEM_NOMINAL para coherencia de metricas |
| `Creative Performance Ranking` | creative-scorer | Ranking com score 0-100 e lifecycle stage + half-life badge |
| `Ads Forecast Chart` | hw-optimizer | Previsao 7 dias com IC de confianca (Holt-Winters) |
| `Budget Optimizer` | budget-optimizer | Sugestao de realocacao de orcamento por ROAS |
| `Ads Intelligence Panel` | insight-engine | Feed de insights: MAD_ZSCORE + HW_PI + STL_CUSUM |
| `Anomaly Multivariate` | isolation-forest | Mapa de anomalias multivariado por campanha |
| `Ads Efficiency Panel` | advanced-indicators | Curva Michaelis-Menten spend×ROAS + SaturationBar |
| `Ads Demographics Section` | facebook-ads.service | Heatmap age×gender + Golden Segment + Placement table |
| `Ads Account Switcher` | ads-slice | Dropdown multi-conta com historico localStorage |
| `Ads Multi-Account Overview` | ads-slice | Grid spend+ROAS das top-5 contas (Promise.all max 3) |
| `Ads KPI Cards` | statistics | 9 KPIs incluindo Viral Potential Index |
| `Ads Video Metrics` | facebook-ads.service | Retention funnel + ThruPlay + video completion rates |
| `Ads Quality Rankings` | facebook-ads.service | Quality ranking + engagement ranking + conversion ranking |
| `Ads Report Print` | — | Relatorio PDF via window.print() (server-side HTML) |
| `Campaigns Table` | — | Tabela com toggle status, expand AdSets, metricas |
| `Creatives Gallery` | creative-scorer | Galeria visual com score + lifecycle + busca |
| `Ads Charts` | — | Timeline gastos + impressoes + cliques (Recharts) |
| `Ads AI Panel` | ai-adapter | Recomendacoes IA via Gemini |
| `Ads Attribution Section` | attribution | Shapley Values + Markov Chain por canal |

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
| **Agendamento Inteligente** | Sugere datas/horarios otimos: 11:30, 18:00, 20:00 — distribuidos ao longo dos dias |
| **Estrategia Completa** | Relatorio com insights demograficos, melhores formatos, horarios e acoes |
| **Sentimento de Comentarios** | Analise automatica com sugestoes de resposta usando dados reais do negocio |
| **Intencao de Compra** | Detecta comentarios com intencao comercial |
| **Comparacao VS** | Chatbot para explorar diferencas entre perfis |
| **Analise de Ads** | Recomendacoes de otimizacao para campanhas Meta Ads |

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

**Tokens de API**:

| Campo | Descricao |
|-------|-----------|
| Token Meta Graph API | Para dados privados (alcance, saves, shares) |
| Token Facebook Ads | Para gerenciamento de campanhas de anuncios |
| Ad Account ID | ID da conta de anuncios (formato: act_XXXXXXXXX) |

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
| **APIs** | Meta Graph API v25.0, Meta Ads API, Apify, FireCrawl |
| **Automacao** | Playwright (browser automation) |
| **Imagem** | Sharp (composicao, resize, thumbnails) |

### API Routes (45)

| Rota | Funcao |
|------|--------|
| `POST /api/ads-campaigns` | Campanhas + AdSets + insights por campanha |
| `POST /api/ads-insights` | KPIs agregados + insights diarios para graficos |
| `POST /api/ads-creatives` | Ads com criativos (imagens) + insights por ad |
| `POST /api/ads-actions` | Toggle status de campanha (Ativa/Pausada) |
| `POST /api/ads-ai-analysis` | Analise IA de performance de campanhas |
| `POST /api/ads-intelligence` | Metricas de inteligencia (fadiga, saturacao, saude, A/B tests) |
| `POST /api/ads-creative-score` | Score de qualidade de criativos |
| `POST /api/ads-demographics` | Breakdown demográfico age×gender + placement |
| `POST /api/ads-report` | Geração de relatório PDF (HTML + window.print) |
| `POST /api/ads-debug` | Debug de problemas com Meta API |
| `GET /api/meta/adaccounts` | Lista contas de anúncio (multi-account) |
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
| `POST /api/apify/insights` | Insights públicos via scraping |
| `POST /api/image-proxy` | Proxy de imagens externas |
| `POST /api/upload` | Upload de midia |
| `POST /api/import-md` | Importacao de conteudo via Markdown |
| `POST /api/ai-import` | Importacao inteligente via IA |
| `GET /api/instagram-highlights` | Highlights do perfil |
| `POST /api/automation/auth` | Autenticacao de automacao Playwright |
| `POST /api/automation/respond-comments` | Resposta automatica a comentarios |
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
| **Account** | Contas Instagram + info de negocio + tokens Ads (endereco, telefone, horarios como JSON) |
| **Content** | Posts, Stories, Reels, Carrosseis, Campanhas com workflow de 6 status |
| **Collection** | Campanhas/temas com cor, icone e periodo |
| **Competitor** | Perfis concorrentes salvos com metricas |
| **Analytics** | Cache de metricas (Apify + Meta) em JSON. `type='meta'` = dados privados |
| **Setting** | Configuracoes key-value (API keys, preferencias) |
| **MapsBusiness** | Dados Google Maps (reviews, analise IA) |

---

## Estrutura de Pastas

> Para um guia completo de navegacao, veja [`PROJECT-MAP.md`](PROJECT-MAP.md) na raiz do projeto.

```
instagram-dashboard/
│
│── ZONA 1: APLICACAO (o que faz o projeto rodar)
│
├── app/
│   ├── dashboard/                # Paginas do dashboard
│   │   ├── page.tsx              # Home (Central de Comando)
│   │   ├── storyboard/           # Kanban Board
│   │   ├── calendar/             # Calendario
│   │   ├── ads/                  # Meta Ads Manager (4 tabs)
│   │   ├── analytics/            # Analytics (3 abas)
│   │   ├── accounts/             # Gestao de contas
│   │   ├── collections/          # Colecoes/Campanhas
│   │   ├── intelligence/         # Hub de Inteligencia
│   │   └── settings/             # Configuracoes
│   ├── api/                      # 45 API Routes
│   └── actions/                  # 9 Server Actions
├── features/                     # Modulos de funcionalidade
│   ├── ads/components/           # Ads: tabela, graficos, criativos, inteligencia v2
│   ├── analytics/components/     # 30+ componentes de analytics
│   ├── content/components/       # Editor + TagInput
│   ├── storyboard/components/    # Board + Cards draggable
│   ├── calendar/components/      # Month/Week/Day views
│   ├── collections/components/   # List + Form
│   └── accounts/components/      # List + Form com business info
├── lib/
│   ├── services/                   # Servicos de backend
│   │   ├── facebook-ads.service.ts   # Meta Ads API v25.0 (campaigns, insights, creatives, intelligence)
│   │   ├── instagram-graph.service.ts  # Meta Graph API completa
│   │   ├── instagram.service.ts        # Playwright automation
│   │   ├── apify.service.ts            # Scraping Apify
│   │   ├── ai-adapter.ts              # Gemini/OpenRouter adapter
│   │   ├── maps-playwright.service.ts  # Google Maps scraper
│   │   └── scheduler.service.ts        # Fila de publicacao
│   └── utils/                      # Motor estatistico (pure TypeScript — 18 arquivos, 7.728 LOC)
│       ├── statistics.ts             # 2.057 LOC — 34+ funcoes: descritivas, tendencia, engagement, viral index
│       ├── math-core.ts              # Primitivas: normalCDF, bootstrap CI, OLS regression
│       ├── forecasting.ts            # Holt-Winters, CUSUM change-point detection
│       ├── advanced-indicators.ts    # Elasticidade, meia-vida criativa, retornos decrescentes (Michaelis-Menten)
│       ├── bayesian-ab.ts            # Beta-Binomial, Chi², SPRT, Fisher exact test
│       ├── anomaly-detection.ts      # STL decomposition + MAD z-score
│       ├── hw-optimizer.ts           # Holt-Winters autotuning (grid search 729 params)
│       ├── causal-behavioral.ts      # Granger causality, Fogg behavior model, hook rate
│       ├── isolation-forest.ts       # Isolation Forest multivariado
│       ├── attribution.ts            # Shapley Values + Markov Chain
│       ├── mmm.ts                    # Marketing Mix Model + Adstock transform
│       ├── budget-optimizer.ts       # Markowitz-like allocation + diminishing returns
│       ├── creative-scorer.ts        # Score 0-100: CTR(35%) + CPM(25%) + Eng(20%) + Trend(20%)
│       ├── insight-engine.ts         # Binary max-heap, dedup, scoring composto (MAD+HW+CUSUM)
│       ├── incrementality.ts         # ITS, bootstrap diff means, synthetic control
│       ├── sentiment.ts              # Analise de sentimento em portugues
│       ├── request-cache.ts          # Cache TTL + request deduplication
│       └── export-csv.ts             # CSV export com BOM para Excel
├── stores/                       # Zustand (10 slices)
├── components/                   # UI (Shadcn/UI) + Layout + Shared
├── hooks/                        # Custom hooks
├── types/                        # TypeScript interfaces
├── prisma/schema.prisma          # Schema SQLite
├── scripts/                      # Scripts utilitarios (scheduler, publisher)
│
│── ZONA 2: SUPORTE (documentacao e referencia)
│
├── docs/                         # Documentacao completa
│   ├── screenshots/              # 13 capturas de tela do dashboard
│   ├── stories/                  # User stories do projeto
│   ├── research/                 # Analises tecnicas de API
│   ├── design/                   # Referencias visuais
│   └── qa/                       # Relatorios de QA
├── archive/                      # Scripts historicos (referencia, NAO importar)
│   └── scripts-deprecated/       # 73 scripts de desenvolvimento Meta Ads
├── .github/agents/               # Definicoes dos agentes IA
└── PROJECT-MAP.md                # Guia de navegacao do projeto
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

### Meta Ads API (Campanhas)

Para gerenciar campanhas de anuncios:

1. No mesmo App do Meta, adicione o produto "Marketing API"
2. Gere um token com permissoes `ads_read` e `ads_management`
3. Na pagina de **Contas**, preencha:
   - **Token Facebook Ads**: O token gerado
   - **Ad Account ID**: No formato `act_XXXXXXXXX` (encontre em Business Manager > Configuracoes)
4. Acesse a aba **Ads** para ver campanhas, criativos e metricas

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
- [Meta Ads API](https://developers.facebook.com/docs/marketing-apis/) — Campanhas de Anuncios
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
  Next.js 16 &middot; React 19 &middot; TypeScript 5 &middot; Tailwind 4 &middot; Prisma 5 &middot; Google Gemini &middot; Meta Graph API &middot; Meta Ads API
</p>
