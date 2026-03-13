# US-09 — Visualizações Semanal e Diária do Calendário

**Epic:** Epic 3 — Calendar & Collections
**Prioridade:** 🟡 Média
**Estimativa:** 5 pontos
**Depende de:** US-08

---

## User Story

> **Como** social media manager,
> **Quero** alternar entre visualizações semanal e diária,
> **Para que** eu tenha mais detalhes sobre a programação de curto prazo.

---

## Contexto

A visualização mensal dá a visão macro do planejamento, mas para detalhes de horário e organização diária, as views semanal e diária são essenciais. Ambas exibem uma **timeline por hora** com conteúdos posicionados no horário agendado, permitindo identificar sobreposições e lacunas de horário.

---

## Acceptance Criteria

- [ ] **AC1:** Toggle funcional entre as 3 visualizações: **Mensal / Semanal / Diária** (persiste a preferência no `calendarSlice`)
- [ ] **AC2:** **Visão Semanal:**
  - 7 colunas (uma por dia da semana atual)
  - Timeline vertical com horas (00:00 a 23:00) no eixo Y
  - Header da coluna: nome do dia + número do dia (`Seg 10`)
  - Cards de conteúdo posicionados na hora correspondente ao `scheduledAt`
  - Navegação para semana anterior/próxima
  - Indicador **"agora"** — linha horizontal no horário atual (atualiza a cada minuto)
- [ ] **AC3:** **Visão Diária:**
  - 1 coluna com timeline detalhada (00:00 a 23:00)
  - Intervalos de 30 minutos visíveis
  - Cards de conteúdo com altura proporcional (mínimo 60px por card)
  - Navegação dia anterior/próximo
  - Botão "Hoje" sempre visível
- [ ] **AC4:** Cards no calendário semanal/diário exibem:
  - Ícone do tipo de conteúdo
  - Título (truncado)
  - Horário (`14:00`)
  - Cor do badge de status
- [ ] **AC5:** **Drag-and-drop no calendário** (semanal/diário):
  - Arrastar card para outro horário atualiza `scheduledAt`
  - Arrastar card para outro dia (visão semanal) atualiza data
  - Feedback visual de drag (placeholder no slot de destino)
  - Persistência automática após drop
- [ ] **AC6:** **Indicação visual de horários de pico** (configurável nas Settings):
  - Faixa destacada nas horas de maior engajamento (ex: 18h-21h)
  - Configurável via `settingsStore`
- [ ] **AC7:** Scroll suave — timeline não é visível inteira, faz scroll vertical; página abre scrollada para o horário de trabalho (ex: 08:00)

---

## Notas Técnicas

### Arquivos a Criar/Modificar
```
features/calendar/components/
├── week-view.tsx              # Timeline semanal (7 colunas)
├── day-view.tsx               # Timeline diária (1 coluna)
└── calendar-event.tsx         # Card de evento no calendário (atualizar)
features/calendar/hooks/
└── use-calendar.ts            # Adicionar lógica de semana e dia
```

### Geração de Slots de Hora
```typescript
// Gerar array de horas para a timeline
const HOURS = Array.from({ length: 24 }, (_, i) => i); // [0, 1, 2, ..., 23]

// Posicionar card: topo = (hora * 60 + minutos) * SLOT_HEIGHT_PER_MIN
const TOP_OFFSET_PER_MIN = 2; // px por minuto → 120px por hora
const getCardTop = (scheduledAt: string) => {
  const date = new Date(scheduledAt);
  return (date.getHours() * 60 + date.getMinutes()) * TOP_OFFSET_PER_MIN;
};
```

### Semana Atual com date-fns
```typescript
import { startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const weekDays = eachDayOfInterval({
  start: startOfWeek(currentDate, { weekStartsOn: 0 }),
  end: endOfWeek(currentDate, { weekStartsOn: 0 }),
});
```

### Linha de "Agora"
```typescript
// Atualizar posição da linha a cada minuto
useEffect(() => {
  const interval = setInterval(() => {
    const now = new Date();
    setNowPosition((now.getHours() * 60 + now.getMinutes()) * TOP_OFFSET_PER_MIN);
  }, 60_000);
  return () => clearInterval(interval);
}, []);
```

---

## Definição de Pronto (DoD)

- [ ] Toggle entre Mensal/Semanal/Diária funciona
- [ ] Visão semanal renderiza 7 colunas com timeline de horas
- [ ] Visão diária renderiza com timeline detalhada
- [ ] Cards aparecem no horário correto na timeline
- [ ] Linha "agora" visível apenas no dia atual
- [ ] Drag-and-drop no calendário atualiza data/hora e persiste
- [ ] Navegação anterior/próximo/hoje funciona em todas as views
- [ ] Sem erros de TypeScript
