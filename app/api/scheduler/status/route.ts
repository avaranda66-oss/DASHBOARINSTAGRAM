import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const now = new Date();

        const [scheduled, overdue, recentFailed, nextPost] = await Promise.all([
            prisma.content.count({ where: { status: 'scheduled' } }),
            prisma.content.count({
                where: { status: 'scheduled', scheduledAt: { lte: now } },
            }),
            prisma.content.count({
                where: {
                    status: 'failed',
                    updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
            }),
            prisma.content.findFirst({
                where: { status: 'scheduled', scheduledAt: { gt: now } },
                orderBy: { scheduledAt: 'asc' },
                select: { id: true, title: true, scheduledAt: true },
            }),
        ]);

        const globalScheduler = global as unknown as { __instagramSchedulerInterval?: NodeJS.Timeout };
        const isActive = !!globalScheduler.__instagramSchedulerInterval;

        return NextResponse.json({
            ok: true,
            scheduler: {
                active: isActive,
                checkInterval: '1min',
            },
            queue: {
                scheduled,
                overdue,
                recentFailed24h: recentFailed,
            },
            nextPost: nextPost
                ? {
                      id: nextPost.id,
                      title: nextPost.title,
                      scheduledAt: nextPost.scheduledAt,
                  }
                : null,
            checkedAt: now.toISOString(),
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}
