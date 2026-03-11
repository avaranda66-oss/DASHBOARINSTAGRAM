import { create } from 'zustand';
import { settingsRepository } from '@/lib/repository';
import { getSettingAction, saveSettingAction } from '@/app/actions/settings.actions';
import type { UserSettings } from '@/types/settings';

const SETTINGS_ID = 'global-settings';

interface SettingsState {
    settings: UserSettings | null;
    isLoading: boolean;
    loadSettings: () => Promise<void>;
    updateApiKeys: (apifyKey?: string, geminiKey?: string, firecrawlKey?: string) => Promise<void>;
    updateAISettings: (aiProvider: string, aiModel: string, antigravityApiKey?: string, antigravityBaseUrl?: string) => Promise<void>;
    updateMetaToken: (token: string, expiresAt?: number, username?: string) => Promise<void>;
    clearMetaToken: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    settings: null,
    isLoading: false,

    loadSettings: async () => {
        set({ isLoading: true });
        try {
            const localData = await settingsRepository.findById(SETTINGS_ID);
            const serverDataStr = await getSettingAction(SETTINGS_ID);

            let data = localData;
            if (serverDataStr) {
                try {
                    const serverData = JSON.parse(serverDataStr);
                    data = { ...localData, ...serverData } as typeof localData;
                    if (data) await settingsRepository.save(data);
                } catch (e) { }
            }

            if (data) {
                set({ settings: data });
            } else {
                // Initial default settings creation if not found
                const defaultSettings: UserSettings & { id: string } = {
                    id: SETTINGS_ID,
                    theme: 'system',
                    defaultView: 'board',
                    calendarView: 'month',
                    sidebarCollapsed: false,
                };
                await settingsRepository.save(defaultSettings);
                set({ settings: defaultSettings });
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    updateApiKeys: async (apifyKey?: string, geminiKey?: string, firecrawlKey?: string) => {
        const current = get().settings;
        if (!current) return;

        const updatedSettings = {
            ...current,
            id: SETTINGS_ID,
            apifyApiKey: apifyKey || current.apifyApiKey,
            geminiApiKey: geminiKey || current.geminiApiKey,
            firecrawlApiKey: firecrawlKey || current.firecrawlApiKey,
        };

        if (apifyKey === '') updatedSettings.apifyApiKey = '';
        if (geminiKey === '') updatedSettings.geminiApiKey = '';
        if (firecrawlKey === '') updatedSettings.firecrawlApiKey = '';

        try {
            await settingsRepository.save(updatedSettings);
            await saveSettingAction(SETTINGS_ID, JSON.stringify(updatedSettings));
            set({ settings: updatedSettings });
        } catch (error) {
            console.error('Failed to update API keys:', error);
        }
    },

    updateAISettings: async (aiProvider: string, aiModel: string, antigravityApiKey?: string, antigravityBaseUrl?: string) => {
        const current = get().settings;
        if (!current) return;

        const updatedSettings = {
            ...current,
            id: SETTINGS_ID,
            aiProvider: aiProvider as 'gemini' | 'antigravity',
            aiModel,
            antigravityApiKey: antigravityApiKey ?? current.antigravityApiKey,
            antigravityBaseUrl: antigravityBaseUrl ?? current.antigravityBaseUrl,
        };

        try {
            await settingsRepository.save(updatedSettings);
            await saveSettingAction(SETTINGS_ID, JSON.stringify(updatedSettings));
            set({ settings: updatedSettings });
        } catch (error) {
            console.error('Failed to update AI settings:', error);
        }
    },

    updateMetaToken: async (token: string, expiresAt?: number, username?: string) => {
        const current = get().settings;
        if (!current) return;

        const updatedSettings = {
            ...current,
            id: SETTINGS_ID,
            metaAccessToken: token,
            metaTokenExpiresAt: expiresAt,
            metaUsername: username ?? current.metaUsername,
        };

        try {
            await settingsRepository.save(updatedSettings);
            await saveSettingAction(SETTINGS_ID, JSON.stringify(updatedSettings));
            set({ settings: updatedSettings });
        } catch (error) {
            console.error('Failed to update Meta token:', error);
        }
    },

    clearMetaToken: async () => {
        const current = get().settings;
        if (!current) return;

        const updatedSettings = {
            ...current,
            id: SETTINGS_ID,
            metaAccessToken: undefined,
            metaTokenExpiresAt: undefined,
            metaUsername: undefined,
        };

        try {
            await settingsRepository.save(updatedSettings);
            await saveSettingAction(SETTINGS_ID, JSON.stringify(updatedSettings));
            set({ settings: updatedSettings });
        } catch (error) {
            console.error('Failed to clear Meta token:', error);
        }
    },
}));
