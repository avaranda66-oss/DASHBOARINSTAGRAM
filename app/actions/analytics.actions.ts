'use server';

import prisma from '@/lib/db';
import type { CachedAnalytics } from '@/types/analytics';

export async function getAnalyticsAction(targetId: string, type: 'account' | 'competitor'): Promise<CachedAnalytics | null> {
    const analytics = await prisma.analytics.findUnique({
        where: {
            targetId_type: {
                targetId: type === 'competitor' ? targetId.toLowerCase() : targetId,
                type
            }
        }
    });

    if (!analytics) return null;

    // Busca a foto de perfil. Tenta ambas as tabelas para ser resiliente a erros de 'type' no cache
    const cleanId = targetId.toLowerCase().trim();
    const comp = await prisma.competitor.findUnique({ where: { handle: cleanId } });
    const acc = await prisma.account.findUnique({ where: { providerAccountId: cleanId } });

    const avatarUrl = comp?.avatarUrl || acc?.picture || undefined;

    return {
        id: analytics.id,
        accountHandle: analytics.targetId,
        fetchedAt: analytics.updatedAt.toISOString(),
        posts: JSON.parse(analytics.data),
        avatarUrl
    };
}

export async function getMetaAnalyticsAction(username: string): Promise<CachedAnalytics | null> {
    const analytics = await prisma.analytics.findUnique({
        where: { targetId_type: { targetId: username.toLowerCase(), type: 'meta' } }
    });
    if (!analytics) return null;
    return {
        id: analytics.id,
        accountHandle: analytics.targetId,
        fetchedAt: analytics.updatedAt.toISOString(),
        posts: JSON.parse(analytics.data),
    };
}

export async function saveMetaAnalyticsAction(username: string, posts: CachedAnalytics['posts']): Promise<void> {
    const cleanHandle = username.toLowerCase().trim();
    await prisma.analytics.upsert({
        where: { targetId_type: { targetId: cleanHandle, type: 'meta' } },
        update: { data: JSON.stringify(posts), updatedAt: new Date() },
        create: { targetId: cleanHandle, type: 'meta', data: JSON.stringify(posts), updatedAt: new Date() }
    });
}

/** Remove dados Meta que foram salvos erroneamente com type='account' */
export async function cleanupMetaContaminationAction(username: string): Promise<boolean> {
    try {
        const handle = username.toLowerCase().trim();
        const analytics = await prisma.analytics.findUnique({
            where: { targetId_type: { targetId: handle, type: 'account' } }
        });
        if (!analytics) return false;
        const posts = JSON.parse(analytics.data);
        const isContaminated = Array.isArray(posts) && posts.some((p: any) => p.source === 'meta' || p.reach !== undefined);
        if (isContaminated) {
            await prisma.analytics.delete({
                where: { targetId_type: { targetId: handle, type: 'account' } }
            });
            return true;
        }
        return false;
    } catch { return false; }
}

export async function saveAnalyticsAction(analytics: CachedAnalytics, type: 'account' | 'competitor'): Promise<void> {
    const cleanHandle = analytics.accountHandle.toLowerCase().trim();
    await prisma.analytics.upsert({
        where: {
            targetId_type: {
                targetId: type === 'competitor' ? cleanHandle : analytics.accountHandle,
                type: type
            }
        },
        update: {
            data: JSON.stringify(analytics.posts),
            updatedAt: new Date()
        },
        create: {
            targetId: type === 'competitor' ? cleanHandle : analytics.accountHandle,
            type: type,
            data: JSON.stringify(analytics.posts),
            updatedAt: new Date(analytics.fetchedAt)
        }
    });
}
