import type { ProfitConfig } from '@/stores/profit-config-slice';

export function calcBreakevenRoas(config: ProfitConfig): number {
    const variablePct = config.cogsPct / 100 + config.shippingPct / 100 + config.feesPct / 100;
    const margin = 1 - variablePct;
    if (margin <= 0) return Infinity;
    return 1 / margin;
}

export function calcProfitRoas(revenue: number, adSpend: number, config: ProfitConfig): number {
    if (adSpend <= 0) return 0;
    const variableCosts = revenue * (config.cogsPct + config.shippingPct + config.feesPct) / 100;
    return (revenue - variableCosts - adSpend) / adSpend;
}

export function calcTargetRoas(config: ProfitConfig): number {
    return calcBreakevenRoas(config) * config.targetRoasMultiplier;
}

export type RoasStatus = 'profit' | 'breakeven' | 'loss' | 'unknown';

export function getRoasStatus(roas: number, config: ProfitConfig): RoasStatus {
    if (!roas || roas <= 0) return 'unknown';
    const breakeven = calcBreakevenRoas(config);
    const target = calcTargetRoas(config);
    if (roas > target) return 'profit';
    if (roas >= breakeven) return 'breakeven';
    return 'loss';
}
