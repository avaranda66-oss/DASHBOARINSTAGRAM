'use server';

import prisma from '@/lib/db';
import type { CompetitorProfile } from '@/types/competitor';
import { revalidatePath } from 'next/cache';

export async function getCompetitorsAction(): Promise<CompetitorProfile[]> {
    const competitors = await prisma.competitor.findMany({
        orderBy: { createdAt: 'desc' }
    });

    return competitors.map((c) => ({
        id: c.id,
        handle: c.handle,
        name: c.name,
        avatarUrl: c.avatarUrl || undefined,
        addedAt: c.createdAt.toISOString()
    }));
}

export async function saveCompetitorAction(competitor: CompetitorProfile): Promise<CompetitorProfile> {
    const cleanHandle = competitor.handle.toLowerCase().trim();
    const saved = await prisma.competitor.upsert({
        where: { handle: cleanHandle },
        update: {
            name: competitor.name || undefined,
            avatarUrl: competitor.avatarUrl || undefined,
            updatedAt: new Date()
        },
        create: {
            id: competitor.id,
            handle: cleanHandle,
            name: competitor.name || cleanHandle,
            avatarUrl: competitor.avatarUrl || null,
            createdAt: new Date(competitor.addedAt)
        }
    });

    return {
        id: saved.id,
        handle: saved.handle,
        name: saved.name,
        avatarUrl: saved.avatarUrl || undefined,
        addedAt: saved.createdAt.toISOString()
    };
}

export async function deleteCompetitorAction(id: string): Promise<void> {
    await prisma.competitor.delete({ where: { id } });
    revalidatePath('/dashboard/analytics');
}

export async function updateCompetitorMetricsAction(handle: string, metrics: Record<string, unknown>): Promise<void> {
    await prisma.competitor.update({
        where: { handle },
        data: {
            metrics: JSON.stringify(metrics),
            lastChecked: new Date()
        }
    });
}

export async function refreshCompetitorAvatarAction(handle: string): Promise<string | null> {
    try {
        if (!handle) throw new Error("Handle não fornecido.");

        const cleanHandle = handle.replace(/^@/, '').toLowerCase().trim();

        const { InstagramService } = await import('@/lib/services/instagram.service');

        const avatarUrl = await InstagramService.fetchProfileAvatar(cleanHandle);

        if (avatarUrl) {

            // Tenta atualizar na tabela de Concorrentes
            const comp = await prisma.competitor.findUnique({ where: { handle: cleanHandle } });
            if (comp) {
                await prisma.competitor.update({
                    where: { handle: cleanHandle },
                    data: { avatarUrl }
                });
            } else {
                // Se não é concorrente, tenta atualizar na tabela de Contas
                const acc = await prisma.account.findUnique({ where: { providerAccountId: cleanHandle } });
                if (acc) {
                    await prisma.account.update({
                        where: { providerAccountId: cleanHandle },
                        data: { picture: avatarUrl }
                    });
                } else {
                    console.warn(`[Action] ⚠️ Handle [${cleanHandle}] não encontrado em nenhuma tabela de destino.`);
                }
            }
        } else {
            console.warn(`[Action] ❌ Robô não conseguiu encontrar o avatar.`);
        }
        return avatarUrl;
    } catch (error: any) {
        console.error(`[Action Error] 🚨 FALHA CRÍTICA:`, error);
        // Retornar a mensagem original do erro para o toast
        throw new Error(error.message || "Falha técnica no robô.");
    }
}
