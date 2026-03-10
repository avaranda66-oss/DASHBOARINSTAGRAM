# US-08 — Calendário Editorial (Visualização Mensal)

**Epic:** Epic 3 — Calendar & Collections
**Prioridade:** 🟠 Alta
**Estimativa:** 8 pontos
**Depende de:** US-04, US-06

---

## User Story

> **Como** social media manager,
> **Quero** ver meus conteúdos agendados em um calendário mensal,
> **Para que** eu possa visualizar a cobertura e distribuição de posts ao longo do mês.

---

## Contexto

O Calendário Editorial é a segunda tela principal do produto — complementar ao Storyboard. Enquanto o board mostra o pipeline de produção, o calendário mostra a **distribuição temporal** do conteúdo. Permite identificar lacunas, dias sobrecarregados e gaps no planejamento.

Esta story implementa a visualização mensal. As visualizações semanal e diária são implementadas na US-09.

---

## Acceptance Criteria

- [ ] **AC1:** Grade mensal com 7 colunas (dias da semana) e linhas de semanas:
  - Cabeçalho com nomes dos dias da semana (Dom, Seg, Ter, Qua, Qui, Sex, Sáb) — ou Seg-Dom conforme padrão brasileiro
  - Dias do mês numerados
  - Dias de outros meses exibidos com opacidade reduzida (muted)
- [ ] **AC2:** **Indicação visual do dia atual** (hoje) com destaque (fundo colorido no número do dia)
- [ ] **AC3:** Conteúdos com `scheduledAt` no mês exibidos como **chips/badges** no dia correspondente:
  - Ícone do tipo de conteúdo (Post/Story/Reel/Carrossel)
  - Título truncado (máx 15-20 chars)
  - Cor do chip baseada no status do conteúdo
- [ ] **AC4:** Quando há mais de 3 conteúdos em um dia, exibir "+N mais" clicável:
  - Popover com lista completa dos conteúdos do dia
- [ ] **AC5:** **Navegação entre meses:**
  - Botões "Anterior" (`ChevronLeft`) e "Próximo" (`ChevronRight`)
  - Botão "Hoje" para retornar ao mês atual
  - Título exibindo "Março 2026" (mês + ano)
- [ ] **AC6:** **Clique em um dia vazio** → abre `ContentEditorDialog` em modo criação com data pré-preenchida
- [ ] **AC7:** **Clique em um chip de conteúdo** → abre `ContentEditorDialog` em modo edição com dados do conteúdo
- [ ] **AC8:** Dados carregados do Zustand `contentSlice` filtrados por `scheduledAt` no mês atual
- [ ] **AC9:** Zustand `calendarSlice` com:
  - `currentDate: Date` (mês/ano exibido)
  - `calendarView: 'month' | 'week' | 'day'`
  - `navigateMonth(direction: 'prev' | 'next'): void`
  - `goToToday(): void`
  - `setView(view): void`
- [ ] **AC10:** Toggle de visualização no header da página: **Mensal / Semanal / Diária** (segmented control)
- [ ] **AC11:** Page title no header: "Calendário Editorial"

---

## Notas Técnicas

### Arquivos a Criar
```
app/(dashboard)/calendar/page.tsx
features/calendar/
├── components/
│   ├── calendar-view.tsx          # Wrapper com toggle de views
│   ├── month-view.tsx             # Grid mensal
│   ├── calendar-event.tsx         # Chip de conteúdo no calendar
│   └── calendar-day-cell.tsx      # Célula de um dia
├── hooks/
│   └── use-calendar.ts            # Lógica de navegação e geração de dias
stores/
└── calendar-slice.ts              # calendarSlice
```

### Hook useCalendar (date-fns)
```typescript
// features/calendar/hooks/use-calendar.ts
import { startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const useCalendar = (currentDate: Date) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // domingo
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  return { days, monthStart, monthEnd };
};
```

### Filtrar Conteúdos por Dia
```typescript
// Pegar conteúdos de um dia específico
const getContentsForDay = (day: Date, contents: Content[]) =>
  contents.filter(c => {
    if (!c.scheduledAt) return false;
    return isSameDay(new Date(c.scheduledAt), day);
  });
```

### Cores dos Chips por Status
```typescript
const STATUS_COLORS = {
  idea:      'bg-slate-500/20 text-slate-300',
  draft:     'bg-amber-500/20 text-amber-300',
  approved:  'bg-emerald-500/20 text-emerald-300',
  scheduled: 'bg-blue-500/20 text-blue-300',
  published: 'bg-violet-500/20 text-violet-300',
};
```

---

## Definição de Pronto (DoD)

- [ ] Calendário mensal renderiza corretamente com navegação entre meses
- [ ] Conteúdos agendados aparecem nos dias corretos
- [ ] Indicador de "hoje" visível
- [ ] Clique em dia vazio abre editor com data pré-preenchida
- [ ] Clique em chip abre editor com conteúdo carregado
- [ ] Toggle Mensal/Semanal/Diária visível (outras views podem ser placeholders nesta story)
- [ ] Responsivo em mobile (células menores mas funcionais)
- [ ] Sem erros de TypeScript
