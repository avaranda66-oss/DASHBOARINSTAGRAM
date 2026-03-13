/**
 * inject-content.js — Script genérico para injetar conteúdo no Dashboard Instagram
 * 
 * Uso:
 *   node scripts/inject-content.js --title "Título" --description "Legenda..." --hashtags "#tag1,#tag2" --type "post" --image "C:\path\to\image.png"
 * 
 * Argumentos:
 *   --title       (obrigatório) Título do conteúdo
 *   --description (opcional)    Legenda/descrição
 *   --hashtags    (opcional)    Hashtags separadas por vírgula (ex: "#tag1,#tag2")
 *   --type        (opcional)    Tipo: post | story | reel | carousel (default: post)
 *   --image       (opcional)    Caminho absoluto para imagem (pode ser repetido para carousel)
 *   --port        (opcional)    Porta do servidor Next.js (default: 3000)
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
    const args = {};
    const images = [];
    for (let i = 2; i < argv.length; i++) {
        const key = argv[i];
        const val = argv[i + 1];
        if (key === '--image' && val) {
            images.push(val);
            i++;
        } else if (key.startsWith('--') && val && !val.startsWith('--')) {
            args[key.replace('--', '')] = val;
            i++;
        }
    }
    args.images = images;
    return args;
}

async function main() {
    const args = parseArgs(process.argv);

    if (!args.title) {
        console.error('❌ Erro: --title é obrigatório.');
        console.log('Uso: node scripts/inject-content.js --title "Título" --description "Legenda" --hashtags "#tag1,#tag2" --type "post" --image "caminho/imagem.png"');
        process.exit(1);
    }

    const port = args.port || '3000';
    const type = args.type || 'post';
    const title = args.title;
    const description = args.description || '';
    const hashtags = args.hashtags
        ? args.hashtags.split(',').map(t => t.trim())
        : [];

    // Processar imagens
    const imagePayloads = [];
    for (const imgPath of args.images) {
        const resolvedPath = path.resolve(imgPath);
        if (!fs.existsSync(resolvedPath)) {
            console.error(`❌ Erro: Imagem não encontrada: ${resolvedPath}`);
            process.exit(1);
        }

        const bitmap = fs.readFileSync(resolvedPath);
        const base64Image = Buffer.from(bitmap).toString('base64');
        const name = path.basename(resolvedPath);

        imagePayloads.push({ name, base64: base64Image });
        console.log(`📸 Imagem carregada: ${name} (${(bitmap.length / 1024).toFixed(1)} KB)`);
    }

    // Montar payload
    const payload = {
        title,
        description,
        hashtags,
        type,
        images: imagePayloads
    };

    console.log(`\n🚀 Injetando conteúdo no Dashboard...`);
    console.log(`   Título: ${title}`);
    console.log(`   Tipo: ${type}`);
    console.log(`   Hashtags: ${hashtags.join(', ') || '(nenhuma)'}`);
    console.log(`   Imagens: ${imagePayloads.length}`);

    try {
        const response = await fetch(`http://localhost:${port}/api/ai-import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            console.log(`\n✅ SUCESSO! Conteúdo criado no Dashboard.`);
            console.log(`   ID: ${data.contentId}`);
            console.log(`   Status: draft (Rascunho)`);
            console.log(`   → Abra o Storyboard para revisar e aprovar.`);
        } else {
            console.error(`\n❌ ERRO DA API:`, data);
            process.exit(1);
        }
    } catch (err) {
        console.error(`\n❌ Falha de conexão. O Next.js está rodando em localhost:${port}?`);
        console.error(`   Erro: ${err.message}`);
        process.exit(1);
    }
}

main();
