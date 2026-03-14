# Design System — Dashboard OSS v2

> **Status:** Em construcao
> **Branch:** `v2-dashboard`
> **Metodologia:** Atomic Design (Brad Frost)
> **Identidade:** Apple Clean + Psychedelic Math

---

## Identidade Visual

### Personalidade

| Atributo | Definicao |
|----------|-----------|
| **Tipo** | Produto SaaS generico (nao brand-specific) |
| **Tom** | Tech/moderno, matematico, estatistico |
| **Sensacao** | Clean como Apple, psicodelico nos dados |
| **Base** | Preto profundo, minimalismo cirurgico |
| **Accents** | Gradientes neon nos dados e visualizacoes |
| **Metafora** | "Bloomberg Terminal se Steve Jobs desenhasse sob efeito de LSD" |

### Principios de Design

1. **Preto e espaco negativo** — A base e sempre preta. O espaco vazio e intencional.
2. **Dados sao arte** — Graficos, numeros e metricas ganham vida com cor e movimento.
3. **Tipografia matematica** — Fontes monospace para dados, geometric sans para UI.
4. **Gradientes com significado** — Cada gradiente comunica algo (bom/ruim/neutro/tendencia).
5. **Motion com proposito** — Animacoes explicam transicoes de estado, nao decoram.
6. **Contraste extremo** — Informacao importante brilha contra o preto.
7. **Hierarquia implacavel** — Em cada tela, ha UMA coisa que voce ve primeiro.

### Influencias Visuais

- **Apple** — Limpeza, espaco negativo, tipografia precisa
- **Bloomberg Terminal** — Densidade de informacao, dados em tempo real
- **Stripe Dashboard** — Gradientes sofisticados, micro-interacoes
- **Linear App** — Minimalismo dark, transicoes suaves
- **Arte Generativa** — Visualizacoes que parecem obras de arte matematica

---

## Paleta de Cores (Conceito)

### Base (Apple Clean)
```
--void:        #000000   ← Preto absoluto (backgrounds principais)
--surface-1:   #0A0A0A   ← Cards, containers
--surface-2:   #141414   ← Elevacao 2 (modais, dropdowns)
--surface-3:   #1E1E1E   ← Elevacao 3 (hover states)
--border:      #262626   ← Bordas sutis
--border-hover:#3A3A3A   ← Bordas em hover
--text-primary:#F5F5F5   ← Texto principal (quase branco)
--text-secondary:#8A8A8A ← Texto secundario (cinza medio)
--text-muted:  #4A4A4A   ← Texto desabilitado
```

### Accent (Psychedelic Math)
```
--neon-purple:  #A855F7 → #7C3AED   ← Primario (metricas, links ativos)
--neon-blue:    #3B82F6 → #2563EB   ← Informacao, dados em progresso
--neon-cyan:    #06B6D4 → #0891B2   ← Destaque secundario
--neon-pink:    #EC4899 → #DB2777   ← Alertas, destaques urgentes
--neon-green:   #10B981 → #059669   ← Sucesso, tendencia positiva
--neon-amber:   #F59E0B → #D97706   ← Aviso, atencao
--neon-red:     #EF4444 → #DC2626   ← Erro, tendencia negativa
```

### Gradientes (Psicodelicos — para dados e visualizacoes)
```
--gradient-cosmos:  linear-gradient(135deg, #A855F7, #EC4899, #3B82F6)
--gradient-aurora:  linear-gradient(135deg, #06B6D4, #10B981, #A855F7)
--gradient-sunset:  linear-gradient(135deg, #F59E0B, #EF4444, #EC4899)
--gradient-depth:   linear-gradient(180deg, #0A0A0A, #000000)
```

### Glow Effects (para elementos em destaque)
```
--glow-purple: 0 0 20px rgba(168, 85, 247, 0.3)
--glow-blue:   0 0 20px rgba(59, 130, 246, 0.3)
--glow-green:  0 0 20px rgba(16, 185, 129, 0.3)
```

---

## Tipografia

### Fontes
```
--font-display: "SF Pro Display", "Inter", system-ui   ← Titulos, headlines
--font-body:    "Inter", "SF Pro Text", system-ui       ← Corpo de texto
--font-mono:    "JetBrains Mono", "SF Mono", monospace  ← Dados, metricas, numeros
--font-math:    "Computer Modern", "Latin Modern", serif ← Formulas, notacao (opcional)
```

### Escala
```
--text-xs:   0.75rem / 1rem      ← Labels, captions
--text-sm:   0.875rem / 1.25rem  ← Texto secundario
--text-base: 1rem / 1.5rem       ← Corpo padrao
--text-lg:   1.125rem / 1.75rem  ← Subtitulos
--text-xl:   1.25rem / 1.75rem   ← Titulos de secao
--text-2xl:  1.5rem / 2rem       ← Titulos de pagina
--text-3xl:  1.875rem / 2.25rem  ← Headlines
--text-4xl:  2.25rem / 2.5rem    ← Hero numbers (KPIs grandes)
--text-5xl:  3rem / 1            ← Numeros destaque (psicodelicos)
```

### Regra de Uso
- **Numeros e metricas**: SEMPRE em `font-mono` (JetBrains Mono)
- **Titulos e headers**: `font-display` weight 500-600
- **Corpo de texto**: `font-body` weight 400
- **Labels e badges**: `font-body` weight 500, uppercase com letter-spacing

---

## Spacing

### Escala (base 4px)
```
--space-0:  0
--space-1:  4px    (0.25rem)
--space-2:  8px    (0.5rem)
--space-3:  12px   (0.75rem)
--space-4:  16px   (1rem)
--space-5:  20px   (1.25rem)
--space-6:  24px   (1.5rem)
--space-8:  32px   (2rem)
--space-10: 40px   (2.5rem)
--space-12: 48px   (3rem)
--space-16: 64px   (4rem)
--space-20: 80px   (5rem)
```

### Border Radius
```
--radius-none: 0
--radius-sm:   6px    ← Badges, tags
--radius-md:   10px   ← Botoes, inputs
--radius-lg:   14px   ← Cards
--radius-xl:   20px   ← Modais, containers grandes
--radius-full: 9999px ← Avatars, pills
```

---

## Motion

### Duracoes
```
--duration-instant:  100ms  ← Hover, focus
--duration-fast:     200ms  ← Tooltips, dropdowns
--duration-normal:   300ms  ← Modais, drawers
--duration-slow:     500ms  ← Transicoes de pagina
--duration-dramatic: 800ms  ← Numeros animados, graficos entrando
```

### Easings
```
--ease-out:     cubic-bezier(0.16, 1, 0.3, 1)     ← Padrao (elementos aparecendo)
--ease-in-out:  cubic-bezier(0.65, 0, 0.35, 1)    ← Transicoes simetricas
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1) ← Bounce sutil (numeros)
--ease-smooth:  cubic-bezier(0.4, 0, 0.2, 1)      ← Motion suave (graficos)
```

### Regras de Motion
1. **Dados aparecendo**: fade-in + slide-up (duration-normal)
2. **Numeros mudando**: roll/count animation (duration-dramatic)
3. **Graficos desenhando**: stroke animation esquerda→direita (duration-dramatic)
4. **Hover em cards**: scale(1.01) + glow sutil (duration-instant)
5. **Modais**: fade-in + scale de 0.95→1 (duration-normal)

---

## Arquitetura de Componentes (Atomic Design)

### Atoms (os menores blocos)
```
design-system/atoms/
├── Button/          ← Botao com variantes: primary, secondary, ghost, danger
├── Input/           ← Campo de texto com label flutuante
├── Badge/           ← Badges com variantes por status
├── Card/            ← Container base com glassmorphism
├── Text/            ← Componente de texto com escala tipografica
├── Number/          ← Numero animado (substitui NumberFlow)
├── Icon/            ← Wrapper de icones com sizing
├── Skeleton/        ← Loading skeleton com shimmer
├── Divider/         ← Linha divisoria sutil
├── Avatar/          ← Avatar circular com fallback
├── Toggle/          ← Switch on/off
└── Tooltip/         ← Tooltip com arrow
```

### Molecules (combinacoes de atoms)
```
design-system/molecules/
├── KpiCard/         ← Card + Number + Badge + Sparkline
├── FormField/       ← Label + Input + Error message
├── StatRow/         ← Label + Number + Trend indicator
├── NavItem/         ← Icon + Text + Active indicator
├── SearchBar/       ← Input + Icon + Shortcut badge
├── StatusBadge/     ← Badge + Dot indicator + Label
├── ActionButton/    ← Button + Icon + Tooltip
├── DataCell/        ← Number + Trend arrow + Color coding
└── ChartHeader/     ← Title + Period selector + Actions
```

### Organisms (secoes completas)
```
design-system/organisms/
├── Sidebar/         ← Logo + NavItems + Footer
├── Header/          ← Title + SearchBar + Actions
├── DataTable/       ← Headers + Rows + Pagination + Sort
├── KpiGrid/         ← Grid de KpiCards
├── ChartCard/       ← ChartHeader + Chart + Legend
├── FilterPanel/     ← Multiple FormFields + Apply/Reset
├── CommandPalette/  ← SearchBar + Results + Shortcuts
└── Modal/           ← Overlay + Card + Actions
```

---

## Progresso de Migracao

### Fase 1: Foundation (ATUAL)
- [x] Definir identidade visual
- [x] Criar estrutura de pastas
- [x] Documentar tokens (cores, typo, spacing, motion)
- [ ] Implementar tokens em TypeScript
- [ ] Configurar CSS custom properties
- [ ] Escolher e instalar fontes

### Fase 2: Atoms
- [ ] Button
- [ ] Input
- [ ] Badge
- [ ] Card
- [ ] Text
- [ ] Number (animated)
- [ ] Skeleton
- [ ] Avatar
- [ ] Toggle

### Fase 3: Molecules
- [ ] KpiCard
- [ ] FormField
- [ ] StatRow
- [ ] NavItem
- [ ] SearchBar
- [ ] StatusBadge

### Fase 4: Organisms
- [ ] Sidebar
- [ ] Header
- [ ] DataTable
- [ ] KpiGrid
- [ ] ChartCard

### Fase 5: Page Migration
- [ ] Dashboard Home
- [ ] Storyboard
- [ ] Calendar
- [ ] Analytics
- [ ] Ads
- [ ] Accounts
- [ ] Collections
- [ ] Settings
- [ ] Intelligence Hub

---

## Como Trabalhar com Este Design System

### Regra de Ouro
```
NUNCA editar componentes em components/ui/ (shadcn v1)
SEMPRE criar novos em design-system/
Migrar UMA pagina por vez
```

### Import Pattern
```tsx
// ANTES (v1 — shadcn generico)
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

// DEPOIS (v2 — design system proprio)
import { Button } from '@/design-system/atoms/Button'
import { Card } from '@/design-system/atoms/Card'
import { KpiCard } from '@/design-system/molecules/KpiCard'
```

### Alias no tsconfig.json
```json
"paths": {
  "@/*": ["./*"],
  "@ds/*": ["./design-system/*"]
}
```

Permite imports limpos:
```tsx
import { Button } from '@ds/atoms/Button'
import { tokens } from '@ds/tokens'
```

---

## Para Sessoes Futuras

Quando abrir um novo chat para trabalhar no design system:
1. Leia este arquivo: `design-system/DESIGN-SYSTEM.md`
2. Verifique o progresso na secao "Progresso de Migracao"
3. Confirme que esta na branch `v2-dashboard`
4. Continue de onde parou

---

*Criado por Uma (@ux-design-expert) — 2026-03-13*
