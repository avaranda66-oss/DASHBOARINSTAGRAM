# US-11 — Gerenciamento de Contas Instagram

**Epic:** Epic 4 — Search, Filters & Data Management
**Prioridade:** 🟡 Média
**Estimativa:** 3 pontos
**Depende de:** US-04, US-06

---

## User Story

> **Como** social media manager,
> **Quero** cadastrar e gerenciar minhas páginas de Instagram,
> **Para que** eu possa associar conteúdos a contas específicas.

---

## Contexto

Esta story vai habilitar o gerenciamento de múltiplos perfis de Instagram. No MVP, as contas são gerenciadas manualmente (sem autenticação OAuth). A estrutura é preparada para futura integração com a Instagram Graph API. As contas ficam disponíveis como opção de filtro no storyboard e calendário, e como campo no editor de conteúdo.

---

## Acceptance Criteria

- [ ] **AC1:** Página de gerenciamento (`/accounts`) com lista de contas cadastradas:
  - Card de conta: avatar (imagem ou iniciais do nome), nome, handle (@), notas, contagem de conteúdos vinculados
  - Botão "Nova Conta" no header
  - Estado vazio com CTA e instrução
- [ ] **AC2:** Modal de criação/edição de conta com campos:
  - **Nome*** — texto (obrigatório)
  - **Handle (@)*** — texto sem espaços (obrigatório, ex: `@minhapagina`)
  - **Avatar URL** — URL da imagem ou upload de arquivo
  - **Notas** — textarea livre
- [ ] **AC3:** Validação com Zod:
  - handle deve iniciar com `@` ou ser automaticamente prefixado
  - nome obrigatório
- [ ] **AC4:** Ação de exclusão de conta:
  - Dialog de confirmação
  - Aviso: "Os conteúdos vinculados a esta conta não serão excluídos, apenas desvinculados."
  - Ao excluir: `accountId` dos conteúdos vinculados setado para `null`
- [ ] **AC5:** **Select de conta no `ContentEditorDialog`** populado com contas cadastradas:
  - Opção "Sem conta" (null)
  - Exibe avatar + handle no select
- [ ] **AC6:** **Filtro por conta** disponível no storyboard e calendário:
  - Select "Filtrar por Conta" no header das páginas
  - Quando ativo, exibe apenas conteúdos da conta selecionada
- [ ] **AC7:** Zustand `accountSlice`:
  - `accounts: Account[]`
  - `addAccount(data): void`
  - `updateAccount(id, data): void`
  - `deleteAccount(id): void`
  - `loadAccounts(): Promise<void>`
- [ ] **AC8:** Persistência em `localStorage` via `accountRepository`
- [ ] **AC9:** Estrutura preparada para futura integração OAuth:
  - Campo `oauthToken?: string | null` no type `Account` (opcional, não exibido no MVP)
  - Arquivo `app/api/auth/instagram/route.ts` como stub com comentário `// TODO: OAuth integration`

---

## Notas Técnicas

### Arquivos a Criar
```
app/(dashboard)/accounts/page.tsx
features/accounts/
├── components/
│   ├── account-list.tsx          # Grid de cards de conta
│   ├── account-card.tsx          # Card individual
│   └── account-form-dialog.tsx   # Modal de criação/edição
└── hooks/
    └── use-accounts.ts           # CRUD hook
stores/
└── account-slice.ts              # accountSlice
types/
└── account.ts                    # Type Account
app/api/auth/instagram/
└── route.ts                      # Stub para OAuth futuro
```

### Type: Account
```typescript
// types/account.ts
export interface Account {
  id: string;
  name: string;
  handle: string;      // ex: '@minhapagina'
  avatarUrl: string | null;
  notes: string | null;
  oauthToken: string | null;  // Future: OAuth token
  createdAt: string;
}
```

### Avatar Fallback
Quando não há imagem, exibir initials como avatar:
```typescript
const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
```

---

## Definição de Pronto (DoD)

- [ ] CRUD de contas funciona completamente
- [ ] Página de listagem mostra todas as contas
- [ ] Select de conta no editor de conteúdo funciona e lista as contas cadastradas
- [ ] Filtro por conta funciona no storyboard e calendário
- [ ] Exclusão de conta desvincula corretamente dos conteúdos
- [ ] Dados persistem no localStorage
- [ ] Stub de OAuth criado com comentário documentado
- [ ] Sem erros de TypeScript
