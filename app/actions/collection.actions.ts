'use server';

import prisma from '@/lib/db';
import type { Collection } from '@/types/collection';

function mapToCollection(dbCol: any): Collection {
    return {
        ...dbCol,
        startDate: dbCol.startDate ? dbCol.startDate.toISOString() : null,
        endDate: dbCol.endDate ? dbCol.endDate.toISOString() : null,
        createdAt: dbCol.createdAt.toISOString(),
    };
}

export async function getCollectionsAction(): Promise<Collection[]> {
    const cols = await prisma.collection.findMany({
        orderBy: { createdAt: 'desc' },
    });
    return cols.map(mapToCollection);
}

export async function saveCollectionAction(collection: Collection): Promise<Collection> {
    const { id, startDate, endDate, createdAt, ...rest } = collection;

    const dbData = {
        ...rest,
        id,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
    };

    const saved = await prisma.collection.upsert({
        where: { id },
        update: dbData,
        create: dbData,
    });

    return mapToCollection(saved);
}

export async function deleteCollectionAction(id: string): Promise<void> {
    await prisma.collection.delete({ where: { id } });
}
