
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- FIXING NETWORKING POST ---');
    const networkingPost = {
        title: 'NETWORKING DE ELITE (Impasto 2.1)',
        description: '🤝 **Grandes ideias nascem em grandes ambientes.**\n\nO cenário ideal para expandir seus horizontes. Nosso espaço combina a seriedade dos negócios com o prazer de uma experiência gastronômica impecável.\n\n📍 **Endereço:** Rua Roraima, 39 - Centro\n📲 **Fale com um Consultor:** (73) 9914-6365',
        mediaUrls: JSON.stringify(['/uploads/event_networking_impasto_2_1_1773355172359.png']),
        type: 'post',
        status: 'idea',
        accountId: 'cmmny0v0y0000g3lcp7f4kza7',
        hashtags: JSON.stringify(['Networking', 'Business', 'Elite', 'Varanda'])
    };

    try {
        const created = await prisma.content.create({
            data: networkingPost
        });
        console.log('✅ Fixed created: ' + created.title);
    } catch (e) {
        console.error('❌ Error fixing: ', e.message);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
