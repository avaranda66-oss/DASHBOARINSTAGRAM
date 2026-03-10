# US-13 — Command Palette (Ctrl+K)

**Epic:** Epic 4 — Search, Filters & Data Management
**Prioridade:** 🟢 Baixa (Feature de produtividade para power users)
**Estimativa:** 3 pontos
**Depende de:** US-02, US-06

---

## User Story

> **Como** power user,
> **Quero** um command palette acionado por Ctrl+K,
> **Para que** eu possa navegar e executar ações rapidamente via teclado.

---

## Contexto

O Command Palette é uma feature de produtividade que permite ao usuário executar qualquer ação da aplicação sem tirar as mãos do teclado. É acionado por `Ctrl+K` (ou `Cmd+K` no Mac) e funciona como uma busca fuzzy sobre todas as ações disponíveis.

Implementado com o componente `Command` do shadcn/ui (que usa `cmdk` internamente).

---

## Acceptance Criteria

- [ ] **AC1:** Atalho de teclado `Ctrl+K` (Windows/Linux) e `Cmd+K` (Mac) abre/fecha o command palette via `useKeyboardShortcut` hook
- [ ] **AC2:** Modal com Input de busca fuzzy que filtra a lista de ações em tempo real
- [ ] **AC3:** **Grupos de ações** com separadores visuais:
  - **Navegação:** Dashboard, Storyboard, Calendário, Coleções, Contas, Configurações
  - **Ações:** Criar Novo Conteúdo, Nova Coleção, Nova Conta
  - **Preferências:** Alternar Tema (Dark/Light)
  - **Conteúdos Recentes:** Últimos 5 conteúdos criados (busca dinâmica)
- [ ] **AC4:** Cada item exibe:
  - Ícone Lucide relevante
  - Label da ação
  - Atalho de teclado (quando disponível, ex: "⌘K" para abrir)
- [ ] **AC5:** Navegação por teclado:
  - `↑` / `↓` para navegar entre itens
  - `Enter` para executar a ação selecionada
  - `Esc` para fechar
- [ ] **AC6:** Fechar ao clicar fora do modal (overlay)
- [ ] **AC7:** `CommandPalette` montado no layout raiz (sempre disponível, independente da página)
- [ ] **AC8:** Estado de abertura gerenciado no `uiSlice` do Zustand (`commandPaletteOpen: boolean`)

---

## Notas Técnicas

### Arquivos a Criar/Modificar
```
components/shared/command-palette.tsx    # Componente principal
hooks/use-keyboard-shortcut.ts           # Hook para atalhos de teclado
stores/ui-slice.ts                       # Adicionar commandPaletteOpen
```

### Hook useKeyboardShortcut
```typescript
// hooks/use-keyboard-shortcut.ts
export const useKeyboardShortcut = (
  key: string,
  callback: () => void,
  modifiers: { ctrl?: boolean; meta?: boolean; shift?: boolean } = {}
) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        (!modifiers.ctrl || e.ctrlKey) &&
        (!modifiers.meta || e.metaKey) &&
        (!modifiers.shift || e.shiftKey)
      ) {
        e.preventDefault();
        callback();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [key, callback, modifiers]);
};
```

### Uso com shadcn/ui Command
```tsx
// components/shared/command-palette.tsx
import { Command, CommandDialog, CommandInput, CommandList, CommandGroup, CommandItem } from '@/components/ui/command';

export const CommandPalette = () => {
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const router = useRouter();

  useKeyboardShortcut('k', () => setCommandPaletteOpen(true), { ctrl: true, meta: true });

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput placeholder="Buscar ações..." />
      <CommandList>
        <CommandGroup heading="Navegação">
          <CommandItem onSelect={() => { router.push('/dashboard'); setCommandPaletteOpen(false); }}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          {/* ...outros itens */}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
```

---

## Definição de Pronto (DoD)

- [ ] `Ctrl+K` / `Cmd+K` abre o command palette
- [ ] Busca fuzzy filtra ações em tempo real
- [ ] Todos os grupos de ações (Navegação, Ações, Preferências) estão funcionais
- [ ] Navegação por teclado (↑↓ Enter Esc) funciona
- [ ] Executar ação de navegação redireciona para a rota correta
- [ ] "Criar Novo Conteúdo" abre o editor modal
- [ ] "Alternar Tema" muda o tema da aplicação
- [ ] Fechamento por Esc e clique no overlay funciona
- [ ] Sem erros de TypeScript
