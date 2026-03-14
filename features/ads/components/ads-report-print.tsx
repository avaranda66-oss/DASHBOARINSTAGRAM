'use client';

/**
 * US-59 — PDF Report Generator
 * Componente de relatório otimizado para impressão/PDF via window.print().
 * Sem dependências externas — funciona em Vercel serverless.
 *
 * Uso: abrir em nova aba e print. O CSS @media print controla a aparência.
 */

import type { AdCampaign, AdsKpiSummary, DailyAdInsight } from '@/types/ads';

interface AdsReportPrintProps {
    accountName: string;
    accountId: string;
    period: string;
    kpiSummary: AdsKpiSummary;
    campaigns: AdCampaign[];
    dailyInsights: DailyAdInsight[];
    currency: string;
    generatedAt?: string;
}

function fmt(val: number, currency?: string): string {
    if (currency) return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(val);
    return new Intl.NumberFormat('pt-BR').format(val);
}

export function AdsReportPrint({
    accountName, accountId, period, kpiSummary, campaigns, dailyInsights, currency, generatedAt
}: AdsReportPrintProps) {
    const top10 = [...campaigns]
        .filter(c => c.insights?.spend)
        .sort((a, b) => parseFloat(b.insights!.spend) - parseFloat(a.insights!.spend))
        .slice(0, 10);

    const now = generatedAt ?? new Date().toLocaleString('pt-BR');

    return (
        <div className="ads-report" style={{ fontFamily: 'monospace', color: '#000', background: '#fff', padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
            <style>{`
                @media print {
                    body { margin: 0; }
                    .ads-report { padding: 20px; }
                    .no-print { display: none !important; }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                }
                .ads-report table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
                .ads-report th { background: #f5f5f5; border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
                .ads-report td { border: 1px solid #ddd; padding: 8px 12px; font-size: 12px; }
                .ads-report .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
                .ads-report .kpi-card { border: 1px solid #ddd; padding: 16px; }
                .ads-report .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #666; }
                .ads-report .kpi-value { font-size: 22px; font-weight: bold; margin-top: 4px; }
                .ads-report h1 { font-size: 24px; margin: 0 0 4px 0; }
                .ads-report h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 2px solid #000; padding-bottom: 8px; margin: 32px 0 16px 0; }
                .ads-report .meta { color: #666; font-size: 11px; margin-bottom: 32px; }
                .ads-report .badge-active { color: #16a34a; font-weight: bold; }
                .ads-report .badge-paused { color: #9ca3af; }
            `}</style>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                    <h1>{accountName}</h1>
                    <div className="meta">
                        ID: {accountId} · Período: {period} · Gerado em {now}
                    </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 10, color: '#999' }}>
                    <div>[ADS_ENGINE_V2]</div>
                    <div>Dashboard OSS</div>
                </div>
            </div>

            {/* KPIs */}
            <h2>Resumo de Performance</h2>
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-label">Gasto Total</div>
                    <div className="kpi-value">{fmt(kpiSummary.totalSpend, currency)}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Impressões</div>
                    <div className="kpi-value">{fmt(kpiSummary.totalImpressions)}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Cliques</div>
                    <div className="kpi-value">{fmt(kpiSummary.totalClicks)}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">CTR Médio</div>
                    <div className="kpi-value">{kpiSummary.avgCtr.toFixed(2)}%</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">CPM Médio</div>
                    <div className="kpi-value">{fmt(kpiSummary.avgCpm, currency)}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">ROAS</div>
                    <div className="kpi-value">{kpiSummary.roas.toFixed(2)}x</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Conversões</div>
                    <div className="kpi-value">{fmt(kpiSummary.totalConversions)}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">CPA</div>
                    <div className="kpi-value">{kpiSummary.cpa > 0 ? fmt(kpiSummary.cpa, currency) : '—'}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Alcance</div>
                    <div className="kpi-value">{fmt(kpiSummary.totalReach)}</div>
                </div>
            </div>

            {/* Top campanhas */}
            {top10.length > 0 && (
                <>
                    <h2>Top Campanhas por Gasto</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Campanha</th>
                                <th>Status</th>
                                <th>Gasto</th>
                                <th>Impressões</th>
                                <th>CTR</th>
                                <th>ROAS</th>
                                <th>CPA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {top10.map(c => {
                                const i = c.insights;
                                const spend = parseFloat(i?.spend || '0');
                                const roas = parseFloat(i?.purchase_roas?.[0]?.value || '0');
                                const ctr = parseFloat(i?.ctr || '0');
                                const outboundCtr = parseFloat(i?.outbound_clicks_ctr?.[0]?.value || '0');
                                const ctrDisplay = outboundCtr > 0 ? outboundCtr : ctr;
                                return (
                                    <tr key={c.id}>
                                        <td>{c.name}</td>
                                        <td className={c.effective_status === 'ACTIVE' ? 'badge-active' : 'badge-paused'}>
                                            {c.effective_status}
                                        </td>
                                        <td>{fmt(spend, currency)}</td>
                                        <td>{fmt(parseInt(i?.impressions || '0'))}</td>
                                        <td>{ctrDisplay.toFixed(2)}%</td>
                                        <td>{roas > 0 ? `${roas.toFixed(2)}x` : '—'}</td>
                                        <td>
                                            {kpiSummary.cpa > 0 ? fmt(kpiSummary.cpa, currency) : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </>
            )}

            {/* Tendência diária (últimos 14 dias) */}
            {dailyInsights.length > 0 && (
                <>
                    <h2>Tendência Diária ({Math.min(14, dailyInsights.length)} dias)</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Gasto</th>
                                <th>Impressões</th>
                                <th>Cliques</th>
                                <th>CTR</th>
                                <th>Conversões</th>
                                <th>ROAS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dailyInsights.slice(-14).map(d => (
                                <tr key={d.date}>
                                    <td>{d.date}</td>
                                    <td>{fmt(d.spend, currency)}</td>
                                    <td>{fmt(d.impressions)}</td>
                                    <td>{fmt(d.clicks)}</td>
                                    <td>{d.ctr.toFixed(2)}%</td>
                                    <td>{d.conversions}</td>
                                    <td>{d.roas > 0 ? `${d.roas.toFixed(2)}x` : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}

            {/* Footer */}
            <div style={{ marginTop: 48, borderTop: '1px solid #ddd', paddingTop: 16, fontSize: 10, color: '#999', display: 'flex', justifyContent: 'space-between' }}>
                <span>Dashboard OSS · ADS_ENGINE_V2</span>
                <span>Gerado em {now}</span>
            </div>
        </div>
    );
}
