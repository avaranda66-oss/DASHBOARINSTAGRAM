const fs = require('fs');
const path = require('path');

async function testRealIngestion() {
    console.log("🤖 [MoltBot] Iniciando injeção de Post AI Real...");

    const aiTitle = "A Nova Margarita de Pitaya 🌺";
    const aiDescription = "Sexta-feira pede ousadia! Já provou a nova Margarita de Pitaya do A Varanda?\n\nCriamos um equilíbrio perfeito entre a acidez cítrica da tequila premium e a doçura exótica da pitaya fresca. O resultado? Um drink que é uma obra de arte até no visual.\n\nChama quem vai dividir essa taça com você hoje à noite. A gente te espera a partir das 18h! 🥂";
    const aiHashtags = ["#Margarita", "#Pitaya", "#DrinksExoticos", "#AVaranda", "#Sextou", "#Coquetelaria"];

    // Caminho da imagem recém-gerada pelo Agente (Eu)
    const imagePath = "C:\\Users\\Usuario\\.gemini\\antigravity\\brain\\e50213f8-5284-4867-aecc-b4155f86e270\\margarita_pitaya_1773071461688.png";
    let base64Image = "";

    try {
        if (fs.existsSync(imagePath)) {
            const bitmap = fs.readFileSync(imagePath);
            base64Image = Buffer.from(bitmap).toString('base64');
            console.log(`📸 Imagem Carregada e Convertida: margarita_pitaya.png`);
        } else {
            console.log(`❌ Erro: Imagem não encontrada!`);
            return;
        }
    } catch (e) {
        console.log("❌ Falha ao ler a imagem gerada.", e);
        return;
    }

    const payload = {
        title: aiTitle,
        description: aiDescription,
        hashtags: aiHashtags,
        images: [
            {
                name: "margarita_pitaya_ai.png",
                base64: base64Image
            }
        ]
    };

    try {
        const response = await fetch('http://localhost:3000/api/ai-import', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            console.log("✅ PUSH CONCLUÍDO! (ID: " + data.contentId + ")");
        } else {
            console.error("❌ ERRO DA API:", data);
        }
    } catch (err) {
        console.error("❌ Falha de Conexão:", err.message);
    }
}

testRealIngestion();
