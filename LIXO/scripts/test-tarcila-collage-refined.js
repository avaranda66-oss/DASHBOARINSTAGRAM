const fs = require('fs');
const path = require('path');

async function pushChefTarcilaCollageRefined() {
    console.log("🤖 [MoltBot] Iniciando injeção do Poster Colagem Orgânica (Blend Otimizado & Quadro Inteiro)...");

    const aiTitle = "A VARANDA Bistrot | Fusão Brasil-Bélgica 🇧🇷🇧🇪";
    const aiDescription = "Quando o cacau encontra a mandioca, a magia acontece.\n\nA Chef Tarcila traz para A Varanda a verdadeira fusão entre as ricas raízes brasileiras e a clássica sofisticação belga. Cada detalhe do nosso menu foi pensado para ser uma viagem gastronômica inesquecível pelo oceano Atlântico.\n\nUma fusão de sabores que atravessa fronteiras. Venha viver a experiência A Varanda.";
    const aiHashtags = ["#AVaranda", "#ChefTarcila", "#FusaoGastronomica", "#BrasilBelgica", "#GastronomiaCriativa", "#ColagemArtistica"];

    // Caminho da nova imagem (Refinada sem cortes)
    const imagePath = "C:\\Users\\Usuario\\.gemini\\antigravity\\brain\\e50213f8-5284-4867-aecc-b4155f86e270\\chef_tarcila_collage_refined_1773072642144.png";
    let base64Image = "";

    try {
        if (fs.existsSync(imagePath)) {
            const bitmap = fs.readFileSync(imagePath);
            base64Image = Buffer.from(bitmap).toString('base64');
            console.log(`📸 Imagem Carregada e Convertida: chef_tarcila_collage_refined.png`);
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
                name: "chef_tarcila_collage_refined.png",
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

pushChefTarcilaCollageRefined();
