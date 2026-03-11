'use server';

import prisma from '@/lib/db';

export interface MapsBusinessData {
    name: string;
    rating?: number | null;
    totalReviews?: number | null;
    address?: string | null;
    phone?: string | null;
    category?: string | null;
    hours?: string | null;
    website?: string | null;
    highlights?: string[];
    rawMarkdown?: string | null;
}

/**
 * Save or update a Maps business
 */
export async function saveMapsBusinessAction(data: MapsBusinessData) {
    try {
        // Check if business with same name exists
        const existing = await prisma.mapsBusiness.findFirst({
            where: { name: data.name },
        });

        if (existing) {
            const updated = await prisma.mapsBusiness.update({
                where: { id: existing.id },
                data: {
                    rating: data.rating,
                    totalReviews: data.totalReviews,
                    address: data.address,
                    phone: data.phone,
                    category: data.category,
                    hours: data.hours,
                    website: data.website,
                    highlights: data.highlights ? JSON.stringify(data.highlights) : null,
                    rawMarkdown: data.rawMarkdown,
                    scrapedAt: new Date(),
                },
            });
            return { success: true, data: updated, isUpdate: true };
        }

        const created = await prisma.mapsBusiness.create({
            data: {
                name: data.name,
                rating: data.rating,
                totalReviews: data.totalReviews,
                address: data.address,
                phone: data.phone,
                category: data.category,
                hours: data.hours,
                website: data.website,
                highlights: data.highlights ? JSON.stringify(data.highlights) : null,
                rawMarkdown: data.rawMarkdown,
            },
        });
        return { success: true, data: created, isUpdate: false };
    } catch (error) {
        console.error('[saveMapsBusinessAction] Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
}

/**
 * Get all saved Maps businesses
 */
export async function getMapsBusinessesAction() {
    try {
        const businesses = await prisma.mapsBusiness.findMany({
            orderBy: { scrapedAt: 'desc' },
        });
        return businesses.map(b => ({
            ...b,
            highlights: b.highlights ? JSON.parse(b.highlights) : [],
        }));
    } catch (error) {
        console.error('[getMapsBusinessesAction] Error:', error);
        return [];
    }
}

/**
 * Delete a Maps business by ID
 */
export async function deleteMapsBusinessAction(id: string) {
    try {
        await prisma.mapsBusiness.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error('[deleteMapsBusinessAction] Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
}

/**
 * Update review count manually
 */
export async function updateMapsReviewCountAction(id: string, totalReviews: number) {
    try {
        const updated = await prisma.mapsBusiness.update({
            where: { id },
            data: { totalReviews },
        });
        return { success: true, data: updated };
    } catch (error) {
        console.error('[updateMapsReviewCountAction] Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
}
