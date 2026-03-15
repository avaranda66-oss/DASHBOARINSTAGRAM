import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ProfitConfig {
    cogsPct: number;
    shippingPct: number;
    feesPct: number;
    targetRoasMultiplier: number;
    enabled: boolean;
}

interface ProfitConfigSlice {
    config: ProfitConfig;
    setConfig: (c: ProfitConfig) => void;
}

const DEFAULT_CONFIG: ProfitConfig = {
    cogsPct: 40,
    shippingPct: 8,
    feesPct: 3,
    targetRoasMultiplier: 1.2,
    enabled: false,
};

export const useProfitConfigStore = create<ProfitConfigSlice>()(
    persist(
        (set) => ({
            config: DEFAULT_CONFIG,
            setConfig: (c) => set({ config: c }),
        }),
        { name: 'profit-config' }
    )
);
