import { NextRequest, NextResponse } from 'next/server';

/**
 * US-59 — PDF Report via browser print
 * Retorna HTML completo do relatório que o browser imprime como PDF.
 * Zero dependências externas — funciona em Vercel sem Puppeteer.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { accountName, accountId, period, kpiSummary, campaigns, dailyInsights, currency } = body;

        if (!kpiSummary) {
            return NextResponse.json({ success: false, error: 'kpiSummary ausente' }, { status: 400 });
        }

        const now = new Date().toLocaleString('pt-BR');
        const top10 = (campaigns as any[])
            .filter((c: any) => c.insights?.spend)
            .sort((a: any, b: any) => parseFloat(b.insights.spend) - parseFloat(a.insights.spend))
            .slice(0, 10);

        const fmtCurrency = (val: number) =>
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(val);
        const fmtNum = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

        const kpiRows = [
            ['Gasto Total', fmtCurrency(kpiSummary.totalSpend)],
            ['Impressões', fmtNum(kpiSummary.totalImpressions)],
            ['Cliques', fmtNum(kpiSummary.totalClicks)],
            ['CTR Médio', `${kpiSummary.avgCtr.toFixed(2)}%`],
            ['CPM Médio', fmtCurrency(kpiSummary.avgCpm)],
            ['ROAS', `${kpiSummary.roas.toFixed(2)}x`],
            ['Conversões', fmtNum(kpiSummary.totalConversions)],
            ['CPA', kpiSummary.cpa > 0 ? fmtCurrency(kpiSummary.cpa) : '—'],
            ['Alcance', fmtNum(kpiSummary.totalReach)],
        ].map(([label, value]) => `
            <div class="kpi-card">
                <div class="kpi-label">${label}</div>
                <div class="kpi-value">${value}</div>
            </div>
        `).join('');

        const campaignRows = top10.map((c: any) => {
            const i = c.insights;
            const spend = parseFloat(i?.spend || '0');
            const roas = parseFloat(i?.purchase_roas?.[0]?.value || '0');
            const ctr = parseFloat(i?.outbound_clicks_ctr?.[0]?.value || i?.ctr || '0');
            const statusClass = c.effective_status === 'ACTIVE' ? 'color:#16a34a' : 'color:#9ca3af';
            return `<tr>
                <td>${c.name}</td>
                <td style="${statusClass}">${c.effective_status}</td>
                <td>${fmtCurrency(spend)}</td>
                <td>${fmtNum(parseInt(i?.impressions || '0'))}</td>
                <td>${ctr.toFixed(2)}%</td>
                <td>${roas > 0 ? roas.toFixed(2) + 'x' : '—'}</td>
            </tr>`;
        }).join('');

        const dailyRows = ((dailyInsights as any[]) || []).slice(-14).map((d: any) => `<tr>
            <td>${d.date}</td>
            <td>${fmtCurrency(d.spend)}</td>
            <td>${fmtNum(d.impressions)}</td>
            <td>${fmtNum(d.clicks)}</td>
            <td>${d.ctr.toFixed(2)}%</td>
            <td>${d.conversions}</td>
            <td>${d.roas > 0 ? d.roas.toFixed(2) + 'x' : '—'}</td>
        </tr>`).join('');

        const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório Ads — ${accountName}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: monospace; color: #000; background: #fff; margin: 0; padding: 40px; }
  @media print {
    body { padding: 20px; }
    .no-print { display: none !important; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
  }
  h1 { font-size: 24px; margin: 0 0 4px 0; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 2px solid #000; padding-bottom: 8px; margin: 32px 0 16px 0; }
  .meta { color: #666; font-size: 11px; margin-bottom: 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { font-size: 10px; color: #999; text-align: right; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 32px; }
  .kpi-card { border: 1px solid #ddd; padding: 14px; }
  .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #666; }
  .kpi-value { font-size: 20px; font-weight: bold; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
  th { background: #f5f5f5; border: 1px solid #ddd; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
  td { border: 1px solid #ddd; padding: 7px 10px; }
  .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 12px; font-size: 10px; color: #999; display: flex; justify-content: space-between; }
  .print-btn { display: block; margin: 0 auto 32px; padding: 10px 24px; background: #000; color: #fff; border: none; font-family: monospace; font-size: 12px; cursor: pointer; letter-spacing: 0.1em; text-transform: uppercase; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">↓ IMPRIMIR / SALVAR PDF</button>

<div class="header">
  <div>
    <h1>${accountName}</h1>
    <div class="meta">ID: ${accountId} · Período: ${period} · Gerado em ${now}</div>
  </div>
  <div class="brand"><div>[ADS_ENGINE_V2]</div><div>Dashboard OSS</div></div>
</div>

<h2>Resumo de Performance</h2>
<div class="kpi-grid">${kpiRows}</div>

${top10.length > 0 ? `
<h2>Top Campanhas por Gasto</h2>
<table>
  <thead><tr><th>Campanha</th><th>Status</th><th>Gasto</th><th>Impressões</th><th>CTR</th><th>ROAS</th></tr></thead>
  <tbody>${campaignRows}</tbody>
</table>` : ''}

${dailyRows ? `
<h2>Tendência Diária (últimos 14 dias)</h2>
<table>
  <thead><tr><th>Data</th><th>Gasto</th><th>Impressões</th><th>Cliques</th><th>CTR</th><th>Conversões</th><th>ROAS</th></tr></thead>
  <tbody>${dailyRows}</tbody>
</table>` : ''}

<div class="footer">
  <span>Dashboard OSS · ADS_ENGINE_V2</span>
  <span>Gerado em ${now}</span>
</div>

<script>window.onload = function() { /* auto-print se chamado via URL com ?print=1 */
  if (new URLSearchParams(window.location.search).get('print') === '1') window.print();
};</script>
</body>
</html>`;

        return new NextResponse(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
            },
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
