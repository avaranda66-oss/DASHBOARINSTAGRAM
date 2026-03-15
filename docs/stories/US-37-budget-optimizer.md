# US-37: Budget Optimizer — Bid Landscape + Markowitz Allocation

**Status:** Done
**Epic:** [EPIC-STAT-ENGINE](epics/EPIC-STAT-ENGINE.md)
**Prioridade:** 🟠 Média-Alta
**Pontos:** 5
**Criado por:** @sm (River) | **Validado por:** @po (Pax) | **Analisado por:** @aios-master (Orion)

---

## Descrição

O sistema atual tem `diminishingReturns()` em `advanced-indicators.ts` para detectar
saturação de budget, mas **não tem otimização de alocação entre ad sets**.

Esta story implementa o `budget-optimizer.ts`: três funções independentes para
(1) estimar empiricamente a curva P(win|bid) a partir de dados históricos,
(2) maximizar conversões dado um budget via grid search 1D, e
(3) alocar budget entre ad sets com aproximação Markowitz diagonal (sem matriz de covariâncias).

Baseado na análise da pesquisa Perplexity (score 68/100). Decisão crítica:
**`detectDiminishingReturns` NÃO implementado** — redundante com `diminishingReturns()`
existente em `advanced-indicators.ts`.

---

## Critérios de Aceitação

**AC-1:** Tipos exportados com tipagem estrita:
```typescript
interface BidSample {
  bid: number;                   // proxy de bid (ex: target CPA invertido)
  eligibleImpressions: number;   // impressões elegíveis estimadas
  wonImpressions: number;        // impressões efetivamente entregues
}

interface BidBucket {
  bidCenter: number;
  winProb: number;               // [0, 1]
}

interface BidCurvePoint {
  bid: number;
  winProb: number;
  ctr: number;
  cvr: number;
  cpm: number;
}

interface BidOptResult {
  bid: number;
  expectedConversions: number;
  expectedCost: number;
}

interface AdSetStats {
  id: string;
  meanRoas: number;
  roasStd: number;
  minSpend: number;
  maxSpend: number;
}

interface Allocation {
  adSetId: string;
  spend: number;
}
```

**AC-2:** `estimateBidLandscape(samples: BidSample[], buckets?: number): BidBucket[]`:
- Default `buckets = 20`
- Ordena amostras por `bid` crescente
- Bina em chunks de `ceil(n / buckets)` amostras
- Por chunk: `bidCenter = média dos bids`, `winProb = totalWon / totalEligible`
- Skipa chunks com `totalEligible === 0`
- Enforça monotonicidade crescente: `result[i].winProb = max(result[i].winProb, result[i-1].winProb)`
- Retorna `[]` se `samples` vazio

**AC-3:** `optimizeBidUnderBudget(curve: BidCurvePoint[], eligibleImpressions: number, budget: number): BidOptResult | null`:
- Grid search sobre todos os pontos da curva
- Para cada ponto: `impressions = eligible × winProb`, `clicks = impressions × ctr`, `conversions = clicks × cvr`, `cost = impressions × cpm / 1000`
- Descarta pontos onde `cost > budget`
- Retorna o ponto de maior `conversions` dentro do budget, ou `null` se nenhum couber

**AC-4:** `allocateBudgetMarkowitzLike(adSets: AdSetStats[], totalBudget: number, riskAversion: number): Allocation[]`:
- Score ajustado por risco: `adjusted_i = meanRoas_i − riskAversion × roasStd_i`
- Normaliza para [0,1]: `norm_i = (adjusted_i − min) / (max − min)` — se todos iguais, `norm = 1`
- Peso proporcional ao score normalizado, com `max(norm, 0)` para evitar negativos
- Aloca `target_i = totalBudget × weight_i`, clampado entre `[minSpend_i, maxSpend_i]`
- Distribui `remaining` (sobra após clamps) pelos ad sets com maior score-ajustado, respeitando `maxSpend`
- Comportamento determinístico — zero `Math.random()`

**AC-5:** `detectDiminishingReturns` **NÃO implementado** — JSDoc no arquivo documenta:
```typescript
/**
 * NOTA: Para detecção de retornos decrescentes, use `diminishingReturns()`
 * de `lib/utils/advanced-indicators.ts` — já implementado com maior rigor.
 */
```

**AC-6:** JSDoc em `BidSample` documenta que `eligibleImpressions` e `wonImpressions`
são campos que precisam ser adicionados ao schema de `types/ads.ts` quando a integração
com Meta API for estendida para expor esses dados.

**AC-7:** Zero dependências externas. Importações de `math-core.ts` apenas se necessário
(ex: utilitários matemáticos já existentes).

**AC-8:** TypeScript estrito — zero `any` implícito, todos os tipos de retorno explícitos

**AC-9:** Todos os tipos e funções exportados do arquivo

---

## Scope

**IN:**
- `lib/utils/budget-optimizer.ts` (CRIAR)

**OUT:**
- `detectDiminishingReturns` (redundante com `advanced-indicators.ts`)
- Integração Lagrangiana completa com iteração de lambda (complexidade desproporcional ao ganho)
- UI de visualização de alocação (story futura)
- Integração com Meta API para `eligibleImpressions` real

---

## Dependências

| Módulo | Função | Uso |
|--------|--------|-----|
| `advanced-indicators.ts` | `diminishingReturns` | Referenciado na doc como alternativa — NÃO importado |
| `math-core.ts` | (opcional) | Utilitários se necessário |

---

## Notas de Implementação

### Por que Markowitz diagonal (sem covariâncias)
A aproximação diagonal `μ_i − γ × σ_i` é suficiente quando o número de ad sets é pequeno
(tipicamente 2-10) e os dados históricos são curtos demais para estimar covariâncias estáveis.
A matriz completa de Markowitz exigiria no mínimo `n × (n+1) / 2` estimativas de covariância
com dados suficientes — impraticável no contexto de ads com rotatividade alta de criativos.

### Limitação da bid landscape
Meta Ads não expõe diretamente `eligibleImpressions` via Graph API padrão. A função
`estimateBidLandscape` assume que esses dados serão coletados via campos de insights
estendidos ou estimados via CPM histórico. Documentado em JSDoc sem bloquear implementação.

### Grid search vs Lagrangiano
O grid search 1D é O(n) e suficiente com 20 buckets. A iteração de lambda seria mais elegante
matematicamente mas adiciona complexidade sem ganho prático significativo no contexto de
~20 pontos discretos de bid.

---

## File List

- `lib/utils/budget-optimizer.ts` (CRIAR)

---

## Change Log

| Data | Agente | Ação |
|------|--------|------|
| 2026-03-14 | @aios-master (Orion) | Análise crítica — score 68/100, aprovado |
| 2026-03-14 | @sm (River) | Story criada |
| 2026-03-14 | @po (Pax) | Validada — GO |
| 2026-03-14 | @dev (Dex) | Implementado: `lib/utils/budget-optimizer.ts` |
| 2026-03-14 | @qa (Quinn) | QA Gate PASS — TSC: 0 erros, ESLint: 0 warnings |
