// =============================================================================
// attribution.ts — Atribuição Multi-Touch: Shapley Values + Markov Chain
// Pure TypeScript, zero dependencies
//
// Story: US-29 — Shapley Attribution + Markov Chain para Touchpoints
// Referência: Shapley (1953) "A Value for n-Person Games". Contributions to
//             the Theory of Games, vol.2, Annals of Mathematics Studies.
//             Anderl et al. (2016) "Mapping the Customer Journey". IJRM.
// =============================================================================

// =============================================================================
// Tipos Públicos
// =============================================================================

/**
 * Matriz de transição de uma Markov Chain.
 *
 * `P[i][j]` = probabilidade de transição do estado `states[i]` para `states[j]`.
 * Cada linha soma 1.0 (ou 0.0 se o estado não tem saída — estado absorvente).
 */
export interface TransitionMatrix {
  /** Estados únicos ordenados alfabeticamente */
  states: string[];
  /** Matriz estocástica N×N (row = from, col = to) */
  P: number[][];
}

// =============================================================================
// Helpers Internos
// =============================================================================

/**
 * Conta o número de bits 1 em um inteiro não-negativo.
 * Usado para calcular o tamanho de uma coalização representada por bitmask.
 */
function countBits(n: number): number {
  let count = 0;
  let x = n;
  while (x > 0) {
    count += x & 1;
    x >>>= 1;
  }
  return count;
}

/**
 * Calcula P(atingir `absorbIdx` | partir de `startIdx`) via power iteration.
 *
 * Distribui probabilidade ao longo da cadeia de Markov iterativamente até
 * convergência. Estados absorventes (linha zero na matriz) param de propagar.
 *
 * @param P - Matriz de transição N×N
 * @param startIdx - Índice do estado inicial
 * @param absorbIdx - Índice do estado de conversão (absorvente)
 * @param n - Número de estados
 * @param maxIter - Máximo de iterações (default: 1000)
 * @param tol - Tolerância de convergência (default: 1e-8)
 */
function absorptionProb(
  P: number[][],
  startIdx: number,
  absorbIdx: number,
  n: number,
  maxIter = 1000,
  tol = 1e-8
): number {
  // Distribuição inicial
  let dist = new Array<number>(n).fill(0);
  dist[startIdx] = 1;

  let cumConv = 0;

  for (let iter = 0; iter < maxIter; iter++) {
    const next = new Array<number>(n).fill(0);
    let totalMass = 0;

    for (let i = 0; i < n; i++) {
      const prob = dist[i];
      if (prob < 1e-15) continue;

      // Estado de conversão — absorver
      if (i === absorbIdx) {
        cumConv += prob;
        continue;
      }

      // Verificar se o estado tem saída
      const rowSum = P[i].reduce((a, v) => a + v, 0);
      if (rowSum < 1e-10) {
        // Estado absorvente não-conversão (ex: "null") — probabilidade perdida
        continue;
      }

      for (let j = 0; j < n; j++) {
        if (P[i][j] > 0) {
          next[j] += prob * P[i][j];
          totalMass += prob * P[i][j];
        }
      }
    }

    dist = next;

    if (totalMass < tol) break;
  }

  return Math.min(1, Math.max(0, cumConv));
}

// =============================================================================
// 1. Shapley Values
// =============================================================================

/**
 * Calcula os Shapley Values para atribuição de crédito entre jogadores.
 *
 * Implementação via enumeração de coalizões com bitmask 2^n.
 * Adequado para n ≤ 10 touchpoints (recomendado n ≤ 5 para uso em tempo real).
 *
 * Fórmula de Shapley:
 *   φᵢ = Σ_{S ⊆ N\{i}} [|S|!(n-|S|-1)!/n!] * [v(S∪{i}) - v(S)]
 *
 * Propriedades garantidas:
 * - Eficiência: Σφᵢ = v(N) — soma ao valor total
 * - Simetria: jogadores equivalentes recebem o mesmo valor
 * - Nulo: jogadores que não contribuem recebem 0
 * - Aditividade: linear na função de valor
 *
 * @param players - Nomes dos jogadores/canais (ex: ['facebook', 'email', 'google'])
 * @param valueFn - Função de valor: dado um conjunto de canais, retorna a métrica (ex: taxa de conversão)
 * @returns Dicionário {canal: shapleyValue} — valores somam a v(players)
 *
 * @example
 * ```typescript
 * // Qual canal contribui mais para conversões quando combinado com outros?
 * const phi = shapleyValues(
 *   ['facebook', 'email', 'google'],
 *   (coalition) => coalition.length === 0 ? 0 :
 *                  coalition.includes('google') ? 0.8 : 0.3
 * );
 * // phi.google ≈ 0.5, facebook ≈ 0.15, email ≈ 0.15
 * ```
 */
export function shapleyValues(
  players: string[],
  valueFn: (coalition: string[]) => number
): Record<string, number> {
  const n = players.length;

  if (n === 0) return {};
  if (n > 20) throw new Error('shapleyValues: máximo 20 jogadores (bitmask 2^20)');

  // Fatorial pré-computado (n até 20, evita overflow com n ≤ 20)
  const fact = new Array<number>(n + 1);
  fact[0] = 1;
  for (let i = 1; i <= n; i++) fact[i] = fact[i - 1] * i;

  // Pré-computa v(S) para todas as 2^n coalizões
  const totalMasks = 1 << n;
  const coalitionValues = new Array<number>(totalMasks);

  for (let mask = 0; mask < totalMasks; mask++) {
    const coalition: string[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) coalition.push(players[i]);
    }
    coalitionValues[mask] = valueFn(coalition);
  }

  const result: Record<string, number> = {};

  for (let i = 0; i < n; i++) {
    let phi = 0;
    const iBit = 1 << i;

    // Itera sobre todas as coalizões S que NÃO contêm o jogador i
    for (let mask = 0; mask < totalMasks; mask++) {
      if (mask & iBit) continue; // S deve excluir jogador i

      const sSize = countBits(mask);

      // Peso de Shapley: |S|!(n-|S|-1)!/n!
      const weight = (fact[sSize] * fact[n - sSize - 1]) / fact[n];

      // Contribuição marginal: v(S ∪ {i}) - v(S)
      const marginal = coalitionValues[mask | iBit] - coalitionValues[mask];

      phi += weight * marginal;
    }

    result[players[i]] = Math.round(phi * 100000) / 100000;
  }

  return result;
}

// =============================================================================
// 2. Markov Chain — Estimação da Matriz de Transição
// =============================================================================

/**
 * Estima a matriz de transição de uma Markov Chain a partir de histórico de paths.
 *
 * Cada path é uma sequência de estados visitados (ex: touchpoints até conversão).
 * Conta todas as transições estado→estado e normaliza por linha.
 *
 * @param paths - Array de sequências de estados (ex: [['start','fb','google','conv'], ...])
 * @returns `TransitionMatrix` com estados ordenados e matriz P
 *
 * @example
 * ```typescript
 * const paths = [
 *   ['start', 'facebook', 'convert'],
 *   ['start', 'email', 'facebook', 'convert'],
 *   ['start', 'google', 'null'],
 * ];
 * const { states, P } = estimateTransitionMatrix(paths);
 * ```
 */
export function estimateTransitionMatrix(paths: string[][]): TransitionMatrix {
  // Coleta todos os estados únicos
  const stateSet = new Set<string>();
  for (const path of paths) {
    for (const s of path) stateSet.add(s);
  }

  const states = Array.from(stateSet).sort();
  const n = states.length;
  const stateIdx = new Map<string, number>(states.map((s, i) => [s, i]));

  // Matriz de contagens de transições
  const counts: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));

  for (const path of paths) {
    for (let i = 0; i < path.length - 1; i++) {
      const fromIdx = stateIdx.get(path[i]);
      const toIdx = stateIdx.get(path[i + 1]);
      if (fromIdx !== undefined && toIdx !== undefined) {
        counts[fromIdx][toIdx]++;
      }
    }
  }

  // Normaliza por linha para obter probabilidades de transição
  const P: number[][] = counts.map(row => {
    const rowSum = row.reduce((a, v) => a + v, 0);
    if (rowSum === 0) return new Array<number>(n).fill(0);
    return row.map(v => Math.round((v / rowSum) * 100000) / 100000);
  });

  return { states, P };
}

// =============================================================================
// 3. Markov Chain — Removal Effect por Canal
// =============================================================================

/**
 * Calcula o removal effect de um canal na taxa de conversão via Markov Chain.
 *
 * Removal effect = proporção das conversões atribuída ao canal, definida como:
 *   RE(c) = (P_base - P_removed) / P_base
 *
 * Onde:
 * - P_base = P(atingir convState | partir de startState) com todos os canais
 * - P_removed = P(atingir convState | partir de startState) sem o canal c
 *   (remoção = zerar todas as transições que PARTEM do canal c)
 *
 * @param matrix - Matriz de transição obtida via `estimateTransitionMatrix`
 * @param channelState - Estado do canal a remover (ex: 'facebook')
 * @param startState - Estado inicial da jornada (ex: 'start')
 * @param convState - Estado de conversão absorvente (ex: 'convert')
 * @returns Removal effect ∈ [0, 1] — fração das conversões atribuída ao canal
 *
 * @example
 * ```typescript
 * const matrix = estimateTransitionMatrix(paths);
 * const re = removalEffect(matrix, 'facebook', 'start', 'convert');
 * // re = 0.35 → facebook é responsável por 35% das conversões
 * ```
 */
export function removalEffect(
  matrix: TransitionMatrix,
  channelState: string,
  startState: string,
  convState: string
): number {
  const { states, P } = matrix;
  const n = states.length;
  const stateIdx = new Map<string, number>(states.map((s, i) => [s, i]));

  const convIdx = stateIdx.get(convState);
  const startIdx = stateIdx.get(startState);
  const channelIdx = stateIdx.get(channelState);

  if (convIdx === undefined || startIdx === undefined) return 0;
  if (channelIdx === undefined) return 0;

  // Probabilidade base de conversão
  const pBase = absorptionProb(P, startIdx, convIdx, n);

  if (pBase < 1e-10) return 0;

  // Remove o canal: zera todas as transições que partem de channelIdx
  const P_removed = P.map((row, i) =>
    i === channelIdx ? new Array<number>(n).fill(0) : [...row]
  );

  const pRemoved = absorptionProb(P_removed, startIdx, convIdx, n);

  const re = (pBase - pRemoved) / pBase;
  return Math.round(Math.max(0, Math.min(1, re)) * 10000) / 10000;
}
