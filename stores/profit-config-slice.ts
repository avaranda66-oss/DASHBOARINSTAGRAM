import { create } from 'zustand';

export interface ProfitConfig {
    cogsPct: number;
    shippingPct: number;
    feesPct: number;
    targetRoasMultiplier: number;
    enabled: boolean;
}

interface ProfitConfigSlice {
    config: ProfitConfig;
    isLoaded: boolean;
    setConfig: (c: ProfitConfig) => void;
    loadConfig: () => Promise<void>;
    saveConfig: (c: ProfitConfig) => Promise<void>;
}

const DEFAULT_CONFIG: ProfitConfig = {
    cogsPct: 40,
    shippingPct: 8,
    feesPct: 3,
    targetRoasMultiplier: 1.2,
    enabled: false,
};

export const useProfitConfigStore = create<ProfitConfigSlice>((set, get) => ({
    config: DEFAULT_CONFIG,
    isLoaded: false,

    setConfig: (c) => set({ config: c }),

    loadConfig: async () => {
        if (get().isLoaded) return;
        try {
            const res = await fetch('/api/user/profit-config');
            if (res.ok) {
                const { config } = await res.json();
                set({ config: config ?? DEFAULT_CONFIG, isLoaded: true });
            } else {
                // 401 ou outro erro: usa config default silenciosamente
                set({ isLoaded: true });
            }
        } catch {
            // falha de rede: mantém DEFAULT_CONFIG
            set({ isLoaded: true });
        }
    },

    saveConfig: async (c) => {
        set({ config: c });
        try {
            await fetch('/api/user/profit-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(c),
            });
        } catch {
            // falha silenciosa — config já atualizado no estado local
        }
    },
}));
