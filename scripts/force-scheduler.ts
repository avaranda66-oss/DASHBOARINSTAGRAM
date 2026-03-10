import { SchedulerService } from '../lib/services/scheduler.service';
import prisma from '../lib/db';

async function forceRun() {
    try {
        console.log("Iniciando Verificação Forçada...");

        // Verificar o que está no banco agora
        const post = await prisma.content.findUnique({
            where: { id: 'cmmje29kp000qq8x2e3mh25qp' }
        });

        if (post) {
            console.log(`Post encontrado: ${post.title}`);
            console.log(`MediaUrls atuais no DB: ${post.mediaUrls}`);

            // Força o update do caminho caso esteja errado
            if (post.mediaUrls.includes('hybrid_masterpiece')) {
                console.log("Caminho incorreto detectado. Corrigindo para o arquivo timestamped...");
                await prisma.content.update({
                    where: { id: post.id },
                    data: { mediaUrls: '["/uploads/ai-1773073299190-504378499.png"]' }
                });
                console.log("DB Corrigido via Prisma.");
            }
        } else {
            console.log("Erro: Post não encontrado.");
        }

        console.log("Chamando SchedulerService.checkAndPublish()...");
        await SchedulerService['checkAndPublish']();
        console.log("Execução do Scheduler concluída.");

    } catch (err: any) {
        console.error("FALHA CRÍTICA NO SCRIPT:");
        console.error(err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

forceRun();
