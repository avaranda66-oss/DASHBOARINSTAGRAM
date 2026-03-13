
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const imageMap = {
    corporate: 'event_corporate_2_0_restored_1773351532565.png',
    family: 'event_family_2_0_restored_1773351679083.png',
    happyhour: 'event_happyhour_senior_v1_retry_1_1773354197088.png',
    birthday: 'event_birthday_senior_v1_fusion_1773354310627.png',
    networking: 'event_networking_senior_v1_fusion_1773354450298.png',
    venue: 'event_venue_senior_v1_fusion_1773354582812.png'
};

const basePath = '/C:/Users/Usuario/.gemini/antigravity/brain/84f9c6fd-2e5f-451f-a806-377474c8c8d2/';

const eventPosts = [
    {
        title: 'EXCELÊNCIA CORPORATIVA (Master 2.0)',
        description: '🏢 **Sua empresa merece o padrão Varanda.**\n\nProporcione um ambiente de excelência para sua equipe. Nossas soluções corporativas unem sofisticação, gastronomia de alto nível e a logística perfeita para reuniões e celebrações de negócios.\n\n📍 **Nosso Endereço:** Rua Roraima, 39 - Centro, Itamaraju\n📲 **Reservas:** (73) 9914-6365\n✨ **Link na Bio**',
        mediaUrls: JSON.stringify([basePath + imageMap.corporate]),
        type: 'post',
        status: 'idea',
        accountId: 'cmmny0v0y0000g3lcp7f4kza7',
        hashtags: JSON.stringify(['EventosCorporativos', 'AVaranda', 'Networking', 'Elite'])
    },
    {
        title: 'LEGADO E SABOR (Master 2.0)',
        description: '❤️ **Onde a família se encontra e a história acontece.**\n\nNão é apenas um almoço, é o ritual de reunir quem mais importa em torno de uma mesa farta e um ambiente acolhedor. Memórias preciosas são temperadas com o melhor da nossa cozinha.\n\n📍 **Nosso Endereço:** Rua Roraima, 39 - Centro, Itamaraju\n📲 **Reservas:** (73) 9914-6365\n✨ **Link na Bio**',
        mediaUrls: JSON.stringify([basePath + imageMap.family]),
        type: 'post',
        status: 'idea',
        accountId: 'cmmny0v0y0000g3lcp7f4kza7',
        hashtags: JSON.stringify(['Familia', 'AVaranda', 'Gastronomia', 'Memorias'])
    },
    {
        title: 'MOMENTOS ÚNICOS (Senior V1)',
        description: '🍹 **O brinde perfeito após um dia de sucesso.**\n\nO Happy Hour n\'A Varanda é o cenário ideal para relaxar com estilo. Drinks exclusivos e petiscos gourmet em um ambiente que respira sofisticação.\n\n📍 **Nosso Endereço:** Rua Roraima, 39 - Centro, Itamaraju\n📲 **Reservas:** (73) 9914-6365\n✨ **Link na Bio**',
        mediaUrls: JSON.stringify([basePath + imageMap.happyhour]),
        type: 'post',
        status: 'idea',
        accountId: 'cmmny0v0y0000g3lcp7f4kza7',
        hashtags: JSON.stringify(['HappyHour', 'Drinks', 'AVaranda', 'Premium'])
    },
    {
        title: 'CELEBRE A VIDA (Senior V1)',
        description: '🎂 **Onde cada ciclo novo ganha um sabor especial.**\n\nCelebre seu aniversário com a exclusividade que a data exige. Pacotes personalizados para grupos e o brinde mais memorável da cidade.\n\n📍 **Nosso Endereço:** Rua Roraima, 39 - Centro, Itamaraju\n📲 **Reservas:** (73) 9914-6365\n✨ **Link na Bio**',
        mediaUrls: JSON.stringify([basePath + imageMap.birthday]),
        type: 'post',
        status: 'idea',
        accountId: 'cmmny0v0y0000g3lcp7f4kza7',
        hashtags: JSON.stringify(['Aniversario', 'Celebracao', 'AVaranda', 'Elite'])
    },
    {
        title: 'GRANDES NEGÓCIOS (Senior V1)',
        description: '🤝 **O ambiente que transforma conversas em acordos.**\n\nTraga seus parceiros e clientes para um ambiente que transparece profissionalismo e bom gosto. O lugar certo para o seu próximo grande passo.\n\n📍 **Nosso Endereço:** Rua Roraima, 39 - Centro, Itamaraju\n📲 **Reservas:** (73) 9914-6365\n✨ **Link na Bio**',
        mediaUrls: JSON.stringify([basePath + imageMap.networking]),
        type: 'post',
        status: 'idea',
        accountId: 'cmmny0v0y0000g3lcp7f4kza7',
        hashtags: JSON.stringify(['Networking', 'Negocios', 'AVaranda', 'Bussines'])
    },
    {
        title: 'O LUGAR CERTO (Senior V1)',
        description: '✨ **A infraestrutura completa para o seu grande dia.**\n\nCasamentos, formaturas ou eventos de grande porte. Do buffet à ambientação, entregamos a experiência completa para que você apenas celebre.\n\n📍 **Nosso Endereço:** Rua Roraima, 39 - Centro, Itamaraju\n📲 **Reservas:** (73) 9914-6365\n✨ **Link na Bio**',
        mediaUrls: JSON.stringify([basePath + imageMap.venue]),
        type: 'post',
        status: 'idea',
        accountId: 'cmmny0v0y0000g3lcp7f4kza7',
        hashtags: JSON.stringify(['Eventos', 'EspacoEventos', 'AVaranda', 'Luxo'])
    }
];

async function main() {
    console.log('--- SAVING FINAL CAMPAIGN IDEAS ---');
    for (const post of eventPosts) {
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
