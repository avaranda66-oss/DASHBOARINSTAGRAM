import { NextResponse } from 'next/server';
import { getSchedule, saveSchedule, calculateNextSendAt } from '@/lib/services/report-scheduler.service';
import type { ReportSchedule } from '@/lib/services/report-scheduler.service';

// ─── US-60 — GET /api/reports/schedule ────────────────────────────────────────

export async function GET() {
    try {
        const schedule = await getSchedule();
        return NextResponse.json({ schedule });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Erro ao ler agendamento';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// ─── US-60 — POST /api/reports/schedule ───────────────────────────────────────

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, frequency, accountId, accountName, token, enabled, datePreset } = body;

        if (!email || !frequency || !accountId || !token) {
            return NextResponse.json(
                { error: 'Campos obrigatórios: email, frequency, accountId, token' },
                { status: 400 },
            );
        }

        if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
            return NextResponse.json(
                { error: 'frequency deve ser: daily, weekly ou monthly' },
                { status: 400 },
            );
        }

        const schedule: ReportSchedule = {
            email,
            frequency,
            accountId,
            accountName: accountName || accountId,
            token,
            enabled: enabled !== false,
            nextSendAt: calculateNextSendAt(frequency),
            datePreset,
        };

        await saveSchedule(schedule);
        return NextResponse.json({ schedule, message: 'Agendamento salvo com sucesso' });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Erro ao salvar agendamento';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
