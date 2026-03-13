const fs = require('fs');
const path = require('path');

async function pushChefTarcilaSeniorDesign() {
    console.log("🤖 [Varanda Bot] Iniciando injeção do Masterpiece Nível Senior Designer...");

    const aiTitle = "Design Builder Style | A ARTE DA CHEF ✨";
    const aiDescription = "A masterclass de sabores está nas mãos dela.\n\nA Chef Tarcila comanda a operação gastronômica de A Varanda com uma precisão cirúrgica e um toque que apenas os grandes mestres possuem. Cada nota de sabor é pensada, testada e executada para surpreender.\n\nSinta a excelência. Experimente a alta gastronomia hoje mesmo.\n\n---\n\n📍 **Nosso Endereço:**\nRua Roraima, 39 - Centro, Itamaraju\n\n📲 **Reservas e Informações (WhatsApp):**\n(73) 9914-6365\n\n✨ **Clique no link da bio para ver nosso cardápio completo!**";

    let aiHashtags = ["#AVaranda", "#ChefTarcila", "#Masterpiece", "#GastronomiaCriativa", "#HighEndDining"];

    // Caminho da imagem Senior Design
    const imagePath = "C:\\Users\\Usuario\\.gemini\\antigravity\\brain\\e50213f8-5284-4867-aecc-b4155f86e270\\chef_tarcila_senior_design_1773073044531.png";
    let base64Image = "";

    try {
        if (fs.existsSync(imagePath)) {
            const bitmap = fs.readFileSync(imagePath);
            base64Image = Buffer.from(bitmap).toString('base64');
            console.log(`📸 Imagem Carregada e Convertida: chef_tarcila_senior_design.png`);
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
                name: "chef_tarcila_senior_design.png",
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

pushChefTarcilaSeniorDesign();
