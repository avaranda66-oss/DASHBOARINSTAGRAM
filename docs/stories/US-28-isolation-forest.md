# US-28: Isolation Forest Multivariado para Anomalias em Ads
**Status:** Ready
**Epic:** [EPIC-STAT-ENGINE](epics/EPIC-STAT-ENGINE.md)
**Prioridade:** 🔴 Alta
**Pontos:** 5
**Criado por:** @sm (River) | **Validado por:** @po (Pax)

---

## Descrição

O módulo `anomaly-detection.ts` (US-25) opera em séries univariadas. Campanhas de ads
geram dados multivariados correlacionados (CTR, CPC, ROAS, frequência) onde anomalias
se manifestam como combinações incomuns — não como valores extremos em cada dimensão isolada.

Isolation Forest (Liu et al., 2008) detecta anomalias multivariadas sem assumir
distribuição, isolando pontos via partições aleatórias. Pontos fáceis de isolar = anomalias.

Esta story cria `lib/utils/isolation-forest.ts` com a classe `IsolationForest` pura TypeScript.

---

## Critérios de Aceitação

**AC-1 — Classe IsolationForest:**
- `new IsolationForest(options?)` aceita `{ nTrees, subSampling, seed }`
- Defaults: `nTrees=100`, `subSampling=256`, `seed=42`
- `fit(data: number[][])` treina o modelo com matriz N×D
- `scoreSamples(data: number[][])` retorna `number[]` com anomaly scores [0,1]
- `detect(data: number[][], threshold?)` retorna `IsolationForestResult`

**AC-2 — Score correto:**
- Score = `2^(-avgPathLen / c(n))` onde `c(n)` = comprimento médio esperado para n pontos
- `c(n) = 2 * H(n-1) - 2*(n-1)/n` (H = harmônico = ln(n-1) + 0.5772...)
- Score próximo de 1 = anomalia, próximo de 0.5 = normal

**AC-3 — PRNG determinístico:**
- NUNCA usar `Math.random()`
- LCG interno com seed=42 por default (configurável)
- Resultados idênticos para mesma entrada + mesmo seed

**AC-4 — Subsampling correto:**
- `psi = min(subSampling, n)` pontos por árvore (amostragem sem reposição)
- `maxDepth = ceil(log2(psi))` (limita profundidade para eficiência)

**AC-5 — Zero dependências externas**
- Apenas TypeScript puro, sem imports de outros utils (PRNG inline)
- Todas as funções/classe exportadas

---

## Scope

**IN:**
- Arquivo `lib/utils/isolation-forest.ts`
- Classe `IsolationForest` com métodos `fit`, `scoreSamples`, `detect`
- Interface `IsolationForestOptions` e `IsolationForestResult`
- PRNG LCG inline (não importar de outro arquivo)

**OUT:**
- Integração na UI (tarefa separada)
- Suporte a streaming/incremental fit
- Serialização/deserialização do modelo

---

## Dependências

- Nenhuma story prerequisito
- Nenhum import externo

---

## Riscos

- Recursão profunda em árvores pode causar stack overflow para `n` muito grande — mitigado por `maxDepth = ceil(log2(psi))`
- Partição onde min == max não divide: retornar leaf imediatamente

---

## File List

- `lib/utils/isolation-forest.ts` (CRIAR)

---

## Change Log

| Data | Agente | Ação |
|------|--------|------|
| 2026-03-14 | @sm (River) | Story criada |
| 2026-03-14 | @po (Pax) | Validada — GO (10/10) |
| 2026-03-14 | @dev (Dex) | Implementação iniciada |
