'use server';

import db from '@/lib/db';
import { Account } from '@/types/account';
import { revalidatePath } from 'next/cache';

export async function getAccountsAction(): Promise<Account[]> {
    const dbAccounts = await db.account.findMany();
    return dbAccounts.map((acc) => ({
        id: acc.id,
        name: acc.username || acc.providerAccountId,
        handle: `@${acc.providerAccountId}`,
        avatarUrl: acc.picture,
        notes: acc.notes ?? null,
        password: acc.password,
        oauthToken: acc.access_token,
        adsToken: acc.ads_token ?? null,
        adsAccountId: acc.ads_account_id ?? null,
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
                ads_token: account.adsToken || null,
                ads_account_id: account.adsAccountId || null,
                notes: account.notes ?? null,
            },
            update: {
                username: account.name || undefined,
                password: account.password || undefined,
                picture: account.avatarUrl || undefined,
                access_token: account.oauthToken || undefined,
                ads_token: account.adsToken || undefined,
                ads_account_id: account.adsAccountId || undefined,
                notes: account.notes ?? null,
            }
        });

        revalidatePath('/dashboard/accounts');
        return { success: true };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("Erro ao salvar conta no Prisma:", e);
        return { success: false, error: msg };
    }
}

export async function deleteAccountAction(id: string) {
    try {
        await db.account.delete({ where: { id } });
        revalidatePath('/dashboard/accounts');
        return { success: true };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("Erro ao deletar conta no Prisma:", e);
        return { success: false, error: msg };
    }
}

export async function updateAccountMetaProfileAction(username: string, data: {
    followersCount?: number;
    name?: string;
    biography?: string;
    profilePictureUrl?: string;
    followsCount?: number;
    mediaCount?: number;
    website?: string;
}) {
    try {
        const handle = username.replace('@', '').toLowerCase();
        const updateData: Record<string, unknown> = {};
        if (data.followersCount != null) updateData.followers_count = data.followersCount;
        if (data.name) updateData.name = data.name;
        if (data.biography != null) updateData.biography = data.biography;
        if (data.profilePictureUrl) updateData.picture = data.profilePictureUrl;
        if (data.followsCount != null) updateData.follows_count = data.followsCount;
        if (data.mediaCount != null) updateData.media_count = data.mediaCount;
        if (data.website != null) updateData.website = data.website;
        if (Object.keys(updateData).length === 0) return { success: true };

        await db.account.update({
            where: { providerAccountId: handle },
            data: updateData,
        });
        return { success: true };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("Erro ao atualizar perfil Meta no Prisma:", e);
        return { success: false, error: msg };
    }
}

export async function getAccountByUsernameAction(username: string) {
    try {
        const handle = username.replace('@', '').toLowerCase();
        const account = await db.account.findUnique({
            where: { providerAccountId: handle }
        });
        if (!account) return null;
        return {
            name: (account as any).name || account.username || account.providerAccountId,
            followersCount: (account as any).followers_count || undefined,
            mediaCount: (account as any).media_count || undefined,
            biography: (account as any).biography || undefined,
            picture: (account as any).picture || undefined,
            follows_count: (account as any).follows_count || undefined,
            website: (account as any).website || undefined,
        };
    } catch (e) {
        return null;
    }
}
