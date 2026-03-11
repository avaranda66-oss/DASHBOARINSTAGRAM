'use client';

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Account } from '@/types/account';
import { useContentStore } from '@/stores';
import {
    getAccountsAction,
    saveAccountAction,
    deleteAccountAction
} from '@/app/actions/account.actions';

interface AccountSlice {
    accounts: Account[];
    isLoaded: boolean;
    loadAccounts: () => Promise<void>;
    addAccount: (data: Omit<Account, 'id' | 'createdAt' | 'oauthToken'>) => void;
    updateAccount: (id: string, data: Partial<Account>) => void;
    deleteAccount: (id: string) => void;
    checkAutomationStatus: (id: string) => Promise<void>;
    connectAutomation: (id: string) => Promise<boolean>;
    selectedAccountId: string | 'all';
    setSelectedAccountId: (id: string | 'all') => void;
}

export const useAccountStore = create<AccountSlice>()((set, get) => ({
    accounts: [],
    isLoaded: false,
    selectedAccountId: 'all',

    setSelectedAccountId: (id) => {
        set({ selectedAccountId: id });
        const { saveSettingAction } = require('@/app/actions/settings.actions');
        saveSettingAction('selected_account_id', id).catch(console.error);
    },

    loadAccounts: async () => {
        // Tenta migrar do localStorage se ainda houver dados lá
        // NOTA: nunca sobrescreve notes com null — preserva notas já salvas no banco
        const localData = typeof window !== 'undefined' ? localStorage.getItem('ig-dashboard:accounts') : null;
        if (localData) {
            try {
                const localAccounts: Account[] = JSON.parse(localData);
                // Carrega dados do banco primeiro para não perder notes já salvas
                const existingDbAccounts = await getAccountsAction();
                const dbNotesByHandle = new Map(
                    existingDbAccounts.map((a) => [a.handle.replace('@', '').toLowerCase(), a.notes])
                );
                for (const acc of localAccounts) {
                    const handle = acc.handle.replace('@', '').toLowerCase();
                    // Preserva notes do banco se o acc local não tiver notes
                    const mergedAcc = { ...acc, notes: acc.notes ?? dbNotesByHandle.get(handle) ?? null };
                    await saveAccountAction(mergedAcc);
                }
                localStorage.removeItem('ig-dashboard:accounts');
            } catch (e) {
                console.error('Erro na migração de contas:', e);
            }
        }

        const accounts = await getAccountsAction();
        const { getSettingAction } = require('@/app/actions/settings.actions');
        const savedAccountId = await getSettingAction('selected_account_id');

        set({
            accounts,
            isLoaded: true,
            selectedAccountId: savedAccountId || 'all'
        });

        // Verificar status de automação para cada conta carregada
        accounts.forEach(a => {
            get().checkAutomationStatus(a.id).catch(() => { });
        });
    },

    addAccount: (data) => {
        const now = new Date().toISOString();
        const account: Account = {
            ...data,
            id: nanoid(12),
            createdAt: now,
            oauthToken: null,
            isAutomationConnected: false
        };
        set((state) => ({ accounts: [...state.accounts, account] }));
        saveAccountAction(account).catch(console.error);

        // Verificar automação logo após adicionar
        get().checkAutomationStatus(account.id).catch(() => { });
    },

    updateAccount: (id, data) => {
        set((state) => ({
            accounts: state.accounts.map((a) =>
                a.id === id ? { ...a, ...data } : a,
            ),
        }));
        const updated = get().accounts.find((a) => a.id === id);
        if (updated) saveAccountAction(updated).catch(console.error);
    },

    checkAutomationStatus: async (id) => {
        const account = get().accounts.find(a => a.id === id);
        if (!account) return;

        try {
            const res = await fetch(`/api/automation/auth?handle=${encodeURIComponent(account.handle)}`);
            const data = await res.json();

            if (data.isConnected !== account.isAutomationConnected) {
                get().updateAccount(id, { isAutomationConnected: data.isConnected });
            }
        } catch (e) {
            console.error('Erro ao checar status de automação:', e);
        }
    },

    connectAutomation: async (id) => {
        const account = get().accounts.find(a => a.id === id);
        if (!account) return false;

        try {
            const res = await fetch('/api/automation/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ handle: account.handle })
            });
            const data = await res.json();

            if (data.success) {
                get().updateAccount(id, { isAutomationConnected: true });
                return true;
            }
            return false;
        } catch (e) {
            console.error('Erro ao conectar automação:', e);
            return false;
        }
    },

    deleteAccount: (id) => {
        set((state) => ({
            accounts: state.accounts.filter((a) => a.id !== id),
        }));
        deleteAccountAction(id).catch(console.error);

        // Desassociar conteudos desta conta
        const contentsState = useContentStore.getState();
        contentsState.contents.forEach((c) => {
            if (c.accountId === id) {
                contentsState.updateContent(c.id, { accountId: null });
            }
        });
    },
}));
