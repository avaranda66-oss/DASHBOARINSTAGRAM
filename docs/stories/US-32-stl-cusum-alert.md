# US-32: STL-CUSUM no AlertAnomalyPanel (Posts)
**Status:** Ready
**Epic:** [EPIC-STAT-ENGINE](epics/EPIC-STAT-ENGINE.md)
**Prioridade:** 🔴 Alta
**Pontos:** 3
**Criado por:** @sm (River) | **Validado por:** @po (Pax)

---

## Descrição

O `AlertAnomalyPanel` usa `detectOutliers` (IQR simples) que gera falsos positivos
por sazonalidade semanal (menos engajamento toda segunda-feira não é anomalia).

Adicionar detecção via `stlCusum` que remove tendência e sazonalidade antes de detectar
mudanças de regime — eliminando ~80% dos falsos positivos sazonais.

---

## Critérios de Aceitação

**AC-1:** Importa e usa `stlCusum` de `lib/utils/anomaly-detection.ts`
**AC-2:** Série: posts ordenados por `timestamp`, valores = `likesCount + commentsCount`
**AC-3:** Se `changePoints.length > 0`, adiciona alert com título e descrição
**AC-4:** Distingue mudança positiva (cusum final positivo) vs negativa (cusum final negativo)
**AC-5:** Mínimo: 14 posts para rodar CUSUM (senão silencia — não bloqueia alertas existentes)
**AC-6:** Mantém todos os alertas existentes (IQR, trend, best day) — apenas adiciona o CUSUM

---

## Scope

**IN:**
- `features/analytics/components/alert-anomaly-panel.tsx` (MODIFICAR)

**OUT:** Substituir os alertas existentes, UI visual do panel

---

## File List

- `features/analytics/components/alert-anomaly-panel.tsx` (MODIFICAR)

---

## Change Log

| Data | Agente | Ação |
|------|--------|------|
| 2026-03-14 | @sm (River) | Story criada |
| 2026-03-14 | @po (Pax) | Validada — GO (10/10) |
| 2026-03-14 | @dev (Dex) | Implementação iniciada |
