# US-10 — Coleções e Campanhas

**Epic:** Epic 3 — Calendar & Collections
**Prioridade:** 🟡 Média
**Estimativa:** 5 pontos
**Depende de:** US-04, US-06

---

## User Story

> **Como** social media manager,
> **Quero** organizar conteúdos em coleções temáticas,
> **Para que** eu possa agrupar posts de uma mesma campanha ou tema.

---

## Contexto

Coleções (também chamadas de Campanhas) são agrupamentos temáticos de conteúdos. Exemplos de uso: "Campanha de Páscoa", "Semana de Black Friday", "Série Tutorial de Fotografia". Uma coleção tem cor, ícone e período (datas opcionais).

Um conteúdo pode pertencer a **múltiplas coleções** (relação N:N via array de IDs).

---

## Acceptance Criteria

- [ ] **AC1:** CRUD completo de coleções:
  - **Criar:** Modal com campos: nome*, cor (color picker), ícone (selector de Lucide icons), descrição, data início, data fim
  - **Editar:** Mesmo modal em modo edição
  - **Excluir:** Com dialog de confirmação (não exclui conteúdos vinculados, apenas remove a associação)
- [ ] **AC2:** **Página de listagem** (`/collections`):
  - Cards de coleção com: cor como accent, ícone, nome, descrição, período, contagem de conteúdos vinculados
  - Botão "Nova Coleção" no header
  - Estado vazio com CTA quando sem coleções
- [ ] **AC3:** **Página de detalhe** (`/collections/[id]`):
  - Header com nome, cor, ícone, período da coleção
  - Grid/lista dos conteúdos vinculados (reutiliza `ContentCard` em modo compacto)
  - Botão "Adicionar Conteúdo" que abre seletor de conteúdos existentes
- [ ] **AC4:** **Associação de conteúdos** no `ContentEditorDialog`:
  - Campo "Coleções" no formulário do editor (multi-select ou checkbox list)
  - Badge da coleção visível no `ContentCard` no storyboard
- [ ] **AC5:** **Filtro por coleção** no storyboard e no calendário:
  - Select "Filtrar por Coleção" no header das páginas
  - Quando ativo, exibe apenas conteúdos da coleção selecionada
- [ ] **AC6:** Zustand `collectionSlice`:
  - `collections: Collection[]`
  - `addCollection(data): void`
  - `updateCollection(id, data): void`
  - `deleteCollection(id): void`
  - `loadCollections(): Promise<void>`
- [ ] **AC7:** Persistência de coleções em `localStorage` via `collectionRepository`
- [ ] **AC8:** `collectionIds` em `Content` atualizado ao associar/desassociar coleções

---

## Notas Técnicas

### Arquivos a Criar
```
app/(dashboard)/collections/
├── page.tsx                        # Lista de coleções
└── [id]/
    └── page.tsx                    # Detalhe da coleção
features/collections/
├── components/
│   ├── collection-list.tsx         # Grid de cards de coleção
│   ├── collection-card.tsx         # Card individual de coleção
│   ├── collection-detail.tsx       # Detalhe da coleção com conteúdos
│   └── collection-form-dialog.tsx  # Modal de criação/edição
└── hooks/
    └── use-collections.ts          # Custom hook para CRUD
stores/
└── collection-slice.ts             # collectionSlice
types/
└── collection.ts                   # Type Collection
```

### Type: Collection
```typescript
// types/collection.ts
export interface Collection {
  id: string;
  name: string;
  description: string | null;
  color: string;       // hex, ex: '#E1306C'
  icon: string | null; // nome do ícone Lucide, ex: 'Sparkles'
  startDate: string | null;  // ISO 8601
  endDate: string | null;    // ISO 8601
  createdAt: string;
}
```

### Color Picker
Usar o componente `Input type="color"` como base, ou uma paleta de cores predefinidas com as cores da identidade do projeto:

```typescript
const PRESET_COLORS = [
  '#E1306C', // Instagram Pink
  '#833AB4', // Instagram Purple
  '#F77737', // Instagram Orange
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#EF4444', // Red
];
```

### Icon Selector
Exibir um grid com subset de ícones Lucide relevantes para campanhas:
`Sparkles`, `Star`, `Heart`, `Tag`, `Megaphone`, `Gift`, `Camera`, `Palette`, `Rocket`, `Globe`, `Music`, `ShoppingBag`, `Coffee`, `Sun`, `Leaf`

---

## Definição de Pronto (DoD)

- [ ] CRUD de coleções funciona completamente
- [ ] Página de listagem mostra todas as coleções com contagem de conteúdos
- [ ] Página de detalhe mostra conteúdos vinculados
- [ ] Multi-select de coleções no editor de conteúdo funciona
- [ ] Badge de coleção visível nos cards do storyboard
- [ ] Filtro por coleção funciona no storyboard e calendário
- [ ] Dados persistem no localStorage
- [ ] Sem erros de TypeScript
