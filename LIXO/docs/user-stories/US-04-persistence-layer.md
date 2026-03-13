# US-04 — Camada de Persistência (Repository Pattern)

**Epic:** Epic 2 — Storyboard & Content Management
**Prioridade:** 🔴 Crítica (Bloqueante para US-05, US-06, US-07)
**Estimativa:** 5 pontos
**Depende de:** US-01, US-03

---

## User Story

> **Como** social media manager,
> **Quero** que meus conteúdos sejam persistidos localmente,
> **Para que** meu planejamento não se perca ao fechar o navegador.

---

## Contexto

Esta story implementa a **camada de dados** da aplicação. É uma story técnica crítica que define como todos os dados são salvos, lidos e gerenciados. Deve ser implementada **antes** das features de Storyboard e Editor, pois elas dependem desta camada.

O padrão **Repository Pattern** é mandatório conforme a arquitetura — a interface permite trocar `localStorage` por uma API real no futuro sem tocar nos componentes.

---

## Acceptance Criteria

- [ ] **AC1:** Interface genérica `IRepository<T>` criada em `lib/repository/repository.interface.ts`:
  ```typescript
  interface IRepository<T> {
    findAll(): Promise<T[]>;
    findById(id: string): Promise<T | null>;
    save(entity: T): Promise<T>;
    delete(id: string): Promise<void>;
    deleteAll(): Promise<void>;
  }
  ```
- [ ] **AC2:** Implementação `LocalStorageRepository<T>` em `lib/repository/local-storage.repository.ts` que:
  - Implementa `IRepository<T>`
  - Usa chave parametrizável (`key: string`) para separar coleções no localStorage
  - Serializa/deserializa via `JSON.stringify` / `JSON.parse`
  - Trata `QuotaExceededError` e emite erro amigável
  - Trata localStorage indisponível (SSR safety) com check `typeof window !== 'undefined'`
- [ ] **AC3:** Repositórios concretos instanciados:
  - `contentRepository` — chave: `'ig-dashboard:contents'`
  - `collectionRepository` — chave: `'ig-dashboard:collections'`
  - `accountRepository` — chave: `'ig-dashboard:accounts'`
  - `settingsRepository` — chave: `'ig-dashboard:settings'`
- [ ] **AC4:** Zustand `contentSlice` atualizado com middleware `persist` ou integração manual com repositório:
  - `contents: Content[]`
  - `addContent(data): void`
  - `updateContent(id, data): void`
  - `deleteContent(id): void`
  - `duplicateContent(id): void` (cria novo com mesmo conteúdo + sufixo " (Cópia)")
  - `moveContent(id, newStatus, newOrder): void`
  - `loadContents(): Promise<void>`
- [ ] **AC5:** Geração de IDs únicos com `nanoid` (ID URL-safe de 12 chars)
- [ ] **AC6:** Campos `createdAt` e `updatedAt` gerenciados automaticamente pela camada de repositório
- [ ] **AC7:** Dados carregados automaticamente ao inicializar a aplicação (no `RootProvider` ou `useEffect` na página dashboard)
- [ ] **AC8:** Estrutura preparada para trocar implementação: `lib/repository/index.ts` exporta as instâncias de repositório, facilitando substituição por `APIRepository` no futuro
- [ ] **AC9:** Testes unitários para `LocalStorageRepository`:
  - `save` persiste no localStorage
  - `findAll` retorna todos os itens
  - `findById` retorna item correto
  - `delete` remove item correto
  - `deleteAll` limpa a coleção

---

## Notas Técnicas

### Estrutura de Arquivos
```
lib/
├── repository/
│   ├── repository.interface.ts    # Interface IRepository<T>
│   ├── local-storage.repository.ts # Implementação localStorage
│   └── index.ts                   # Instâncias concretas
```

### Implementação LocalStorageRepository
```typescript
export class LocalStorageRepository<T extends { id: string }> implements IRepository<T> {
  constructor(private readonly key: string) {}

  async findAll(): Promise<T[]> {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(this.key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  }

  async save(entity: T): Promise<T> {
    const all = await this.findAll();
    const idx = all.findIndex(e => e.id === entity.id);
    if (idx >= 0) all[idx] = entity;
    else all.push(entity);
    localStorage.setItem(this.key, JSON.stringify(all));
    return entity;
  }
  // ... etc
}
```

### Integração com Zustand Store
O Zustand store NÃO usa middleware `persist` diretamente — ele chama o repositório como fonte da verdade. Isso mantém a abstração:

```typescript
// stores/content-slice.ts
addContent: (data) => {
  const content = { ...data, id: nanoid(12), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  set(state => ({ contents: [...state.contents, content] }));
  contentRepository.save(content); // async, fire-and-forget com error handling
},
```

---

## Definição de Pronto (DoD)

- [ ] Interface `IRepository<T>` implementada e tipada corretamente
- [ ] `LocalStorageRepository` funciona sem SSR errors
- [ ] Dados de conteúdo persistem ao recarregar a página
- [ ] `duplicateContent` gera novo ID único (nanoid) e sufixo " (Cópia)"
- [ ] Testes unitários passando (`pnpm test`)
- [ ] Sem erros de TypeScript strict mode
