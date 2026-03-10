const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

// Importamos logicamente o serviço (como é um script Node puro, precisamos carregar o build ou usar ts-node)
// Para simplificar a execução no PC do usuário sem depender de build complexo, vamos reusar a lógica do InstagramService aqui
const prisma = new PrismaClient();

async function log(msg) {
    const time = new Date().toLocaleString();
    console.log(`[${time}] ${msg}`);
}

async function checkAndPublish() {
    try {
        const now = new Date();

        // Buscar posts agendados para agora ou passado que ainda não foram publicados
        const pendingPosts = await prisma.content.findMany({
            where: {
                status: 'scheduled',
                scheduledAt: {
                    lte: now
                }
            }
        });

        if (pendingPosts.length === 0) {
            return;
        }

        log(`Encontrado(s) ${pendingPosts.length} post(s) para publicar agora.`);

        // Importação dinâmica do serviço compilado (Next.js compila para .next ou usamos transpile)
        // Como o InstagramService usa imports de TS, a forma mais segura de rodar via script externo 
        // é disparar via process.child se necessário, mas vamos tentar carregar o necessário.

        for (const post of pendingPosts) {
            try {
                log(`Iniciando publicação automática: "${post.title}" (ID: ${post.id})`);

                const mediaArr = JSON.parse(post.mediaUrls || '[]');
                if (mediaArr.length === 0) {
                    log(`[ERRO] Post ${post.id} não tem mídia. Pulando.`);
                    continue;
                }

                const imageUrl = mediaArr[0];

                // Formatar legenda (mesma lógica do action)
                const titleText = post.title ? `${post.title}\n\n` : "";
                const descText = post.description ? `${post.description}\n\n` : "";
                let tagsText = "";
                try {
                    const parsedTags = JSON.parse(post.hashtags || '[]');
                    if (Array.isArray(parsedTags) && parsedTags.length > 0) {
                        tagsText = parsedTags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ');
                    }
                } catch (e) { }

                const caption = `${titleText}${descText}${tagsText}`.trim();

                // Para rodar o InstagramService (TS) dentro de um script JS puro:
                // Vamos disparar um pequeno worker ou usar a mesma estratégia do login manual
                // Mas aqui vamos chamar diretamente o node num script auxiliar de 'publish-worker.js'

                log(`Disparando Playwright para o post...`);

                // Criar um arquivo temporário de comando para o Playwright não dar conflito de env
                const success = await runPublishWorker(imageUrl, caption);

                if (success) {
                    await prisma.content.update({
                        where: { id: post.id },
                        data: { status: 'published' }
                    });
                    log(`✅ Post "${post.title}" publicado e status atualizado!`);
                } else {
                    log(`❌ Falha na publicação do post "${post.title}".`);
                }

            } catch (err) {
                log(`[ERRO CRÍTICO] Falha ao processar post ${post.id}: ${err.message}`);
            }
        }

    } catch (err) {
        log(`[ERRO SCHEDULER] ${err.message}`);
    }
}

async function runPublishWorker(image, caption) {
    // Para evitar problemas de compatibilidade TS/JS no script de background,
    // vamos usar o próprio ts-node se disponível ou disparar via o runner do Next
    // A forma mais INFALÍVEL é criar um mini-script JS que importa o essencial.

    return new Promise((resolve) => {
        const { exec } = require('child_process');
        // Usamos aspas triplas ou escape para a legenda não quebrar o CMD
        const safeCaption = caption.replace(/"/g, '\\"').replace(/\n/g, '\\n');

        // Comando para rodar um script auxiliar que lida com o Playwright
        // Passamos via env ou argumentos
        const workerPath = path.join(__dirname, 'publish-worker.js');

        const child = exec(`node "${workerPath}" "${image}" "${safeCaption}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Worker Error: ${error.message}`);
                resolve(false);
                return;
            }
            if (stdout.includes('🎉 Publicado com sucesso')) {
                resolve(true);
            } else {
                console.log(`Worker Output: ${stdout}`);
                resolve(false);
            }
        });
    });
}

log("Agendador de Instagram iniciado...");
log("Pressione Ctrl+C para parar.");

// Rodar a cada 60 segundos
setInterval(checkAndPublish, 60000);

// Rodar uma vez no início
checkAndPublish();
