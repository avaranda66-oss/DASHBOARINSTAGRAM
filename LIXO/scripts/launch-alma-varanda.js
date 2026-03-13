const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const CAMPAIGN_ID = '120241416199550412';
const PAGE_ID = '764239866781806';
const IG_USER_ID = '17841439736892152';
const GRAPH = 'https://graph.facebook.com/v25.0';

async function main() {
    const db = new PrismaClient();

    try {
        // 0. Get token from database
        const acc = await db.account.findFirst({ where: { ads_token: { not: null } } });
        if (!acc || !acc.ads_token) throw new Error('Nenhuma conta com ads_token encontrada no banco.');
        const TOKEN = acc.ads_token;
        const AD_ACCOUNT = acc.ads_account_id; // Usar a conta do banco
        console.log('0. Token encontrado, usando conta:', AD_ACCOUNT);

        // 1. Insert into Content table (storyboard) as idea — skip if exists
        console.log('1. Verificando storyboard...');
        const existing = await db.content.findFirst({ where: { title: 'Alma da Varanda — Gesto Artístico' } });
        if (existing) {
            console.log('   Já existe no storyboard:', existing.id);
        } else {
            const content = await db.content.create({
                data: {
                    title: 'Alma da Varanda — Gesto Artístico',
                    description: 'Criativo estilo Gesto Artístico com Chef Tarcila. Brushstrokes douradas, fundo verde amazônico. Headline: TRADIÇÃO EM CADA GESTO.',
                    type: 'image',
                    status: 'idea',
                    mediaUrls: JSON.stringify(['/creatives/varanda/criativo_01_alma_varanda.png']),
                    hashtags: JSON.stringify(['#AVarianda', '#ChefTarcila', '#GastronomiaAutoral', '#Itamaraju']),
                    accountId: 'a_varanda_itamaraju',
                    order: 0,
                },
            });
            console.log('   Inserido no storyboard:', content.id);
        }

        // 2. Upload image to Meta
        console.log('2. Fazendo upload da imagem para Meta...');
        const imagePath = path.join(__dirname, '..', 'public', 'creatives', 'varanda', 'criativo_01_alma_varanda.png');
        const imageBuffer = fs.readFileSync(imagePath);

        const formData = new FormData();
        formData.append('filename', new Blob([imageBuffer]), 'criativo_01_alma_varanda.png');
        formData.append('access_token', TOKEN);

        const uploadRes = await fetch(`${GRAPH}/${AD_ACCOUNT}/adimages`, {
            method: 'POST',
            body: formData,
        });
        const uploadJson = await uploadRes.json();
        if (uploadJson.error) throw new Error('Upload falhou: ' + uploadJson.error.message);

        const imageHash = Object.values(uploadJson.images)[0].hash;
        console.log('   Image hash:', imageHash);

        // 3. Create Ad Set — R$15/dia
        console.log('3. Criando Ad Set R$15/dia...');
        const adsetParams = new URLSearchParams({
            name: 'Alma da Varanda — R$15/dia — Itamaraju 28-60',
            campaign_id: CAMPAIGN_ID,
            status: 'ACTIVE',
            daily_budget: '1500',
            billing_event: 'IMPRESSIONS',
            optimization_goal: 'REACH',
            bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
            is_adset_budget_sharing_enabled: 'false',
            targeting: JSON.stringify({
                geo_locations: { cities: [{ key: '2513108', radius: 30, distance_unit: 'kilometer' }] },
                age_min: 28,
                age_max: 60,
                publisher_platforms: ['facebook', 'instagram'],
                facebook_positions: ['feed', 'story'],
                instagram_positions: ['stream', 'story', 'reels', 'explore'],
                targeting_automation: { advantage_audience: 0 },
            }),
            access_token: TOKEN,
        });

        const adsetRes = await fetch(`${GRAPH}/${AD_ACCOUNT}/adsets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: adsetParams.toString(),
        });
        const adsetJson = await adsetRes.json();
        if (adsetJson.error) throw new Error('Ad Set falhou: ' + JSON.stringify(adsetJson.error));
        const adsetId = adsetJson.id;
        console.log('   Ad Set criado:', adsetId);

        // 4. Create Creative
        console.log('4. Criando creative...');
        const creativeParams = new URLSearchParams({
            name: 'Creative — Alma da Varanda',
            object_story_spec: JSON.stringify({
                page_id: PAGE_ID,
                instagram_user_id: IG_USER_ID,
                link_data: {
                    image_hash: imageHash,
                    link: 'https://www.instagram.com/a_varanda_itamaraju/',
                    message: '🍽️ Tradição em cada gesto. A culinária é uma forma de arte.\n\n📍 A Varanda — Itamaraju\n#AVarianda #ChefTarcila #GastronomiaAutoral',
                    call_to_action: { type: 'LEARN_MORE' },
                },
            }),
            access_token: TOKEN,
        });

        const creativeRes = await fetch(`${GRAPH}/${AD_ACCOUNT}/adcreatives`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: creativeParams.toString(),
        });
        const creativeJson = await creativeRes.json();
        if (creativeJson.error) throw new Error('Creative falhou: ' + creativeJson.error.message);
        const creativeId = creativeJson.id;
        console.log('   Creative criado:', creativeId);

        // 5. Create Ad
        console.log('5. Criando anúncio...');
        const adParams = new URLSearchParams({
            name: 'Ad — Alma da Varanda',
            adset_id: adsetId,
            creative: JSON.stringify({ creative_id: creativeId }),
            status: 'ACTIVE',
            access_token: TOKEN,
        });

        const adRes = await fetch(`${GRAPH}/${AD_ACCOUNT}/ads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: adParams.toString(),
        });
        const adJson = await adRes.json();
        if (adJson.error) throw new Error('Ad falhou: ' + adJson.error.message);
        console.log('   Anúncio criado:', adJson.id);

        console.log('\n✅ TUDO PRONTO!');
        console.log('   Storyboard: item inserido como "idea"');
        console.log('   Ad Set:', adsetId, '— R$15/dia');
        console.log('   Campanha total agora: R$50/dia (15+15+20)');

    } catch (err) {
        console.error('ERRO:', err.message || err);
    } finally {
        await db.$disconnect();
    }
}

main();
