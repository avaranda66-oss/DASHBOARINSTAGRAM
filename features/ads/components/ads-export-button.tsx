'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { downloadCsv, csvFilename, campaignsToCSV, dailyInsightsToCSV } from '@/lib/utils/export-csv';
import type { AdCampaign, DailyAdInsight, AdsKpiSummary } from '@/types/ads';

interface AdsExportButtonProps {
    campaigns: AdCampaign[];
    dailyInsights: DailyAdInsight[];
    period: string;
    kpiSummary?: AdsKpiSummary | null;
    accountName?: string;
    accountId?: string;
    currency?: string;
}

export function AdsExportButton({
    campaigns,
    dailyInsights,
    period,
    kpiSummary,
    accountName = '',
    accountId = '',
    currency = 'BRL',
}: AdsExportButtonProps) {
    const [exportingPdf, setExportingPdf] = useState(false);
    const [exportingCsv, setExportingCsv] = useState(false);

    const handleExportPDF = async () => {
        if (!kpiSummary) {
            toast.error('Dados insuficientes para gerar relatório');
            return;
        }
        setExportingPdf(true);
        try {
            const res = await fetch('/api/ads-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountName,
                    accountId,
                    period,
                    kpiSummary,
                    campaigns,
                    dailyInsights,
                    currency,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Erro ao gerar relatório' }));
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            const html = await res.text();
            const win = window.open('', '_blank');
            if (!win) {
                toast.error('Pop-up bloqueado. Permita pop-ups para exportar PDF.');
                return;
            }
            win.document.write(html);
            win.document.close();
            toast.success('Relatório aberto — use Ctrl+P para salvar como PDF');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro ao exportar PDF';
            toast.error(message);
        } finally {
            setExportingPdf(false);
        }
    };

    const handleExportCsv = () => {
        setExportingCsv(true);
        try {
            const campaignRows = campaignsToCSV(campaigns, currency);
            downloadCsv(campaignRows, csvFilename(`campanhas-${period}`));

            if (dailyInsights.length > 0) {
                const dailyRows = dailyInsightsToCSV(dailyInsights, currency);
                downloadCsv(dailyRows, csvFilename(`diario-${period}`));
            }

            toast.success('CSV exportado com sucesso');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro ao exportar CSV';
            toast.error(message);
        } finally {
            setExportingCsv(false);
        }
    };

    const btnClass =
        'px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest border border-white/10 text-[#4A4A4A] hover:border-[#A3E635] hover:text-[#A3E635] transition-all disabled:opacity-40 flex items-center gap-1.5';

    return (
        <div className="flex items-center gap-2">
            <button onClick={handleExportPDF} disabled={exportingPdf} className={btnClass}>
                {exportingPdf ? (
                    <>
                        <span className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
                        GERANDO...
                    </>
                ) : (
                    '◈ PDF'
                )}
            </button>
            <button onClick={handleExportCsv} disabled={exportingCsv} className={btnClass}>
                {exportingCsv ? (
                    <>
                        <span className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
                        EXPORTANDO...
                    </>
                ) : (
                    '◈ CSV'
                )}
            </button>
        </div>
    );
}
