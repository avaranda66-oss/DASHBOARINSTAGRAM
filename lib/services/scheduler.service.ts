import prisma from '@/lib/db';
import { InstagramService } from './instagram.service';
import path from 'path';
import fs from 'fs';

export class SchedulerService {
    private static isRunning = false;
    private static CHECK_INTERVAL = 1 * 60 * 1000; // 1 minuto para ser mais responsivo sem pesar o PC

    static async start() {
        // Padrão Singleton para Hot Reload do Next.js (evita duplicar o intervalo ao salvar arquivos)
        const globalScheduler = global as any as { __instagramSchedulerInterval?: NodeJS.Timeout };

        if (globalScheduler.__instagramSchedulerInterval) {
            return;
        }

        console.log(`[Scheduler] 🤖 Agendador INTEGRADO iniciado (Check: ${this.CHECK_INTERVAL / 60000}min).`);

        globalScheduler.__instagramSchedulerInterval = setInterval(() => {
            this.checkAndPublish();
        }, this.CHECK_INTERVAL);

        // Rodar uma vez imediatamente
        this.checkAndPublish();
    }

    static async stop() {
        const globalScheduler = global as any as { __instagramSchedulerInterval?: NodeJS.Timeout };
        if (globalScheduler.__instagramSchedulerInterval) {
            clearInterval(globalScheduler.__instagramSchedulerInterval);
            delete globalScheduler.__instagramSchedulerInterval;
        }
    }

    private static async checkAndPublish() {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            const now = new Date();

            // Buscar posts agendados
            const pendingPosts = await prisma.content.findMany({
                where: {
                    status: 'scheduled',
                    scheduledAt: {
                        lte: now
                    }
                }
            });

            if (pendingPosts.length === 0) {
                this.isRunning = false;
                return;
            }

            console.log(`[Scheduler] Encontrado(s) ${pendingPosts.length} post(s) para publicar.`);

            // Agrupar posts por conta para processamento paralelo por conta
            const postsByAccount: Record<string, typeof pendingPosts> = {};
            for (const post of pendingPosts) {
                const accountId = post.accountId || 'unknown';
                if (!postsByAccount[accountId]) postsByAccount[accountId] = [];
                postsByAccount[accountId].push(post);
            }

            const accountIds = Object.keys(postsByAccount);
            console.log(`[Scheduler] Processando ${accountIds.length} conta(s) em paralelo.`);

            // Processar cada conta em paralelo
            await Promise.all(accountIds.map(async (accountId) => {
                const accountPosts = postsByAccount[accountId];

                // Processar posts da MESMA conta sequencialmente para evitar flags do Instagram
                for (const post of accountPosts) {
                    try {
                        console.log(`[Scheduler] [Conta: ${accountId}] Publicando: "${post.title}"...`);

                        const mediaArr = post.mediaUrls ? JSON.parse(post.mediaUrls) : [];
                        if (mediaArr.length === 0) {
                            console.error(`[Scheduler] Post ${post.id} sem mídia.`);
                            await prisma.content.update({
                                where: { id: post.id },
                                data: { status: 'failed' }
                            });
                            continue;
                        }

                        // Formatar legenda
                        const titleText = post.title ? `${post.title}\n\n` : "";
                        const descText = post.description ? `${post.description}\n\n` : "";
                        let tagsText = "";
                        try {
                            const parsedTags = post.hashtags ? JSON.parse(post.hashtags) : [];
                            if (Array.isArray(parsedTags) && parsedTags.length > 0) {
                                tagsText = parsedTags.map((t: string) => t.startsWith('#') ? t : `#${t}`).join(' ');
                            }
                        } catch (e) { }

                        const caption = `${titleText}${descText}${tagsText}`.trim();

                        // Buscar o handle da conta no banco
                        let handle = "";
                        const account = await prisma.account.findUnique({
                            where: { providerAccountId: accountId }
                        }) || await prisma.account.findFirst({
                            where: { id: accountId }
                        });

                        if (account) {
                            handle = account.providerAccountId.replace('@', '').toLowerCase();
                        }

                        if (!handle) {
                            console.error(`[Scheduler] ❌ Erro: Conta inválida para o post "${post.title}".`);
                            await prisma.content.update({
                                where: { id: post.id },
                                data: { status: 'failed' }
                            });
                            continue;
                        }

                        const normalizedType = (post.type || 'post').toLowerCase();
                        let success = false;

                        // --- Lógica Meta API Priority ---
                        // SEGURANÇA: Usamos APENAS o token configurado para esta conta específica.
                        // O fallback para token global foi REMOVIDO pois causava publicação cruzada:
                        // getInstagramUserId(tokenGlobal) retorna o userId do DONO do token global,
                        // não da conta @${handle}, resultando em posts na conta errada.
                        const metaToken = account?.access_token ?? null;

                        if (!metaToken) {
                            console.warn(`[Scheduler] ⚠️ Conta @${handle} não possui token Meta configurado. Pulando Meta API, tentando Playwright.`);
                        }

                        if (metaToken) {
                            console.log(`[Scheduler] Tentando publicar via Meta API para @${handle}...`);
                            try {
                                const { publishImage, publishCarousel, publishReel, publishStory, getInstagramUserId } = await import('@/lib/services/instagram-graph.service');

                                const userId = await getInstagramUserId(metaToken);
                                if (!userId) {
                                    console.warn(`[Scheduler] ⚠️ Não foi possível obter userId Meta para @${handle}. Token inválido ou expirado? Tentando Playwright.`);
                                }
                                if (userId) {
                                    // Mapear URLs para Túnel
                                    const tunnelSetting = await prisma.setting.findUnique({ where: { key: 'tunnel_url' } });
                                    const tunnelUrl = tunnelSetting?.value ? JSON.parse(tunnelSetting.value) : null;
                                    
                                    // Se não há tunnel_url mas há mídias locais, não é possível publicar via Meta API
                                    const hasLocalMedia = mediaArr.some((url: string) =>
                                        url.startsWith('/uploads/') || url.startsWith('/creatives/')
                                    );
                                    if (!tunnelUrl && hasLocalMedia) {
                                        console.warn(`[Scheduler] ⚠️ Tunnel URL não disponível ainda. Post "${post.title}" será tentado no próximo ciclo.`);
                                        continue;
                                    }

                                    let finalMediaUrls = mediaArr;
                                    if (tunnelUrl) {
                                        finalMediaUrls = mediaArr.map((url: string) => {
                                            if (url.startsWith('/uploads/') || url.startsWith('/creatives/')) {
                                                return `${tunnelUrl.replace(/\/$/, '')}${url}`;
                                            }
                                            return url;
                                        });
                                    }

                                    if (normalizedType === 'story') {
                                        // Otimizar imagens grandes para Stories (Meta API: max 8MB, 1440x2560)
                                        const storyUrl = finalMediaUrls[0];
                                        const isStoryVideo = storyUrl.toLowerCase().match(/\.(mp4|mov|avi|wmv|m4v)$/i);
                                        if (!isStoryVideo && hasLocalMedia) {
                                            try {
                                                const localRelPath = mediaArr[0];
                                                const localAbsPath = path.join(process.cwd(), 'public', localRelPath);
                                                const stats = fs.statSync(localAbsPath);
                                                if (stats.size > 8 * 1024 * 1024) {
                                                    const sharp = (await import('sharp')).default;
                                                    const optimizedRelPath = localRelPath.replace(/\.[^.]+$/, '_story.jpg');
                                                    const optimizedAbsPath = path.join(process.cwd(), 'public', optimizedRelPath);
                                                    await sharp(localAbsPath)
                                                        .resize(1080, 1920, { fit: 'inside', withoutEnlargement: true })
                                                        .jpeg({ quality: 85 })
                                                        .toFile(optimizedAbsPath);
                                                    const newSize = fs.statSync(optimizedAbsPath).size;
                                                    finalMediaUrls[0] = `${tunnelUrl!.replace(/\/$/, '')}${optimizedRelPath}`;
                                                    console.log(`[Scheduler] Imagem otimizada para Story: ${(stats.size / 1024 / 1024).toFixed(1)}MB → ${(newSize / 1024 / 1024).toFixed(1)}MB (JPEG 1080x1920)`);
                                                }
                                            } catch (optErr: any) {
                                                console.warn(`[Scheduler] Falha ao otimizar imagem para story: ${optErr.message}`);
                                            }
                                        }

                                        const res = await publishStory(metaToken, userId, finalMediaUrls[0]);
                                        success = res.success;
                                        if (!res.success) console.warn(`[Scheduler] Meta API Story falhou: ${res.error}`);
                                    } else if (finalMediaUrls.length > 1) {
                                        const res = await publishCarousel(metaToken, userId, finalMediaUrls, caption);
                                        success = res.success;
                                        if (!res.success) console.warn(`[Scheduler] Meta API Carousel falhou: ${res.error}`);
                                    } else {
                                        const url = finalMediaUrls[0];
                                        const isVideo = url.match(/\.(mp4|mov|avi|wmv|m4v)$/i);

                                        if (normalizedType === 'reel' || isVideo) {
                                            const res = await publishReel(metaToken, userId, url, caption);
                                            success = res.success;
                                            if (!res.success) console.warn(`[Scheduler] Meta API Reel falhou: ${res.error}`);
                                        } else {
                                            const res = await publishImage(metaToken, userId, url, caption);
                                            success = res.success;
                                            if (!res.success) console.warn(`[Scheduler] Meta API Image falhou: ${res.error}`);
                                        }
                                    }
                                }
                            } catch (metaErr: any) {
                                console.error(`[Scheduler] Meta API falhou, tentando fallback Playwright:`, metaErr.message);
                            }
                        }

                        // Playwright APENAS para contas SEM token Meta.
                        // Contas com token usam exclusivamente Meta API — sem Playwright
                        // para evitar conflito de sessões ou publicação duplicada.
                        if (!success && !metaToken) {
                            console.log(`[Scheduler] Usando Playwright para @${handle} (sem token Meta)...`);
                            if (normalizedType === 'story') {
                                success = await InstagramService.publishStory(handle, mediaArr[0], true);
                            } else if (normalizedType === 'reel') {
                                success = await InstagramService.publishReel(handle, mediaArr[0], caption, false);
                            } else {
                                success = await InstagramService.publishPost(handle, mediaArr, caption, false);
                            }
                        } else if (!success && metaToken) {
                            console.warn(`[Scheduler] ⚠️ Meta API falhou para @${handle}. Playwright ignorado (conta tem token Meta). Post marcado como falhou.`);
                        }

                        if (success) {
                            await prisma.content.update({
                                where: { id: post.id },
                                data: { status: 'published' }
                            });
                            console.log(`[Scheduler] ✅ Post "${post.title}" (@${handle}) publicado com sucesso!`);
                        } else {
                            console.error(`[Scheduler] ❌ Falha ao publicar "${post.title}" (@${handle}).`);
                            await prisma.content.update({
                                where: { id: post.id },
                                data: { status: 'failed' }
                            });
                        }
                    } catch (err: any) {
                        console.error(`[Scheduler] Erro no post ${post.id}:`, err.message);
                        await prisma.content.update({
                            where: { id: post.id },
                            data: { status: 'failed' }
                        });
                    }
                }
            }));

        } catch (err: any) {
            console.error(`[Scheduler] Erro Geral:`, err.message);
        } finally {
            this.isRunning = false;
        }
    }
}
