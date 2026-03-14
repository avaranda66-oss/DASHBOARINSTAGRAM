# Regras do Design System v3 — Dashboard OSS
> Carregado automaticamente pelo Antigravity em qualquer sessão neste projeto.
> Última atualização: inteligência de IBM Carbon, GitHub Primer, Radix, Linear, Vercel integrada.

---

## Contexto do Projeto
Dashboard Instagram/Meta Ads com design system próprio nível "equipe grande".
Branch de trabalho: `v2-dashboard`. Nunca toque em `main`.

**REGRA CRÍTICA:** Trabalhe APENAS em `design-system/` e `app/brandbook/`.
Não toque em `components/ui/`, `app/(dashboard)/`, `lib/`, `stores/`.

---

## Fonte de Verdade (leia ANTES de qualquer tarefa)
```
design-system/CONTEXT.md          ← contexto completo para geração
design-system/tokens/colors.ts    ← cores: primitive + semantic (dois níveis)
design-system/tokens/typography.ts← escala Major Third, presets semânticos
design-system/tokens/spacing.ts   ← radius semântico, layout tokens
design-system/tokens/motion.ts    ← durations por tipo, easings, springs
```

---

## Arquitetura de Tokens (CRÍTICO — padrão nível IBM Carbon/GitHub Primer)

### Dois níveis obrigatórios:
```
PRIMITIVO  →  valor bruto (ex: primitive.solar.base = '#A3E635')
SEMÂNTICO  →  intenção de uso (ex: semantic.action.primary = primitive.solar.base)
```

### Regra de uso:
- **Componentes consomem SEMANTIC tokens** — nunca primitive diretamente
- Import: `import { semantic, primitive } from '@/design-system/tokens/colors'`

### Tokens semânticos disponíveis:
```typescript
semantic.bg.base        // #000000 — void
semantic.bg.subtle      // #050505 — página
semantic.bg.surface     // #0A0A0A — cards
semantic.bg.elevated    // #141414 — painéis
semantic.bg.overlay     // #1E1E1E — dropdowns/modais

semantic.border.hairline  // rgba(255,255,255,0.04) — divisores
semantic.border.subtle    // rgba(255,255,255,0.08) — cards
semantic.border.default   // rgba(255,255,255,0.12) — interativos
semantic.border.strong    // rgba(255,255,255,0.20) — focus

semantic.text.primary     // #F5F5F5
semantic.text.secondary   // #8A8A8A
semantic.text.muted       // #4A4A4A

semantic.action.primary         // #A3E635
semantic.action.primaryHover    // #84CC16
semantic.action.primarySubtle   // rgba(163,230,53,0.08)
```

---

## Regras de Código (padrão Linear/Vercel)

### DEVE fazer:
1. `export function ComponentName(props: Props)` — nunca `export default`
2. Importar `semantic` de `@/design-system/tokens/colors` para cores
3. `font-mono` (JetBrains Mono) em QUALQUER elemento com número
4. Bordas sempre com `style={{ borderColor: semantic.border.subtle }}`
5. Focus-visible em todos elementos interativos
6. Estados via `data-state` attribute (padrão Radix):
   ```tsx
   <button data-state={isLoading ? 'loading' : 'idle'} />
   // CSS: [data-state="loading"] { cursor: progress }
   ```
7. Motion tokens importados de `@/design-system/tokens/motion`:
   ```tsx
   import { motionPreset, easing, duration } from '@/design-system/tokens/motion'
   ```

### NÃO fazer (anti-padrões):
- ❌ `border-[#333333]` → usar `style={{ borderColor: semantic.border.subtle }}`
- ❌ `bg-[#1E1E1E]` → usar `style={{ background: semantic.bg.overlay }}`
- ❌ Gradiente em título/hero → gradiente APENAS em charts e KPI numbers
- ❌ Ícones Lucide decorativos → ícones só quando semanticamente essenciais
- ❌ Múltiplos accent colors → usar APENAS `#A3E635` (solar green) como accent
- ❌ Cor hex direta em border → sempre rgba com opacidade
- ❌ `transition-all` → animar apenas `background-color, color, opacity, transform`

---

## Anatomia de Componente (padrão Radix/Geist)

Todo componente atômico deve ter:
```typescript
interface ComponentProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'solid' | 'outline' | 'ghost'    // aparência
  size?:    'sm' | 'md' | 'lg'               // escala
  intent?:  'default' | 'success' | 'warning' | 'error' | 'info'  // semântica
  isLoading?: boolean
  disabled?:  boolean
}
```

**8 estados obrigatórios** (documentar visualmente no brandbook):
`default` → `hover` → `focus` → `active` → `disabled` → `loading` → `error` → `success`

---

## Tipografia (escala Major Third ×1.25)

```
display: 56px  tracking-[-0.04em]  font-black   → hero titles
3xl:     34px  tracking-[-0.03em]  font-bold    → page titles
2xl:     28px  tracking-[-0.02em]  font-semibold→ section titles
xl:      22px  tracking-[-0.02em]  font-semibold→ card titles
lg:      18px  tracking-normal     font-medium  → panel titles
base:    16px  tracking-normal     font-normal  → body
sm:      14px  tracking-normal     font-normal  → body compact (tabelas densas)
xs:      12px  tracking-[0.06em]   font-medium  → labels uppercase
2xs:     11px  tracking-[0.1em]    font-semibold→ badges uppercase
```

**JetBrains Mono** obrigatório em: KPIs, métricas, IDs, timestamps, preços, percentuais.

---

## Motion (durations por tipo)

```
hover:    100ms  easing.standard  → mudança de cor/bg em hover
feedback: 130ms  easing.feedback  → tap, click
entrance: 200ms  easing.standard  → elementos aparecendo
exit:     150ms  easing.exit      → elementos sumindo (mais rápido)
panel:    250ms  easing.standard  → sidebars, painéis
modal:    300ms  easing.inOut     → modais
countUp:  800ms  easing.spring    → KPIs animados
```

Stagger em listas: `delay = index * 40ms` para criar hierarquia sem bordas extras.

---

## Estrutura de Pastas
```
design-system/
├── atoms/          ← componentes puros, sem data-fetching
│   └── Button/index.tsx   ← ✅ existente
├── molecules/      ← composição de átomos apenas
├── organisms/      ← composição de moléculas
├── tokens/         ← NÃO ALTERAR sem instrução explícita
│   ├── colors.ts   ← primitive + semantic (dois níveis)
│   ├── typography.ts
│   ├── spacing.ts
│   ├── motion.ts
│   └── index.ts
└── utils/cn.ts     ← NÃO ALTERAR

app/brandbook/      ← documentação visual do design system
├── layout.tsx
├── page.tsx        ← landing do brandbook
└── foundations/page.tsx
```

---

## Brandbook vs Design System

| | Design System | Brandbook |
|---|---|---|
| **O que é** | Tokens + componentes React | Site de documentação |
| **Onde fica** | `design-system/` | `app/brandbook/` |
| **Quem consome** | App inteiro | Desenvolvedores/designers |
| **Muda o visual?** | Só quando componente usa os tokens | Sim, diretamente |
