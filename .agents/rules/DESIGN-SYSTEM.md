# Regras do Design System v2 — Dashboard OSS
> Carregado automaticamente pelo Antigravity em qualquer sessão neste projeto.

## Contexto do Projeto
Este é um dashboard Instagram/Meta Ads com design system próprio sendo construído do zero.
A v1 (produção) está no branch `main`. A v2 (design system novo) está no branch `v2-dashboard`.

**REGRA CRÍTICA:** Você está SEMPRE no branch `v2-dashboard`. Não toque em nada fora de `design-system/`.

## Fonte de Verdade
Antes de qualquer tarefa, leia:
- `@design-system/CONTEXT.md` — tokens, tipos, regras, anti-padrões
- `@design-system/tokens/colors.ts` — paleta completa
- `@design-system/tokens/spacing.ts` — radius, spacing, shadow
- `@design-system/tokens/motion.ts` — presets Framer Motion

## Estrutura de Pastas (onde criar arquivos)
```
design-system/
├── atoms/
│   └── ComponentName/
│       ├── index.tsx      ← componente principal
│       ├── types.ts       ← interfaces TypeScript (se necessário)
│       └── index.test.tsx ← testes (se solicitado)
├── molecules/
│   └── ComponentName/
│       └── index.tsx
├── organisms/
│   └── ComponentName/
│       └── index.tsx
├── tokens/                ← NÃO ALTERAR sem instrução explícita
└── utils/                 ← NÃO ALTERAR
```

## Stack Obrigatória
- React 19 + TypeScript strict (sem `any`)
- Tailwind CSS v4 (classes utilitárias no JSX)
- Framer Motion para micro-animações
- `cn()` de `@/design-system/utils/cn` para merge de classes

## Regras de Geração de Código
1. Exportar como `export function ComponentName(props: Props)` — nunca `export default`
2. Tipos/interfaces em arquivo separado `types.ts` se forem reusados; inline se forem locais
3. JetBrains Mono (`font-mono`) **obrigatório** em qualquer elemento que exiba número
4. Cores via `style={{ color: '#hex' }}` usando os valores de `@design-system/tokens/colors.ts`
5. Radius, spacing e shadow via classes Tailwind (`rounded-[10px]`, `p-4`, etc.)
6. Sem data-fetching, sem chamadas HTTP — componentes puramente visuais
7. Não importar de `components/ui/` (shadcn v1 antigo) — apenas de `design-system/`
8. Framer Motion apenas para micro-interações específicas (hover, entrada, loading)
9. Focus-visible obrigatório em elementos interativos

## Anti-Padrões Proibidos
- `className="text-red-500"` → usar `style={{color:'#EF4444'}}`
- `bg-[#1E1E1E]` → usar `style={{background:'#1E1E1E'}}`
- `px-[17px]` valores arbitrários → usar escala do spacing
- Criar tokens novos sem atualizar `design-system/tokens/`
- Modificar `components/ui/`, `app/`, `lib/`, `stores/` — essas pastas são da v1
