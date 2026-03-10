import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo recebido.' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Criar um nome único e seguro para o arquivo
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const extension = file.name.split('.').pop() || 'tmp';
        const filename = `${uniqueSuffix}.${extension}`;

        // Definir o caminho de destino em `public/uploads`
        const uploadDir = join(process.cwd(), 'public', 'uploads');

        // Garantir que a pasta existe (ignora se já existir)
        await mkdir(uploadDir, { recursive: true }).catch(() => { });

        const filepath = join(uploadDir, filename);

        // Salvar fisicamente no disco
        await writeFile(filepath, buffer);

        // Retornar a URL pública do arquivo
        const publicUrl = `/uploads/${filename}`;

        return NextResponse.json({ url: publicUrl, success: true });
    } catch (error) {
        console.error('Erro ao fazer upload:', error);
        return NextResponse.json({ error: 'Erro interno no servidor ao salvar arquivo.' }, { status: 500 });
    }
}
