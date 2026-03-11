import prisma from '@/lib/db';
import { InstagramService } from './instagram.service';

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

                        const imageUrl = mediaArr[0];

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

                        if (normalizedType === 'story') {
                            success = await InstagramService.publishStory(handle, imageUrl, true);
                        } else if (normalizedType === 'reel') {
                            // Reels também com headful falso por enquanto
                            success = await InstagramService.publishReel(handle, imageUrl, caption, false);
                        } else {
                            // Posts precisam rodar em modo headful (com janela) pois o Instagram
                            // não renderiza o modal de criação corretamente em modo headless
                            success = await InstagramService.publishPost(handle, [imageUrl], caption, false);
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
