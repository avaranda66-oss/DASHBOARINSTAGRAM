'use server';

import prisma from '@/lib/db';
import type { Content } from '@/types/content';
import { revalidatePath } from 'next/cache';

// Safe JSON array parse — handles both JSON arrays and plain strings
function safeJsonArray(value: string | null | undefined): string[] {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
    } catch {
        return value.split(/[,\s]+/).filter(Boolean);
    }
}

// Helper to convert DB Content to App Content (handling JSON strings)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToContent(dbContent: any): Content {
    return {
        ...dbContent,
        scheduledAt: dbContent.scheduledAt ? dbContent.scheduledAt.toISOString() : null,
        createdAt: dbContent.createdAt.toISOString(),
        updatedAt: dbContent.updatedAt.toISOString(),
        hashtags: safeJsonArray(dbContent.hashtags),
        mediaUrls: safeJsonArray(dbContent.mediaUrls),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collectionIds: dbContent.collections ? dbContent.collections.map((c: any) => c.id) : [],
    };
}

export async function getContentsAction(): Promise<Content[]> {
    const contents = await prisma.content.findMany({
        orderBy: { order: 'asc' },
        include: { collections: true },
    });
    return contents.map(mapToContent);
}

export async function saveContentAction(content: Content): Promise<Content> {
    const { id, scheduledAt, hashtags, mediaUrls, createdAt, updatedAt, collectionIds, ...rest } = content;

    // Convert to DB format
    const dbData = {
        ...rest,
        id,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        hashtags: JSON.stringify(hashtags || []),
        mediaUrls: JSON.stringify(mediaUrls || []),
    };

    const saved = await prisma.content.upsert({
        where: { id },
        update: {
            ...dbData,
            collections: {
                set: (collectionIds || []).map(cid => ({ id: cid }))
            }
        },
        create: {
            ...dbData,
            collections: {
                connect: (collectionIds || []).map(cid => ({ id: cid }))
            }
        },
        include: { collections: true },
    });

    return mapToContent(saved);
}

export async function saveAllContentsAction(contents: Content[]): Promise<void> {
    // Only used for mock data initialization
    for (const c of contents) {
        await saveContentAction(c);
    }
}

export async function deleteContentAction(id: string): Promise<void> {
    await prisma.content.delete({ where: { id } });
}

/**
 * Reordena conteúdos agendados, redistribuindo as datas de agendamento.
 *
 * orderedIds vem do mini storyboard "Ordem de Publicação":
 * - orderedIds[0] = publica PRIMEIRO = recebe a data MAIS ANTIGA
 * - orderedIds[last] = publica POR ÚLTIMO = recebe a data MAIS RECENTE
 *
 * No grid do Instagram, orderedIds[last] aparecerá na posição 1 (topo-esquerda)
 * porque é o mais recente.
 */
export async function reorderContentsAction(orderedIds: string[]): Promise<void> {
    // 1. Buscar as datas atuais de todos os conteúdos envolvidos
    const contents = await prisma.content.findMany({
        where: { id: { in: orderedIds } },
        select: { id: true, scheduledAt: true },
    });

    // 2. Coletar datas e ordenar da mais antiga para a mais recente
    const dates = contents
        .map(c => c.scheduledAt)
        .filter((d): d is Date => d !== null)
        .sort((a, b) => a.getTime() - b.getTime()); // mais antiga primeiro

    // 3. Atribuir: orderedIds[0] recebe a data mais antiga (publica primeiro)
    for (let i = 0; i < orderedIds.length; i++) {
        const newDate = i < dates.length ? dates[i] : null;
        await prisma.content.update({
            where: { id: orderedIds[i] },
            data: {
                order: i,
                ...(newDate ? { scheduledAt: newDate } : {}),
            },
        });
    }
    revalidatePath('/dashboard/content');
}

/**
 * Reagenda conteúdos com datas específicas sugeridas pela IA.
 * Cada item tem id + datetime ISO string.
 */
export async function rescheduleContentsAction(
    schedule: { id: string; datetime: string }[]
): Promise<void> {
    for (const item of schedule) {
        await prisma.content.update({
            where: { id: item.id },
            data: {
                scheduledAt: new Date(item.datetime),
            },
        });
    }
    revalidatePath('/dashboard/content');
}
