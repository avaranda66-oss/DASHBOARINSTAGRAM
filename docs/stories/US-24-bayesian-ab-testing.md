# US-24: Bayesian A/B Testing + Chi² para CTR
**Status:** Ready
**Epic:** [EPIC-STAT-ENGINE](epics/EPIC-STAT-ENGINE.md)
**Prioridade:** 🔴 Alta
**Pontos:** 5
**Criado por:** @sm (River) | **Validado por:** @po (Pax)

---

## Descrição

O dashboard usa Z-test para comparar CTR entre variantes de anúncios. CTR é uma proporção
binomial (cliques/impressões) — o Z-test gaussiano é metodologicamente incorreto e produz
falsos positivos especialmente com amostras pequenas (<500 impressões por variante).

Esta story cria um novo módulo `lib/utils/bayesian-ab.ts` com 3 abordagens:
1. **Chi-squared com correção de Yates** — teste frequentista correto para proporções
2. **Bayesian Beta-Binomial** — P(B > A) via Monte Carlo, mais intuitivo para a UI
3. **SPRT (Sequential Probability Ratio Test)** — parada antecipada sem inflar erro tipo I

---

## Critérios de Aceitação

**AC-1 — Chi-squared para proporções:**
- `chiSquaredProportions(a_clicks, a_impr, b_clicks, b_impr)` retorna `{ chiSq, pValue, significant, effect }`
- Usa correção de Yates quando qualquer célula esperada < 10
- `pValue` calculado via CDF chi-quadrado com 1 grau de liberdade (approx série de Taylor)
- `effect` = diferença relativa de CTR em %

**AC-2 — Bayesian A/B:**
- `bayesianAB(a_clicks, a_impr, b_clicks, b_impr, options?)` retorna `{ probBWins, expectedLoss, credibleInterval, recommendation }`
- Prior: Beta(1,1) não-informativo (uniforme)
- `probBWins` via Monte Carlo com 10.000 amostras (seed determinístico)
- `expectedLoss` = E[max(θA - θB, 0)] para decisão de custo mínimo
- `recommendation`: 'deploy_B' | 'keep_A' | 'inconclusive' com threshold configurável (default 95%)

**AC-3 — SPRT:**
- `sprtTest(clicks_seq_a, clicks_seq_b, impr_seq_a, impr_seq_b, options?)` retorna `{ decision, likelihoodRatio, sampleSize, canStop }`
- `decision`: 'accept_H1' | 'accept_H0' | 'continue'
- Boundaries: α=0.05, β=0.20 (Wald's A = β/1-α, B = 1-β/α)
- `canStop: true` quando razão de verossimilhança cruza boundary

**AC-4 — Sem dependências externas**
- Zero imports de bibliotecas externas
- Todas as funções exportadas como named exports
- JSDoc completo em cada função

---

## Scope

**IN:**
- Arquivo `lib/utils/bayesian-ab.ts`
- Funções: `chiSquaredProportions`, `bayesianAB`, `sprtTest`, `betaSample` (helper interno)
- Chi-quadrado CDF via série de Taylor (precisão suficiente para 1 grau de liberdade)

**OUT:**
- Modificação de `ads-insights/route.ts` (conectar na UI é tarefa separada)
- Testes automatizados de integração (Jest não configurado no projeto)
- Suporte a mais de 2 variantes (A/B apenas, não A/B/n)

---

## Dependências

- `lib/utils/math-core.ts` — pode importar `normalCDF` para chi-squared CDF
- Nenhuma story anterior como prerequisito

---

## Riscos

- Monte Carlo com 10k amostras pode ser lento se chamado em loop — mitigar com seed fixo e B configurável
- CDF chi-quadrado via Taylor é aproximação — documentar precisão esperada (|erro| < 1e-4 para x < 20)

---

## File List

- `lib/utils/bayesian-ab.ts` (CRIAR)

---

## Change Log

| Data | Agente | Ação |
|------|--------|------|
| 2026-03-14 | @sm (River) | Story criada |
| 2026-03-14 | @po (Pax) | Validada — GO (10/10) |
| 2026-03-14 | @dev (Dex) | Implementação iniciada |
