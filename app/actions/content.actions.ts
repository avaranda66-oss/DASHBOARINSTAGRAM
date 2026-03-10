'use server';

import prisma from '@/lib/db';
import type { Content } from '@/types/content';
import { revalidatePath } from 'next/cache';

// Helper to convert DB Content to App Content (handling JSON strings)
function mapToContent(dbContent: any): Content {
    return {
        ...dbContent,
        scheduledAt: dbContent.scheduledAt ? dbContent.scheduledAt.toISOString() : null,
        createdAt: dbContent.createdAt.toISOString(),
        updatedAt: dbContent.updatedAt.toISOString(),
        hashtags: dbContent.hashtags ? JSON.parse(dbContent.hashtags) : [],
        mediaUrls: dbContent.mediaUrls ? JSON.parse(dbContent.mediaUrls) : [],
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
