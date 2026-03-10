import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import prisma from '@/lib/db';

/**
 * Remove prefixos de blockquote ("> ") das linhas.
 */
function stripBlockquotes(text: string): string {
    return text.split('\n').map(line => line.replace(/^>\s?/, '')).join('\n').trim();
}

/**
 * Parseia um arquivo .md com a estrutura de posts do A Varanda.
 * Suporta dois formatos:
 *   Formato A: **Título/Gancho:** / **Corpo:** / **CTA:** / **Hashtags:**
 *   Formato B: ### Post: Title / - **Copy:** (blockquotes) / - **Hashtags:** (blockquotes)
 */
function parseMdContent(mdText: string): { title: string; description: string; hashtags: string[] } {
    let title = '';
    let description = '';
    let hashtags: string[] = [];

    // --- TÍTULO ---
    // Formato A: **Título/Gancho:** ...
    const tituloMatch = mdText.match(/\*\*T[ií]tulo\/Gancho:\*\*\s*(.+)/i);
    if (tituloMatch) {
        title = tituloMatch[1].trim();
    } else {
        // Formato B: ### Post: Title  ou  ## Post: Title
        const postTitleMatch = mdText.match(/^#{1,4}\s+(?:Post:\s*)?(.+)/m);
        if (postTitleMatch) {
            title = postTitleMatch[1].trim();
        }
    }

    // --- CORPO (description) ---
    // Formato A: **Corpo:** ... até o próximo campo
    const corpoMatch = mdText.match(/\*\*Corpo:\*\*\s*([\s\S]*?)(?=\*\*Chamada|---|\*\*Hashtags|\*\*CTA|## Hashtags|## Chamada|$)/i);
    let corpoText = corpoMatch ? corpoMatch[1].trim() : '';

    // Formato A: Adicionar CTA ao corpo
    const ctaMatch = mdText.match(/\*\*Chamada para A[çc][ãa]o.*?\*\*\s*([\s\S]*?)(?=\*\*Hashtags|---|\n## |$)/i);
    if (ctaMatch) {
        const ctaText = ctaMatch[1].trim();
        if (ctaText) {
            corpoText = corpoText ? `${corpoText}\n\n${ctaText}` : ctaText;
        }
    }

    // Formato A: Texto Sugerido (carrossel)
    if (!corpoText) {
        const textoSugerido = mdText.match(/\*\*Texto Sugerido:\*\*\s*([\s\S]*?)(?=---|## |$)/i);
        if (textoSugerido) {
            corpoText = textoSugerido[1].trim();
        }
    }

    // Formato B: - **Copy:** seguido de blockquotes
    if (!corpoText) {
        const copyMatch = mdText.match(/-\s*\*\*Copy:\*\*\s*\n([\s\S]*?)(?=-\s*\*\*Hashtags|-\s*\*\*Tags|$)/i);
        if (copyMatch) {
            corpoText = stripBlockquotes(copyMatch[1]);
        }
    }

    description = corpoText;

    // --- HASHTAGS ---
    // Formato A: **Hashtags...:** \n tags  ou  ## Hashtags...: \n tags
    const hashtagsMatchA = mdText.match(/(?:\*\*Hashtags.*?\*\*|## Hashtags.*?)\s*\n([\s\S]*?)$/im);
    if (hashtagsMatchA) {
        const rawTags = stripBlockquotes(hashtagsMatchA[1]);
        hashtags = rawTags.split(/\s+/).filter(t => t.startsWith('#')).map(t => t.replace(/,$/g, ''));
    }

    // Formato B: - **Hashtags:** \n > #tags (se ainda não capturou)
    if (hashtags.length === 0) {
        const hashtagsMatchB = mdText.match(/-\s*\*\*Hashtags:\*\*\s*\n([\s\S]*?)$/im);
        if (hashtagsMatchB) {
            const rawTags = stripBlockquotes(hashtagsMatchB[1]);
            hashtags = rawTags.split(/\s+/).filter(t => t.startsWith('#')).map(t => t.replace(/,$/g, ''));
        }
    }

    return { title, description, hashtags };
}


export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const files = formData.getAll('files') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'Nenhum arquivo recebido.' }, { status: 400 });
        }

        // Separar MDs e Imagens
        const mdFiles: File[] = [];
        const imageFiles = new Map<string, File>(); // basename sem extensão -> File

        for (const file of files) {
            const name = file.name.toLowerCase();
            if (name.endsWith('.md')) {
                mdFiles.push(file);
            } else if (/\.(png|jpg|jpeg|webp)$/i.test(name)) {
                // Guardar pelo basename sem extensão para fazer o match com o MD
                const baseName = file.name.replace(/\.(png|jpg|jpeg|webp)$/i, '');
                imageFiles.set(baseName.toLowerCase(), file);
            }
        }

        if (mdFiles.length === 0) {
            return NextResponse.json({ error: 'Nenhum arquivo .md encontrado.' }, { status: 400 });
        }

        const uploadDir = join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true }).catch(() => { });

        let importedCount = 0;

        for (const mdFile of mdFiles) {
            const mdText = await mdFile.text();
            const { title, description, hashtags } = parseMdContent(mdText);

            if (!title && !description) continue; // Skip empty MDs

            // Tentar encontrar a imagem correspondente
            const mdBaseName = mdFile.name.replace(/\.md$/i, '').toLowerCase();
            const mediaUrls: string[] = [];

            // Verificar match exato ou parcial (o MD pode ter "-post" no nome mas a imagem não)
            let matchedImage: File | undefined;

            // 1. Match exato
            matchedImage = imageFiles.get(mdBaseName);

            // 2. Se não achou, tentar remover sufixos como "-post", "-post-design"
            if (!matchedImage) {
                const cleanBase = mdBaseName.replace(/-(post|design|post-design|final)$/i, '');
                matchedImage = imageFiles.get(cleanBase);
            }

            // 3. Tentar match parcial nos dois lados
            if (!matchedImage) {
                for (const [imgBase, imgFile] of imageFiles) {
                    if (mdBaseName.includes(imgBase) || imgBase.includes(mdBaseName)) {
                        matchedImage = imgFile;
                        break;
                    }
                }
            }

            // Se encontrou imagem, salvar em uploads
            if (matchedImage) {
                const imgBytes = await matchedImage.arrayBuffer();
                const imgBuffer = Buffer.from(imgBytes);
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                const ext = matchedImage.name.split('.').pop() || 'png';
                const filename = `${uniqueSuffix}.${ext}`;
                const filepath = join(uploadDir, filename);
                await writeFile(filepath, imgBuffer);
                mediaUrls.push(`/uploads/${filename}`);
            }

            // Criar o Content no banco
            await prisma.content.create({
                data: {
                    title: title || mdFile.name.replace('.md', ''),
                    description: description || null,
                    type: 'post',
                    status: 'draft',
                    hashtags: JSON.stringify(hashtags),
                    mediaUrls: JSON.stringify(mediaUrls),
                    order: 0,
                },
            });

            importedCount++;
        }

        return NextResponse.json({
            success: true,
            imported: importedCount,
            message: `${importedCount} post(s) importado(s) com sucesso!`,
        });
    } catch (error: any) {
        console.error('Erro na importação MD:', error);
        return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
    }
}
