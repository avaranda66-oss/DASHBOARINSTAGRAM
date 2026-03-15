import { NextResponse } from 'next/server';
import { sendReportNow } from '@/lib/services/report-scheduler.service';

// ─── US-60 — POST /api/reports/send-now ───────────────────────────────────────

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, token, accountId, accountName, datePreset } = body;

        if (!email || !token || !accountId) {
            return NextResponse.json(
                { error: 'Campos obrigatórios: email, token, accountId' },
                { status: 400 },
            );
        }

        const result = await sendReportNow(email, token, accountId, accountName, datePreset);
        return NextResponse.json(result, { status: result.success ? 200 : 500 });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Erro ao enviar relatório';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
