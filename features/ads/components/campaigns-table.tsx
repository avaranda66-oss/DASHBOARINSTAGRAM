'use client';

import { useState, Fragment, useMemo } from 'react';
import { Button } from '@/design-system/atoms/Button';
import type { AdCampaign, AdSet } from '@/types/ads';
// [ZERO_LUCIDE_PURGE]
import { toast } from 'sonner';
import { analyzeAuctionPressure, computeAccountAverages } from '@/lib/utils/auction-pressure';
import type { PressureAnalysis } from '@/lib/utils/auction-pressure';

interface Props {
    campaigns: AdCampaign[];
    adSets: AdSet[];
    currency: string;
    onToggleStatus: (campaignId: string, newStatus: 'ACTIVE' | 'PAUSED') => Promise<boolean>;
    onExpandCampaign: (id: string | null) => void;
    expandedCampaignId: string | null;
}

const wrap = (g: string) => <span className="font-mono text-[10px]">{g}</span>;

function formatCurrency(value: number, currency: string = 'BRL'): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
}

function formatNumber(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString('pt-BR');
}

function statusBadge(status: string) {
    const map: Record<string, { label: string; classes: string; style?: React.CSSProperties }> = {
        ACTIVE: {
            label: 'Ativa',
            classes: 'bg-[#A3E635]/10 text-[#A3E635] border-[#A3E635]/20',
            style: { color: '#A3E635', borderColor: 'rgba(163,230,53,0.3)', backgroundColor: 'rgba(163,230,53,0.06)' }
        },
        PAUSED: {
            label: 'Pausada',
            classes: 'bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/20',
            style: { color: '#FBBF24', borderColor: 'rgba(251,191,36,0.3)', backgroundColor: 'rgba(251,191,36,0.06)' }
        },
        ARCHIVED: {
            label: 'Arquivada',
            classes: 'bg-[#4A4A4A]/10 text-[#4A4A4A] border-[#4A4A4A]/20',
            style: { color: '#4A4A4A', borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'transparent' }
        },
        DELETED: {
            label: 'Excluída',
            classes: 'bg-red-500/10 text-red-500 border-red-500/20'
        },
    };
    const info = map[status] || { label: status, classes: 'bg-[#4A4A4A]/10 text-[#4A4A4A] border-[#4A4A4A]/20' };
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest border font-bold ${info.classes}`}
            style={info.style}
        >
            {info.label}
        </span>
    );
}

const PRESSURE_CONFIG = {
    competition:        { dot: '#60A5FA', label: 'CONCORRÊNCIA', title: 'Concorrência alta' },
    creative_fatigue:   { dot: '#EF4444', label: 'FADIGA',       title: 'Fadiga criativa' },
    audience_saturation:{ dot: '#FBBF24', label: 'SATURAÇÃO',    title: 'Saturação de audiência' },
    healthy:            { dot: '#A3E635', label: 'SAUDÁVEL',      title: 'Saudável' },
    insufficient_data:  { dot: '#4A4A4A', label: '—',             title: 'Dados insuficientes' },
} as const;

function PressureBadge({ analysis, compact = false }: { analysis: PressureAnalysis; compact?: boolean }) {
    const cfg = PRESSURE_CONFIG[analysis.signal];
    const tooltipLines = [cfg.title, ...analysis.indicators, analysis.recommendation].join('\n');

    return (
        <span
            className="inline-flex items-center gap-1 font-mono text-[9px] tracking-widest cursor-default select-none"
            title={tooltipLines}
        >
            <span style={{ color: cfg.dot, fontSize: 10 }}>●</span>
            {!compact && (
                <span style={{ color: cfg.dot }} className="uppercase opacity-80">{cfg.label}</span>
            )}
        </span>
    );
}

export function CampaignsTable({ campaigns, adSets, currency, onToggleStatus, onExpandCampaign, expandedCampaignId }: Props) {
    const [loadingId, setLoadingId] = useState<string | null>(null);

    // Médias de CPM/CTR de todas as campanhas (benchmark da conta)
    const { avgCpm, avgCtr } = useMemo(() => {
        const items = campaigns.map(c => ({
            cpm: parseFloat(c.insights?.cpm || '0'),
            ctr: parseFloat(c.insights?.ctr || '0'),
        }));
        return computeAccountAverages(items);
    }, [campaigns]);

    const handleToggle = async (campaign: AdCampaign) => {
        const newStatus = campaign.effective_status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        setLoadingId(campaign.id);
        const ok = await onToggleStatus(campaign.id, newStatus);
        setLoadingId(null);
        if (ok) {
            toast.success(`Campanha "${campaign.name}" ${newStatus === 'ACTIVE' ? 'ativada' : 'pausada'}.`);
        } else {
            toast.error('Erro ao alterar status da campanha.');
        }
    };

    if (campaigns.length === 0) {
        return (
            <div className="rounded-xl border border-white/10 bg-[#0A0A0A] p-8 text-center text-[#8A8A8A]">
                Nenhuma campanha encontrada para este período/filtro.
            </div>
        );
    }

    return (
        <div className="overflow-hidden bg-[#0A0A0A] border border-white/10 rounded-lg">
            <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/5 uppercase tracking-widest text-[10px] text-[#4A4A4A]">
                            <th className="px-4 py-3 text-left font-bold w-8"></th>
                            <th className="px-4 py-3 text-left font-bold">Campanha</th>
                            <th className="px-4 py-3 text-left font-bold">Status</th>
                            <th className="px-4 py-3 text-left font-bold">Objetivo</th>
                            <th className="px-4 py-3 text-right font-bold">Orçamento/dia</th>
                            <th className="px-4 py-3 text-right font-bold">Gasto</th>
                            <th className="px-4 py-3 text-right font-bold">Impressões</th>
                            <th className="px-4 py-3 text-right font-bold">Cliques</th>
                            <th className="px-4 py-3 text-right font-bold">CTR</th>
                            <th className="px-4 py-3 text-right font-bold">CPC</th>
                            <th className="px-4 py-3 text-center font-bold">Pressão</th>
                            <th className="px-4 py-3 text-center font-bold">Ação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {campaigns.map((c) => {
                            const ins = c.insights;
                            const spend = parseFloat(ins?.spend || '0');
                            const impressions = parseInt(ins?.impressions || '0');
                            const clicks = parseInt(ins?.clicks || '0');
                            const ctr = parseFloat(ins?.ctr || '0');
                            const cpc = parseFloat(ins?.cpc || '0');
                            const cpm = parseFloat(ins?.cpm || '0');
                            const frequency = parseFloat(ins?.frequency || '0');
                            const budget = c.daily_budget ? parseInt(c.daily_budget) / 100 : null;
                            const isExpanded = expandedCampaignId === c.id;
                            const campaignAdSets = adSets.filter(s => s.campaign_id === c.id);

                            const pressure = analyzeAuctionPressure({
                                cpm, ctr, frequency,
                                qualityRanking: ins?.quality_ranking,
                                accountAvgCpm: avgCpm,
                                accountAvgCtr: avgCtr,
                            });

                            return (
                                <Fragment key={c.id}>
                                    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => onExpandCampaign(c.id)}>
                                        <td className="px-4 py-3">
                                            {campaignAdSets.length > 0 ? (
                                                <span className="text-[#A3E635] font-bold">{isExpanded ? wrap('▼') : wrap('▶')}</span>
                                            ) : <span className="w-4" />}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-[#F5F5F5] max-w-[200px] truncate" title={c.name}>{c.name}</td>
                                        <td className="px-4 py-3">{statusBadge(c.effective_status)}</td>
                                        <td className="px-4 py-3 text-[10px] uppercase text-[#4A4A4A]">{formatObjective(c.objective)}</td>
                                        <td className="px-4 py-3 text-right text-[#F5F5F5]">{budget != null ? formatCurrency(budget, currency) : '—'}</td>
                                        <td className="px-4 py-3 text-right font-bold text-[#A3E635]">{formatCurrency(spend, currency)}</td>
                                        <td className="px-4 py-3 text-right text-[#8A8A8A]">{formatNumber(impressions)}</td>
                                        <td className="px-4 py-3 text-right text-[#8A8A8A]">{formatNumber(clicks)}</td>
                                        <td className="px-4 py-3 text-right text-[#8A8A8A]">{ctr.toFixed(2)}%</td>
                                        <td className="px-4 py-3 text-right text-[#8A8A8A]">{formatCurrency(cpc, currency)}</td>
                                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                            <PressureBadge analysis={pressure} />
                                        </td>
                                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                            {(c.effective_status === 'ACTIVE' || c.effective_status === 'PAUSED') && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 hover:bg-[#A3E635]/10"
                                                    disabled={loadingId === c.id}
                                                    onClick={() => handleToggle(c)}
                                                    title={c.effective_status === 'ACTIVE' ? 'Pausar' : 'Ativar'}
                                                >
                                                    {c.effective_status === 'ACTIVE'
                                                        ? <span className="text-[#FBBF24] font-bold text-xs" style={{ color: '#FBBF24' }}>{wrap('❚❚')}</span>
                                                        : <span className="text-[#A3E635] font-bold text-xs" style={{ color: '#A3E635' }}>{wrap('▶')}</span>
                                                    }
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                    {isExpanded && campaignAdSets.map((adSet) => {
                                        const sIns = adSet.insights;
                                        const sSpend = parseFloat(sIns?.spend || '0');
                                        const sImpr = parseInt(sIns?.impressions || '0');
                                        const sClicks = parseInt(sIns?.clicks || '0');
                                        const sCtr = parseFloat(sIns?.ctr || '0');
                                        const sCpc = parseFloat(sIns?.cpc || '0');
                                        const sCpm = parseFloat(sIns?.cpm || '0');
                                        const sFreq = parseFloat(sIns?.frequency || '0');
                                        const sBudget = adSet.daily_budget ? parseInt(adSet.daily_budget) / 100 : null;

                                        const adSetPressure = analyzeAuctionPressure({
                                            cpm: sCpm, ctr: sCtr, frequency: sFreq,
                                            qualityRanking: sIns?.quality_ranking,
                                            accountAvgCpm: avgCpm,
                                            accountAvgCtr: avgCtr,
                                        });

                                        return (
                                            <tr key={adSet.id} className="border-b border-white/5 bg-white/[0.02] text-[11px]">
                                                <td className="px-4 py-2"></td>
                                                <td className="px-4 py-2 pl-10 text-[#8A8A8A] truncate max-w-[180px]" title={adSet.name}>
                                                    <span className="text-[#4A4A4A] mr-2">{wrap('↳')}</span> {adSet.name}
                                                </td>
                                                <td className="px-4 py-2">{statusBadge(adSet.effective_status)}</td>
                                                <td className="px-4 py-2 text-[#4A4A4A] uppercase text-[9px] tracking-tighter">{adSet.optimization_goal || '—'}</td>
                                                <td className="px-4 py-2 text-right text-[#F5F5F5]">{sBudget != null ? formatCurrency(sBudget, currency) : '—'}</td>
                                                <td className="px-4 py-2 text-right text-[#A3E635]">{formatCurrency(sSpend, currency)}</td>
                                                <td className="px-4 py-2 text-right text-[#4A4A4A]">{formatNumber(sImpr)}</td>
                                                <td className="px-4 py-2 text-right text-[#4A4A4A]">{formatNumber(sClicks)}</td>
                                                <td className="px-4 py-2 text-right text-[#4A4A4A]">{sCtr.toFixed(2)}%</td>
                                                <td className="px-4 py-2 text-right text-[#4A4A4A]">{formatCurrency(sCpc, currency)}</td>
                                                <td className="px-4 py-2 text-center">
                                                    <PressureBadge analysis={adSetPressure} compact />
                                                </td>
                                                <td className="px-4 py-2"></td>
                                            </tr>
                                        );
                                    })}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function formatObjective(obj: string): string {
    const map: Record<string, string> = {
        OUTCOME_AWARENESS: 'Reconhecimento',
        OUTCOME_ENGAGEMENT: 'Engajamento',
        OUTCOME_LEADS: 'Leads',
        OUTCOME_SALES: 'Vendas',
        OUTCOME_TRAFFIC: 'Tráfego',
        OUTCOME_APP_PROMOTION: 'App',
        LINK_CLICKS: 'Cliques no Link',
        POST_ENGAGEMENT: 'Engajamento',
        REACH: 'Alcance',
        CONVERSIONS: 'Conversões',
        MESSAGES: 'Mensagens',
        VIDEO_VIEWS: 'Visualizações',
        BRAND_AWARENESS: 'Reconhecimento',
    };
    return map[obj] || obj;
}
