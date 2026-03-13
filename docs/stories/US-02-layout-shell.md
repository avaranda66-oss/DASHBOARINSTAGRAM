# US-02 — Layout Shell (Sidebar + Header)

**Epic:** Epic 1 — Foundation & Core Infrastructure
**Prioridade:** 🔴 Crítica (Base de navegação para toda a aplicação)
**Estimativa:** 5 pontos
**Depende de:** US-01

---

## User Story

> **Como** usuário,
> **Quero** ver uma interface com sidebar de navegação e header,
> **Para que** eu possa navegar entre as seções do dashboard.

---

## Contexto

O Layout Shell é o esqueleto visual da aplicação. Ele envolve todas as páginas e fornece navegação consistente. Deve ser implementado como um Server Component no `app/(dashboard)/layout.tsx` com subcomponentes Client onde necessário (toggle de tema, interatividade da sidebar).

O dark mode é o **padrão** da aplicação, com persistência da preferência em `localStorage` via Zustand `uiSlice`.

---

## Acceptance Criteria

- [ ] **AC1:** `AppSidebar` com links de navegação para todas as seções:
  - Dashboard (`/dashboard`) — ícone: `LayoutDashboard`
  - Storyboard (`/storyboard`) — ícone: `Kanban`
  - Calendário (`/calendar`) — ícone: `Calendar`
  - Coleções (`/collections`) — ícone: `FolderOpen`
  - Contas (`/accounts`) — ícone: `Users`
  - Configurações (`/settings`) — ícone: `Settings`
- [ ] **AC2:** Link ativo destacado visualmente (cor de destaque + indicador lateral)
- [ ] **AC3:** Sidebar **colapsável** com ícone toggle (`ChevronLeft`/`ChevronRight`):
  - Modo expandido: ícone + label de texto
  - Modo colapsado: apenas ícone com tooltip ao hover
  - Animação suave com Framer Motion (`layout animation`)
- [ ] **AC4:** `AppHeader` com:
  - Título dinâmico da página atual
  - Toggle de tema dark/light (ícone `Sun`/`Moon`)
  - Avatar placeholder (iniciais ou ícone `UserCircle`)
- [ ] **AC5:** `AppLayout` wrapper combinando sidebar + header + área de conteúdo com scroll
- [ ] **AC6:** **Dark mode como padrão**, toggle funcional com persistência em `localStorage` via `uiSlice` do Zustand
- [ ] **AC7:** Layout **responsivo**:
  - Desktop (1280px+): sidebar lateral fixa
  - Tablet (768px-1279px): sidebar colapsada por padrão
  - Mobile (< 768px): sidebar vira bottom navigation bar ou drawer (Sheet do shadcn/ui)
- [ ] **AC8:** Ícones Lucide em todos os itens de navegação
- [ ] **AC9:** Transições suaves entre estados (collapse/expand, theme toggle) com Framer Motion
- [ ] **AC10:** Zustand `uiSlice` criado com: `sidebarCollapsed: boolean`, `theme: 'dark' | 'light'` e ações `toggleSidebar`, `setTheme`

---

## Notas Técnicas

### Arquivos a Criar/Modificar
```
app/(dashboard)/layout.tsx         # Route group com AppLayout
components/layout/app-layout.tsx   # Wrapper principal
components/layout/app-sidebar.tsx  # Sidebar de navegação
components/layout/app-header.tsx   # Header com title, toggle, avatar
components/layout/theme-toggle.tsx # Botão de toggle de tema
stores/ui-slice.ts                 # Zustand slice para UI state
stores/index.ts                    # Store combinado
hooks/use-theme.ts                 # Hook para tema
hooks/use-media-query.ts           # Hook para breakpoints
```

### Estrutura do uiSlice (Zustand)
```typescript
interface UISlice {
  sidebarCollapsed: boolean;
  theme: 'dark' | 'light';
  toggleSidebar: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}
```

### Padrão de Theme Provider
O tema deve ser aplicado via classe no elemento `<html>` (`class="dark"` ou `class="light"`). Usar `next-themes` ou implementação manual com `useEffect` no lado client.

### Referência Visual
Inspiração: Linear.app sidebar — clean, compacto, ícones precisos, transições fluidas.

---

## Definição de Pronto (DoD)

- [ ] Sidebar funciona em todos os breakpoints
- [ ] Dark/Light mode toggle funciona e persiste ao recarregar
- [ ] Navegação entre todas as rotas funciona (páginas podem ser placeholder por enquanto)
- [ ] Animações de collapse/expand suaves e sem janks
- [ ] Sem erros de TypeScript ou lint
