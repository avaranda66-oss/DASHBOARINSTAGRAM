# US-07 — Drag-and-Drop & Reordenação de Cards

**Epic:** Epic 2 — Storyboard & Content Management
**Prioridade:** 🔴 Crítica (Experience diferencial do produto)
**Estimativa:** 8 pontos
**Depende de:** US-05, US-06

---

## User Story

> **Como** social media manager,
> **Quero** arrastar cards entre colunas e reordenar dentro de uma coluna,
> **Para que** eu possa atualizar o status do conteúdo de forma visual e intuitiva.

---

## Contexto

O drag-and-drop é o **diferencial de experiência** do Storyboard. Deve ser fluido, responsivo e com feedback visual rico. Implementado com `@dnd-kit/core` — a biblioteca escolhida pela arquitetura por ser acessível, performática e tree-shakeable.

A atualização de status ao mover cards entre colunas deve acontecer de forma **otimista** (UI atualiza imediatamente, persistência acontece em background). O rollback ocorre apenas em caso de erro de persistência.

---

## Acceptance Criteria

- [ ] **AC1:** Drag-and-drop funcional entre colunas usando `@dnd-kit/core` + `@dnd-kit/sortable`:
  - Card pode ser arrastado de qualquer coluna para qualquer outra
  - Status do card é atualizado automaticamente ao soltar na nova coluna
- [ ] **AC2:** Reordenação dentro da mesma coluna preserva a ordem dos cards
- [ ] **AC3:** Feedback visual durante o arraste:
  - **Drag overlay:** Card "fantasma" semi-transparente seguindo o cursor
  - **Drop placeholder:** Espaço vazio na posição de destino
  - **Elevation:** Card original fica com opacidade reduzida durante arraste
  - **Cursor:** muda para `grabbing` durante arraste
- [ ] **AC4:** Atualização **otimista** do estado:
  - UI re-renderiza imediatamente ao soltar o card
  - Persistência no `localStorage` acontece em background via repositório
  - Em caso de erro de persistência: rollback do estado + toast de erro
- [ ] **AC5:** Campo `order` atualizado em todos os cards afetados após reordenação
- [ ] **AC6:** Animações suaves de entrada/saída dos cards no novo slot (Framer Motion `layout` animation)
- [ ] **AC7:** Drag handle visível no hover do card (ícone `GripVertical`)
- [ ] **AC8:** Funciona corretamente em mobile (touch events suportados pelo @dnd-kit)
- [ ] **AC9:** Cards drop fora de uma coluna válida retornam à posição original (cancelamento gracioso)
- [ ] **AC10:** Acessibilidade: suporte a drag-and-drop via teclado (seta para mover card entre colunas, espaço para pegar/soltar)

---

## Notas Técnicas

### Arquivos a Criar/Modificar
```
features/storyboard/components/
├── board.tsx                      # DndContext wrapper
├── board-column.tsx               # Droppable + SortableContext
├── content-card.tsx               # useSortable hook
└── dnd-provider.tsx               # DnDKit DndContext config
features/storyboard/hooks/
└── use-board-dnd.ts               # Lógica central de DnD (onDragStart, onDragEnd)
```

### Setup @dnd-kit
```typescript
// features/storyboard/components/board.tsx
import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

// Sensores para mouse + touch + teclado
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);
```

### Hook useBoardDnd
```typescript
// features/storyboard/hooks/use-board-dnd.ts
export const useBoardDnd = () => {
  const { moveContent } = useContentStore();
  const [activeCard, setActiveCard] = useState<Content | null>(null);

  const onDragStart = (event: DragStartEvent) => {
    setActiveCard(event.active.data.current?.card);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    const newStatus = over.data.current?.column as ContentStatus;
    const newOrder = over.data.current?.sortable?.index ?? 0;
    
    moveContent(active.id as string, newStatus, newOrder); // optimistic
    setActiveCard(null);
  };

  return { activeCard, onDragStart, onDragEnd };
};
```

### Algoritmo de Reordenação (moveContent no contentSlice)
```typescript
moveContent: (id, newStatus, newOrder) => {
  set(state => {
    const contents = [...state.contents];
    const cardIdx = contents.findIndex(c => c.id === id);
    if (cardIdx === -1) return state;
    
    const card = { ...contents[cardIdx], status: newStatus, updatedAt: new Date().toISOString() };
    
    // Remove da posição atual, insere na nova
    contents.splice(cardIdx, 1);
    // Reordenar por coluna e inserir na posição correta
    // ...
    
    return { contents };
  });
  
  // Persist em background
  contentRepository.save(updatedCard).catch(err => {
    console.error('[ContentStore] MOVE: Failed to persist', err);
    // Rollback: re-fetch do localStorage
  });
}
```

---

## Definição de Pronto (DoD)

- [ ] Drag entre colunas atualiza status corretamente
- [ ] Reordenação dentro de coluna mantém ordem após reload
- [ ] Drag overlay exibe card clone semi-transparente
- [ ] Placeholder visual no slot de destino durante arraste
- [ ] Funciona em touch (mobile)
- [ ] Suporte a teclado (acessibilidade básica)
- [ ] Sem erros no console durante operações de DnD
- [ ] Estado persiste após recarregar a página
