import { NextResponse } from 'next/server';
import { InstagramService } from '@/lib/services/instagram.service';

export const maxDuration = 300; // Allow up to 5 minutes for browser automation

export async function POST(req: Request) {
    try {
        const { replies, accountHandle } = await req.json();

        if (!Array.isArray(replies) || replies.length === 0) {
            return NextResponse.json({ success: false, error: 'Nenhuma resposta enviada' }, { status: 400 });
        }

        if (!accountHandle) {
            return NextResponse.json({ success: false, error: 'Account handle não fornecido' }, { status: 400 });
        }

        // Limit the batch to prevent long-running processes that might timeout or get blocked
        const limitedReplies = replies.slice(0, 10);

        const result = await InstagramService.batchRespondToComments(accountHandle, limitedReplies);

        return NextResponse.json(result);

    } catch (error) {
        console.error('Erro na API de Automação de Respostas:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' },
            { status: 500 }
        );
    }
}
