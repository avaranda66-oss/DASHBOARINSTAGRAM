const fs = require('fs');
const path = require('path');

async function pushStoryTarcila() {
    console.log("🤖 [Varanda Bot] Injetando Story 9:16 da Chef Tarcila...");

    const story = {
        title: "Story 9:16 | Chef Tarcila - Momentos Únicos",
        description: "A gastronomia brasileira encontra a alma belga. Venha viver essa experiência na Varanda Bistrot.\n\n📍 Rua Roraima, 39 - Centro, Itamaraju\n📲 Reservas: (73) 9914-6365",
        type: "story",
        image: "C:\\Users\\Usuario\\.gemini\\antigravity\\brain\\36e9eae7-1208-49e4-91f5-e396a03a5fb6\\chef_tarcila_story_FINAL_9x16.png"
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
            hashtags: ["#AVaranda", "#ChefTarcila", "#GastronomiaPremium", "#Itamaraju", "#MomentosUnicos"],
            images: [
                {
                    name: "chef_tarcila_story_9x16.png",
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
            console.log(`✅ STORY 9:16 INJETADO: ${story.title} (ID: ${data.contentId})`);

            // Agendar para publicação imediata
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            await prisma.content.update({
                where: { id: data.contentId },
                data: {
                    status: 'scheduled',
                    scheduledAt: new Date(Date.now() - 5000)
                }
            });
            console.log("✅ Story agendado para publicação imediata.");
            await prisma.$disconnect();
        } else {
            console.error(`❌ ERRO NA API:`, data);
        }
    } catch (err) {
        console.error(`❌ Falha:`, err.message);
    }
}

pushStoryTarcila();
