# EPIC: Statistical Engine Upgrade — Level PhD
**ID:** EPIC-STAT-ENGINE
**Status:** InProgress
**Owner:** @aios-master (Orion)
**Branch:** v2-dashboard
**Created:** 2026-03-14

---

## Visão Geral

O motor estatístico atual (`lib/utils/`) tem base sólida (Holt-Winters, CUSUM, OLS, Bootstrap)
mas apresenta 3 lacunas críticas que comprometem a confiabilidade das análises:

1. **Z-test para CTR** — erro metodológico. CTR é proporção binomial, não gaussiana.
2. **CUSUM com stdDev bruto** — falsos positivos por sazonalidade não removida.
3. **α,β,γ hardcoded** no Holt-Winters — previsões subótimas por conta.

Além disso, funções de alto valor (`advertisingElasticity`, `creativeHalfLife`) existem
mas não estão conectadas a alertas ou indicadores acionáveis na UI.

---

## Objetivos

- Corrigir rigor estatístico (A/B testing com método correto)
- Eliminar falsos positivos de anomalia via STL + MAD
- Holt-Winters com auto-tuning de parâmetros
- Adicionar causalidade (Granger), Hook Rate e Social Proof Velocity
- Zero dependências externas — TypeScript puro mantido

---

## Stories do Epic

| Story | Título | Prioridade | Status |
|-------|--------|-----------|--------|
| [US-24](../US-24-bayesian-ab-testing.md) | Bayesian A/B Testing + Chi² para CTR | 🔴 Alta | Done |
| [US-25](../US-25-stl-mad-anomaly.md) | STL Decomposition + MAD Adaptive CUSUM | 🔴 Alta | Done |
| [US-26](../US-26-hw-autotuning.md) | Holt-Winters Auto-tuning + Prediction Intervals | 🟡 Média | Done |
| [US-27](../US-27-causal-behavioral.md) | Granger Causality + Hook Rate + Social Proof Velocity | 🟡 Média | Done |
| [US-28](../US-28-isolation-forest.md) | Isolation Forest Multivariado | 🔴 Alta | Done |
| [US-29](../US-29-shapley-markov.md) | Shapley Attribution + Markov Chain | 🔴 Alta | Done |
| [US-30](../US-30-fisher-exact-normal-quantile.md) | Fisher Exact Test + normalQuantile | 🟡 Média | Done |

---

## Arquivos Afetados

```
lib/utils/
├── math-core.ts              (existente — normalQuantile adicionada US-30)
├── statistics.ts             (existente — sem modificação)
├── forecasting.ts            (existente — parâmetros corrigidos via US-26)
├── advanced-indicators.ts    (existente — sem modificação)
├── sentiment.ts              (existente — sem modificação)
├── bayesian-ab.ts            (NOVO — US-24 + fisherExact2x2 US-30)
├── anomaly-detection.ts      (NOVO — US-25)
├── hw-optimizer.ts           (NOVO — US-26)
├── causal-behavioral.ts      (NOVO — US-27)
├── isolation-forest.ts       (NOVO — US-28)
└── attribution.ts            (NOVO — US-29)
```

---

## Definition of Done do Epic

- [ ] Todos os 4 módulos implementados e exportando funções corretas
- [ ] Cada módulo tem testes unitários inline (doctest pattern)
- [ ] Z-test para CTR substituído por Chi² + Bayesian no ads-insights
- [ ] CUSUM operando sobre resíduos STL (sem falsos positivos sazonais)
- [ ] `holtWinters` pode receber parâmetros otimizados via `optimizeHW`
- [ ] Hook Rate e Social Proof Velocity disponíveis para uso na UI
- [ ] Nenhuma dependência externa adicionada ao package.json
- [ ] TypeScript sem erros de tipo (`npm run typecheck` passa)

---

## Referências Acadêmicas

- Granger (1969) — Investigating Causal Relations by Econometric Models. Econometrica.
- Hyndman & Athanasopoulos — Forecasting: Principles and Practice (caps. 8-9)
- Cleveland et al. (1990) — STL: A Seasonal-Trend Decomposition Procedure. JOSA.
- Kohavi et al. (2020) — Trustworthy Online Controlled Experiments. Cambridge.
- Fogg (2009) — A Behavior Model for Persuasive Design. Persuasive Technology.
