# Design System Context — Dashboard OSS v2
> Arquivo de contexto para IAs (Gemini Antigravity, Claude). Leia ANTES de qualquer geração de componente.
> Última atualização: pesquisa de Linear, Vercel, Datadog, Grafana, Segment, Amplitude, Mixpanel integrada.

---

## Stack
- Next.js 15 (App Router), React 19, TypeScript 5 (strict)
- Tailwind CSS v4 — classes utilitárias + inline style para tokens semânticos
- Framer Motion — micro-animações discretas
- Recharts — charts (customizado, não usar defaults)
- Atomic Design: `design-system/atoms/` → `molecules/` → `organisms/`
- Fonte numérica: **JetBrains Mono** (OBRIGATÓRIO em qualquer elemento com número)
- Fonte UI: **Inter** (display/body)

---

## Tokens Semânticos (fonte da verdade — importar de `@/design-system/tokens/colors`)

```typescript
import { semantic } from '@/design-system/tokens/colors'

// BACKGROUNDS (5 níveis de profundidade)
semantic.bg.base      // #000000 — fundo void
semantic.bg.subtle    // #050505 — página principal
semantic.bg.surface   // #0A0A0A — cards em repouso
semantic.bg.elevated  // #141414 — painéis, popups
semantic.bg.overlay   // #1E1E1E — dropdowns, modais

// BORDAS (SEMPRE rgba — nunca hex sólido)
semantic.border.hairline  // rgba(255,255,255,0.04) — divisores
semantic.border.subtle    // rgba(255,255,255,0.08) — cards padrão
semantic.border.default   // rgba(255,255,255,0.12) — interativos
semantic.border.strong    // rgba(255,255,255,0.20) — focus
semantic.border.accent    // rgba(163,230,53,0.25)  — destaque solar

// TEXTO
semantic.text.primary     // #F5F5F5
semantic.text.secondary   // #8A8A8A
semantic.text.muted       // #4A4A4A
semantic.text.disabled    // #3A3A3A

// ACTION (accent único — solar green)
semantic.action.primary        // #A3E635
semantic.action.primaryHover   // #84CC16
semantic.action.primarySubtle  // rgba(163,230,53,0.08)

// STATUS
semantic.status.success        // #10B981
semantic.status.successSubtle  // rgba(16,185,129,0.10)
semantic.status.warning        // #F59E0B
semantic.status.warningSubtle  // rgba(245,158,11,0.10)
semantic.status.error          // #EF4444
semantic.status.errorSubtle    // rgba(239,68,68,0.10)
semantic.status.info           // #3B82F6
semantic.status.infoSubtle     // rgba(59,130,246,0.10)
```

---

## Regras de Código (não negociáveis)

1. `export function ComponentName` — nunca `export default`
2. Bordas: `style={{ borderColor: semantic.border.subtle }}` — **nunca** `border-[#262626]`
3. Font-mono OBRIGATÓRIO em qualquer número: KPI, delta, percentual, ID, timestamp, preço
4. Accent único: `#A3E635` (solar green) — nunca purple, cyan, ou qualquer outro accent
5. Gradiente APENAS em charts e visualizações de dados — nunca em títulos ou texto
6. Sem ícones Lucide decorativos — usar apenas quando semanticamente essencial
7. Focus-visible em todos os elementos interativos, ring `#A3E635`
8. Sem `transition-all` — animar apenas `background-color, color, opacity, transform`

---

## Sistema de Navegação (Sidebar) — regras derivadas de Linear, Vercel, Datadog

### Filosofia
O sidebar não é uma lista de rotas — é a expressão do modelo mental do produto.
Cada seção deve ser nomeada pelo **job to be done** do usuário, não pelo tipo de página.

### Estrutura de grupos para este dashboard
```
[RT]  App Dashboard          ← link de retorno rápido
────────────────────────────
MONITORAR                    ← ALL CAPS, grupo, sem clique
  [01] Overview
  [02] Analytics

ANÚNCIOS                     ← ALL CAPS, grupo
  [03] Campaigns
  [04] Ads
  [05] Intelligence

CONTEÚDO                     ← ALL CAPS, grupo
  [06] Collections
  [07] Storyboard
  [08] Calendar

────────────────────────────
CONFIGURAR                   ← ALL CAPS, grupo
  [09] Accounts
  [10] Settings
```

### Dimensões e estados
```
Largura sidebar:     256px (expandido)
Row height item:     40px (padding: 10px 16px)
Row height grupo:    28px (label de seção)
Separador:           border-top rgba(255,255,255,0.06) + margin 8px vertical
```

### Indicador de item ativo — combinação de 3 sinais (padrão Datadog/Linear)
```
1. border-left: 2px solid #A3E635    (mais forte — localização visual)
2. background: rgba(163,230,53,0.05)  (leve — não "grita")
3. text: #F5F5F5 + font-weight: 500  (contraste de peso)
Hover: apenas background rgba(255,255,255,0.04) + text #D4D4D4
```

### Tipografia no sidebar
```
Itens clicáveis:  Title Case, 14px, font-medium — não ALL CAPS
Labels de grupo:  ALL CAPS, 10px, tracking-[0.15em], color #3A3A3A — nunca clicáveis
Indicadores [XX]: font-mono, 10px, tracking-[0.1em]
```

### Micro-detalhes que separam do template
- Label de grupo NUNCA tem hover/active state — só texto muted
- Separador entre grupos: `border-t` sutil, não um `<hr>` visível
- Footer do sidebar: metadata do sistema em font-mono text-[9px] text-[#2A2A2A]
- Sem ícones nos itens de nav — apenas indicadores `[XX]` + label
- Transição nos estados: `transition: background-color 100ms, color 100ms` — nunca transition-all

---

## Sistema de Charts — regras derivadas de Datadog, Mixpanel, Amplitude, Vercel

### Filosofia
O problema com Recharts/Chart.js não é a lib — é usar os defaults sem opinion.
Charts de produto tratam cada parâmetro visual como decisão de design.

### Linha (Line Chart) — padrões de stroke
```
strokeWidth: 2          — padrão para séries secundárias
strokeWidth: 2.5        — série principal
strokeLinecap: "round"
strokeLinejoin: "round"
type: "monotone"        — suavização estilo Vercel (não linear)
dot: false              — sem dots por padrão; dot={false}
activeDot: { r: 3, strokeWidth: 0, fill: '#A3E635' }
```

### Grid e eixos
```
CartesianGrid:
  strokeDasharray: "0"         — sem tracejado
  stroke: "rgba(255,255,255,0.04)"  — grid quase invisível
  vertical: {false}            — só linhas horizontais

XAxis/YAxis:
  tick: { fill: '#4A4A4A', fontSize: 11, fontFamily: 'JetBrains Mono' }
  axisLine: { stroke: 'rgba(255,255,255,0.06)' }
  tickLine: { stroke: 'none' }
  tickCount: 4 a 5            — poucos ticks, não poluir
```

### Container do chart
```css
padding: 16px 20px 8px 4px   /* respiro interno, label Y à esquerda */
border: none                  /* borda no CARD, não no chart */
background: transparent
```

### Tooltip — profissional (anti-amador)
```tsx
// Conteúdo:
// Linha 1: timestamp/intervalo em font-mono text-[10px] text-[#4A4A4A]
// Linha 2: métrica principal em font-mono font-bold text-[14px] text-[#F5F5F5]
// Linhas extras: 1-2 métricas auxiliares ordenadas por valor

// Visual CSS:
background: '#0A0A0A'
border: '1px solid rgba(255,255,255,0.10)'
borderRadius: '6px'
padding: '8px 10px'
boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
// Tipografia IDÊNTICA ao resto do app (JetBrains Mono para valores, Inter para labels)
// Máximo 3-4 linhas — nunca listar todas as séries de uma vez
// Valores formatados: 1.2k, não 1203; 3.2%, não 3.1978%
```

### Sparkline (mini-chart em cards/tabelas)
```
viewBox: "0 0 80 24"
strokeWidth: 1.5
Sem eixos, sem legendas, sem labels, sem dots
Container: h-6 w-20 (24px × 80px)
Escala Y: CONSISTENTE entre sparklines comparáveis
preserveAspectRatio: "xMidYMid meet"
```

### Cores para séries de dados (paleta do produto)
```
Série principal:   #A3E635 (solar green accent)
Série secundária:  #3B82F6 (blue)
Série terciária:   #8A8A8A (muted gray)
Positivo/sucesso:  #10B981
Negativo/erro:     #EF4444
Referência/média:  rgba(255,255,255,0.20)
```

### Regras anti-genérico
- Sem gradiente de cor no fill de área — usar `rgba(cor, 0.06)` a `rgba(cor, 0.10)` apenas
- Nunca múltiplas cores vibrantes simultâneas — máximo 2 séries coloridas + 1 referência cinza
- Nunca `dot={true}` com stroke pesado — ou `dot={false}` ou dot minimalista
- Legends: embutida no título/label, não floating legend box separada

---

## Layout de Dashboard — padrões derivados de Bloomberg → Google Ads → Meta Ads → Linear → Vercel

### Hero KPI Band (faixa superior obrigatória)
Toda página de dashboard começa com uma faixa horizontal de 4-6 KPI cards.
Padrão de prioridade para dashboard de Meta Ads:
```
[01] Gasto Total    [02] Resultados   [03] Custo/Resultado  [04] ROAS   [05] CTR   [06] CPM
```
Cada card contém:
1. Label (10px, uppercase, muted)
2. Valor atual (font-mono, 2.75rem, primary) — NUNCA gradiente
3. Delta: símbolo ASCII (↑↓—) + percentual + label "vs. 7 dias" (font-mono xs)
4. Sparkline (80×24px, sem eixos) — obrigatório em cards com série temporal

### Grid do dashboard (12 colunas como base)
```
Hero KPI cards:        col-span-2 cada (6 cards em 12 col = linha completa)
Gráfico principal:     col-span-8
Painel lateral:        col-span-4
Tabela full-width:     col-span-12
Card secundário:       col-span-3 ou col-span-4
```

### Segmentação de densidade por módulo (padrão Vercel)
Não usar uma mega-tabela. Dividir em painéis temáticos:
```
[Painel A] Desempenho por Campanha  — tabela compacta + sparkline por linha
[Painel B] Distribuição por Criativo — tabela + badge de status
[Painel C] Top Conteúdos            — lista compacta
```

### Row heights para tabelas
```
28–32px  h-8  → ultra-denso: log de eventos, lista de criativos, campanhas (text-[12px])
36–40px  h-10 → padrão geral desktop (text-[13px]) ← NOVO DEFAULT
44–48px  h-11 → linhas altamente interativas, touch targets (text-[14px])
```
Default para este dashboard: 36px (h-9) com text-[13px] — compromisso Linear/Datadog.

### Spacing e Layout
```
Gap KPI cards:          gap-4 (16px) — denso mas respirável
Gap entre seções:       gap-6 (24px)
Padding card KPI:       p-5 (20px) — não p-6 para manter densidade
Padding card gráfico:   p-6 (24px)
Topbar height:          h-12 (48px) — não 64px
Sidebar width:          256px fixo
```

### Delta indicators — padrão ads dashboard
```tsx
// Combinação obrigatória: cor + símbolo + percentual + label
// Verde/positivo:
<span className="font-mono text-xs text-[#10B981]">↑ +12.4%</span>
<span className="text-[10px] text-[#4A4A4A]">vs. 7 dias</span>

// Vermelho/negativo:
<span className="font-mono text-xs text-[#EF4444]">↓ −3.2%</span>

// Neutro:
<span className="font-mono text-xs text-[#8A8A8A]">—</span>

// NUNCA usar apenas cor sem símbolo (acessibilidade para daltônicos)
```

### Sparkline em KPI cards
```tsx
// ViewBox: "0 0 80 24"
// strokeWidth: 1.5
// Sem eixos, sem legendas, sem labels, sem dots (exceto último ponto)
// Último ponto: dot r=2 fill="#A3E635" para destacar estado atual
// Escala Y: CONSISTENTE entre sparklines comparáveis
// Container: h-6 w-20 (24px × 80px)
// Cor linha: positiva=#10B981, negativa=#EF4444, neutra=#4A4A4A
```

---

## Anatomia de Componente (todos seguem este padrão)

```typescript
interface ComponentProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'solid' | 'outline' | 'ghost'
  size?:    'sm' | 'md' | 'lg'
  intent?:  'default' | 'success' | 'warning' | 'error' | 'info'
  isLoading?: boolean
  disabled?:  boolean
}
```

8 estados obrigatórios: `default` → `hover` → `focus` → `active` → `disabled` → `loading` → `error` → `success`

---

## Componentes Existentes

```
// ATOMS
design-system/atoms/Button/index.tsx        — variant('solid'|'outline'|'ghost'), size, intent, isLoading ✅
design-system/atoms/Badge/index.tsx         — variant('solid'|'outline'|'subtle'), intent, size ✅
design-system/atoms/Input/index.tsx         — label?, hint?, error?, prefix?, suffix?, size('sm'|'md'), isLoading?, isMono? ✅
  → isMono=true: obrigatório para inputs de número, ID, token, data, API key
  → Focus: bottom-line animation #A3E635 (não ring externo)

// MOLECULES
design-system/molecules/KpiCard/index.tsx   — label, value(string), delta?, deltaLabel?, sparkline?, prefix?, isLoading? ✅
design-system/molecules/SectionCard/index.tsx — title?, headerRight?, padding('default'|'compact'|'none') ✅
  → USO OBRIGATÓRIO para todos os painéis/cards de seção no dashboard
  → Elimina o padrão repetido: bg '#0A0A0A' + border 'rgba(255,255,255,0.08)' + borderRadius '8px'
  → Import: import { SectionCard } from '@/design-system/molecules/SectionCard'
design-system/molecules/ChartCard/index.tsx — title, subtitle?, headerRight?, height?(default:200), isLoading? ✅
  → Wrapper para Recharts — usa SectionCard internamente, shimmer loading com gridlines simuladas
  → Import: import { ChartCard } from '@/design-system/molecules/ChartCard'

// ORGANISMS
design-system/organisms/DashboardShell/index.tsx — wraps all dashboard pages, sidebar + topbar ✅
  → Título derivado automaticamente do pathname via NAVIGATION config (sem props externas)

// UTILS / TOKENS
design-system/utils/cn.ts              — cn() para merge de classes
design-system/tokens/colors.ts         — primitive + semantic (dois níveis)
design-system/tokens/typography.ts     — Major Third scale + presets semânticos
design-system/tokens/spacing.ts        — radius, shadow, layout tokens
design-system/tokens/motion.ts         — duration por tipo + spring presets
```

---

## Formato de Resposta

- Retornar apenas blocos `tsx` com o componente completo
- Estrutura: imports → types → component function → sem export default
- Comentários apenas onde a lógica não é óbvia
