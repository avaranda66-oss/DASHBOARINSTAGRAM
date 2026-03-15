// ─── US-59b — Ads Report HTML Template ───────────────────────────────────────
// Auto-contido: sem imports externos, system fonts, paleta monocromática.
// Otimizado para A4 via @page CSS.

export interface ReportData {
    accountName: string;
    accountId: string;
    dateRange: { start: string; end: string };
    campaigns: Array<{
        name: string;
        status: string;
        spend: number;
        roas: number;
        ctr: number;
        cpc: number;
        impressions: number;
        clicks: number;
    }>;
    summary: {
        totalSpend: number;
        avgRoas: number;
        avgCtr: number;
        avgCpc: number;
        avgCpm: number;
        totalImpressions: number;
        totalClicks: number;
        totalConversions: number;
        totalCampaigns: number;
        activeCampaigns: number;
    };
    currency: string;
    generatedAt: string;
}

function fmtCurrency(val: number, currency: string): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(val);
}

function fmtNum(val: number): string {
    return new Intl.NumberFormat('pt-BR').format(val);
}

function statusStyle(status: string): string {
    if (status === 'ACTIVE') return 'color:#16a34a;font-weight:700;';
    if (status === 'PAUSED' || status === 'CAMPAIGN_PAUSED') return 'color:#9ca3af;';
    return 'color:#ef4444;';
}

function statusLabel(status: string): string {
    const map: Record<string, string> = {
        ACTIVE: 'Ativo',
        PAUSED: 'Pausado',
        CAMPAIGN_PAUSED: 'Camp. Pausada',
        ARCHIVED: 'Arquivado',
    };
    return map[status] || status;
}

export function buildAdsReportHtml(data: ReportData): string {
    const { accountName, accountId, dateRange, campaigns, summary, currency, generatedAt } = data;

    // Sort by spend desc
    const sorted = [...campaigns].sort((a, b) => b.spend - a.spend);

    const summaryCards = [
        { label: 'Gasto Total', value: fmtCurrency(summary.totalSpend, currency) },
        { label: 'ROAS Médio', value: summary.avgRoas > 0 ? `${summary.avgRoas.toFixed(2)}×` : '—' },
        { label: 'CTR Médio', value: `${summary.avgCtr.toFixed(2)}%` },
        { label: 'CPC Médio', value: fmtCurrency(summary.avgCpc, currency) },
        { label: 'Impressões', value: fmtNum(summary.totalImpressions) },
        { label: 'Cliques', value: fmtNum(summary.totalClicks) },
    ].map(c => `
        <div class="card">
            <div class="card-label">${c.label}</div>
            <div class="card-value">${c.value}</div>
        </div>
    `).join('');

    const campaignRows = sorted.map(c => `
        <tr>
            <td class="name-cell">${c.name}</td>
            <td style="${statusStyle(c.status)}">${statusLabel(c.status)}</td>
            <td class="num">${fmtCurrency(c.spend, currency)}</td>
            <td class="num">${c.roas > 0 ? `${c.roas.toFixed(2)}×` : '—'}</td>
            <td class="num">${c.ctr.toFixed(2)}%</td>
            <td class="num">${fmtCurrency(c.cpc, currency)}</td>
            <td class="num">${fmtNum(c.impressions)}</td>
            <td class="num">${fmtNum(c.clicks)}</td>
        </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório Ads — ${accountName}</title>
<style>
    @page {
        size: A4;
        margin: 20mm;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
        font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
        color: #1a1a1a;
        background: #fff;
        font-size: 11px;
        line-height: 1.5;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    .page {
        max-width: 210mm;
        margin: 0 auto;
        padding: 24px 0;
    }

    /* ── Header ── */
    .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: 16px;
        border-bottom: 2px solid #1a1a1a;
        margin-bottom: 24px;
    }

    .header h1 {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: -0.02em;
        margin-bottom: 4px;
    }

    .header-meta {
        font-size: 10px;
        color: #666;
        letter-spacing: 0.03em;
    }

    .header-brand {
        text-align: right;
        font-size: 9px;
        color: #999;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    /* ── Section ── */
    .section-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        border-bottom: 1px solid #ddd;
        padding-bottom: 6px;
        margin: 28px 0 14px 0;
        color: #1a1a1a;
    }

    /* ── Summary Cards ── */
    .cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-bottom: 8px;
    }

    .card {
        border: 1px solid #e0e0e0;
        padding: 12px 14px;
        border-radius: 4px;
    }

    .card-label {
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #888;
        margin-bottom: 4px;
    }

    .card-value {
        font-size: 18px;
        font-weight: 800;
        color: #1a1a1a;
    }

    /* ── Table ── */
    table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 16px;
        page-break-inside: auto;
    }

    thead {
        background: #f7f7f7;
    }

    th {
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        text-align: left;
        padding: 8px 10px;
        border: 1px solid #e0e0e0;
        color: #555;
    }

    td {
        padding: 7px 10px;
        border: 1px solid #e8e8e8;
        font-size: 10px;
    }

    tr {
        page-break-inside: avoid;
    }

    tr:nth-child(even) {
        background: #fafafa;
    }

    .name-cell {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 600;
    }

    .num {
        text-align: right;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }

    /* ── Meta strip ── */
    .meta-strip {
        display: flex;
        gap: 16px;
        font-size: 9px;
        color: #999;
        margin-bottom: 20px;
    }

    .meta-strip span {
        background: #f5f5f5;
        padding: 3px 8px;
        border-radius: 3px;
    }

    /* ── Footer ── */
    .footer {
        margin-top: 32px;
        padding-top: 12px;
        border-top: 1px solid #ddd;
        display: flex;
        justify-content: space-between;
        font-size: 9px;
        color: #aaa;
    }
</style>
</head>
<body>
<div class="page">

    <!-- HEADER -->
    <div class="header">
        <div>
            <h1>${accountName}</h1>
            <div class="header-meta">
                ID: ${accountId} &middot;
                Período: ${dateRange.start} → ${dateRange.end} &middot;
                Gerado em ${generatedAt}
            </div>
        </div>
        <div class="header-brand">
            <div>ADS_ENGINE_V2</div>
            <div>Dashboard OSS</div>
        </div>
    </div>

    <!-- META STRIP -->
    <div class="meta-strip">
        <span>${summary.totalCampaigns} campanhas total</span>
        <span>${summary.activeCampaigns} ativas</span>
        <span>${summary.totalConversions} conversões</span>
    </div>

    <!-- SUMMARY -->
    <div class="section-title">Resumo de Performance</div>
    <div class="cards">${summaryCards}</div>

    <!-- CAMPAIGNS TABLE -->
    ${sorted.length > 0 ? `
    <div class="section-title">Campanhas por Gasto</div>
    <table>
        <thead>
            <tr>
                <th>Campanha</th>
                <th>Status</th>
                <th>Gasto</th>
                <th>ROAS</th>
                <th>CTR</th>
                <th>CPC</th>
                <th>Impressões</th>
                <th>Cliques</th>
            </tr>
        </thead>
        <tbody>${campaignRows}</tbody>
    </table>` : ''}

    <!-- FOOTER -->
    <div class="footer">
        <span>Dashboard OSS &middot; ADS_ENGINE_V2</span>
        <span>Gerado em ${generatedAt}</span>
    </div>

</div>
</body>
</html>`;
}
