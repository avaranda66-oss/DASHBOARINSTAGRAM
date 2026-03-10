import { NextResponse } from 'next/server';
import { InstagramService } from '@/lib/services/instagram.service';
import path from 'path';
import fs from 'fs';

const SESSIONS_DIR = path.join(process.cwd(), 'sessions');

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const handle = searchParams.get('handle')?.replace('@', '');

        if (!handle) {
            return NextResponse.json({ success: false, error: 'Handle não fornecido' }, { status: 400 });
        }

        const sessionPath = path.join(SESSIONS_DIR, `${handle}.json`);
        const isConnected = fs.existsSync(sessionPath);

        return NextResponse.json({
            success: true,
            isConnected
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Erro ao verificar conexão' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { handle } = await req.json();
        const cleanHandle = handle?.replace('@', '');

        if (!cleanHandle) {
            return NextResponse.json({ success: false, error: 'Handle não fornecido' }, { status: 400 });
        }

        // Abre o navegador para login manual no Playwright
        // Esta chamada é bloqueante até o usuário fechar o navegador
        const loggedUser = await InstagramService.requestManualLogin(cleanHandle);

        if (loggedUser) {
            return NextResponse.json({
                success: true,
                loggedUser
            });
        } else {
            return NextResponse.json({
                success: false,
                error: 'Login não foi concluído ou usuário não detectado'
            }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Erro no login de automação:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Erro ao iniciar login'
        }, { status: 500 });
    }
}
