const fs = require('fs');
const path = require('path');

async function pushStoryV4() {
    console.log("🤖 [Varanda Bot] Injetando Story V4 Aprovado (Fidelidade Natural)...");

    const story = {
        title: "Story Oficial | Reservas Abertas",
        description: "",
        type: "story",
        image: "C:\\Users\\Usuario\\.gemini\\antigravity\\brain\\e50213f8-5284-4867-aecc-b4155f86e270\\chef_tarcila_story_natural_fidelity_v4_1773078757196.png"
    };

    try {
        if (!fs.existsSync(story.image)) {
            console.error(`❌ Erro: Imagem não encontrada: ${story.image}`);
            process.exit(1);
        }

        const bitmap = fs.readFileSync(story.image);
        const base64Image = Buffer.from(bitmap).toString('base64');

        const payload = {
            title: story.title,
            description: story.description,
            type: story.type,
            hashtags: ["#Varanda", "#ChefTarcila"],
            images: [
                {
                    name: path.basename(story.image),
                    base64: base64Image
                }
            ]
        };

        const response = await fetch('http://localhost:3000/api/ai-import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (response.ok) {
            console.log(`✅ STORY V4 PUSH OK: ${story.title} (ID: ${data.contentId})`);

            // Forçar o status para 'scheduled' com data retroativa para o scheduler pegar
            // (O ai-import cria como 'draft' por padrão)
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            await prisma.content.update({
                where: { id: data.contentId },
                data: {
                    status: 'scheduled',
                    scheduledAt: new Date(Date.now() - 10000) // 10s atrás
                }
            });
            console.log("✅ Status atualizado para 'scheduled'. Pronto para o gatilho.");
            await prisma.$disconnect();
        } else {
            console.error(`❌ ERRO NA API:`, data);
        }
    } catch (err) {
        console.error(`❌ Falha de Conexão:`, err.message);
    }
}

pushStoryV4();
