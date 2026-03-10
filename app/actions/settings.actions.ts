'use server';

import prisma from '@/lib/db';

export async function getSettingAction(key: string): Promise<string | null> {
    try {
        const setting = await prisma.setting.findUnique({
            where: { key },
        });
        return setting?.value ?? null;
    } catch (error) {
        console.error(`[Settings] Erro ao buscar configuração ${key}:`, error);
        return null;
    }
}

export async function saveSettingAction(key: string, value: string): Promise<void> {
    try {
        await prisma.setting.upsert({
            where: { key },
            update: { value, updatedAt: new Date() },
            create: { key, value },
        });
    } catch (error) {
        console.error(`[Settings] Erro ao salvar configuração ${key}:`, error);
    }
}

export async function getAllSettingsAction(): Promise<Record<string, string>> {
    try {
        const settings = await prisma.setting.findMany();
        return settings.reduce((acc: Record<string, string>, s: any) => ({ ...acc, [s.key]: s.value }), {} as Record<string, string>);
    } catch (error) {
        console.error('[Settings] Erro ao buscar todas as configurações:', error);
        return {};
    }
}
