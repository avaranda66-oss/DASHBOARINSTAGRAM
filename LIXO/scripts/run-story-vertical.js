const fs = require('fs');
const path = require('path');

async function pushStoryVertical() {
    console.log("🤖 [Varanda Bot] Injetando Story Vertical 9:16 (Fidelidade Refinada)...");

    const story = {
        title: "Story Vertical 9:16 | Reservas",
        description: "",
        type: "story",
        image: "C:\\Users\\Usuario\\.gemini\\antigravity\\brain\\e50213f8-5284-4867-aecc-b4155f86e270\\chef_tarcila_story_9_16_vertical_final_1773080146728.png"
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
            console.log(`✅ STORY VERTICAL OK: ${story.title} (ID: ${data.contentId})`);

            // Forçar para agendado imediato
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            await prisma.content.update({
                where: { id: data.contentId },
                data: {
                    status: 'scheduled',
                    scheduledAt: new Date(Date.now() - 5000)
                }
            });
            console.log("✅ Post agendado com sucesso para agora.");
            await prisma.$disconnect();
        } else {
            console.error(`❌ ERRO NA API:`, data);
        }
    } catch (err) {
        console.error(`❌ Falha:`, err.message);
    }
}

pushStoryVertical();
