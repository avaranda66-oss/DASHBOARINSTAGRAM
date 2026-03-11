# US-16: Account-Level Insights (Metricas da Conta)

**Status:** Ready
**Prioridade:** CRITICA
**Estimativa:** 4-5 horas
**Depende de:** US-15
**Branch:** v2-dashboard

---

## Descricao

Implementar busca de insights a nivel de conta (account-level), que sao metricas agregadas diarias da conta inteira. Atualmente o dashboard so busca insights por post individual, perdendo tendencias temporais da conta como crescimento de seguidores, reach diario e engagement diario.

---

## Acceptance Criteria

### AC-1: Novo service function `fetchAccountInsights()`
- [ ] Criar funcao em `instagram-graph.service.ts`
- [ ] Chamar `GET /{user_id}/insights` com metricas: `reach,views,accounts_engaged,total_interactions,likes,comments,saves,shares,follows_and_unfollows,profile_links_taps`
- [ ] Parametro `period=day`
- [ ] Parametro `since` e `until` para range de datas (default: ultimos 30 dias)
- [ ] Parsear resposta que vem em formato `{ data: [{ name, period, values: [{ value, end_time }] }] }`
- [ ] Retornar dados estruturados por data

### AC-2: Novo service function `fetchAudienceDemographics()`
- [ ] Chamar `GET /{user_id}/insights` com metricas: `follower_demographics,engaged_audience_demographics`
- [ ] Parametro `period=lifetime`
- [ ] Parametro `timeframe=last_30_days`
- [ ] Breakdowns: `age,city,country,gender` (um request por breakdown)
- [ ] Tratar caso de conta com <100 seguidores (retorna vazio)
- [ ] Retornar dados estruturados por breakdown type

### AC-3: Novo API endpoint `/api/meta-account-insights`
- [ ] POST handler recebe `{ token, days?: number }` (default 30)
- [ ] Validacao de token
- [ ] Chama `fetchAccountInsights()` + `fetchAudienceDemographics()`
- [ ] Retorna `{ success, accountInsights, demographics, period }`

### AC-4: Armazenamento dos dados
- [ ] Salvar account insights no Analytics table com type `meta_account`
- [ ] Separar de post-level data (type `meta` existente)
- [ ] Incluir periodo nos dados salvos para historico

---

## Dados Retornados (Estrutura)

```typescript
interface AccountInsights {
  daily: {
    date: string; // "2026-03-01"
    reach: number;
    views: number;
    accountsEngaged: number;
    totalInteractions: number;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
    followsNet: number; // follows - unfollows
    profileLinksTaps: number;
  }[];
  demographics: {
    followers: {
      age: { range: string; count: number }[];
      gender: { type: string; count: number }[];
      city: { name: string; count: number }[];
      country: { code: string; count: number }[];
    };
    engaged: {
      age: { range: string; count: number }[];
      gender: { type: string; count: number }[];
      city: { name: string; count: number }[];
      country: { code: string; count: number }[];
    };
  };
}
```

---

## Escopo

**IN:**
- Service functions para account insights + demographics
- API route `/api/meta-account-insights`
- Persistencia no Analytics table
- TypeScript interfaces

**OUT:**
- Componentes de UI (US-18)
- Graficos de demographics (US-18)
- Business Discovery (US-19)

---

## Criterio de Done
- [ ] `npm run build` passa
- [ ] Endpoint retorna dados reais da conta do usuario
- [ ] Demographics retorna dados (se conta tem 100+ followers)
- [ ] Dados sao salvos no banco para consulta futura

---

## File List
- [ ] `lib/services/instagram-graph.service.ts` — Novas funcoes
- [ ] `app/api/meta-account-insights/route.ts` — Novo endpoint
- [ ] `lib/types/instagram.ts` ou inline — Interfaces AccountInsights
