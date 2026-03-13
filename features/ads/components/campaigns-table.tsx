'use client';

import { useState, Fragment } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { AdCampaign, AdSet } from '@/types/ads';
import {
    Play, Pause, ChevronDown, ChevronRight,
    DollarSign, Eye, MousePointerClick, Target,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    campaigns: AdCampaign[];
    adSets: AdSet[];
    currency: string;
    onToggleStatus: (campaignId: string, newStatus: 'ACTIVE' | 'PAUSED') => Promise<boolean>;
    onExpandCampaign: (id: string | null) => void;
    expandedCampaignId: string | null;
}

function formatCurrency(value: number, currency: string = 'BRL'): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
}

function formatNumber(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString('pt-BR');
}

function statusBadge(status: string) {
    const map: Record<string, { label: string; classes: string }> = {
        ACTIVE: { label: 'Ativa', classes: 'bg-green-500/10 text-green-500 border-green-500/20' },
        PAUSED: { label: 'Pausada', classes: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
        ARCHIVED: { label: 'Arquivada', classes: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
        DELETED: { label: 'Excluída', classes: 'bg-red-500/10 text-red-500 border-red-500/20' },
    };
    const info = map[status] || { label: status, classes: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${info.classes}`}>
            {info.label}
        </span>
    );
}

export function CampaignsTable({ campaigns, adSets, currency, onToggleStatus, onExpandCampaign, expandedCampaignId }: Props) {
    const [loadingId, setLoadingId] = useState<string | null>(null);

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
            <Card className="p-8 text-center text-muted-foreground">
                Nenhuma campanha encontrada para este período/filtro.
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/50">
                            <th className="px-4 py-3 text-left font-medium w-8"></th>
                            <th className="px-4 py-3 text-left font-medium">Campanha</th>
                            <th className="px-4 py-3 text-left font-medium">Status</th>
                            <th className="px-4 py-3 text-left font-medium">Objetivo</th>
                            <th className="px-4 py-3 text-right font-medium">Orçamento/dia</th>
                            <th className="px-4 py-3 text-right font-medium">Gasto</th>
                            <th className="px-4 py-3 text-right font-medium">Impressões</th>
                            <th className="px-4 py-3 text-right font-medium">Cliques</th>
                            <th className="px-4 py-3 text-right font-medium">CTR</th>
                            <th className="px-4 py-3 text-right font-medium">CPC</th>
                            <th className="px-4 py-3 text-center font-medium">Ação</th>
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
                            const budget = c.daily_budget ? parseInt(c.daily_budget) / 100 : null;
                            const isExpanded = expandedCampaignId === c.id;
                            const campaignAdSets = adSets.filter(s => s.campaign_id === c.id);

                            return (
                                <Fragment key={c.id}>
                                    <tr className="border-b hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onExpandCampaign(c.id)}>
                                        <td className="px-4 py-3">
                                            {campaignAdSets.length > 0 ? (
                                                isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                            ) : <span className="w-4" />}
                                        </td>
                                        <td className="px-4 py-3 font-medium max-w-[200px] truncate" title={c.name}>{c.name}</td>
                                        <td className="px-4 py-3">{statusBadge(c.effective_status)}</td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatObjective(c.objective)}</td>
                                        <td className="px-4 py-3 text-right">{budget != null ? formatCurrency(budget, currency) : '—'}</td>
                                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(spend, currency)}</td>
                                        <td className="px-4 py-3 text-right">{formatNumber(impressions)}</td>
                                        <td className="px-4 py-3 text-right">{formatNumber(clicks)}</td>
                                        <td className="px-4 py-3 text-right">{ctr.toFixed(2)}%</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(cpc, currency)}</td>
                                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                            {(c.effective_status === 'ACTIVE' || c.effective_status === 'PAUSED') && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    disabled={loadingId === c.id}
                                                    onClick={() => handleToggle(c)}
                                                    title={c.effective_status === 'ACTIVE' ? 'Pausar' : 'Ativar'}
                                                >
                                                    {c.effective_status === 'ACTIVE'
                                                        ? <Pause className="h-4 w-4 text-yellow-500" />
                                                        : <Play className="h-4 w-4 text-green-500" />
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
                                        const sBudget = adSet.daily_budget ? parseInt(adSet.daily_budget) / 100 : null;

                                        return (
                                            <tr key={adSet.id} className="border-b bg-muted/20 text-xs">
                                                <td className="px-4 py-2"></td>
                                                <td className="px-4 py-2 pl-10 text-muted-foreground truncate max-w-[180px]" title={adSet.name}>
                                                    ↳ {adSet.name}
                                                </td>
                                                <td className="px-4 py-2">{statusBadge(adSet.effective_status)}</td>
                                                <td className="px-4 py-2 text-muted-foreground">{adSet.optimization_goal || '—'}</td>
                                                <td className="px-4 py-2 text-right">{sBudget != null ? formatCurrency(sBudget, currency) : '—'}</td>
                                                <td className="px-4 py-2 text-right">{formatCurrency(sSpend, currency)}</td>
                                                <td className="px-4 py-2 text-right">{formatNumber(sImpr)}</td>
                                                <td className="px-4 py-2 text-right">{formatNumber(sClicks)}</td>
                                                <td className="px-4 py-2 text-right">{sCtr.toFixed(2)}%</td>
                                                <td className="px-4 py-2 text-right">{formatCurrency(sCpc, currency)}</td>
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
        </Card>
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
