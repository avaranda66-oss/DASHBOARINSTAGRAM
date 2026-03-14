# US-26: Holt-Winters Auto-tuning + Prediction Intervals
**Status:** Ready
**Epic:** [EPIC-STAT-ENGINE](epics/EPIC-STAT-ENGINE.md)
**Prioridade:** 🟡 Média
**Pontos:** 5
**Criado por:** @sm (River) | **Validado por:** @po (Pax)

---

## Descrição

O `holtWinters` em `forecasting.ts` usa α=0.3, β=0.1, γ=0.1 fixos para todas as contas
e métricas. Estes são valores "razoáveis para o caso médio" mas subótimos para qualquer
conta específica. Uma conta com engajamento altamente sazonal precisa de γ alto; uma conta
com tendência forte precisa de β alto.

Esta story cria `lib/utils/hw-optimizer.ts` com:
1. Grid search para otimização de α,β,γ minimizando MSSE
2. Intervalos de predição (80% e 95%) via variância dos resíduos
3. Seleção automática aditivo vs multiplicativo

---

## Critérios de Aceitação

**AC-1 — Grid Search para α,β,γ:**
- `optimizeHW(data, options?)` retorna `{ alpha, beta, gamma, msse, model }`
- Grid: α,β,γ ∈ {0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9} (9³ = 729 combinações)
- Métrica: MSSE = mean((fitted[t] - data[t])² / mean(|diff(data)|²))
- `model`: 'additive' | 'multiplicative' (selecionado automaticamente — ver AC-3)
- Guard: se `data.length < 14`, retorna defaults (α=0.3, β=0.1, γ=0.1)

**AC-2 — Prediction Intervals:**
- `holtWintersWithPI(data, options?)` retorna resultado de `holtWinters` + `{ pi80, pi95 }`
- `pi80` e `pi95`: arrays de `{ lower, upper }` para cada passo do forecast
- Fórmula: `PI_h = forecast_h ± z * sigma_h` onde `sigma_h = sigma_1 * sqrt(h)`
- `sigma_1` = desvio padrão dos resíduos `data - fitted`
- `z_80 = 1.282`, `z_95 = 1.960` (via `normalCDF` de math-core.ts)

**AC-3 — Seleção automática aditivo vs multiplicativo:**
- `selectHWModel(data, period)` retorna `'additive' | 'multiplicative'`
- Critério: coeficiente de variação dos fatores sazonais brutos
  - `seasonal_ratio_i = data[i] / trend_i`
  - Se `CV(seasonal_ratio) > 0.15` → multiplicativo (amplitude sazonal cresce com tendência)
  - Senão → aditivo
- Guard: se qualquer dado ≤ 0, forçar aditivo

**AC-4 — Holt-Winters Multiplicativo:**
- `holtWintersMultiplicative(data, options?)` com mesma interface que `holtWinters`
- Equações sazonais: `S[t] = γ * (data[t] / L) + (1-γ) * S[t-m]`
- Guard: se algum valor ≤ 0, retornar fallback aditivo com aviso

---

## Scope

**IN:**
- Arquivo `lib/utils/hw-optimizer.ts`
- Funções: `optimizeHW`, `holtWintersWithPI`, `selectHWModel`, `holtWintersMultiplicative`
- Importa `holtWinters` e `normalCDF` dos módulos existentes

**OUT:**
- Modificação de `forecasting.ts` (não quebrar nada existente)
- Nelder-Mead (grid search de 729 combos é suficiente para este caso)
- Otimização de γ independente do modelo multiplicativo (mesma lógica)

---

## Dependências

- `lib/utils/forecasting.ts` (importar `holtWinters`)
- `lib/utils/math-core.ts` (importar `normalCDF`)

---

## Riscos

- Grid de 729 combos * N pontos pode ser lento para N > 365. Mitigar: usar subset de 90 pontos para otimização se série muito longa
- Multiplicativo pode divergir se dados têm zeros — guard obrigatório

---

## File List

- `lib/utils/hw-optimizer.ts` (CRIAR)

---

## Change Log

| Data | Agente | Ação |
|------|--------|------|
| 2026-03-14 | @sm (River) | Story criada |
| 2026-03-14 | @po (Pax) | Validada — GO (9/10) |
| 2026-03-14 | @dev (Dex) | Implementação iniciada |
