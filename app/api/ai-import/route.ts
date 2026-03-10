import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import prisma from '@/lib/db';
import { formatStoryImage } from '@/lib/image-utils';

/**
 * Endpoint para recebimento de posts gerados por Agentes de IA/Scripts Externos.
 * Exemplo de Payload JSON:
 * {
 *   "title": "Novo Drink",
 *   "description": "Venha provar o nosso novo Moscow Mule...",
 *   "hashtags": ["#MoscowMule", "#Drinks"],
 *   "images": [
 *      {
 *         "name": "moscow.jpg",
 *         "base64": "iVBORw0KGgoAAAANSUhEUgAA..." // base64 (pode conter prefixo data:image/...)
 *      }
 *   ]
 * }
 */
export async function POST(request: Request) {
    try {
        const payload = await request.json();

        const { title, description, hashtags = [], images = [] } = payload;

        if (!title && !description) {
            return NextResponse.json({ error: 'Título ou descrição são obrigatórios.' }, { status: 400 });
        }

        const uploadDir = join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true }).catch(() => { });

        const mediaUrls: string[] = [];

        // Processar imagens Base64
        if (Array.isArray(images)) {
            for (const img of images) {
                if (img.base64) {
                    // Limpar possível prefixo tipo "data:image/jpeg;base64,"
                    const base64Data = img.base64.replace(/^data:image\/\w+;base64,/, "");
                    const buffer = Buffer.from(base64Data, 'base64');

                    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                    // Extrair extensão do nome original ou usar jpg como fallback
                    const ext = payload.type === 'story' ? 'jpg' : (img.name ? img.name.split('.').pop() : 'jpg');
                    const filename = `ai-${uniqueSuffix}.${ext}`;
                    const filepath = join(uploadDir, filename);

                    let finalBuffer: Buffer = buffer;
                    if (payload.type === 'story') {
                        finalBuffer = await formatStoryImage(buffer) as Buffer;
                    }

                    await writeFile(filepath, finalBuffer);
                    mediaUrls.push(`/uploads/${filename}`);
                }
            }
        }

        // Criar o Content no banco de dados SQLite local
        const newContent = await prisma.content.create({
            data: {
                title: title || 'Gerado por IA',
                description: description || null,
                type: payload.type || 'post',
                status: 'draft',
                hashtags: JSON.stringify(hashtags),
                mediaUrls: JSON.stringify(mediaUrls),
                order: 0,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Post gerado pela IA importado com sucesso.',
            contentId: newContent.id
        });

    } catch (error: any) {
        console.error('Erro na rota /api/ai-import:', error);
        return NextResponse.json({ error: error.message || 'Erro interno no Ingestão de IA.' }, { status: 500 });
    }
}
