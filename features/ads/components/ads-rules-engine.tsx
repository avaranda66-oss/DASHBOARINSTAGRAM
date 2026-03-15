'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { AdCampaign, RuleMetric, RuleOperator, RuleAction, RuleCondition, RuleSimulationResult } from '@/types/ads';
import { useAdsRulesStore } from '@/stores/ads-rules-slice';
import { useAdsStore } from '@/stores/ads-slice';
import { METRIC_LABELS, OPERATOR_LABELS, ACTION_LABELS, formatCondition, formatAction } from '@/lib/utils/rules-engine';
import { cn } from '@/design-system/utils/cn';
import { toast } from 'sonner';

// ─── Constants ───────────────────────────────────────────────────────────────

const GLYPHS = {
    RULE: '◬',
    ADD: '+',
    DELETE: '✕',
    PLAY: '▶',
    SIM: '◎',
    HISTORY: '◷',
    CHECK: '◆',
    WARN: '▲',
    TOGGLE_ON: '●',
    TOGGLE_OFF: '○',
};

const METRICS: RuleMetric[] = ['cpa', 'roas', 'ctr', 'cpc', 'cpm', 'spend', 'conversions', 'impressions', 'frequency'];
const OPERATORS: RuleOperator[] = ['gt', 'gte', 'lt', 'lte', 'eq'];
const ACTIONS: RuleAction[] = ['pause_campaign', 'increase_budget', 'decrease_budget', 'notify'];

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
    campaigns: AdCampaign[];
    token: string;
    accountId: string;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RuleForm({
    campaigns,
    onSave,
    onCancel,
}: {
    campaigns: AdCampaign[];
    onSave: (data: {
        name: string;
        description: string;
        conditions: RuleCondition[];
        action: RuleAction;
        actionValue?: number;
        targetCampaignIds: string[] | 'all';
        enabled: boolean;
    }) => void;
    onCancel: () => void;
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [conditions, setConditions] = useState<RuleCondition[]>([
        { metric: 'cpa', operator: 'gt', value: 50 },
    ]);
    const [action, setAction] = useState<RuleAction>('notify');
    const [actionValue, setActionValue] = useState(15);
    const [targetAll, setTargetAll] = useState(true);
    const [targetIds, setTargetIds] = useState<string[]>([]);

    const addCondition = () => {
        setConditions([...conditions, { metric: 'ctr', operator: 'lt', value: 1 }]);
    };

    const removeCondition = (idx: number) => {
        setConditions(conditions.filter((_, i) => i !== idx));
    };

    const updateCondition = (idx: number, partial: Partial<RuleCondition>) => {
        setConditions(conditions.map((c, i) => i === idx ? { ...c, ...partial } : c));
    };

    const handleSubmit = () => {
        if (!name.trim()) { toast.error('Nome da regra é obrigatório'); return; }
        if (conditions.length === 0) { toast.error('Adicione pelo menos uma condição'); return; }
        onSave({
            name: name.trim(),
            description: description.trim(),
            conditions,
            action,
            actionValue: (action === 'increase_budget' || action === 'decrease_budget') ? actionValue : undefined,
            targetCampaignIds: targetAll ? 'all' : targetIds,
            enabled: true,
        });
    };

    const inputCls = "bg-transparent border border-white/10 rounded px-2 py-1.5 text-[11px] font-mono text-white outline-none focus:border-[#A3E635] transition-colors";
    const selectCls = "bg-[#0A0A0A] border border-white/10 rounded px-2 py-1.5 text-[11px] font-mono text-white outline-none focus:border-[#A3E635] transition-colors";

    return (
        <div className="bg-[#0A0A0A] border border-[#A3E635]/20 rounded-lg p-6 space-y-5 font-mono">
            <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#A3E635] uppercase tracking-[0.3em] font-bold">Nova Regra</span>
                <button onClick={onCancel} className="text-[#4A4A4A] hover:text-white text-[10px]">{GLYPHS.DELETE}</button>
            </div>

            {/* Name + Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="text-[8px] text-[#4A4A4A] uppercase tracking-widest block mb-1">Nome</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Pausar CPA alto" className={cn(inputCls, "w-full")} />
                </div>
                <div>
                    <label className="text-[8px] text-[#4A4A4A] uppercase tracking-widest block mb-1">Descrição</label>
                    <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Opcional" className={cn(inputCls, "w-full")} />
                </div>
            </div>

            {/* Conditions */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-[8px] text-[#4A4A4A] uppercase tracking-widest">Condições (AND)</label>
                    <button onClick={addCondition} className="text-[9px] text-[#A3E635] hover:underline uppercase tracking-widest">{GLYPHS.ADD} CONDIÇÃO</button>
                </div>
                {conditions.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                        <span className="text-[9px] text-[#4A4A4A]">SE</span>
                        <select value={c.metric} onChange={e => updateCondition(idx, { metric: e.target.value as RuleMetric })} className={selectCls}>
                            {METRICS.map(m => <option key={m} value={m}>{METRIC_LABELS[m]}</option>)}
                        </select>
                        <select value={c.operator} onChange={e => updateCondition(idx, { operator: e.target.value as RuleOperator })} className={cn(selectCls, "w-16")}>
                            {OPERATORS.map(o => <option key={o} value={o}>{OPERATOR_LABELS[o]}</option>)}
                        </select>
                        <input type="number" value={c.value} onChange={e => updateCondition(idx, { value: parseFloat(e.target.value) || 0 })} className={cn(inputCls, "w-24")} step="0.01" />
                        {conditions.length > 1 && (
                            <button onClick={() => removeCondition(idx)} className="text-[#EF4444] text-[10px] hover:text-white">{GLYPHS.DELETE}</button>
                        )}
                    </div>
                ))}
            </div>

            {/* Action */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="text-[8px] text-[#4A4A4A] uppercase tracking-widest block mb-1">Ação</label>
                    <select value={action} onChange={e => setAction(e.target.value as RuleAction)} className={cn(selectCls, "w-full")}>
                        {ACTIONS.map(a => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}
                    </select>
                </div>
                {(action === 'increase_budget' || action === 'decrease_budget') && (
                    <div>
                        <label className="text-[8px] text-[#4A4A4A] uppercase tracking-widest block mb-1">Percentual (%)</label>
                        <input type="number" value={actionValue} onChange={e => setActionValue(parseInt(e.target.value) || 0)} className={cn(inputCls, "w-full")} min={1} max={100} />
                    </div>
                )}
            </div>

            {/* Target campaigns */}
            <div>
                <label className="text-[8px] text-[#4A4A4A] uppercase tracking-widest block mb-2">Campanhas alvo</label>
                <div className="flex items-center gap-3 mb-2">
                    <button
                        onClick={() => setTargetAll(true)}
                        className={cn("px-2 py-1 rounded text-[9px] uppercase tracking-widest border transition-all",
                            targetAll ? "bg-[#A3E635] text-black border-[#A3E635]" : "border-white/10 text-[#4A4A4A]"
                        )}
                    >Todas</button>
                    <button
                        onClick={() => setTargetAll(false)}
                        className={cn("px-2 py-1 rounded text-[9px] uppercase tracking-widest border transition-all",
                            !targetAll ? "bg-[#A3E635] text-black border-[#A3E635]" : "border-white/10 text-[#4A4A4A]"
                        )}
                    >Específicas</button>
                </div>
                {!targetAll && (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {campaigns.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setTargetIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                                className={cn(
                                    "px-2 py-0.5 rounded text-[9px] border transition-all truncate max-w-[200px]",
                                    targetIds.includes(c.id)
                                        ? "bg-[#A3E635]/20 border-[#A3E635]/30 text-[#A3E635]"
                                        : "border-white/10 text-[#4A4A4A] hover:text-white"
                                )}
                                title={c.name}
                            >{c.name}</button>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
                <button onClick={onCancel} className="px-4 py-1.5 rounded text-[9px] uppercase tracking-widest border border-white/10 text-[#4A4A4A] hover:text-white transition-all">
                    Cancelar
                </button>
                <button onClick={handleSubmit} className="px-4 py-1.5 rounded text-[9px] uppercase tracking-widest bg-[#A3E635] text-black font-bold hover:bg-[#A3E635]/80 transition-all">
                    Salvar Regra
                </button>
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdsRulesEngine({ campaigns, token, accountId }: Props) {
    const {
        rules, executionHistory, isEvaluating,
        loadFromStorage, addRule, deleteRule, toggleRule,
        evaluateAllRules, simulateRule, clearHistory,
    } = useAdsRulesStore();

    const { updateCampaignStatus, updateCampaignBudget } = useAdsStore();

    const [showForm, setShowForm] = useState(false);
    const [activeSubTab, setActiveSubTab] = useState<'rules' | 'history' | 'simulation'>('rules');
    const [simResult, setSimResult] = useState<RuleSimulationResult | null>(null);
    const [confirmExec, setConfirmExec] = useState(false);

    useEffect(() => {
        loadFromStorage();
    }, [loadFromStorage]);

    const handleSaveRule = useCallback((data: Parameters<typeof addRule>[0]) => {
        addRule(data);
        setShowForm(false);
        toast.success('Regra criada');
    }, [addRule]);

    const handleDeleteRule = useCallback((id: string) => {
        deleteRule(id);
        toast.success('Regra removida');
    }, [deleteRule]);

    const handleSimulate = useCallback((ruleId: string) => {
        const result = simulateRule(ruleId, campaigns);
        if (result) {
            setSimResult(result);
            setActiveSubTab('simulation');
        }
    }, [simulateRule, campaigns]);

    const executeAction = useCallback(async (campaignId: string, action: string, value?: number): Promise<boolean> => {
        switch (action) {
            case 'pause_campaign':
                return updateCampaignStatus(token, campaignId, 'PAUSED');
            case 'increase_budget': {
                const c = campaigns.find(c => c.id === campaignId);
                if (!c?.daily_budget) return false;
                const current = parseFloat(c.daily_budget) / 100;
                const newBudget = current * (1 + (value || 15) / 100);
                return updateCampaignBudget(token, campaignId, newBudget);
            }
            case 'decrease_budget': {
                const c = campaigns.find(c => c.id === campaignId);
                if (!c?.daily_budget) return false;
                const current = parseFloat(c.daily_budget) / 100;
                const newBudget = current * (1 - (value || 15) / 100);
                return updateCampaignBudget(token, campaignId, Math.max(newBudget, 1));
            }
            case 'notify':
                toast.info(`Regra ativada para campanha ${campaigns.find(c => c.id === campaignId)?.name || campaignId}`);
                return true;
            default:
                return false;
        }
    }, [token, campaigns, updateCampaignStatus, updateCampaignBudget]);

    const handleExecuteAll = useCallback(async () => {
        if (!confirmExec) {
            setConfirmExec(true);
            return;
        }
        setConfirmExec(false);
        const logs = await evaluateAllRules(campaigns, executeAction);
        if (logs.length === 0) {
            toast.info('Nenhuma regra ativada — condições não atendidas');
        } else {
            toast.success(`${logs.length} ação(ões) executada(s)`);
            setActiveSubTab('history');
        }
    }, [confirmExec, evaluateAllRules, campaigns, executeAction]);

    // Reset confirm state after 5s
    useEffect(() => {
        if (!confirmExec) return;
        const t = setTimeout(() => setConfirmExec(false), 5000);
        return () => clearTimeout(t);
    }, [confirmExec]);

    const enabledCount = useMemo(() => rules.filter(r => r.enabled).length, [rules]);

    return (
        <section className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <span className="text-[#A3E635] font-mono text-[10px]">{GLYPHS.RULE}</span>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#F5F5F5]">Automation_Rules_Engine</h3>
                <span className="text-[9px] font-mono text-[#4A4A4A] ml-2">[{enabledCount}/{rules.length}_ATIVAS]</span>
                <span className="h-px flex-1 bg-white/5" />
            </div>

            {/* Sub-tabs + actions */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex bg-[#050505] border border-white/10 rounded overflow-hidden font-mono p-0.5">
                    {([
                        { id: 'rules' as const, label: 'REGRAS' },
                        { id: 'history' as const, label: 'HISTÓRICO' },
                        { id: 'simulation' as const, label: 'SIMULAÇÃO' },
                    ]).map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveSubTab(t.id)}
                            className={cn(
                                "text-[9px] px-3 py-1.5 uppercase font-bold tracking-widest transition-all",
                                activeSubTab === t.id ? "bg-[#A3E635] text-black" : "text-[#4A4A4A] hover:text-[#F5F5F5]"
                            )}
                        >{t.label}</button>
                    ))}
                </div>
                <div className="flex gap-2 font-mono">
                    {rules.length > 0 && enabledCount > 0 && (
                        <button
                            onClick={handleExecuteAll}
                            disabled={isEvaluating}
                            className={cn(
                                "px-3 py-1.5 rounded text-[9px] uppercase tracking-widest border transition-all font-bold",
                                confirmExec
                                    ? "bg-[#EF4444] text-white border-[#EF4444] animate-pulse"
                                    : "border-[#A3E635]/30 text-[#A3E635] hover:bg-[#A3E635]/10",
                                isEvaluating && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isEvaluating ? 'Executando...' : confirmExec ? 'CONFIRMAR EXECUÇÃO' : `${GLYPHS.PLAY} EXECUTAR REGRAS`}
                        </button>
                    )}
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-3 py-1.5 rounded text-[9px] uppercase tracking-widest border border-white/10 text-[#4A4A4A] hover:border-[#A3E635] hover:text-[#A3E635] transition-all"
                    >{GLYPHS.ADD} NOVA REGRA</button>
                </div>
            </div>

            {/* Form */}
            {showForm && (
                <RuleForm
                    campaigns={campaigns}
                    onSave={handleSaveRule}
                    onCancel={() => setShowForm(false)}
                />
            )}

            {/* Rules list */}
            {activeSubTab === 'rules' && (
                <div className="space-y-2">
                    {rules.length === 0 ? (
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-12 flex flex-col items-center justify-center gap-3 font-mono text-center opacity-40">
                            <span className="text-2xl text-[#4A4A4A]">{GLYPHS.RULE}</span>
                            <p className="text-[10px] text-[#4A4A4A] uppercase tracking-widest">Nenhuma regra configurada</p>
                            <p className="text-[9px] text-[#4A4A4A] max-w-xs">Crie regras para automatizar ações como pausar campanhas com CPA alto ou ajustar budgets.</p>
                        </div>
                    ) : (
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-lg overflow-hidden font-mono">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-white/5 text-[8px] uppercase tracking-widest text-[#4A4A4A]">
                                        <th className="px-4 py-3 font-bold w-8"></th>
                                        <th className="px-4 py-3 font-bold">Regra</th>
                                        <th className="px-4 py-3 font-bold">Condição</th>
                                        <th className="px-4 py-3 font-bold">Ação</th>
                                        <th className="px-4 py-3 font-bold">Alvo</th>
                                        <th className="px-4 py-3 font-bold text-center">Ops</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[10px]">
                                    {rules.map(rule => (
                                        <tr key={rule.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-3">
                                                <button onClick={() => toggleRule(rule.id)} className={cn("text-[12px]", rule.enabled ? "text-[#A3E635]" : "text-[#4A4A4A]")}>
                                                    {rule.enabled ? GLYPHS.TOGGLE_ON : GLYPHS.TOGGLE_OFF}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn("font-bold uppercase", rule.enabled ? "text-[#F5F5F5]" : "text-[#4A4A4A]")}>{rule.name}</span>
                                                {rule.description && <span className="block text-[8px] text-[#4A4A4A] mt-0.5">{rule.description}</span>}
                                            </td>
                                            <td className="px-4 py-3 text-[#8A8A8A]">
                                                {rule.conditions.map((c, i) => (
                                                    <span key={i}>{i > 0 && <span className="text-[#4A4A4A]"> E </span>}{formatCondition(c)}</span>
                                                ))}
                                            </td>
                                            <td className="px-4 py-3 text-[#A3E635]">{formatAction(rule.action, rule.actionValue)}</td>
                                            <td className="px-4 py-3 text-[#4A4A4A]">
                                                {rule.targetCampaignIds === 'all' ? 'Todas' : `${(rule.targetCampaignIds as string[]).length} selecionadas`}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => handleSimulate(rule.id)} className="text-[#4A4A4A] hover:text-[#A3E635] transition-colors" title="Simular">
                                                        {GLYPHS.SIM}
                                                    </button>
                                                    <button onClick={() => handleDeleteRule(rule.id)} className="text-[#4A4A4A] hover:text-[#EF4444] transition-colors" title="Remover">
                                                        {GLYPHS.DELETE}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* History */}
            {activeSubTab === 'history' && (
                <div className="space-y-2">
                    {executionHistory.length > 0 && (
                        <div className="flex justify-end">
                            <button onClick={clearHistory} className="text-[9px] font-mono text-[#4A4A4A] hover:text-[#EF4444] uppercase tracking-widest transition-colors">
                                Limpar histórico
                            </button>
                        </div>
                    )}
                    {executionHistory.length === 0 ? (
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-12 flex flex-col items-center gap-3 font-mono text-center opacity-40">
                            <span className="text-2xl text-[#4A4A4A]">{GLYPHS.HISTORY}</span>
                            <p className="text-[10px] text-[#4A4A4A] uppercase tracking-widest">Nenhuma execução registrada</p>
                        </div>
                    ) : (
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-lg overflow-hidden font-mono">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-white/5 text-[8px] uppercase tracking-widest text-[#4A4A4A]">
                                        <th className="px-4 py-3 font-bold">Quando</th>
                                        <th className="px-4 py-3 font-bold">Regra</th>
                                        <th className="px-4 py-3 font-bold">Campanha</th>
                                        <th className="px-4 py-3 font-bold">Ação</th>
                                        <th className="px-4 py-3 font-bold text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[10px]">
                                    {executionHistory.slice(0, 50).map(log => (
                                        <tr key={log.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                                            <td className="px-4 py-3 text-[#4A4A4A]">
                                                {new Date(log.executedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-4 py-3 text-[#F5F5F5] font-bold uppercase">{log.ruleName}</td>
                                            <td className="px-4 py-3 text-[#8A8A8A] truncate max-w-[200px]" title={log.campaignName}>{log.campaignName}</td>
                                            <td className="px-4 py-3 text-[#A3E635]">{formatAction(log.action, log.actionValue)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={cn(
                                                    "text-[8px] px-1.5 py-0.5 rounded border uppercase tracking-widest font-black",
                                                    log.success
                                                        ? "bg-[#A3E635]/10 text-[#A3E635] border-[#A3E635]/20"
                                                        : "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20"
                                                )}>
                                                    {log.simulated ? 'SIM' : log.success ? 'OK' : 'ERRO'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Simulation */}
            {activeSubTab === 'simulation' && (
                <div className="space-y-2">
                    {simResult ? (
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-lg overflow-hidden font-mono">
                            <div className="px-4 py-3 bg-white/5 flex items-center justify-between">
                                <span className="text-[10px] text-[#A3E635] uppercase tracking-widest font-bold">
                                    Simulação: {simResult.ruleName}
                                </span>
                                <span className="text-[9px] text-[#4A4A4A]">
                                    {simResult.matchedCampaigns.filter(c => c.wouldTrigger).length}/{simResult.matchedCampaigns.length} campanhas afetadas
                                </span>
                            </div>
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[8px] uppercase tracking-widest text-[#4A4A4A] border-t border-white/5">
                                        <th className="px-4 py-2 font-bold">Campanha</th>
                                        <th className="px-4 py-2 font-bold text-center">Ativaria?</th>
                                        <th className="px-4 py-2 font-bold">Ação Projetada</th>
                                        <th className="px-4 py-2 font-bold text-right">CPA</th>
                                        <th className="px-4 py-2 font-bold text-right">ROAS</th>
                                        <th className="px-4 py-2 font-bold text-right">CTR</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[10px]">
                                    {simResult.matchedCampaigns.map(c => (
                                        <tr
                                            key={c.campaignId}
                                            className={cn("border-t border-white/5", c.wouldTrigger ? "bg-[#A3E635]/5" : "")}
                                        >
                                            <td className="px-4 py-2 text-[#F5F5F5] font-bold uppercase truncate max-w-[200px]">{c.campaignName}</td>
                                            <td className="px-4 py-2 text-center">
                                                <span className={c.wouldTrigger ? "text-[#EF4444]" : "text-[#4A4A4A]"}>
                                                    {c.wouldTrigger ? GLYPHS.WARN : '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-[#A3E635]">{c.projectedAction}</td>
                                            <td className="px-4 py-2 text-right text-[#8A8A8A]">{(c.currentValues.cpa ?? 0).toFixed(2)}</td>
                                            <td className="px-4 py-2 text-right text-[#8A8A8A]">{(c.currentValues.roas ?? 0).toFixed(2)}</td>
                                            <td className="px-4 py-2 text-right text-[#8A8A8A]">{(c.currentValues.ctr ?? 0).toFixed(2)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-12 flex flex-col items-center gap-3 font-mono text-center opacity-40">
                            <span className="text-2xl text-[#4A4A4A]">{GLYPHS.SIM}</span>
                            <p className="text-[10px] text-[#4A4A4A] uppercase tracking-widest">Clique em {GLYPHS.SIM} numa regra para simular</p>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
