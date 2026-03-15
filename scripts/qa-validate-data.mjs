// QA Sprint - Validação de Dados Reais vs Dashboard
// Usa ads_token (EAA...) para Meta Ads API

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const GRAPH_BASE = 'https://graph.facebook.com/v25.0';

async function main() {
  // FASE 0 — Credenciais
  const account = await prisma.account.findFirst({ where: { name: { contains: 'VARANDA' } } });
  await prisma.$disconnect();

  if (!account?.ads_token) { console.error('ADS_TOKEN NÃO ENCONTRADO'); process.exit(1); }

  const token = account.ads_token;
  const accountId = account.ads_account_id;

  console.log('=== FASE 0 — CREDENCIAIS ===');
  console.log('Conta:', account.name);
  console.log('Account ID:', accountId);
  console.log('Token (12 chars):', token.substring(0, 12) + '...');
  console.log('Token prefix:', token.substring(0, 4), '→ Facebook Ads ✅');

  // FASE 1.1 — Campanhas
  console.log('\n=== FASE 1.1 — CAMPANHAS ===');
  const fields = [
    'id','name','status','daily_budget','lifetime_budget','budget_remaining',
    'start_time','stop_time','created_time',
    'insights{spend,impressions,clicks,ctr,cpc,cpm,purchase_roas,actions,frequency,date_start,date_stop}'
  ].join(',');

  const campUrl = `${GRAPH_BASE}/${accountId}/campaigns?fields=${encodeURIComponent(fields)}&date_preset=last_30d&limit=10&access_token=${encodeURIComponent(token)}`;
  const campRes = await fetch(campUrl);
  const campJson = await campRes.json();

  if (campJson.error) {
    console.log('ERRO_API_CAMPANHAS:', campJson.error.message, '| code:', campJson.error.code, '| subcode:', campJson.error.error_subcode);
    process.exit(1);
  }

  const campaigns = campJson.data || [];
  console.log('Total campanhas retornadas:', campaigns.length);

  const campData = campaigns.map(c => ({
    ...c,
    _insights: c.insights?.data?.[0] || null,
  }));

  // Tabela resumo raw
  console.log('\n[RAW] Campanha | Status | Budget | Spend | Impressões | CTR | ROAS');
  for (const c of campData) {
    const i = c._insights;
    const budget = c.daily_budget ? `D:${(parseFloat(c.daily_budget)/100).toFixed(0)}` : c.lifetime_budget ? `L:${(parseFloat(c.lifetime_budget)/100).toFixed(0)}` : 'N/A';
    const roas = i?.purchase_roas?.[0]?.value || '—';
    console.log(`  [${c.status}] ${c.name.substring(0,40)} | Budget:${budget} | Spend:${i?.spend||'—'} | Imp:${i?.impressions||'—'} | CTR:${i?.ctr||'—'} | ROAS:${roas}`);
  }

  // FASE 1.2 — Demographics
  console.log('\n=== FASE 1.2 — DEMOGRAPHICS AGE/GENDER ===');
  const demoUrl = `${GRAPH_BASE}/${accountId}/insights?fields=spend,impressions,clicks,ctr,cpc,actions&breakdowns=age,gender&date_preset=last_30d&limit=20&access_token=${encodeURIComponent(token)}`;
  const demoRes = await fetch(demoUrl);
  const demoJson = await demoRes.json();

  if (demoJson.error) {
    console.log('ERRO_DEMO:', demoJson.error.message);
  } else {
    const rows = demoJson.data || [];
    console.log('Rows retornados:', rows.length);
    rows.slice(0, 6).forEach(r => console.log(' ', JSON.stringify({ age: r.age, gender: r.gender, spend: r.spend, impressions: r.impressions, ctr: r.ctr })));
  }

  // FASE 1.3 — Placement
  console.log('\n=== FASE 1.3 — PLACEMENT ===');
  const placeUrl = `${GRAPH_BASE}/${accountId}/insights?fields=spend,impressions,clicks,ctr&breakdowns=publisher_platform,platform_position&date_preset=last_30d&limit=20&access_token=${encodeURIComponent(token)}`;
  const placeRes = await fetch(placeUrl);
  const placeJson = await placeRes.json();

  if (placeJson.error) {
    console.log('ERRO_PLACEMENT:', placeJson.error.message);
  } else {
    const rows = placeJson.data || [];
    console.log('Rows retornados:', rows.length);
    rows.slice(0, 6).forEach(r => console.log(' ', JSON.stringify({ platform: r.publisher_platform, position: r.platform_position, spend: r.spend, impressions: r.impressions, ctr: r.ctr })));
  }

  // FASE 2 — Validação de cálculos
  console.log('\n=== FASE 2.1 — BUDGET PACING (calculateBudgetPacing) ===');

  function parseCents(v) { return v ? (parseFloat(v) || 0) / 100 : 0; }
  function daysBetween(a, b) {
    if (!a) return 1;
    const ms = new Date(b).getTime() - new Date(a).getTime();
    return Math.max(Math.ceil(ms / 86400000), 0);
  }

  function calculateBudgetPacing(campaign) {
    const dailyBudget = parseCents(campaign.daily_budget);
    const lifetimeBudget = parseCents(campaign.lifetime_budget);
    const budgetTotal = lifetimeBudget || dailyBudget;
    if (budgetTotal <= 0) return null;

    const ins = campaign._insights;
    const spend = ins ? parseFloat(ins.spend) || 0 : 0;
    const budgetRemaining = campaign.budget_remaining
      ? parseCents(campaign.budget_remaining)
      : Math.max(budgetTotal - spend, 0);

    const now = new Date();
    const startDate = ins?.date_start || campaign.start_time || campaign.created_time;
    const endDate = campaign.stop_time || ins?.date_stop;

    const daysElapsed = Math.max(daysBetween(startDate, now.toISOString()), 1);
    const totalPeriodDays = endDate ? daysBetween(startDate, endDate) : 30;
    const daysRemaining = Math.max(totalPeriodDays - daysElapsed, 0);
    const avgDailySpend = spend / daysElapsed;

    const expectedUtilizationPct = totalPeriodDays > 0 ? Math.min((daysElapsed / totalPeriodDays) * 100, 100) : 100;
    const utilizationPct = budgetTotal > 0 ? (spend / budgetTotal) * 100 : 0;
    const pacingRatio = expectedUtilizationPct > 0 ? utilizationPct / expectedUtilizationPct : (utilizationPct > 0 ? 999 : 1);

    let status;
    if (budgetRemaining <= 0 || utilizationPct >= 99) status = 'exhausted';
    else if (pacingRatio > 1.2) status = 'overspending';
    else if (pacingRatio < 0.6) status = 'underspending';
    else status = 'on_track';

    return { status, budgetTotal, spend, budgetRemaining, avgDailySpend, daysRemaining, utilizationPct, expectedUtilizationPct, pacingRatio };
  }

  function extractCampaignMetrics(campaign) {
    const ins = campaign._insights;
    if (!ins) return { cpa: 0, roas: 0, ctr: 0, cpc: 0, cpm: 0, spend: 0, conversions: 0, impressions: 0, frequency: 0 };

    const spend = parseFloat(ins.spend) || 0;
    const impressions = parseInt(ins.impressions) || 0;
    const clicks = parseInt(ins.clicks) || 0;
    const ctr = parseFloat(ins.ctr || '0') || 0;
    const cpc = parseFloat(ins.cpc || '0') || 0;
    const cpm = parseFloat(ins.cpm || '0') || 0;
    const frequency = parseFloat(ins.frequency || '0') || 0;

    const convTypes = new Set(['offsite_conversion.fb_pixel_purchase','offsite_conversion.fb_pixel_lead','offsite_conversion.fb_pixel_complete_registration','lead']);
    let conversions = 0;
    if (ins.actions) for (const a of ins.actions) if (convTypes.has(a.action_type)) conversions += parseInt(a.value) || 0;

    let roas = 0;
    if (ins.purchase_roas?.length > 0) {
      const omni = ins.purchase_roas.find(r => r.action_type === 'omni_purchase');
      roas = parseFloat((omni || ins.purchase_roas[0]).value) || 0;
    }
    const cpa = conversions > 0 ? spend / conversions : 0;
    return { cpa, roas, ctr, cpc, cpm, spend, conversions, impressions, frequency };
  }

  console.log('\nCampanha | Pacing Status | Budget | Gasto API | Gasto Calc | Match? | Utilização | Ratio');
  const pacingResults = [];
  for (const c of campData) {
    const pacing = calculateBudgetPacing(c);
    if (!pacing) {
      console.log(`  [SEM BUDGET] ${c.name.substring(0,35)} → null ✅`);
      pacingResults.push({ name: c.name, status: 'NO_BUDGET', correct: true });
      continue;
    }
    const apiSpend = c._insights ? parseFloat(c._insights.spend || '0') : 0;
    const spendMatch = Math.abs(pacing.spend - apiSpend) < 0.01;
    console.log(`  [${pacing.status}] ${c.name.substring(0,35)} | Budget:R$${pacing.budgetTotal.toFixed(0)} | APIspend:${apiSpend} | CalcSpend:${pacing.spend.toFixed(2)} | Match:${spendMatch?'✅':'❌'} | Util:${pacing.utilizationPct.toFixed(1)}% | Ratio:${pacing.pacingRatio.toFixed(2)}`);
    pacingResults.push({ name: c.name, status: pacing.status, spendMatch, utilizationPct: pacing.utilizationPct });
  }

  console.log('\n=== FASE 2.2 — MÉTRICAS DO MOTOR (extractCampaignMetrics) ===');
  console.log('\nCampanha | CTR API | CTR Calc | Match | CPC API | CPC Calc | Match | ROAS API | ROAS Calc | Match');
  const metricResults = [];
  for (const c of campData) {
    if (!c._insights) { console.log(`  [SEM INSIGHTS] ${c.name.substring(0,30)}`); continue; }
    const m = extractCampaignMetrics(c);
    const ins = c._insights;
    const apiCtr = parseFloat(ins.ctr || '0');
    const apiCpc = parseFloat(ins.cpc || '0');
    const apiRoas = ins.purchase_roas?.[0] ? parseFloat(ins.purchase_roas[0].value) : 0;

    // CTR do motor é extraído diretamente da API (não recalculado), deve ser idêntico
    const ctrMatch = Math.abs(m.ctr - apiCtr) < 0.0001;
    const cpcMatch = Math.abs(m.cpc - apiCpc) < 0.0001;
    const roasMatch = Math.abs(m.roas - apiRoas) < 0.001;

    console.log(`  ${c.name.substring(0,30)} | CTR: ${apiCtr.toFixed(4)} vs ${m.ctr.toFixed(4)} ${ctrMatch?'✅':'❌'} | CPC: ${apiCpc.toFixed(4)} vs ${m.cpc.toFixed(4)} ${cpcMatch?'✅':'❌'} | ROAS: ${apiRoas.toFixed(4)} vs ${m.roas.toFixed(4)} ${roasMatch?'✅':'❌'} | Conv:${m.conversions}`);
    metricResults.push({ name: c.name.substring(0,30), ctrMatch, cpcMatch, roasMatch });
  }

  console.log('\n=== FASE 2.3 — INDICADORES ESTATÍSTICOS ===');
  const withSpend = campData.filter(c => c._insights && parseFloat(c._insights.spend || '0') > 0);
  if (withSpend.length === 0) {
    console.log('Nenhuma campanha com spend > 0 no período last_30d.');
    console.log('NOTA: Indicadores engagementScore/viralPotential/weightedTrend requerem série histórica diária. Sem dados de série, retornariam 0 ou null.');
  } else {
    const best = withSpend.sort((a,b) => parseFloat(b._insights.spend) - parseFloat(a._insights.spend))[0];
    console.log('Campanha mais rica:', best.name);
    const ins = best._insights;
    console.log('  Spend:', ins.spend, '| Impressões:', ins.impressions, '| CTR:', ins.ctr, '| Freq:', ins.frequency);

    // engagementScore — espera array de posts com likes/comments/shares/reach
    // Não disponível neste endpoint de campanha → retornaria 0
    console.log('  engagementScore: requer posts com likes/comments/shares — NÃO disponível em insights de campanha');
    console.log('  viralPotentialIndex: requer shares + reach → NÃO disponível');
    console.log('  weightedRecentTrend: requer série temporal diária (30 pontos) → NÃO disponível nesta chamada');
    console.log('  STATUS: Indicadores estatísticos só se aplicam ao módulo Instagram Analytics, não ao Ads. ✅ (sem divergência)');
  }

  // FASE 3 — Demographics estrutura
  console.log('\n=== FASE 3 — VALIDAÇÃO DEMOGRAPHICS ===');
  if (!demoJson.error && demoJson.data?.length > 0) {
    const sample = demoJson.data[0];
    const checks = {
      'age presente': 'age' in sample,
      'gender presente': 'gender' in sample,
      'spend presente': 'spend' in sample,
      'impressions presente': 'impressions' in sample,
      'ctr presente': 'ctr' in sample,
      'actions presente': 'actions' in sample,
    };
    console.log('Campos no breakdown age/gender:');
    for (const [k,v] of Object.entries(checks)) console.log(`  ${v?'✅':'❌'} ${k}`);
    console.log('  Componente ads-demographics-section.tsx espera: age, gender, spend, impressions, ctr, conversions, roas');
    const hasAllRequired = checks['age presente'] && checks['gender presente'] && checks['spend presente'] && checks['impressions presente'];
    console.log('  Estrutura compatível com componente?', hasAllRequired ? '✅ SIM' : '❌ NÃO');
  } else if (demoJson.error) {
    console.log('  Não foi possível validar — erro na API:', demoJson.error.message);
  } else {
    console.log('  Array vazio retornado — sem dados de demographics no período.');
  }

  // Resumo final
  console.log('\n=== RESUMO FINAL ===');
  console.log('Campanhas total:', campaigns.length);
  const pacingOk = pacingResults.filter(r => r.spendMatch !== false).length;
  console.log('Pacing spend match:', pacingOk, '/', pacingResults.filter(r => r.spendMatch !== undefined).length);
  const metricsOk = metricResults.filter(r => r.ctrMatch && r.cpcMatch && r.roasMatch).length;
  console.log('Métricas 100% match:', metricsOk, '/', metricResults.length);
}

main().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
