'use server';

import db from '@/lib/db';
import { Account } from '@/types/account';
import { revalidatePath } from 'next/cache';

export async function getAccountsAction(): Promise<Account[]> {
    const dbAccounts = await db.account.findMany();
    return dbAccounts.map(acc => ({
        id: acc.id,
        name: acc.username || acc.providerAccountId,
        handle: `@${acc.providerAccountId}`,
        avatarUrl: acc.picture,
        notes: null,
        password: acc.password,
        oauthToken: acc.access_token,
        isAutomationConnected: false, // Will be checked by store
        createdAt: acc.createdAt.toISOString()
    }));
}

export async function saveAccountAction(account: Account) {
    try {
        const handle = account.handle.replace('@', '').toLowerCase();

        await db.account.upsert({
            where: { providerAccountId: handle },
            create: {
                id: account.id,
                providerAccountId: handle,
                username: account.name || handle,
                provider: 'instagram',
                type: 'instagram',
                password: account.password || null,
                picture: account.avatarUrl || null,
                access_token: account.oauthToken || null,
            },
            update: {
                username: account.name || undefined,
                password: account.password || undefined,
                picture: account.avatarUrl || undefined,
                access_token: account.oauthToken || undefined,
            }
        });

        revalidatePath('/dashboard/accounts');
        return { success: true };
    } catch (e: any) {
        console.error("Erro ao salvar conta no Prisma:", e);
        return { success: false, error: e.message };
    }
}

export async function deleteAccountAction(id: string) {
    try {
        await db.account.delete({ where: { id } });
        revalidatePath('/dashboard/accounts');
        return { success: true };
    } catch (e: any) {
        console.error("Erro ao deletar conta no Prisma:", e);
        return { success: false, error: e.message };
    }
}
