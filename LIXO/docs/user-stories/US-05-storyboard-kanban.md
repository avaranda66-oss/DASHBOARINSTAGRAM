# US-05 — Storyboard Kanban Board

**Epic:** Epic 2 — Storyboard & Content Management
**Prioridade:** 🔴 Crítica (Feature principal do produto)
**Estimativa:** 8 pontos
**Depende de:** US-01, US-02, US-04

---

## User Story

> **Como** social media manager,
> **Quero** visualizar meus conteúdos em um board Kanban organizado por status,
> **Para que** eu possa ver claramente o pipeline de produção de conteúdo.

---

## Contexto

O Storyboard é o **coração do produto** — a tela que o usuário usará mais frequentemente. Similar ao quadro Kanban do Trello ou Jira, mas com visual premium e foco em conteúdo de Instagram. O board exibe 5 colunas fixas representando o pipeline de produção.

Esta story implementa a estrutura visual estática do board. A interatividade de drag-and-drop é implementada na US-06.

---

## Acceptance Criteria

- [ ] **AC1:** Board com **5 colunas fixas** na ordem:
  1. **Ideia** (`idea`) — cor: cinza/azul slate
  2. **Rascunho** (`draft`) — cor: amarelo âmbar
  3. **Aprovado** (`approved`) — cor: verde esmeralda
  4. **Agendado** (`scheduled`) — cor: azul index
  5. **Publicado** (`published`) — cor: roxo violeta
- [ ] **AC2:** Cada coluna exibe:
  - Header com nome da coluna + ícone Lucide representativo
  - **Contador de cards** (badge com número)
  - Botão "+" para adicionar card àquela coluna
  - Área de drop zone (droppable)
- [ ] **AC3:** Cada `ContentCard` exibe:
  - Thumbnail/preview (imagem se existir, ou ícone do tipo de conteúdo)
  - Título (máx 2 linhas, truncado)
  - **Badge de tipo** (Post/Story/Reel/Carrossel) com cor e ícone
  - Data/hora prevista formatada (ex: "10 Mar, 14:00")
  - Indicador de conta Instagram (avatar ou handle)
  - Ícone de arrastar (drag handle) visível ao hover
- [ ] **AC4:** Layout **horizontal com scroll horizontal** quando colunas excedem a viewport (não quebra em linha)
- [ ] **AC5:** Colunas com **scroll vertical independente** quando há muitos cards
- [ ] **AC6:** Cards carregados do Zustand `contentSlice` (filtrados por status)
- [ ] **AC7:** Coluna vazia exibe estado vazio com ícone e CTA para adicionar conteúdo
- [ ] **AC8:** Visual premium: glassmorphism sutil nos cards, sombra ao hover, bordas arredondadas, transições suaves
- [ ] **AC9:** Page title no header: "Storyboard"
- [ ] **AC10:** Botão FAB (Floating Action Button) no canto inferior direito para criar novo conteúdo

---

## Notas Técnicas

### Arquivos a Criar
```
app/(dashboard)/storyboard/page.tsx
features/storyboard/components/
├── board.tsx                  # Componente principal do board
├── board-column.tsx           # Coluna individual
├── content-card.tsx           # Card de conteúdo
└── board-empty-state.tsx      # Estado vazio de uma coluna
```

### Constantes do Board
```typescript
// lib/constants.ts
export const BOARD_COLUMNS = [
  { id: 'idea',      label: 'Ideia',     icon: 'Lightbulb',  color: 'slate'   },
  { id: 'draft',     label: 'Rascunho',  icon: 'FileText',   color: 'amber'   },
  { id: 'approved',  label: 'Aprovado',  icon: 'CheckCircle',color: 'emerald' },
  { id: 'scheduled', label: 'Agendado',  icon: 'Clock',      color: 'blue'    },
  { id: 'published', label: 'Publicado', icon: 'Send',       color: 'violet'  },
] as const;
```

### Estrutura do Board Component
```tsx
// features/storyboard/components/board.tsx
'use client';
export const Board = () => {
  const contents = useContentStore(s => s.contents);
  
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full">
      {BOARD_COLUMNS.map(column => (
        <BoardColumn
          key={column.id}
          column={column}
          cards={contents.filter(c => c.status === column.id)}
        />
      ))}
    </div>
  );
};
```

### ContentCard — Mapeamento de Ícones por Tipo
```typescript
const TYPE_ICONS = {
  post: 'Image',
  story: 'Layers',
  reel: 'Film',
  carousel: 'LayoutGrid',
};
```

---

## Definição de Pronto (DoD)

- [ ] Board renderiza todas as 5 colunas corretamente
- [ ] Cards exibem informações corretas do store
- [ ] Scroll horizontal funciona quando há muitas colunas
- [ ] Scroll vertical por coluna funciona com muitos cards
- [ ] Estado vazio visual nas colunas sem cards
- [ ] FAB e botão "+" nas colunas visíveis e funcionais (abrirão modal na US-06)
- [ ] Layout responsivo verificado
- [ ] Sem erros de TypeScript
