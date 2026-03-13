const fs = require('fs');
const path = require('path');

async function pushChefTarcilaMasterpiece() {
    console.log("🤖 [Varanda Bot] Iniciando injeção do Masterpiece Final...");

    const aiTitle = "A ARTE DA CHEF ✨";
    const aiDescription = "Cada prato servido no A Varanda é uma extensão da paixão e perfeccionismo da nossa Chef Tarcila.\n\nNão servimos apenas comida; servimos experiências gastronômicas que acolhem e marcam momentos inesquecíveis. O cuidado estrito na seleção de ingredientes, o domínio das chamas e a dedicação ao sabor autêntico estão cravados em nosso DNA.\n\nExperimente a alta gastronomia hoje mesmo.\n\n---\n\n📍 **Nosso Endereço:**\nRua Roraima, 39 - Centro, Itamaraju\n\n📲 **Reservas e Informações (WhatsApp):**\n(73) 9914-6365\n\n✨ **Clique no link da bio para ver nosso cardápio completo!**";

    const aiHashtags = ["#AVaranda", "#ChefTarcila", "#AltaGastronomia", "#SaborQueAcolhe", "#ExperienciaVaranda", "#Itamaraju", "#GastronomiaCriativa"];

    // Caminho da imagem de Masterpiece da Varanda
    const imagePath = "C:\\Users\\Usuario\\.gemini\\antigravity\\brain\\e50213f8-5284-4867-aecc-b4155f86e270\\chef_tarcila_varanda_masterpiece_1773072900447.png";
    let base64Image = "";

    try {
        if (fs.existsSync(imagePath)) {
            const bitmap = fs.readFileSync(imagePath);
            base64Image = Buffer.from(bitmap).toString('base64');
            console.log(`📸 Imagem Carregada e Convertida: chef_tarcila_varanda_masterpiece.png`);
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
                name: "chef_tarcila_varanda_masterpiece.png",
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

pushChefTarcilaMasterpiece();
