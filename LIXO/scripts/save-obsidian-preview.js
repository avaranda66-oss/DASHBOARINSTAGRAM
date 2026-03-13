
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- SAVING OBSIDIAN 3.0 PREVIEW ---');
    const post = {
        title: 'VISÃO GASTRONÔMICA (Obsidian 3.0)',
        description: '🖤 **Onde cada ingrediente é uma promessa de perfeição.**\n\nApresentamos o novo padrão Master 3.0: Obsidian & Liquid Gold. Uma estética que une a profundidade do mármore negro ao brilho do ouro líquido, refletindo a visão transcendente da Chef Tarcila.\n\n📍 **Endereço:** Rua Roraima, 39 - Centro\n📲 **Reserve sua Experiência:** (73) 9914-6365',
        mediaUrls: JSON.stringify(['/uploads/tarcila_vision_obsidian_3_0_1773357909143.png']),
        type: 'post',
        status: 'idea',
        accountId: 'cmmny0v0y0000g3lcp7f4kza7',
        hashtags: JSON.stringify(['ObsidianSeries', 'ChefTarcila', 'AVaranda', 'LiquidGold'])
    };

    try {
        const created = await prisma.content.create({
            data: post
        });
        console.log('✅ Idea created: ' + created.title);
    } catch (e) {
        console.error('❌ Error creating: ', e.message);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
