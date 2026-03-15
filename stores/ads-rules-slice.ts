'use client';

import { create } from 'zustand';
import type { AutomationRule, RuleExecutionLog, RuleSimulationResult, AdCampaign } from '@/types/ads';
import { evaluateRule, simulateRule, formatConditionsSummary, formatAction } from '@/lib/utils/rules-engine';

const STORAGE_KEY = 'ads-automation-rules';
const HISTORY_KEY = 'ads-automation-history';

function generateId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface AdsRulesSlice {
    rules: AutomationRule[];
    executionHistory: RuleExecutionLog[];
    isEvaluating: boolean;

    // CRUD
    addRule: (rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateRule: (id: string, partial: Partial<AutomationRule>) => void;
    deleteRule: (id: string) => void;
    toggleRule: (id: string) => void;

    // Evaluation
    evaluateAllRules: (
        campaigns: AdCampaign[],
        executeAction: (campaignId: string, action: string, value?: number) => Promise<boolean>,
    ) => Promise<RuleExecutionLog[]>;

    // Simulation
    simulateRule: (ruleId: string, campaigns: AdCampaign[]) => RuleSimulationResult | null;

    // History
    clearHistory: () => void;

    // Persistence
    loadFromStorage: () => void;
}

export const useAdsRulesStore = create<AdsRulesSlice>((set, get) => ({
    rules: [],
    executionHistory: [],
    isEvaluating: false,

    loadFromStorage: () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const histRaw = localStorage.getItem(HISTORY_KEY);
            set({
                rules: raw ? JSON.parse(raw) : [],
                executionHistory: histRaw ? JSON.parse(histRaw) : [],
            });
        } catch {
            // corrupted localStorage — start fresh
            set({ rules: [], executionHistory: [] });
        }
    },

    addRule: (ruleData) => {
        const now = new Date().toISOString();
        const rule: AutomationRule = {
            ...ruleData,
            id: generateId(),
            createdAt: now,
            updatedAt: now,
        };
        const rules = [...get().rules, rule];
        set({ rules });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    },

    updateRule: (id, partial) => {
        const rules = get().rules.map(r =>
            r.id === id ? { ...r, ...partial, updatedAt: new Date().toISOString() } : r
        );
        set({ rules });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    },

    deleteRule: (id) => {
        const rules = get().rules.filter(r => r.id !== id);
        set({ rules });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    },

    toggleRule: (id) => {
        const rules = get().rules.map(r =>
            r.id === id ? { ...r, enabled: !r.enabled, updatedAt: new Date().toISOString() } : r
        );
        set({ rules });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    },

    evaluateAllRules: async (campaigns, executeAction) => {
        set({ isEvaluating: true });
        const { rules, executionHistory } = get();
        const newLogs: RuleExecutionLog[] = [];

        for (const rule of rules) {
            if (!rule.enabled) continue;

            const targets = rule.targetCampaignIds === 'all'
                ? campaigns
                : campaigns.filter(c => (rule.targetCampaignIds as string[]).includes(c.id));

            for (const campaign of targets) {
                if (!evaluateRule(rule, campaign)) continue;

                let success = false;
                let error: string | undefined;

                try {
                    success = await executeAction(campaign.id, rule.action, rule.actionValue);
                } catch (e: unknown) {
                    error = e instanceof Error ? e.message : 'Erro desconhecido';
                }

                newLogs.push({
                    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    ruleId: rule.id,
                    ruleName: rule.name,
                    campaignId: campaign.id,
                    campaignName: campaign.name,
                    action: rule.action,
                    actionValue: rule.actionValue,
                    conditionsSummary: formatConditionsSummary(rule.conditions),
                    executedAt: new Date().toISOString(),
                    success,
                    error,
                    simulated: false,
                });
            }
        }

        const updatedHistory = [...newLogs, ...executionHistory].slice(0, 200);
        set({ executionHistory: updatedHistory, isEvaluating: false });
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));

        return newLogs;
    },

    simulateRule: (ruleId, campaigns) => {
        const rule = get().rules.find(r => r.id === ruleId);
        if (!rule) return null;
        return simulateRule(rule, campaigns);
    },

    clearHistory: () => {
        set({ executionHistory: [] });
        localStorage.removeItem(HISTORY_KEY);
    },
}));
