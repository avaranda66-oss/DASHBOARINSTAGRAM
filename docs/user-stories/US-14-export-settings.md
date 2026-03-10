# US-14 — Exportação de Dados e Configurações

**Epic:** Epic 4 — Search, Filters & Data Management
**Prioridade:** 🟢 Baixa
**Estimativa:** 3 pontos
**Depende de:** US-04, US-10, US-11

---

## User Story

> **Como** social media manager,
> **Quero** exportar meus dados e configurar minhas preferências,
> **Para que** eu tenha controle sobre minhas informações e personalização da experiência.

---

## Contexto

A página de configurações centraliza as preferências do usuário e o gerenciamento dos dados da aplicação. Permite exportar e importar todos os dados (backup), resetar o app e ajustar preferências de visualização. É a última story do V1, complementando o conjunto de funcionalidades.

---

## Acceptance Criteria

- [ ] **AC1:** Página de configurações (`/settings`) com seções organizadas:
  - **Aparência:** Toggle tema dark/light (duplica o do header para conveniência)
  - **Visualização:** Select para view padrão do calendário (Mensal/Semanal/Diária)
  - **Horários de Pico:** Input para definir faixa de horas de maior engajamento (usada na US-09)
  - **Dados:** Ações de exportação, importação e reset
  - **Sobre:** Versão da aplicação, links para repositório/PRD
- [ ] **AC2:** **Exportação de dados (JSON):**
  - Botão "Exportar Dados" com ícone `Download`
  - Exporta JSON contendo: `{ contents, collections, accounts, exportedAt, version }`
  - Arquivo nomeado: `ig-dashboard-export-YYYY-MM-DD.json`
  - Download automático via browser (anchor `download` trick)
- [ ] **AC3:** **Importação de dados (JSON):**
  - Botão "Importar Dados" com input file `application/json`
  - Validação do formato com Zod antes de importar
  - Dialog de confirmação: "Importar dados irá substituir todos os dados atuais. Deseja continuar?"
  - Feedback de sucesso com contagem: "Importados: 25 conteúdos, 3 coleções, 2 contas"
  - Feedback de erro caso JSON inválido
- [ ] **AC4:** **Resetar Dados:**
  - Botão "Resetar Todos os Dados" com ícone `Trash2` em vermelho
  - Dialog de confirmação com texto de aviso em destaque
  - Limpa `localStorage` completamente e recarrega a página
- [ ] **AC5:** Preferências persistidas via `settingsRepository` em `localStorage`
- [ ] **AC6:** Zustand `settingsSlice` (ou pode ser parte do `uiSlice`):
  ```typescript
  interface Settings {
    theme: 'dark' | 'light';
    defaultView: 'board' | 'calendar';
    calendarView: 'month' | 'week' | 'day';
    peakHours: { start: number; end: number }; // ex: { start: 18, end: 21 }
    sidebarCollapsed: boolean;
  }
  ```
- [ ] **AC7:** Informações do app na seção "Sobre":
  - Versão: `v1.0.0`
  - Stack: Next.js 15, Tailwind CSS v4, shadcn/ui
  - Link para repositório GitHub (se disponível)
- [ ] **AC8:** Page title no header: "Configurações"

---

## Notas Técnicas

### Arquivos a Criar/Modificar
```
app/(dashboard)/settings/page.tsx    # Página de configurações
types/settings.ts                    # Type UserSettings
stores/ui-slice.ts                   # Adicionar settings ao slice
```

### Export JSON
```typescript
const handleExport = () => {
  const data = {
    contents: contentStore.contents,
    collections: collectionStore.collections,
    accounts: accountStore.accounts,
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ig-dashboard-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
```

### Import JSON com Validação Zod
```typescript
const exportSchema = z.object({
  contents: z.array(contentSchema).optional().default([]),
  collections: z.array(collectionSchema).optional().default([]),
  accounts: z.array(accountSchema).optional().default([]),
  exportedAt: z.string(),
  version: z.string(),
});

const handleImport = async (file: File) => {
  const raw = await file.text();
  const parsed = exportSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    toast.error('Arquivo inválido. Verifique o formato do JSON.');
    return;
  }
  // ... substituir dados após confirmação
};
```

---

## Definição de Pronto (DoD)

- [ ] Página de configurações renderiza todas as seções
- [ ] Exportação gera arquivo JSON válido e inicia download automático
- [ ] Importação lê arquivo JSON, valida e substitui dados após confirmação
- [ ] Importação exibe feedback de erro para JSON inválido
- [ ] Reset limpa localStorage e recarrega a página
- [ ] Preferências de tema e visualização são salvas e aplicadas
- [ ] Page title "Configurações" correto no header
- [ ] Sem erros de TypeScript
