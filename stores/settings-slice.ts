import { create } from 'zustand';
import { settingsRepository } from '@/lib/repository';
import { getSettingAction, saveSettingAction } from '@/app/actions/settings.actions';
import type { UserSettings } from '@/types/settings';

const SETTINGS_ID = 'global-settings';

interface SettingsState {
    settings: UserSettings | null;
    isLoading: boolean;
    loadSettings: () => Promise<void>;
    updateApiKeys: (apifyKey?: string, geminiKey?: string) => Promise<void>;
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

    updateApiKeys: async (apifyKey?: string, geminiKey?: string) => {
        const current = get().settings;
        if (!current) return;

        const updatedSettings = {
            ...current,
            id: SETTINGS_ID,
            apifyApiKey: apifyKey || current.apifyApiKey,
            geminiApiKey: geminiKey || current.geminiApiKey,
        };

        if (apifyKey === '') updatedSettings.apifyApiKey = '';
        if (geminiKey === '') updatedSettings.geminiApiKey = '';

        try {
            await settingsRepository.save(updatedSettings);
            await saveSettingAction(SETTINGS_ID, JSON.stringify(updatedSettings));
            set({ settings: updatedSettings });
        } catch (error) {
            console.error('Failed to update API keys:', error);
        }
    },
}));
