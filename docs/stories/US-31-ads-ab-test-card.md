# US-31: Card de A/B Test nos Ads (bayesianAB + Chi²)
**Status:** Ready
**Epic:** [EPIC-STAT-ENGINE](epics/EPIC-STAT-ENGINE.md)
**Prioridade:** 🔴 Alta
**Pontos:** 5
**Criado por:** @sm (River) | **Validado por:** @po (Pax)

---

## Descrição

Os módulos `bayesianAB` e `chiSquaredProportions` existem mas nunca aparecem na UI.
Criar o componente `AdsABTestCard` que compara automaticamente os 2 maiores ad sets
de uma campanha por CTR — exibindo resultado estatístico completo no dashboard de Ads.

Dados disponíveis: `adSets[].insights` contém impressões + cliques por ad set.

---

## Critérios de Aceitação

**AC-1:** Componente recebe `adSets: AdSet[]` e seleciona automaticamente os top 2 por impressões
**AC-2:** Executa `chiSquaredProportions(aClicks, aImpr, bClicks, bImpr)` e `bayesianAB(...)`
**AC-3:** Exibe: nome de cada variante, CTR A vs B, chi-sq pValue, P(B>A), `recommendation`
**AC-4:** Badge de resultado: `deploy_B` (verde), `keep_A` (vermelho), `inconclusive` (amarelo)
**AC-5:** Se < 2 ad sets com dados suficientes (> 100 impressões), exibe estado vazio
**AC-6:** Integrado na aba CAMPANHAS da página de Ads, após a tabela de campanhas
**AC-7:** Zero dependências externas novas

---

## Scope

**IN:**
- `features/ads/components/ads-ab-test-card.tsx` (CRIAR)
- `app/dashboard/ads/page.tsx` (MODIFICAR — adicionar `<AdsABTestCard adSets={filteredAdSets} />`)

**OUT:** Integração com Meta API para A/B test real (usa dados existentes de insights)

---

## File List

- `features/ads/components/ads-ab-test-card.tsx` (CRIAR)
- `app/dashboard/ads/page.tsx` (MODIFICAR)

---

## Change Log

| Data | Agente | Ação |
|------|--------|------|
| 2026-03-14 | @sm (River) | Story criada |
| 2026-03-14 | @po (Pax) | Validada — GO (10/10) |
| 2026-03-14 | @dev (Dex) | Implementação iniciada |
