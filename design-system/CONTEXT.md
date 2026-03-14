# Design System Context — Instagram Dashboard OSS
> Arquivo de contexto para IAs (Claude, Gemini, GPT). Cole no início de qualquer sessão de geração de componentes.

## Stack
- Next.js 15 (App Router), React 19, TypeScript 5 (strict)
- Tailwind CSS v4 — apenas classes utilitárias no JSX
- Framer Motion — micro-animações discretas
- Atomic Design: `design-system/atoms/` → `molecules/` → `organisms/`
- Fonte numérica: **JetBrains Mono** (OBRIGATÓRIO para todos os números)
- Fonte UI: **Inter** (display/body)

## Identidade Visual
"Bloomberg Terminal se Steve Jobs desenhasse sob efeito de LSD"
- **Base**: preto absoluto + superfícies cinza ultra-escuro (Apple Clean)
- **Dados**: gradientes neon psicodélicos nos gráficos e KPIs
- **Regra de ouro**: tela é preta; os dados brilham

## Tokens Principais

### Cores (usar hex direto — Tailwind v4 com @theme está em WIP)
```
SUPERFÍCIES:    void=#000000  surface1=#0A0A0A  surface2=#141414  surface3=#1E1E1E
BORDAS:         default=#262626  hover=#3A3A3A  focus=#4A4A4A
TEXTO:          primary=#F5F5F5  secondary=#8A8A8A  muted=#4A4A4A
NEON:           purple=#A855F7  blue=#3B82F6  cyan=#06B6D4  pink=#EC4899
                green=#10B981   amber=#F59E0B  red=#EF4444
SEMANTIC:       success=#10B981  warning=#F59E0B  error=#EF4444  info=#3B82F6
```

### Gradientes (APENAS em dados/charts/highlights)
```
cosmos:  135deg → #A855F7 → #EC4899 → #3B82F6
aurora:  135deg → #06B6D4 → #10B981 → #A855F7
sunset:  135deg → #F59E0B → #EF4444 → #EC4899
ocean:   135deg → #3B82F6 → #06B6D4 → #10B981
```

### Glow Effects (box-shadow nos elementos neon)
```
purple: 0 0 20px rgba(168,85,247,0.3)   blue: 0 0 20px rgba(59,130,246,0.3)
green:  0 0 20px rgba(16,185,129,0.3)   pink: 0 0 20px rgba(236,72,153,0.3)
```

### Radius
```
sm=6px (badges/tags)  md=10px (botões/inputs)  lg=14px (cards)  xl=20px (modais)  full=9999px (avatars)
```

### Spacing (base 4px)
```
1=4px  2=8px  3=12px  4=16px  5=20px  6=24px  8=32px  10=40px  12=48px  16=64px
```

### Tipografia
```
NÚMEROS/KPIs:   font-family JetBrains Mono, font-weight bold/semibold, tracking tight
TÍTULOS:        Inter 500-600, tracking tight
LABELS/BADGES:  Inter 500, uppercase, tracking wider (0.05em+)
```

### Animações (Framer Motion presets)
```tsx
fadeIn:      { initial:{opacity:0}, animate:{opacity:1}, transition:{duration:0.3, ease:[0.16,1,0.3,1]} }
fadeInUp:    { initial:{opacity:0,y:12}, animate:{opacity:1,y:0}, transition:{duration:0.35, ease:[0.16,1,0.3,1]} }
fadeInScale: { initial:{opacity:0,scale:0.95}, animate:{opacity:1,scale:1}, transition:{duration:0.3} }
cardHover:   { whileHover:{scale:1.01}, transition:{duration:0.1} }
countUp:     { transition:{duration:0.8, ease:[0.34,1.56,0.64,1]} }
```

## Regras Obrigatórias
1. **NUNCA** usar cores raw (hex/rgb) no JSX — usar className com Tailwind ou `style` com os tokens acima
2. **SEMPRE** usar `font-mono` (JetBrains Mono) em qualquer `<span>` ou elemento que exiba número
3. **Gradientes**: apenas em charts, KPI numbers e highlights — nunca em backgrounds de página
4. **Glow**: apenas em elementos de dados com accent neon — nunca em texto corpo
5. Sem inline styles exceto para `style={{ background: gradients.X }}` ou `boxShadow: glows.X`
6. Componentes puros: sem data-fetching, sem chamadas HTTP, sem lógica de negócio
7. Não importar de `components/ui/` (shadcn v1) — usar apenas `design-system/`
8. Acessibilidade mínima: focus-visible, aria-label em ícones, roles semânticos

## Anti-Padrões (NUNCA fazer)
- `className="text-red-500"` → usar `style={{color: colors.semantic.error}}`
- `bg-[#1E1E1E]` arbitrary values → usar `style={{background: colors.surface[3]}}`
- Animar toda a página com Motion → apenas micro-interações em elementos individuais
- `px-[17px]` arbitrary spacing → usar escala (p-4 = 16px)
- Criar novos tokens sem atualizar `design-system/tokens/`

## Contrato de Tipos (fonte da verdade)

```typescript
// ATOMS
export type Intent = 'default' | 'success' | 'warning' | 'error' | 'info'
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type Variant = 'solid' | 'outline' | 'ghost' | 'subtle'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  intent?: Intent
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export interface BadgeProps {
  label: string
  intent?: Intent
  size?: 'sm' | 'md'
  dot?: boolean
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  glow?: keyof typeof glows  // 'purple'|'blue'|'green'|...
}

// MOLECULES
export interface KpiCardProps {
  label: string
  value: number | string
  valuePrefix?: string   // 'R$', 'US$'
  valueSuffix?: string   // '%', 'K'
  delta?: number         // % variação
  deltaLabel?: string    // 'vs. ontem'
  intent?: Intent
  gradient?: 'cosmos' | 'aurora' | 'sunset' | 'ocean'
  isLoading?: boolean
}
```

## Formato de Resposta da IA
- **Retornar apenas** blocos `tsx` com o componente completo (imports, tipos, export)
- Zero explicações fora do código
- Estrutura do arquivo: imports → types/interface → component function → export
- Sempre exportar como `export function ComponentName(props: Props)`

## Componentes Existentes
- `design-system/utils/cn.ts` — utilitário `cn()` para merge de classes
- `design-system/tokens/colors.ts` — colors, gradients, glows, alpha
- `design-system/tokens/typography.ts` — fontFamily, fontSize, textPreset
- `design-system/tokens/spacing.ts` — spacing, radius, shadow, zIndex
- `design-system/tokens/motion.ts` — motionPreset (fadeIn, fadeInUp, cardHover, countUp)

## Exemplo de Referência (Button — padrão de qualidade esperado)
```tsx
import { motion } from 'framer-motion'
import { cn } from '@/design-system/utils/cn'
import type { ButtonProps } from '@/design-system/atoms/Button/types'

const intentMap = {
  default: 'bg-[#A855F7] text-white hover:bg-[#7C3AED]',
  success: 'bg-[#10B981] text-white hover:bg-[#059669]',
  error:   'bg-[#EF4444] text-white hover:bg-[#DC2626]',
}

export function Button({ variant = 'solid', size = 'md', intent = 'default', isLoading, children, className, ...props }: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7] focus-visible:ring-offset-2 focus-visible:ring-offset-black',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        size === 'sm' && 'h-8 px-3 text-sm rounded-[6px]',
        size === 'md' && 'h-10 px-4 text-sm rounded-[10px]',
        size === 'lg' && 'h-12 px-6 text-base rounded-[10px]',
        variant === 'solid' && intentMap[intent ?? 'default'],
        variant === 'outline' && 'border border-[#3A3A3A] text-[#F5F5F5] hover:border-[#4A4A4A] hover:bg-[#141414]',
        variant === 'ghost' && 'text-[#8A8A8A] hover:text-[#F5F5F5] hover:bg-[#141414]',
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <span className="animate-spin mr-2">⟳</span> : null}
      {children}
    </motion.button>
  )
}
```
