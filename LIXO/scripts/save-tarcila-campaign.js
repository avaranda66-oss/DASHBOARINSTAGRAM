
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const imageMap = {
    soul: '/uploads/tarcila_soul_impasto_2_1_1773355938383.png',
    art: '/uploads/tarcila_art_impasto_2_1_v2_1773356114925.png',
    perfection: '/uploads/tarcila_perfection_impasto_2_1_v3_1773356269159.png',
    heritage: '/uploads/tarcila_heritage_impasto_2_1_v2_1773356344317.png',
    excellence: '/uploads/tarcila_excellence_impasto_2_1_v2_1773356433117.png',
    invite: '/uploads/tarcila_invite_impasto_2_1_v2_1773356517763.png'
};

const tarcilaPosts = [
    {
        title: 'A ALMA DA COZINHA (Chef Tarcila)',
        description: '👩‍🍳 **Conheça a visão e a paixão da Chef Tarcila.**\n\nPor trás de cada prato d\'A Varanda, existe uma história de dedicação e amor pela gastronomia. A Chef Tarcila coloca sua alma em cada receita, transformando ingredientes simples em experiências extraordinárias.\n\n📍 **Endereço:** Rua Roraima, 39 - Centro\n📲 **Saiba mais sobre nós no link da bio!**',
        mediaUrls: JSON.stringify([imageMap.soul]),
        type: 'post',
        status: 'idea',
        accountId: 'cmmny0v0y0000g3lcp7f4kza7',
        hashtags: JSON.stringify(['ChefTarcila', 'AVaranda', 'GastronomiaComAlma', 'Itamaraju'])
    },
    {
        title: 'ARTE NO PRATO (Chef Tarcila)',
        description: '🎨 **Onde a técnica encontra a alma brasileira.**\n\nGastronomia é arte. Cada empratamento é uma composição de cores, texturas e sabores pensada para despertar todos os seus sentidos. Venha provar a arte da Chef Tarcila.\n\n📍 **Endereço:** Rua Roraima, 39 - Centro\n📲 **Confira nosso cardápio no link da bio!**',
        mediaUrls: JSON.stringify([imageMap.art]),
        type: 'post',
        status: 'idea',
        accountId: 'cmmny0v0y0000g3lcp7f4kza7',
        hashtags: JSON.stringify(['ArteGastronomica', 'ChefTarcila', 'AVaranda', 'FoodArt'])
    },
    {
        title: 'PERFEIÇÃO EM CADA CORTE (Chef Tarcila)',
        description: '🔪 **A obsessão pelo detalhe que define A Varanda.**\n\nA excelência está nos pequenos detalhes. Do corte preciso do ingrediente ao ponto exato da cocção, o rigor técnico da Chef Tarcila garante o padrão de luxo que você merece.\n\n📍 **Endereço:** Rua Roraima, 39 - Centro\n📲 **Reserve sua mesa:** (73) 9914-6365',
        mediaUrls: JSON.stringify([imageMap.perfection]),
        type: 'post',
        status: 'idea',
        accountId: 'cmmny0v0y0000g3lcp7f4kza7',
        hashtags: JSON.stringify(['Perfeição', 'TécnicaGastronomica', 'AVaranda', 'AltaCozinha'])
    },
    {
        title: 'HERANÇA E SABOR (Chef Tarcila)',
        description: '📜 **Receitas que atravessaram gerações com um toque moderno.**\n\nNossa gastronomia honra o passado enquanto abraça o futuro. Sabores ancestrais reinterpretados pela visão contemporânea da Chef Tarcila. Sinta o peso da história em cada garfada.\n\n📍 **Endereço:** Rua Roraima, 39 - Centro\n📲 **Garanta sua mesa agora!**',
        mediaUrls: JSON.stringify([imageMap.heritage]),
        type: 'post',
        status: 'idea',
        accountId: 'cmmny0v0y0000g3lcp7f4kza7',
        hashtags: JSON.stringify(['Herança', 'SaborOriginal', 'AVaranda', 'GastronomiaModerna'])
    },
    {
        title: 'EXCELÊNCIA EM AÇÃO (Chef Tarcila)',
        description: '🔥 **O rigor e a paixão que movem nossa cozinha todos os dias.**\n\nA magia acontece nos bastidores. A liderança da Chef Tarcila inspira nossa equipe a buscar a perfeição constante, entregando sempre o melhor para você.\n\n📍 **Endereço:** Rua Roraima, 39 - Centro\n📲 **Assista nosso dia a dia nos stories!**',
        mediaUrls: JSON.stringify([imageMap.excellence]),
        type: 'post',
        status: 'idea',
        accountId: 'cmmny0v0y0000g3lcp7f4kza7',
        hashtags: JSON.stringify(['Excelência', 'Bastidores', 'ChefTarcila', 'AVaranda'])
    },
    {
        title: 'TE ESPERO NA VARANDA (Chef Tarcila)',
        description: '✨ **Venha viver uma experiência gastronômica sem precedentes.**\n\nO convite está feito. Deixe que a Chef Tarcila guie seus sentidos em uma jornada de sabores inesquecíveis. A Varanda é o seu lugar.\n\n📍 **Endereço:** Rua Roraima, 39 - Centro\n📲 **Reservas via WhatsApp:** (73) 9914-6365',
        mediaUrls: JSON.stringify([imageMap.invite]),
        type: 'post',
        status: 'idea',
        accountId: 'cmmny0v0y0000g3lcp7f4kza7',
        hashtags: JSON.stringify(['Convite', 'VemPraVaranda', 'ChefTarcila', 'Itamaraju'])
    }
];

async function main() {
    console.log('--- SAVING CHEF TARCILA SERIES IDEAS ---');
    for (const post of tarcilaPosts) {
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
