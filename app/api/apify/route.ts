import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { scrapeAndWait } from '@/lib/services/apify.service';

const requestSchema = z.object({
    profileUrls: z
        .array(z.string().min(1))
        .min(1, 'Informe pelo menos uma URL ou @username'),
    resultsLimit: z.number().int().min(1).max(9999).default(20),
    periodDays: z.number().int().min(1).optional(),
});

// Simples In-Memory Rate Limiter para segurança do Apify (limite diário de runs globais)
// OBS: Em Produção (Serverless), o ideal é usar Redis ou Vercel KV. Para V1 funciona bem em escopos menores.
let dailyRunCount = 0;
let lastRunDate = new Date().toDateString();
const MAX_DAILY_RUNS = 20;

export async function POST(req: NextRequest) {
    try {
        // Verifica o limite temporal
        const today = new Date().toDateString();
        if (lastRunDate !== today) {
            dailyRunCount = 0;
            lastRunDate = today;
        }

        if (dailyRunCount >= MAX_DAILY_RUNS) {
            console.warn(`[APIFY SECURITY] Limite global de segurança diário atingido (${MAX_DAILY_RUNS} runs). Pedido negado.`);
            return NextResponse.json(
                { success: false, error: `Limite diário de uso do sistema de inteligência atingido (${MAX_DAILY_RUNS}). Tente novamente amanhã.` },
                { status: 429 },
            );
        }

        const body = await req.json();
        const parsed = requestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error.issues[0].message },
                { status: 400 },
            );
        }

        let { profileUrls, resultsLimit, periodDays } = parsed.data;

        // Se houver período, o limite de posts deve ser muito alto para que a data seja o filtro real
        if (periodDays && resultsLimit < 1000) {
            resultsLimit = 1000;
        }

        // Log explícito

        // Incrementa o contador SEGURO ANTES de chamar, para evitar race conditions básicas
        dailyRunCount++;

        const posts = await scrapeAndWait(profileUrls, resultsLimit, periodDays);

        return NextResponse.json({ success: true, data: posts });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('[API /apify] Error:', message);
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 },
        );
    }
}
