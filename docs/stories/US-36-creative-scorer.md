# US-36: Creative Intelligence Scorer

**Status:** Done
**Epic:** [EPIC-STAT-ENGINE](epics/EPIC-STAT-ENGINE.md)
**Prioridade:** 🟡 Média
**Pontos:** 5
**Criado por:** @sm (River) | **Validado por:** @po (Pax) | **Analisado por:** @aios-master (Orion)

---

## Descrição

O sistema atual detecta fadiga criativa via `creativeHalfLife()` em `advanced-indicators.ts`,
mas não tem uma **rubrica de scoring multidimensional** que combine qualidade criativa
(visual + copy) com performance histórica e detecção estatística de fadiga.

Esta story implementa o `creative-scorer.ts`: um motor de scoring de criativos para Meta Ads
que usa métricas disponíveis via Graph API + metadados de criativos (anotados offline)
para produzir `CreativeScore` com dimensões separadas (visual, copy, performance, fadiga).

Baseado na análise da pesquisa Perplexity (score 68/100), com correções:
- `clamp01` e `zScore` **importados de `math-core.ts`** (não duplicados inline)
- `scoreFatigue` usa `stlDecompose()` de `anomaly-detection.ts` em vez de first-vs-last
- Metadados criativos adicionados como campos opcionais em `types/ads.ts`

---

## Critérios de Aceitação

**AC-1:** Tipos exportados com tipagem estrita:
```typescript
type HueLabel = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW' | 'BLACK' | 'OTHER';
type TextDensity = 'LOW' | 'MEDIUM' | 'HIGH';
type CaptionType = 'QUESTION' | 'STATEMENT' | 'LIST' | 'HOW_TO' | 'OTHER';
```

**AC-2:** Interface `CreativeMeta` com campos de metadados offline (todos opcionais exceto `id`):
- `id`, `campaignId`, `adSetId`, `objective`, `category`
- `dominantHue?: HueLabel`, `hasFace?: boolean`, `textDensity?: TextDensity`
- `captionType?: CaptionType`, `emojiCount?: number`, `isUGC?: boolean`

**AC-3:** `scoreVisual(meta: CreativeMeta): number` — retorna `[0, 1]`:
- Base 0.5
- `hasFace`: +0.15
- `textDensity LOW`: +0.15, `MEDIUM`: +0.05, `HIGH`: −0.10
- `isUGC`: +0.10
- Bônus de cor por categoria: FINANCE+BLUE (+0.05), FOOD+RED (+0.05), LOCAL_BUSINESS+GREEN (+0.03)
- Usa `clamp01` importado de `math-core.ts`

**AC-4:** `scoreCopy(meta: CreativeMeta): number` — retorna `[0, 1]`:
- Base 0.5
- `captionType QUESTION`: +0.10, `LIST`: +0.08, `HOW_TO`: +0.08
- `emojiCount` 1-5: +0.05, 6-8: −0.02, >8: −0.08
- Usa `clamp01` importado de `math-core.ts`

**AC-5:** `scorePerformance(current: CreativeStats, bench: CreativeBenchmark): number`:
- Base 0.5
- Log2 saturation: `+0.20 × log2(ctr/avgCtr + 1)` + `+0.15 × log2(saveRate/avgSaveRate + 1)` + `+0.10 × log2(commentRate/avgCommentRate + 1)`
- ROAS (se disponível): `+0.20 × log2(roas/avgRoas + 1)`
- Usa `clamp01` importado de `math-core.ts`
- Helper interno `relativeKpi(value, avg)`: retorna 1 se `avg <= 0`

**AC-6:** `scoreFatigue(serie: HistoricalSerie): number` — implementado via STL, **não** first-vs-last:
- Requer mínimo 3 pontos na série, senão retorna 0
- Extrai série de CTR dos pontos históricos
- Chama `stlDecompose(ctrSeries, period?)` de `anomaly-detection.ts`
- Considera fadigado se componente `trend` decresce por ≥ 3 períodos consecutivos: `fadiga += 0.4`
- Se `hookRate` presente e cai >10pp do início ao fim: `fadiga += 0.3`
- Se último spend > primeiro spend com trend decrescente: `fadiga += 0.2`
- Usa `clamp01` importado de `math-core.ts`

**AC-7:** `scoreCreative(meta: CreativeMeta, serie: HistoricalSerie): CreativeScore`:
```typescript
total = clamp01(0.2 × visual + 0.2 × copy + 0.5 × performance − 0.3 × fatigue)
```
Retorna `CreativeScore` com todos os sub-scores e `totalScore`.

**AC-8:** Schema de metadados sincronizado: campos `dominantHue`, `hasFace`, `textDensity`,
`captionType`, `emojiCount`, `isUGC` adicionados como opcionais em `types/ads.ts` (interface
`Creative` ou similar, se existir).

**AC-9:** Zero `Math.random()`, zero dependências externas, TypeScript estrito

**AC-10:** Todos os tipos e funções exportados do arquivo

---

## Scope

**IN:**
- `lib/utils/creative-scorer.ts` (CRIAR)
- `types/ads.ts` (MODIFICAR — adicionar campos de metadados criativos como opcionais)
- `lib/utils/math-core.ts` (MODIFICAR — exportar `clamp01` se ainda não exportado)

**OUT:**
- UI de exibição dos scores (depende de story de integração futura)
- Visão computacional / detecção automática de cor/faces (requer processo offline)
- Integração com `insight-engine.ts` para `CREATIVE_FATIGUE` (US-35 aceita como dep opcional)

---

## Dependências

| Módulo | Função | Uso |
|--------|--------|-----|
| `math-core.ts` | `clamp01` | Normalizar todos os sub-scores para [0,1] |
| `anomaly-detection.ts` | `stlDecompose` | Detectar tendência decrescente em CTR (scoreFatigue) |
| `causal-behavioral.ts` | `hookRate` | Referência para validação de hookRate nos pontos da série |

---

## Notas de Implementação

### Por que STL em vez de first-vs-last no scoreFatigue
A comparação direta `first.ctr vs last.ctr` é sensível a outliers de um único dia
(promoção, feriado). O `stlDecompose` remove sazonalidade e tendência de longo prazo,
deixando apenas o componente real de declínio — mesma abordagem de US-25.

### Metadados offline
Os campos `hasFace`, `textDensity` etc. não são retornados pelo Graph API.
A arquitetura prevê que sejam anotados por processo offline (ex: admin panel, planilha)
e salvos em banco de dados como extensão do criativo. A implementação desta US apenas
define o schema de tipos — o processo de anotação é OUT do escopo.

### clamp01 em math-core.ts
Verificar se já existe. Se não, adicionar:
```typescript
export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
```

---

## File List

- `lib/utils/creative-scorer.ts` (CRIAR)
- `types/ads.ts` (MODIFICAR)
- `lib/utils/math-core.ts` (MODIFICAR se necessário)

---

## Change Log

| Data | Agente | Ação |
|------|--------|------|
| 2026-03-14 | @aios-master (Orion) | Análise crítica — score 68/100, aprovado |
| 2026-03-14 | @sm (River) | Story criada |
| 2026-03-14 | @po (Pax) | Validada — GO |
| 2026-03-14 | @dev (Dex) | Implementado: `lib/utils/creative-scorer.ts` + patch `types/ads.ts` + `clamp01` em `math-core.ts` |
| 2026-03-14 | @qa (Quinn) | QA Gate PASS — TSC: 0 erros, ESLint: 0 warnings |
