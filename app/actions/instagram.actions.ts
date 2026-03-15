'use server';

import { InstagramService } from '@/lib/services/instagram.service';
import prisma from '@/lib/db';
import { exec } from 'child_process';
import path from 'path';

export async function checkInstagramLoginAction(): Promise<boolean> {
    try {
        return await InstagramService.checkLoginStatus();
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function loginInstagramAction(): Promise<boolean> {
    return new Promise((resolve) => {
        try {
            const cwd = process.cwd();
            // Evita bug de aspas no CMD: mudamos de diretório primeiro e mandamos rodar o script relativo
            exec(`start cmd.exe /K "cd /d "${cwd}" && node scripts/playwright-login.js"`, (error) => {
                if (error) {
                    console.error("Erro ao iniciar script de login:", error);
                    resolve(false);
                    return;
                }
                resolve(true);
            });
        } catch (e) {
            console.error(e);
            resolve(false);
        }
    });
}

export async function publishInstagramPostAction(contentId: string, handle?: string, options?: { useMetaApi?: boolean }): Promise<{ success: boolean; message: string }> {
    const reqBody = options || {};
    try {
        const content = await prisma.content.findUnique({
            where: { id: contentId }
        });

        if (!content) throw new Error("Post não encontrado no banco.");

        // Obter mídia
        const mediaArr = content.mediaUrls ? JSON.parse(content.mediaUrls) : [];
        if (mediaArr.length === 0) {
            throw new Error("Agendamento falhou: Nenhuma imagem nesse post para enviar.");
        }

        const imageUrls = mediaArr; // Array com todas as imagens do post

        const titleText = content.title ? `${content.title}\n\n` : "";
        const descText = content.description ? `${content.description}\n\n` : "";

        let tagsText = "";
        try {
            const parsedTags = content.hashtags ? JSON.parse(content.hashtags) : [];
            if (Array.isArray(parsedTags) && parsedTags.length > 0) {
                tagsText = parsedTags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ');
            }
        } catch (e) { }

        // Passa a legenda formatada
        const caption = `${titleText}${descText}${tagsText}`.trim();

        // Chamar o bot baseando-se no tipo de conteúdo
        let success = false;
        const targetHandle = handle || content.accountId || "default";
        const normalizedType = (content.type || 'post').toLowerCase();

        // [NOVO] Opção de postar via Meta API
        const useMetaApi = (reqBody as any)?.useMetaApi === true;

        if (useMetaApi) {
            // Tentar buscar por ID (CUID), ID numérico do provedor ou pelo handle diretamente
            let account = await prisma.account.findFirst({
                where: {
                    OR: [
                        { id: targetHandle },
                        { providerAccountId: targetHandle },
                        { username: targetHandle.replace('@', '') }
                    ]
                }
            });

            const token = account?.access_token ?? null;

            // SEGURANÇA: O fallback para token global foi REMOVIDO.
            // Usar o token global para uma conta diferente causa publicação na conta ERRADA,
            // pois getInstagramUserId(token) retorna o userId do DONO do token, não da conta alvo.
            // Cada conta DEVE ter seu próprio token configurado em "Editar Conta".
            if (!token) {
                throw new Error(
                    `Token Meta não encontrado para @${targetHandle}. ` +
                    `Configure o token individual desta conta em "Gerenciar Contas" → Editar → campo "Token Meta API". ` +
                    `O token Global em Configurações não é usado para evitar publicação na conta errada.`
                );
            }

            // Mapear URLs locais para Públicas via Tunnel se configurado
            const tunnelSetting = await prisma.setting.findUnique({ where: { key: 'tunnel_url' } });
            const tunnelUrl = tunnelSetting?.value ? JSON.parse(tunnelSetting.value) : null;
            

            let finalImageUrls = imageUrls;
            if (tunnelUrl) {
                finalImageUrls = imageUrls.map((url: string) => {
                    // Mapear tanto /uploads/ quanto /creatives/ para a URL do túnel
                    if (url.startsWith('/uploads/') || url.startsWith('/creatives/')) {
                        const mapped = `${tunnelUrl.replace(/\/$/, '')}${url}`;
                        return mapped;
                    }
                    return url;
                });
            } else {
                console.warn(`[Action] AVISO: tunnel_url não configurado. Meta API provavelmente falhará com caminhos locais.`);
            }

            const { publishImage, publishCarousel, publishReel, publishVideo, publishStory, getInstagramUserId } = await import('@/lib/services/instagram-graph.service');
            const userId = await getInstagramUserId(token);
            if (!userId) throw new Error("ID do Instagram não encontrado para o token fornecido.");

            // Otimizar todas as imagens locais (PNG ou > 1MB) antes de enviar
            if (tunnelUrl) {
                const pathMod = (await import('path')).default;
                const fsMod = (await import('fs')).default;
                const isStory = normalizedType === 'story';
                const targetW = 1080;
                const targetH = isStory ? 1920 : 1350; // Story 9:16, Feed 4:5

                for (let i = 0; i < finalImageUrls.length; i++) {
                    const origUrl = imageUrls[i];
                    const isLocal = origUrl?.startsWith('/uploads/') || origUrl?.startsWith('/creatives/');
                    const isVid = finalImageUrls[i]?.toLowerCase().match(/\.(mp4|mov|avi|wmv|m4v)$/i);
                    if (!isLocal || isVid) continue;

                    try {
                        const localAbsPath = pathMod.join(process.cwd(), 'public', origUrl);
                        const stats = fsMod.statSync(localAbsPath);
                        const isPng = localAbsPath.toLowerCase().endsWith('.png');
                        if (stats.size > 1 * 1024 * 1024 || isPng) {
                            const sharp = (await import('sharp')).default;
                            const optimizedRelPath = origUrl.replace(/\.[^.]+$/, `_opt${i}.jpg`);
                            const optimizedAbsPath = pathMod.join(process.cwd(), 'public', optimizedRelPath);
                            await sharp(localAbsPath)
                                .resize(targetW, targetH, {
                                    fit: 'inside',
                                    withoutEnlargement: true,
                                    kernel: 'lanczos3',
                                    fastShrinkOnLoad: false,
                                })
                                .toColorspace('srgb')
                                .jpeg({
                                    quality: 92,
                                    mozjpeg: true,
                                    chromaSubsampling: '4:4:4',
                                })
                                .toFile(optimizedAbsPath);
                            const newSize = fsMod.statSync(optimizedAbsPath).size;
                            finalImageUrls[i] = `${tunnelUrl.replace(/\/$/, '')}${optimizedRelPath}`;
                        }
                    } catch (optErr: unknown) {
                        const msg = optErr instanceof Error ? optErr.message : String(optErr);
                        console.warn(`[Action] Falha ao otimizar imagem ${i}: ${msg}`);
                    }
                }
            }

            if (normalizedType === 'story') {
                const res = await publishStory(token, userId, finalImageUrls[0]);
                success = res.success;
                if (!success) throw new Error(`Meta API Story: ${res.error}`);
            } else if (finalImageUrls.length > 1) {
                const res = await publishCarousel(token, userId, finalImageUrls, caption);
                success = res.success;
                if (!success) throw new Error(`Meta API Carousel: ${res.error}`);
            } else {
                const url = finalImageUrls[0];
                const isVideo = url.toLowerCase().match(/\.(mp4|mov|avi|wmv|m4v)$/i);
                
                if (isVideo) {
                    const res = await publishReel(token, userId, url, caption);
                    success = res.success;
                    if (!success) throw new Error(`Meta API Reel/Video: ${res.error}`);
                } else {
                    if (normalizedType === 'reel') {
                        throw new Error("A Meta API exige arquivos de vídeo (.mp4, .mov) para postagens do tipo Reel. Para imagens, use o tipo 'Post'.");
                    }
                    const res = await publishImage(token, userId, url, caption);
                    success = res.success;
                    if (!success) throw new Error(`Meta API Image: ${res.error}`);
                }
            }
        } else {
            if (normalizedType === 'story') {
                success = await InstagramService.publishStory(targetHandle, imageUrls[0]);
            } else if (normalizedType === 'reel') {
                success = await InstagramService.publishReel(targetHandle, imageUrls[0], caption);
            } else {
                success = await InstagramService.publishPost(targetHandle, imageUrls, caption);
            }
        }

        if (success) {
            // Atualizar status no banco SQLite local
            await prisma.content.update({
                where: { id: contentId },
                data: { status: 'published' }
            });
            return { success: true, message: "Post publicado de verdade e status atualizado para 'Published'." };
        }

        return { success: false, message: "Erro desconhecido na publicação." };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro interno.";
        console.error("publishInstagramPostAction erro:", e);
        return { success: false, message: msg };
    }
}
