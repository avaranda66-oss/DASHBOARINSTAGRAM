// =============================================================================
// isolation-forest.ts — Detecção de Anomalias Multivariadas
// Pure TypeScript, zero dependencies
//
// Story: US-28 — Isolation Forest Multivariado para Anomalias em Ads
// Referência: Liu et al. (2008) "Isolation Forest", ICDM
//             Liu et al. (2012) "Isolation-Based Anomaly Detection", TKDD
// =============================================================================

// =============================================================================
// Tipos Públicos
// =============================================================================

export interface IsolationForestOptions {
  /** Número de árvores de isolamento (default: 100) */
  nTrees?: number;
  /** Tamanho da subamostra por árvore — psi (default: 256) */
  subSampling?: number;
  /** Seed do PRNG para reprodutibilidade (default: 42) */
  seed?: number;
}

export interface IsolationForestResult {
  /** Anomaly scores [0,1] — próximo de 1 = anomalia, próximo de 0.5 = normal */
  scores: number[];
  /** true para cada ponto com score > threshold */
  anomalies: boolean[];
  /** Threshold usado */
  threshold: number;
}

// =============================================================================
// Tipos Internos
// =============================================================================

type Point = number[];

interface INode {
  /** Nó folha: não tem filhos */
  isLeaf: boolean;
  /** Número de pontos que chegaram a este nó durante o treino */
  size: number;
  /** Atributo de split (apenas nós internos) */
  splitAttr: number;
  /** Valor de split (apenas nós internos) */
  splitVal: number;
  left?: INode;
  right?: INode;
}

// =============================================================================
// Helpers Internos
// =============================================================================

/**
 * LCG determinístico como PRNG interno.
 * Mesma implementação de bayesian-ab.ts — inline para evitar acoplamento de módulos.
 * Parâmetros: Knuth (1997) TAOCP vol.2, §3.3.4
 */
function makePRNG(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223;
    s = s >>> 0;
    return s / 0x100000000;
  };
}

/**
 * Comprimento médio de caminho esperado para isolar um ponto em BST com n nós.
 *
 * c(n) = 2 * H(n-1) - 2*(n-1)/n
 * onde H(n) = ln(n) + γ (constante de Euler-Mascheroni ≈ 0.5772156649)
 *
 * Referência: Liu et al. (2008) Eq. 1
 */
function avgPathLength(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  const euler = 0.5772156649;
  const h = Math.log(n - 1) + euler;
  return 2 * h - (2 * (n - 1)) / n;
}

/**
 * Constrói uma árvore de isolamento recursivamente.
 *
 * @param data - Dataset completo de treino
 * @param indices - Índices dos pontos atribuídos a este nó
 * @param depth - Profundidade atual
 * @param maxDepth - Profundidade máxima = ceil(log2(psi))
 * @param rng - PRNG determinístico
 */
function buildTree(
  data: Point[],
  indices: number[],
  depth: number,
  maxDepth: number,
  rng: () => number
): INode {
  const size = indices.length;

  // Condição de parada: ponto único, profundidade máxima, ou nó vazio
  if (size <= 1 || depth >= maxDepth) {
    return { isLeaf: true, size, splitAttr: 0, splitVal: 0 };
  }

  const nFeatures = data[0].length;

  // Seleciona atributo aleatório
  const splitAttr = Math.floor(rng() * nFeatures);

  // Encontra min/max do atributo no subconjunto atual
  let minVal = Infinity;
  let maxVal = -Infinity;

  for (const idx of indices) {
    const v = data[idx][splitAttr];
    if (v < minVal) minVal = v;
    if (v > maxVal) maxVal = v;
  }

  // Todos os valores iguais neste atributo — torna-se folha
  if (minVal === maxVal) {
    return { isLeaf: true, size, splitAttr, splitVal: minVal };
  }

  // Valor de split uniforme em [min, max)
  const splitVal = minVal + rng() * (maxVal - minVal);

  const leftIdx: number[] = [];
  const rightIdx: number[] = [];

  for (const idx of indices) {
    if (data[idx][splitAttr] < splitVal) {
      leftIdx.push(idx);
    } else {
      rightIdx.push(idx);
    }
  }

  return {
    isLeaf: false,
    size,
    splitAttr,
    splitVal,
    left: buildTree(data, leftIdx, depth + 1, maxDepth, rng),
    right: buildTree(data, rightIdx, depth + 1, maxDepth, rng),
  };
}

/**
 * Comprimento do caminho para isolar `point` na árvore `node`.
 *
 * Para nós folha com size > 1 (atingiu maxDepth), adiciona c(size) como
 * estimativa do comprimento esperado para o sub-BST não expandido.
 *
 * @param point - Ponto a isolar
 * @param node - Nó atual da árvore
 * @param currentDepth - Profundidade acumulada
 */
function pathLength(point: Point, node: INode, currentDepth: number): number {
  if (node.isLeaf) {
    // Ajuste pelo tamanho do nó folha (comprimento esperado do sub-BST)
    return currentDepth + avgPathLength(node.size);
  }

  if (point[node.splitAttr] < node.splitVal) {
    return node.left
      ? pathLength(point, node.left, currentDepth + 1)
      : currentDepth + 1;
  } else {
    return node.right
      ? pathLength(point, node.right, currentDepth + 1)
      : currentDepth + 1;
  }
}

/**
 * Fisher-Yates shuffle (parcial) via PRNG determinístico.
 * Retorna os primeiros `k` elementos de uma permutação aleatória de [0..n-1].
 */
function sampleWithoutReplacement(n: number, k: number, rng: () => number): number[] {
  const pool = Array.from({ length: n }, (_, i) => i);
  const result: number[] = [];

  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rng() * (n - i));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
    result.push(pool[i]);
  }

  return result;
}

// =============================================================================
// Classe Principal
// =============================================================================

/**
 * Isolation Forest — Detecção de Anomalias Multivariadas.
 *
 * Princípio: pontos anômalos são facilmente isolados por partições aleatórias,
 * resultando em caminhos mais curtos nas árvores de isolamento.
 *
 * Score = 2^(-avgPathLen / c(psi)) — próximo de 1 = anomalia.
 *
 * @example
 * ```typescript
 * const iforest = new IsolationForest({ nTrees: 100, seed: 42 });
 * iforest.fit([[1,2],[1,3],[10,20]]);  // treina
 * const { anomalies } = iforest.detect([[1,2],[10,20]]);
 * // anomalies = [false, true]
 * ```
 */
export class IsolationForest {
  private trees: INode[] = [];
  private trainSize = 0;
  private readonly opts: Required<IsolationForestOptions>;

  constructor(options: IsolationForestOptions = {}) {
    this.opts = {
      nTrees: options.nTrees ?? 100,
      subSampling: options.subSampling ?? 256,
      seed: options.seed ?? 42,
    };
  }

  /**
   * Treina o modelo com o dataset fornecido.
   *
   * @param data - Matriz N×D de pontos (N amostras, D features)
   * @returns this (permite chaining: `iforest.fit(data).detect(data)`)
   */
  fit(data: Point[]): this {
    if (data.length === 0 || data[0].length === 0) return this;

    const { nTrees, subSampling, seed } = this.opts;
    const n = data.length;
    const psi = Math.min(subSampling, n);
    const maxDepth = Math.ceil(Math.log2(Math.max(psi, 2)));

    this.trainSize = psi;
    this.trees = [];

    const rng = makePRNG(seed);

    for (let t = 0; t < nTrees; t++) {
      const indices = sampleWithoutReplacement(n, psi, rng);
      this.trees.push(buildTree(data, indices, 0, maxDepth, rng));
    }

    return this;
  }

  /**
   * Calcula anomaly scores para cada ponto em `data`.
   *
   * @param data - Matriz N×D de pontos a avaliar
   * @returns Array de scores [0,1] — próximo de 1 = anomalia
   */
  scoreSamples(data: Point[]): number[] {
    if (this.trees.length === 0 || data.length === 0) {
      return data.map(() => 0.5);
    }

    const c = avgPathLength(this.trainSize);

    return data.map(point => {
      const avgLen =
        this.trees.reduce((sum, tree) => sum + pathLength(point, tree, 0), 0) /
        this.trees.length;

      // score = 2^(-avgLen/c): c=0 ocorre apenas se psi=1
      const score = c > 0 ? Math.pow(2, -avgLen / c) : 0.5;
      return Math.round(score * 10000) / 10000;
    });
  }

  /**
   * Detecta anomalias comparando scores com `threshold`.
   *
   * @param data - Matriz N×D de pontos a avaliar
   * @param threshold - Score mínimo para classificar como anomalia (default: 0.6)
   * @returns `{ scores, anomalies, threshold }`
   */
  detect(data: Point[], threshold = 0.6): IsolationForestResult {
    const scores = this.scoreSamples(data);
    return {
      scores,
      anomalies: scores.map(s => s > threshold),
      threshold,
    };
  }
}
