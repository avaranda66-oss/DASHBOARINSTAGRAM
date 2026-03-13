# US-06 — Editor de Conteúdo (Modal de Criação e Edição)

**Epic:** Epic 2 — Storyboard & Content Management
**Prioridade:** 🔴 Crítica
**Estimativa:** 8 pontos
**Depende de:** US-04, US-05

---

## User Story

> **Como** social media manager,
> **Quero** criar e editar conteúdos em um modal detalhado,
> **Para que** eu possa preencher todas as informações do post.

---

## Contexto

O Editor de Conteúdo é o modal/sheet que permite criar e editar todos os detalhes de um conteúdo. É acessado de múltiplos pontos: botão "+" nas colunas do board, FAB, clique em um card existente, clique em um dia no calendário, e via command palette.

Usa **React Hook Form + Zod** para validação rigorosa. O upload de mídia armazena a imagem como base64 no MVP (sem servidor externo).

---

## Acceptance Criteria

- [ ] **AC1:** Modal/Sheet (`Dialog` ou `Sheet` do shadcn/ui) com formulário completo:
  - **Título*** — Input de texto (obrigatório, máx 100 chars)
  - **Descrição/Legenda** — Textarea (opcional, máx 2200 chars — limite Instagram)
  - **Tipo de Conteúdo*** — Select: Post, Story, Reel, Carrossel (obrigatório)
  - **Status*** — Select: Ideia, Rascunho, Aprovado, Agendado, Publicado (obrigatório)
  - **Data/Hora Prevista** — Date picker + time input (opcional)
  - **Conta Instagram** — Select populado com contas cadastradas (opcional)
  - **Hashtags** — Tag input com chips (opcional, máx 30 tags)
  - **Mídia** — Upload de imagem com preview
- [ ] **AC2:** Validação com **React Hook Form + Zod**:
  - Erros inline exibidos abaixo de cada campo
  - Schema Zod em `features/content/schemas/content.schema.ts`
  - Botão "Salvar" desabilitado enquanto form inválido
- [ ] **AC3:** **Upload de imagem** com preview:
  - Input file aceita: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
  - Preview da imagem após seleção
  - Armazenamento como base64 string em `mediaUrls` no MVP
  - Botão para remover imagem
- [ ] **AC4:** **TagInput** para hashtags:
  - Adicionar tag ao pressionar Enter ou vírgula
  - Remover tag com clique no "×" ou Backspace
  - Limite de 30 hashtags (com contador visual)
  - Auto-adiciona "#" caso não seja prefixado
- [ ] **AC5:** **Dois modos:**
  - **Criação:** Form vazio, na coluna do status correspondente (status pré-selecionado)
  - **Edição:** Form preenchido com dados do card clicado
- [ ] **AC6:** Botões de ação:
  - **Salvar** — Valida e persiste, exibe toast "Conteúdo salvo!"
  - **Cancelar** — Fecha modal sem salvar (com confirmação se houve mudanças)
  - **Excluir** (apenas em modo edição) — Com dialog de confirmação, exibe toast "Conteúdo excluído"
  - **Duplicar** (apenas em modo edição) — Cria cópia e fecha modal, exibe toast "Conteúdo duplicado!"
- [ ] **AC7:** Feedback visual:
  - Toast notifications para sucesso/erro usando `Sonner`
  - Loading state no botão Salvar durante persistência
- [ ] **AC8:** Modal fechável via Esc, clique no overlay ou botão X
- [ ] **AC9:** Formulário acessível: todos os campos com `label`, `aria-label` onde necessário

---

## Notas Técnicas

### Arquivos a Criar
```
features/content/
├── components/
│   ├── content-editor-dialog.tsx  # Modal principal
│   ├── content-form.tsx           # Formulário com todos os campos
│   ├── media-uploader.tsx         # Upload e preview de imagens
│   └── tag-input.tsx              # Input de hashtags com chips
├── hooks/
│   └── use-content-form.ts        # Hook com lógica do form (RHF)
└── schemas/
    └── content.schema.ts          # Zod schema de validação
```

### Zod Schema
```typescript
// features/content/schemas/content.schema.ts
export const contentSchema = z.object({
  title: z.string().min(1, 'Título obrigatório').max(100, 'Máximo 100 caracteres'),
  description: z.string().max(2200, 'Máximo 2200 caracteres').nullable().optional(),
  type: z.enum(['post', 'story', 'reel', 'carousel']),
  status: z.enum(['idea', 'draft', 'approved', 'scheduled', 'published']),
  scheduledAt: z.string().nullable().optional(),
  accountId: z.string().nullable().optional(),
  hashtags: z.array(z.string()).max(30, 'Máximo 30 hashtags'),
  mediaUrls: z.array(z.string()),
  collectionIds: z.array(z.string()),
});

export type ContentFormData = z.infer<typeof contentSchema>;
```

### TagInput Component
```tsx
// Comportamento esperado:
// - Input text livre
// - Enter ou "," adiciona a hashtag como chip
// - Chip tem botão × para remover
// - Backspace no input vazio remove última tag
// - Badge contador: "3/30 hashtags"
```

### Base64 Upload
```typescript
// Converter File para base64:
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
```

### Integração com Zustand
```typescript
// Ao salvar (modo criação):
addContent(formData); // contentSlice

// Ao salvar (modo edição):
updateContent(contentId, formData);

// Ao excluir:
deleteContent(contentId);

// Ao duplicar:
duplicateContent(contentId);
```

---

## Definição de Pronto (DoD)

- [ ] Modal abre em modo criação a partir do FAB e botões "+" das colunas
- [ ] Modal abre em modo edição ao clicar em um card
- [ ] Todos os campos validam corretamente com mensagens de erro
- [ ] Upload de imagem funciona e preview é exibido
- [ ] TagInput funciona: adicionar/remover tags
- [ ] Ações de salvar, cancelar, excluir e duplicar funcionam
- [ ] Dados persistem ao recarregar a página
- [ ] Toast notifications exibem feedback correto
- [ ] Sem erros de TypeScript strict
