/**
 * Script de Demonstração "MoltBot"
 * Simula um Agente de IA externo enviando um Post gerado pro Dashboard
 * 
 * Uso: node scripts/test-ai-import.js
 */

const fs = require('fs');
const path = require('path');

async function testAiImport() {
    console.log("🤖 [MoltBot] Iniciando geração de Post AI...");

    // 1. O Agente de IA "gera" um conteúdo (neste caso, mocado para o teste)
    const aiTitle = "Caipirinha de Limão Siciliano 🍋";
    const aiDescription = "O frescor absoluto chegou no A Varanda! Nossa nova Caipirinha de Limão Siciliano une o sabor marcante da cachaça artesanal com o toque cítrico e sofisticado do limão verdadeiro.\n\nPerfeito para a sua sexta-feira à noite!\n\nMarque quem vai pagar a primeira rodada hoje 😉👇";
    const aiHashtags = ["#Caipirinha", "#AVaranda", "#Sextou", "#Drinks", "#LimãoSiciliano"];

    // 2. O Agente de IA "gera" ou baixa uma imagem e converte para Base64
    // Vamos usar uma imagem qualquer existente do projeto como "MOCK" do que a IA geraria
    // Se você não tiver uma 'sample.png' aqui, o script criará um arquivo de imagem 'vazio' fake só pro teste não quebrar.

    // Tenta achar qualquer foto no /public/uploads pra simular
    const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
    let base64Image = "";
    let imageName = "mock_ai_image.png";

    try {
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp'));
            if (files.length > 0) {
                const sampleFile = path.join(uploadsDir, files[0]);
                const bitmap = fs.readFileSync(sampleFile);
                base64Image = Buffer.from(bitmap).toString('base64');
                imageName = files[0];
                console.log(`📸 Imagem 'Gerada': ${imageName}`);
            }
        }
    } catch (e) {
        console.log("⚠️ Nenhuma imagem de exemplo achada no /public/uploads, mandando sem imagem...");
    }

    if (!base64Image) {
        // Criar uma imagem 1x1 pixel base64 como fallback puro
        base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
        imageName = "pixel_gerado_por_ia.png";
    }

    // 3. O Agente envia os dados para a "Sala de Controle" (O Dashboard)
    const payload = {
        title: aiTitle,
        description: aiDescription,
        hashtags: aiHashtags,
        images: [
            {
                name: imageName,
                base64: base64Image
            }
        ]
    };

    console.log("🚀 Enviando para a Área de Rascunhos do Dashboard...");

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
            console.log("✅ SUCESSO! O Rascunho foi criado na fila (ID: " + data.contentId + ")!");
            console.log("Abra o Storyboard no Dashboard para revisar e aprovar o post gerado pela IA.");
        } else {
            console.error("❌ ERRO DA API:", data);
        }

    } catch (err) {
        console.error("❌ Falha de Conexão. O Next.js (Dashboard) está rodando?", err.message);
    }
}

testAiImport();
