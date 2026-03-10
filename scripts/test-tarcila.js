const fs = require('fs');
const path = require('path');

async function pushChefTarcilaTest() {
    console.log("🤖 [MoltBot] Iniciando injeção do Post com Imagem de Referência...");

    const aiTitle = "A Arte Por Trás dos Pratos ✨";
    const aiDescription = "Conheçam a nossa maestrina: Chef Tarcila.\n\nCada prato que chega à sua mesa no A Varanda passa pelo crivo rigoroso e pela paixão incansável dela. De ingredientes selecionados a montagens que parecem verdadeiras obras de arte, tudo tem a assinatura e o amor pela alta gastronomia.\n\nVenha viver essa experiência hoje. Reserve sua mesa pelo link na bio.";
    const aiHashtags = ["#AVaranda", "#ChefTarcila", "#AltaGastronomia", "#ExperienciaVaranda", "#CulinariaArtistica"];

    // Caminho da imagem gerada pelo Agente (Eu) a partir da referência enviada pelo usuário
    const imagePath = "C:\\Users\\Usuario\\.gemini\\antigravity\\brain\\e50213f8-5284-4867-aecc-b4155f86e270\\chef_tarcila_ai_portrait_1773072045929.png";
    let base64Image = "";

    try {
        if (fs.existsSync(imagePath)) {
            const bitmap = fs.readFileSync(imagePath);
            base64Image = Buffer.from(bitmap).toString('base64');
            console.log(`📸 Imagem Carregada e Convertida: chef_tarcila_ai.png`);
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
                name: "chef_tarcila_ai.png",
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

pushChefTarcilaTest();
