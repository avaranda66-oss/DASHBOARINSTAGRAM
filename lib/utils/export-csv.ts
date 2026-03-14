/**
 * US-58 — Export CSV por Seção
 * Utilitário client-side para exportar dados como arquivo CSV.
 */

/** Converte um array de objetos em string CSV */
function toCSV(rows: Record<string, unknown>[], columns?: string[]): string {
    if (rows.length === 0) return '';

    const headers = columns ?? Object.keys(rows[0]);
    const escape = (v: unknown): string => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        // Escapa aspas e valores com vírgula/quebra de linha
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };

    const headerRow = headers.map(escape).join(',');
    const dataRows = rows.map(row =>
        headers.map(h => escape(row[h])).join(',')
    );

    return [headerRow, ...dataRows].join('\n');
}

/** Dispara download de arquivo CSV no browser */
export function downloadCsv(
    rows: Record<string, unknown>[],
    filename: string,
    columns?: string[]
): void {
    const csv = toCSV(rows, columns);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM para Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/** Gera nome de arquivo com data atual */
export function csvFilename(section: string): string {
    const date = new Date().toISOString().slice(0, 10);
    return `dashboard-${date}-${section}.csv`;
}

// ─── Formatadores de dados específicos ─────────────────────────────────────

import type { AdCampaign, DailyAdInsight } from '@/types/ads';

/** Formata campanhas para CSV */
export function campaignsToCSV(campaigns: AdCampaign[], currency: string): Record<string, unknown>[] {
    return campaigns.map(c => ({
        ID: c.id,
        Nome: c.name,
        Status: c.effective_status,
        Objetivo: c.objective,
        Gasto: c.insights?.spend ? `${parseFloat(c.insights.spend).toFixed(2)} ${currency}` : '0',
        Impressoes: c.insights?.impressions ?? '0',
        Cliques: c.insights?.clicks ?? '0',
        CTR: c.insights?.ctr ? `${parseFloat(c.insights.ctr).toFixed(2)}%` : '0%',
        CPM: c.insights?.cpm ? `${parseFloat(c.insights.cpm).toFixed(2)} ${currency}` : '0',
        CPC: c.insights?.cpc ? `${parseFloat(c.insights.cpc).toFixed(2)} ${currency}` : '0',
        ROAS: c.insights?.purchase_roas?.[0]?.value
            ? `${parseFloat(c.insights.purchase_roas[0].value).toFixed(2)}x`
            : '—',
        Alcance: c.insights?.reach ?? '0',
        Frequencia: c.insights?.frequency ?? '0',
    }));
}

/** Formata insights diários para CSV */
export function dailyInsightsToCSV(daily: DailyAdInsight[], currency: string): Record<string, unknown>[] {
    return daily.map(d => ({
        Data: d.date,
        Gasto: `${d.spend.toFixed(2)} ${currency}`,
        Impressoes: d.impressions,
        Cliques: d.clicks,
        CTR: `${d.ctr.toFixed(2)}%`,
        CPM: `${d.cpm.toFixed(2)} ${currency}`,
        CPC: `${d.cpc.toFixed(2)} ${currency}`,
        Conversoes: d.conversions,
        ROAS: `${d.roas.toFixed(2)}x`,
        Alcance: d.reach,
    }));
}
