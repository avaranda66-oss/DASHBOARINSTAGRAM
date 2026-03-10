# Dashboard Instagram — User Stories Index (V1)

> Mapa completo das User Stories do V1, organizadas em ordem lógica de desenvolvimento.
> Cada story tem seu próprio arquivo detalhado em `docs/user-stories/`.

---

## Resumo de Estimativas

| Epic | Stories | Pontos |
|------|---------|--------|
| Epic 1 — Foundation & Core Infrastructure | 3 | 11 pts |
| Epic 2 — Storyboard & Content Management | 4 | 29 pts |
| Epic 3 — Calendar & Collections | 3 | 18 pts |
| Epic 4 — Search, Filters & Data Management | 4 | 14 pts |
| **Total** | **14** | **72 pts** |

---

## Epic 1 — Foundation & Core Infrastructure

> **Meta:** Base técnica, design system, layout e dashboard inicial funcional.

| # | Story | Prioridade | Estimativa | Depende de |
|---|-------|-----------|------------|-----------|
| [US-01](./US-01-project-setup-design-system.md) | Project Setup & Design System | 🔴 Crítica | 3 pts | — |
| [US-02](./US-02-layout-shell.md) | Layout Shell (Sidebar + Header) | 🔴 Crítica | 5 pts | US-01 |
| [US-03](./US-03-dashboard-home.md) | Dashboard Home Page | 🟠 Alta | 3 pts | US-01, US-02 |

---

## Epic 2 — Storyboard & Content Management

> **Meta:** Board Kanban com drag-and-drop, CRUD e persistência local de conteúdos.

| # | Story | Prioridade | Estimativa | Depende de |
|---|-------|-----------|------------|-----------|
| [US-04](./US-04-persistence-layer.md) | Camada de Persistência (Repository Pattern) | 🔴 Crítica | 5 pts | US-01, US-03 |
| [US-05](./US-05-storyboard-kanban.md) | Storyboard Kanban Board | 🔴 Crítica | 8 pts | US-01, US-02, US-04 |
| [US-06](./US-06-content-editor.md) | Editor de Conteúdo (Modal CRUD) | 🔴 Crítica | 8 pts | US-04, US-05 |
| [US-07](./US-07-drag-and-drop.md) | Drag-and-Drop & Reordenação | 🔴 Crítica | 8 pts | US-05, US-06 |

---

## Epic 3 — Calendar & Collections

> **Meta:** Calendário editorial interativo e agrupamento por coleções/campanhas.

| # | Story | Prioridade | Estimativa | Depende de |
|---|-------|-----------|------------|-----------|
| [US-08](./US-08-calendar-month-view.md) | Calendário Mensal | 🟠 Alta | 8 pts | US-04, US-06 |
| [US-09](./US-09-calendar-week-day-views.md) | Visualizações Semanal e Diária | 🟡 Média | 5 pts | US-08 |
| [US-10](./US-10-collections-campaigns.md) | Coleções e Campanhas | 🟡 Média | 5 pts | US-04, US-06 |

---

## Epic 4 — Search, Filters & Data Management

> **Meta:** Busca, filtros, command palette, gerenciamento de contas e exportação de dados.

| # | Story | Prioridade | Estimativa | Depende de |
|---|-------|-----------|------------|-----------|
| [US-11](./US-11-account-management.md) | Gerenciamento de Contas Instagram | 🟡 Média | 3 pts | US-04, US-06 |
| [US-12](./US-12-search-and-filters.md) | Busca Global e Filtros Avançados | 🟡 Média | 5 pts | US-05, US-08, US-10, US-11 |
| [US-13](./US-13-command-palette.md) | Command Palette (Ctrl+K) | 🟢 Baixa | 3 pts | US-02, US-06 |
| [US-14](./US-14-export-settings.md) | Exportação de Dados e Configurações | 🟢 Baixa | 3 pts | US-04, US-10, US-11 |

---

## Diagrama de Dependências

```mermaid
graph LR
    US01["US-01\nProject Setup"] --> US02["US-02\nLayout Shell"]
    US01 --> US03["US-03\nDashboard Home"]
    US02 --> US03
    US01 --> US04["US-04\nPersistência"]
    US03 --> US04
    US04 --> US05["US-05\nStoryboard"]
    US02 --> US05
    US04 --> US06["US-06\nEditor"]
    US05 --> US06
    US05 --> US07["US-07\nDrag & Drop"]
    US06 --> US07
    US04 --> US08["US-08\nCalendário Mensal"]
    US06 --> US08
    US08 --> US09["US-09\nSemanal/Diária"]
    US04 --> US10["US-10\nColeções"]
    US06 --> US10
    US04 --> US11["US-11\nContas"]
    US06 --> US11
    US05 --> US12["US-12\nBusca/Filtros"]
    US08 --> US12
    US10 --> US12
    US11 --> US12
    US02 --> US13["US-13\nCommand Palette"]
    US06 --> US13
    US04 --> US14["US-14\nExport/Settings"]
    US10 --> US14
    US11 --> US14

    style US01 fill:#ef4444,color:#fff
    style US02 fill:#ef4444,color:#fff
    style US04 fill:#ef4444,color:#fff
    style US05 fill:#ef4444,color:#fff
    style US06 fill:#ef4444,color:#fff
    style US07 fill:#ef4444,color:#fff
    style US03 fill:#f97316,color:#fff
    style US08 fill:#f97316,color:#fff
    style US09 fill:#eab308,color:#fff
    style US10 fill:#eab308,color:#fff
    style US11 fill:#eab308,color:#fff
    style US12 fill:#eab308,color:#fff
    style US13 fill:#22c55e,color:#fff
    style US14 fill:#22c55e,color:#fff
```

---

## Critérios por Nível de Prioridade

| Cor | Prioridade | Descrição |
|-----|-----------|-----------|
| 🔴 | Crítica | Bloqueante — não pode ser pulada ou postergada |
| 🟠 | Alta | Muito importante para o V1, mas não bloqueante imediato |
| 🟡 | Média | Importante para o produto completo, pode ser feita em paralelo |
| 🟢 | Baixa | Eleva a experiência, pode ser postergada para iteração seguinte |

---

## Notas de Desenvolvimento

1. **US-01 a US-07** devem ser completadas em sequência (dependências rígidas)
2. **US-08 a US-11** podem ser desenvolvidas em paralelo após US-07
3. **US-12 a US-14** são as últimas e podem rodar em paralelo entre si
4. Todos os arquivos de User Stories seguem o template: User Story → Contexto → Acceptance Criteria → Notas Técnicas → Definição de Pronto
