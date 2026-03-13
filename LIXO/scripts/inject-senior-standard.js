const fs = require('fs');
const path = require('path');

async function pushSeniorStandardPosts() {
    console.log("🤖 [Varanda Bot] Injetando os 2 novos modelos Standard Senior...");

    const posts = [
        {
            title: "Excelência Gastrô | Reservas Abertas 🥂",
            description: "A arte de receber bem começa na escolha dos ingredientes e termina no sorriso de quem prova.\n\nNa Varanda, cada prato é uma história contada pela nossa Chef Tarcila. Venha viver essa experiência que une o Brasil e a Bélgica em um só lugar.\n\n---\n\n📍 **Nosso Endereço:**\nRua Roraima, 39 - Centro, Itamaraju\n\n📲 **Reservas:** (73) 9914-6365\n✨ **Link na Bio**",
            image: "C:\\Users\\Usuario\\.gemini\\antigravity\\brain\\e50213f8-5284-4867-aecc-b4155f86e270\\chef_tarcila_standard_senior_test_1773077010122.png"
        },
        {
            title: "O Padrão Varanda | Reserva Agora ✨",
            description: "Mais do que um restaurante, um palco para os seus melhores momentos.\n\nDescubra por que a gastronomia da Chef Tarcila é referência em Itamaraju. Sofisticação, sabor e alma em cada detalhe.\n\n---\n\n📍 **Endereço:** Rua Roraima, 39 - Centro\n📲 **WhatsApp:** (73) 9914-6365\n🔗 **Cardápio no link da bio!**",
            image: "C:\\Users\\Usuario\\.gemini\\antigravity\\brain\\e50213f8-5284-4867-aecc-b4155f86e270\\chef_tarcila_standard_senior_v2_fidelidade_1773077296907.png"
        }
    ];

    for (const post of posts) {
        try {
            if (!fs.existsSync(post.image)) {
                console.error(`❌ Erro: Imagem não encontrada: ${post.image}`);
                continue;
            }

            const bitmap = fs.readFileSync(post.image);
            const base64Image = Buffer.from(bitmap).toString('base64');

            const payload = {
                title: post.title,
                description: post.description,
                hashtags: ["#AVaranda", "#ChefTarcila", "#GastronomiaPremium", "#Itamaraju", "#AltasGastronomia"],
                images: [
                    {
                        name: path.basename(post.image),
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
                console.log(`✅ PUSH OK: ${post.title} (ID: ${data.contentId})`);
            } else {
                console.error(`❌ ERRO NA API (${post.title}):`, data);
            }
        } catch (err) {
            console.error(`❌ Falha de Conexão no post ${post.title}:`, err.message);
        }
    }
}

pushSeniorStandardPosts();
