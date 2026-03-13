const fs = require('fs');
const path = require('path');

async function pushStoryMasterpiece() {
    console.log("🤖 [Varanda Bot] Injetando Story Masterpiece V3 (Alta Fidelidade)...");

    const story = {
        title: "Story Masterpiece | Fidelidade Máxima",
        description: "Review da Chef Tarcila - Standard Senior 9:16",
        type: "story",
        image: "C:\\Users\\Usuario\\.gemini\\antigravity\\brain\\e50213f8-5284-4867-aecc-b4155f86e270\\chef_tarcila_story_masterpiece_fidelity_v3_1773078469572.png"
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
            console.log(`✅ STORY PUSH OK (V3): ${story.title} (ID: ${data.contentId})`);
        } else {
            console.error(`❌ ERRO NA API:`, data);
        }
    } catch (err) {
        console.error(`❌ Falha de Conexão:`, err.message);
    }
}

pushStoryMasterpiece();
