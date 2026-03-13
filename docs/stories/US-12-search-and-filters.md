# US-12 — Busca Global e Filtros Avançados

**Epic:** Epic 4 — Search, Filters & Data Management
**Prioridade:** 🟡 Média
**Estimativa:** 5 pontos
**Depende de:** US-05, US-08, US-10, US-11

---

## User Story

> **Como** social media manager,
> **Quero** buscar e filtrar conteúdos por diversos critérios,
> **Para que** eu encontre rapidamente o que preciso em um volume grande de conteúdos.

---

## Contexto

Com o crescimento do volume de conteúdos (dezenas ou centenas de cards), a busca e filtragem se tornam essenciais. Os filtros devem se aplicar de forma consistente no storyboard e no calendário, mantendo o contexto enquanto o usuário navega entre as views.

---

## Acceptance Criteria

- [ ] **AC1:** **Barra de busca** no `AppHeader`:
  - Busca em tempo real em `title` e `description` dos conteúdos
  - Debounce de 300ms para evitar re-renders excessivos
  - Ícone de lupa (`Search`) e botão de limpar (`X`)
  - Placeholder: "Buscar conteúdos..."
- [ ] **AC2:** **Painel de filtros** no storyboard e calendário (aberto via botão `Filter`):
  - **Tipo de Conteúdo:** Checkboxes (Post, Story, Reel, Carrossel)
  - **Status:** Checkboxes (Ideia, Rascunho, Aprovado, Agendado, Publicado)
  - **Conta:** Select da conta Instagram
  - **Coleção:** Select da coleção
  - **Data:** Range de datas (data início e data fim)
  - **Hashtag:** Input de texto para busca por hashtag específica
- [ ] **AC3:** Filtros **aplicados simultaneamente** (AND logic — conteúdo deve satisfazer todos os filtros ativos)
- [ ] **AC4:** **Indicação visual de filtros ativos:**
  - Badge com número de filtros ativos no botão `Filter`
  - Chips de filtros ativos exibidos acima do board/calendário com opção de remover individualmente
  - Botão "Limpar filtros" quando há filtros ativos
- [ ] **AC5:** Resultados **atualizados em tempo real** (sem botão "Aplicar")
- [ ] **AC6:** Filtros **persistidos no `uiSlice`** do Zustand durante a sessão (não em localStorage — reset ao recarregar)
- [ ] **AC7:** Zustand `uiSlice` atualizado com:
  ```typescript
  filters: {
    search: string;
    types: ContentType[];
    statuses: ContentStatus[];
    accountId: string | null;
    collectionId: string | null;
    dateRange: { start: string | null; end: string | null };
    hashtag: string;
  }
  setFilter: (key, value) => void;
  clearFilters: () => void;
  ```
- [ ] **AC8:** Hook `useFilteredContents()` que retorna conteúdos filtrados combinando todos os critérios ativos:
  ```typescript
  export const useFilteredContents = () => {
    const { contents } = useContentStore();
    const { filters } = useUIStore();
    return useMemo(() => applyFilters(contents, filters), [contents, filters]);
  };
  ```

---

## Notas Técnicas

### Arquivos a Criar/Modificar
```
stores/ui-slice.ts                      # Adicionar filters state
hooks/use-filtered-contents.ts          # Hook de filtragem
components/shared/
├── search-bar.tsx                      # Barra de busca no header
├── filter-panel.tsx                    # Painel lateral de filtros
└── active-filters-bar.tsx              # Chips de filtros ativos
```

### Função de Filtragem
```typescript
// lib/utils/filter-contents.ts
export const applyFilters = (contents: Content[], filters: Filters): Content[] => {
  return contents.filter(c => {
    // Busca textual
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matches = c.title.toLowerCase().includes(q) ||
                      c.description?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    // Tipo
    if (filters.types.length > 0 && !filters.types.includes(c.type)) return false;
    // Status
    if (filters.statuses.length > 0 && !filters.statuses.includes(c.status)) return false;
    // Conta
    if (filters.accountId && c.accountId !== filters.accountId) return false;
    // Coleção
    if (filters.collectionId && !c.collectionIds.includes(filters.collectionId)) return false;
    // Hashtag
    if (filters.hashtag && !c.hashtags.some(h => h.includes(filters.hashtag))) return false;
    // Data range
    // ...
    return true;
  });
};
```

---

## Definição de Pronto (DoD)

- [ ] Busca por título e descrição funciona em tempo real com debounce
- [ ] Todos os filtros funcionam corretamente
- [ ] Filtros se aplicam no storyboard E no calendário simultaneamente
- [ ] Chips de filtros ativos removíveis exibidos
- [ ] Badge de contagem de filtros ativos no botão Filter
- [ ] Botão "Limpar filtros" visível quando há filtros ativos
- [ ] Sem erros de TypeScript
