# US-30: Fisher Exact Test + normalQuantile (Inverse Normal CDF)
**Status:** Ready
**Epic:** [EPIC-STAT-ENGINE](epics/EPIC-STAT-ENGINE.md)
**Prioridade:** 🟡 Média
**Pontos:** 3
**Criado por:** @sm (River) | **Validado por:** @po (Pax)

---

## Descrição

Duas primitivas estatísticas de alta utilidade ainda ausentes no engine:

1. **Fisher Exact Test** — alternativa exata ao Chi² para tabelas 2×2 com células pequenas
   (n < 20 por célula). Especialmente útil para A/B tests com poucos cliques.
   Baseado na distribuição hipergeométrica, sem aproximação assintótica.

2. **normalQuantile (Φ⁻¹)** — inversa da CDF normal padrão. Necessária para:
   - Calcular intervalos de confiança a partir de Z-scores
   - SPRT com distribuições Gaussianas
   - Bootstrap parametric CI

---

## Critérios de Aceitação

**AC-1 — fisherExact2x2 em bayesian-ab.ts:**
- `fisherExact2x2(a, b, c, d, alpha?) : FisherExactResult`
- Tabela: `[[a, b], [c, d]]` onde a=positivos/A, b=negativos/A, c=positivos/B, d=negativos/B
- p-value dois lados: soma de P(X=k) para todos k onde P(k) ≤ P(observado)
- Probabilidade hipergeométrica via `logFactorial` com Stirling para n > 20
- `oddsRatio = (a*d)/(b*c)` com correção Haldane-Anscombe (+0.5) quando b=0 ou c=0
- Interface `FisherExactResult = { pValue, oddsRatio, significant }`

**AC-2 — normalQuantile em math-core.ts:**
- `normalQuantile(p: number): number` — inversa da CDF normal padrão
- Retorna Φ⁻¹(p) = Z tal que P(Z_std ≤ Z) = p
- Implementação: rational approximation de Acklam (2003)
- Precisão: |erro| < 4.5e-4 para p ∈ (0, 1)
- Casos extremos: `p ≤ 0 → -Infinity`, `p ≥ 1 → Infinity`, `p = 0.5 → 0`

**AC-3 — logFactorial helper:**
- `logFactorial(n: number): number` — interno (não exportado)
- Exato para n ≤ 20 (loop de log)
- Stirling para n > 20: `n*ln(n) - n + 0.5*ln(2πn) + 1/(12n)`

**AC-4 — Zero dependências externas**
- Adições a arquivos existentes, sem novos imports

---

## Scope

**IN:**
- `lib/utils/bayesian-ab.ts` — adicionar `fisherExact2x2` e `FisherExactResult`
- `lib/utils/math-core.ts` — adicionar `normalQuantile` e `logFactorial` (interno)

**OUT:**
- Fisher para tabelas maiores que 2×2
- `normalQuantile` integrada na UI diretamente (uso via funções existentes)

---

## Dependências

- `lib/utils/bayesian-ab.ts` (existente — US-24)
- `lib/utils/math-core.ts` (existente)

---

## Riscos

- logFactorial com Stirling: erro de ~1/(360n³) — desprezível para n > 20
- Fisher exact: soma de probabilidades pode ser ligeiramente > 1.0 por floating point — clampar com `Math.min(1, pValue)`

---

## File List

- `lib/utils/bayesian-ab.ts` (MODIFICAR — adicionar `fisherExact2x2`)
- `lib/utils/math-core.ts` (MODIFICAR — adicionar `normalQuantile`)

---

## Change Log

| Data | Agente | Ação |
|------|--------|------|
| 2026-03-14 | @sm (River) | Story criada |
| 2026-03-14 | @po (Pax) | Validada — GO (10/10) |
| 2026-03-14 | @dev (Dex) | Implementação iniciada |
