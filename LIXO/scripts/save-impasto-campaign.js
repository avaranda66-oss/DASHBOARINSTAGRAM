
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const imageMap = {
    celebration: '/uploads/event_celebration_impasto_2_1_1773355080272.png',
    networking: '/uploads/event_networking_impasto_2_1_1773355172359.png',
    encounters: '/uploads/event_encounters_impasto_2_1_1773355295570.png',
    friends: '/uploads/event_friends_impasto_2_1_1773355428467.png',
    corporate: '/uploads/event_corporate_impasto_2_1_1773355541067.png',
    social: '/uploads/event_social_impasto_2_1_1773355656431.png'
};

const impastoPosts = [
    {
        title: 'CELEBRE CONNOSCO (Impasto 2.1)',
        description: '✨ **A alegria de estar junto tem um novo sabor.**\n\nNossa varanda é o palco perfeito para suas celebrações. Do ambiente à gastronomia, cada detalhe é pincelado com sofisticação para tornar seu momento inesquecível.\n\n📍 **Endereço:** Rua Roraima, 39 - Centro\n📲 **Reservas:** (73) 9914-6365',
        mediaUrls: JSON.stringify([imageMap.celebration]),
        type: 'post',
        status: 'idea',
        accountId: 'cmmny0v0y0000g3lcp7f4kza7',
        hashtags: JSON.stringify(['Celebração', 'VarandaStyle', 'Gastronomia', 'Momentos'])
    },
    {
        title: 'NETWORKING DE ELITE (Impasto 2.1)',
        description: '🤝 **Grandes ideias nascem em grandes ambientes.**\n\nO cenário ideal para expandir seus horizontes. Nosso espaço combina a seriedade dos negócios com o prazer de uma experiência gastronômica impecável.\n\n📍 **Endereço:** Rua Roraima, 39 - Centro\n📲 **Fale com um Consultor:** (73) 9914-6365',
        mediaUrls: JSON.stringify([imageMap.networking]),
        type: 'post',
        status: 'idea',
        accountId: 'cmmny0v0y0000g3lcp7f4kza7',
        hashtags: ['Networking', 'Business', 'Elite', 'Varanda']
    },
    {
        title: 'ENCONTROS ÚNICOS (Impasto 2.1)',
        description: '🍷 **O cenário perfeito para sua próxima história.**\n\nSeja um encontro romântico ou uma reunião casual, A Varanda oferece a atmosfera que transforma encontros em lembranças eternas. Pura alma e sabor.\n\n📍 **Endereço:** Rua Roraima, 39 - Centro\n📲 **Reservas:** (73) 9914-6365',
        mediaUrls: JSON.stringify([imageMap.encounters]),
        type: 'post',
        status: 'idea',
        accountId: 'cmmny0v0y0000g3lcp7f4kza7',
        hashtags: JSON.stringify(['Encontros', 'Romance', 'Varanda', 'Dinner'])
    },
    {
        title: 'BRINDE À AMIZADE (Impasto 2.1)',
        description: '🍻 **Happy Hour com quem faz a vida valer a pena.**\n\nOnde a amizade é o ingrediente principal. Drinks artesanais e um cardápio feito para compartilhar sorrisos e bons momentos.\n\n📍 **Endereço:** Rua Roraima, 39 - Centro\n📲 **Reservas:** (73) 9914-6365',
        mediaUrls: JSON.stringify([imageMap.friends]),
        type: 'post',
        status: 'idea',
        accountId: 'cmmny0v0y0000g3lcp7f4kza7',
        hashtags: JSON.stringify(['Amigos', 'HappyHour', 'Varanda', 'Drinks'])
    },
    {
        title: 'SUCESSO COMPARTILHADO (Impasto 2.1)',
        description: '💼 **O padrão de excelência para sua empresa.**\n\nLeve sua equipe para um novo patamar. Eventos corporativos com a assinatura de luxo e eficiência que só A Varanda proporciona.\n\n📍 **Endereço:** Rua Roraima, 39 - Centro\n📲 **Paineis e Pacotes:** (73) 9914-6365',
        mediaUrls: JSON.stringify([imageMap.corporate]),
        type: 'post',
        status: 'idea',
        accountId: 'cmmny0v0y0000g3lcp7f4kza7',
        hashtags: JSON.stringify(['Corporativo', 'Sucesso', 'Empresarial', 'Varanda'])
    },
    {
        title: 'SINTA-SE EM CASA (Impasto 2.1)',
        description: '🏠 **Aconchego e gastronomia de nível internacional.**\n\nNossa essência é acolher. Sinta o calor do nosso atendimento e a sofisticação de um menu internacional em cada garfada. Sua casa fora de casa.\n\n📍 **Endereço:** Rua Roraima, 39 - Centro\n📲 **Reservas:** (73) 9914-6365',
        mediaUrls: JSON.stringify([imageMap.social]),
        type: 'post',
        status: 'idea',
        accountId: 'cmmny0v0y0000g3lcp7f4kza7',
        hashtags: JSON.stringify(['Social', 'Acolhimento', 'Varanda', 'HomeFeeling'])
    }
];

async function main() {
    console.log('--- SAVING IMPASTO 2.1 CAMPAIGN IDEAS ---');
    for (const post of impastoPosts) {
        try {
            const created = await prisma.content.create({
                data: post
            });
            console.log('✅ Idea created: ' + created.title);
        } catch (e) {
            console.error('❌ Error creating ' + post.title + ': ' + e.message);
        }
    }
    console.log('--- END ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
