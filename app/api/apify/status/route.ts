import { NextRequest, NextResponse } from 'next/server';
import { getRunStatus } from '@/lib/services/apify.service';

export async function GET(req: NextRequest) {
    const runId = req.nextUrl.searchParams.get('runId');

    if (!runId) {
        return NextResponse.json(
            { success: false, error: 'runId query parameter is required' },
            { status: 400 },
        );
    }

    try {
        const status = await getRunStatus(runId);
        return NextResponse.json({ success: true, data: status });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : 'Erro desconhecido';
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 },
        );
    }
}
