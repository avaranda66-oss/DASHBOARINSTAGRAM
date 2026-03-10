# US-03 — Dashboard Home Page

**Epic:** Epic 1 — Foundation & Core Infrastructure
**Prioridade:** 🟠 Alta
**Estimativa:** 3 pontos
**Depende de:** US-01, US-02

---

## User Story

> **Como** social media manager,
> **Quero** ver um dashboard com métricas resumidas e atalhos,
> **Para que** eu tenha uma visão geral rápida do meu planejamento de conteúdo.

---

## Contexto

A home page do dashboard é a primeira tela que o usuário vê. Ela deve transmitir valor imediato, mostrando o estado do planejamento de conteúdo de forma visual e atrativa. Nesta fase (Epic 1), os dados são **mock (hardcoded)** — a integração com dados reais acontece nas stories de persistência (US-07). O Zustand store deve ser inicializado com dados mock.

Design inspirado em dashboards modernos como Linear e Notion — métricas em cards com gradientes sutis, tipografia clean, micro-animações de entrada.

---

## Acceptance Criteria

- [ ] **AC1:** Cards de métricas com contadores animados (Framer Motion `animate` com `counter` effect):
  - **Total de Conteúdos** (soma de todos os status)
  - **Por Status:** Ideia, Rascunho, Aprovado, Agendado, Publicado (5 cards menores)
  - **Conteúdos desta Semana** (agendados para os próximos 7 dias)
- [ ] **AC2:** Seção **"Próximos Conteúdos"** com lista dos 5 próximos itens agendados:
  - Thumbnail (ou ícone do tipo de conteúdo)
  - Título truncado
  - Tipo de conteúdo (badge colorido: Post, Story, Reel, Carrossel)
  - Data/hora prevista formatada (ex: "Amanhã, 14:00" ou "Seg, 10 Mar")
- [ ] **AC3:** Seção **"Ações Rápidas"** com botões primários:
  - ➕ Novo Conteúdo (abre modal/navega para criação)
  - 📋 Ir ao Storyboard (navega para `/storyboard`)
  - 📅 Ir ao Calendário (navega para `/calendar`)
- [ ] **AC4:** Dados mock hardcoded com pelo menos 8-10 conteúdos fictícios distribuídos entre os status
- [ ] **AC5:** Zustand `contentSlice` inicializado com os dados mock
- [ ] **AC6:** Design visual premium:
  - Cards com gradiente sutil no background (glass effect)
  - Micro-animações de entrada (stagger animation nos cards)
  - Ícones Lucide em todos os elementos
  - Tipografia hierárquica clara (título h1, subtítulos, labels)
- [ ] **AC7:** Layout totalmente responsivo (grid de cards adaptável: 4 colunas desktop → 2 tablet → 1 mobile)
- [ ] **AC8:** Page title no header: "Dashboard"

---

## Notas Técnicas

### Arquivos a Criar/Modificar
```
app/(dashboard)/page.tsx                       # Dashboard home page
stores/content-slice.ts                        # Zustand contentSlice com mock data
types/content.ts                               # TypeScript Content type
lib/constants.ts                               # CONTENT_STATUSES, CONTENT_TYPES
```

### Dados Mock (lib/mock-data.ts)
```typescript
// Exemplo de estrutura
const mockContents: Content[] = [
  {
    id: 'c1',
    title: 'Post de Lançamento do Produto',
    type: 'post',
    status: 'approved',
    scheduledAt: '2026-03-11T14:00:00',
    hashtags: ['#lançamento', '#produto'],
    mediaUrls: [],
    accountId: 'a1',
    collectionIds: [],
    order: 0,
    createdAt: '2026-03-09T00:00:00',
    updatedAt: '2026-03-09T00:00:00',
  },
  // ...mais 7-9 itens
];
```

### Type: Content
```typescript
export type ContentType = 'post' | 'story' | 'reel' | 'carousel';
export type ContentStatus = 'idea' | 'draft' | 'approved' | 'scheduled' | 'published';

export interface Content {
  id: string;
  title: string;
  description: string | null;
  type: ContentType;
  status: ContentStatus;
  scheduledAt: string | null;
  hashtags: string[];
  mediaUrls: string[];
  accountId: string | null;
  collectionIds: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}
```

### Cores dos Badges por Tipo
- Post: azul
- Story: roxo (Instagram purple)
- Reel: rosa (Instagram pink)
- Carrossel: laranja (Instagram orange)

---

## Definição de Pronto (DoD)

- [ ] Dashboard carrega em < 1s com dados mock
- [ ] Todos os cards de métricas exibem corretamente
- [ ] Seção de próximos conteúdos lista os 5 próximos itens ordenados por data
- [ ] Ações rápidas funcionam (navegação correta)
- [ ] Layout responsivo verificado nos breakpoints: 375px, 768px, 1280px
- [ ] Zustand store inicializado e acessível
- [ ] Sem erros de TypeScript
