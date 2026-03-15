# US-29: Shapley Attribution + Markov Chain para Touchpoints
**Status:** Ready
**Epic:** [EPIC-STAT-ENGINE](epics/EPIC-STAT-ENGINE.md)
**Prioridade:** 🔴 Alta
**Pontos:** 8
**Criado por:** @sm (River) | **Validado por:** @po (Pax)

---

## Descrição

Modelos de atribuição "last touch" e "first touch" distorcem a análise de ROAS em
campanhas multi-canal. Precisamos de atribuição baseada em teoria dos jogos (Shapley)
para dividir o crédito de conversão de forma matematicamente justa entre canais,
e Markov Chain para modelar caminhos de conversão e calcular o removal effect de cada canal.

Esta story cria `lib/utils/attribution.ts` com:
1. `shapleyValues` — divisão de crédito via Shapley (teoria dos jogos)
2. `estimateTransitionMatrix` — Markov Chain a partir de histórico de paths
3. `removalEffect` — impacto de remover um canal na taxa de conversão

---

## Critérios de Aceitação

**AC-1 — shapleyValues:**
- `shapleyValues(players: string[], valueFn: (coalition: string[]) => number): Record<string, number>`
- Usa bitmask 2^n (suporta até 20 players, otimizado para até 5 touchpoints)
- Fórmula de Shapley: φᵢ = Σ_{S ⊆ N\{i}} |S|!(n-|S|-1)!/n! * [v(S∪{i}) - v(S)]
- Precomputa todos os 2^n valores de coalização para eficiência
- Resultado soma ao valor da grande coalizão: Σφᵢ = v(N)

**AC-2 — estimateTransitionMatrix:**
- `estimateTransitionMatrix(paths: string[][]): TransitionMatrix`
- `TransitionMatrix = { states: string[]; P: number[][] }` (row = from, col = to)
- Conta transições e normaliza por linha
- Estados ordenados alfabeticamente

**AC-3 — removalEffect:**
- `removalEffect(matrix: TransitionMatrix, channelState: string, startState: string, convState: string): number`
- Remove canal: zera todas as transições a partir daquele estado
- Calcula P(convert) via power iteration antes e depois da remoção
- Retorna: `(P_base - P_removed) / P_base` (proporção de conversões atribuída ao canal)
- Retorna 0 se canal não existe ou P_base = 0

**AC-4 — Zero dependências externas**
- TypeScript puro
- Todas as interfaces e funções exportadas

---

## Scope

**IN:**
- Arquivo `lib/utils/attribution.ts`
- Funções: `shapleyValues`, `estimateTransitionMatrix`, `removalEffect`
- Interfaces: `TransitionMatrix`, `ShapleyResult`

**OUT:**
- Integração na UI
- Suporte a paths ponderados (com probabilidade)
- Atribuição multi-touch linear/time-decay (suficiente Shapley + Markov)

---

## Dependências

- Nenhuma story prerequisito
- Nenhum import externo

---

## Riscos

- Power iteration pode não convergir para grafos com ciclos fortes — mitigado com maxIter=1000 e tolerância
- Shapley: 2^n coalitions — para n=20 são 1M coalitions, pode ser lento — documentar limite recomendado (n≤10 para uso prático)

---

## File List

- `lib/utils/attribution.ts` (CRIAR)

---

## Change Log

| Data | Agente | Ação |
|------|--------|------|
| 2026-03-14 | @sm (River) | Story criada |
| 2026-03-14 | @po (Pax) | Validada — GO (10/10) |
| 2026-03-14 | @dev (Dex) | Implementação iniciada |
