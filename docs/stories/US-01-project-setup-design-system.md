# US-01 — Project Setup & Design System

**Epic:** Epic 1 — Foundation & Core Infrastructure
**Prioridade:** 🔴 Crítica (Bloqueante para todas as outras stories)
**Estimativa:** 3 pontos

---

## User Story

> **Como** desenvolvedor,
> **Quero** ter o projeto Next.js configurado com Tailwind CSS e shadcn/ui,
> **Para que** toda a equipe tenha uma base consistente para desenvolvimento.

---

## Contexto

Esta é a story fundacional do projeto. Nenhuma outra funcionalidade pode ser desenvolvida sem ela. Ao final desta story, teremos um projeto funcional com toda a infraestrutura de dependências, linting, formatação e design system base configurados.

**Stack obrigatório:** Next.js 15 (App Router), Tailwind CSS v4, shadcn/ui, TypeScript 5.x strict mode, pnpm como package manager.

---

## Acceptance Criteria

- [ ] **AC1:** Projeto Next.js 15 criado com `create-next-app`, usando App Router e TypeScript strict mode (`"strict": true` em `tsconfig.json`)
- [ ] **AC2:** Tailwind CSS v4 configurado e funcional (arquivo `tailwind.config.ts` + `globals.css` com diretivas)
- [ ] **AC3:** shadcn/ui inicializado com os seguintes componentes base instalados: `Button`, `Card`, `Input`, `Dialog`, `DropdownMenu`, `Select`, `Badge`, `Sheet`, `Command`, `Sonner` (toast)
- [ ] **AC4:** ESLint 9.x configurado com config padrão do Next.js
- [ ] **AC5:** Prettier 3.x configurado com arquivo `.prettierrc`
- [ ] **AC6:** Estrutura de pastas criada conforme arquitetura:
  ```
  app/, components/ui/, components/layout/, components/shared/,
  features/, stores/, lib/repository/, types/, hooks/, public/
  ```
- [ ] **AC7:** Tema customizado definido em variáveis CSS (`globals.css`) com paleta de cores do projeto:
  - Gradiente Instagram (rosa `#E1306C` → roxo `#833AB4` → laranja `#F77737`) como acentos
  - Base em neutros escuros para dark mode padrão
- [ ] **AC8:** Google Font "Inter" configurada via `next/font/google` no `app/layout.tsx`
- [ ] **AC9:** Dependências adicionais instaladas: `zustand`, `@dnd-kit/core`, `@dnd-kit/sortable`, `framer-motion`, `react-hook-form`, `zod`, `date-fns`, `nanoid`, `lucide-react`
- [ ] **AC10:** `pnpm dev` roda sem erros em `localhost:3000`
- [ ] **AC11:** `pnpm build` completa sem erros de TypeScript ou lint
- [ ] **AC12:** Arquivo `lib/utils.ts` criado com helper `cn()` (clsx + tailwind-merge)
- [ ] **AC13:** Arquivo `lib/constants.ts` criado com constantes base: `CONTENT_STATUSES`, `CONTENT_TYPES`

---

## Notas Técnicas

### Estrutura de Pastas Esperada
```
dashboard-instagram/
├── app/
│   ├── layout.tsx          # Root layout com font, providers
│   ├── page.tsx            # Redirect → /dashboard
│   └── globals.css         # Tailwind + CSS vars
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── layout/             # AppSidebar, AppHeader, AppLayout
│   └── shared/             # Componentes reusáveis
├── features/               # Módulos por feature
├── stores/                 # Zustand stores
├── lib/
│   ├── repository/         # Camada de persistência
│   ├── utils.ts
│   └── constants.ts
├── types/                  # TypeScript types
└── hooks/                  # Custom hooks globais
```

### Comandos de Setup
```bash
pnpm create next-app@latest dashboard-instagram --typescript --tailwind --app --src-dir=false
cd dashboard-instagram
pnpm dlx shadcn@latest init
pnpm add zustand @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities framer-motion react-hook-form zod date-fns nanoid
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react
```

### Variáveis CSS do Tema (globals.css)
```css
:root {
  --instagram-pink: #E1306C;
  --instagram-purple: #833AB4;
  --instagram-orange: #F77737;
  --instagram-gradient: linear-gradient(45deg, #F77737, #E1306C, #833AB4);
}
```

---

## Definição de Pronto (DoD)

- [ ] Código no repositório Git com commit inicial estruturado
- [ ] `pnpm dev` funciona sem erros
- [ ] `pnpm build` passa sem erros
- [ ] ESLint e Prettier configurados e sem violações
- [ ] README.md atualizado com instruções de setup
