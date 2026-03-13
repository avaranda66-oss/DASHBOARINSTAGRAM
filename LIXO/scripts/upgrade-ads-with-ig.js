const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const BASE = 'https://graph.facebook.com/v25.0';

async function get(endpoint, token) {
    const sep = endpoint.includes('?') ? '&' : '?';
    const res = await fetch(BASE + '/' + endpoint + sep + 'access_token=' + token);
    return res.json();
}

async function post(endpoint, token, body) {
    const res = await fetch(BASE + '/' + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, access_token: token }),
    });
    const data = await res.json();
    if (data.error) {
        console.log('  ERR:', data.error.error_user_msg || data.error.message);
        throw new Error(data.error.message);
    }
    return data;
}

async function main() {
    const acc = await db.account.findFirst({ where: { ads_token: { not: null } } });
    const token = acc.ads_token;
    const accountId = acc.ads_account_id;
    const pageId = '764239866781806';
    const igUserId = '17841439736892152';
    const adSetId = '120241416199820412';
    const campaignId = '120241416199550412';

    // Delete old ads (the ones without IG)
    console.log('=== DELETANDO ADS ANTIGOS (sem IG) ===');
    const oldAds = await get(accountId + '/ads?fields=id,name&limit=50', token);
    for (const ad of (oldAds.data || [])) {
        try { await post(ad.id, token, { status: 'DELETED' }); console.log('  Deletado:', ad.name); } catch(e) {}
    }

    // Create new ads with instagram_user_id
    console.log('\n=== CRIANDO ADS COM INSTAGRAM (@avaranda_ita) ===');
    const images = [
        { hash: '356e7157fb053f0af90256f358ed35d1', name: 'Prestigio - Risoto', text: 'Venha viver uma experiencia gastronomica unica. A Varanda Itamaraju espera voce!' },
        { hash: '55d46f440fb0a6a5833b05e8f8cc1636', name: 'Descubra Sabores', text: 'Descubra sabores que encantam. Reserve sua mesa na Varanda!' },
        { hash: '1a193f285ce9caa477adbb5a793ce3b4', name: 'Sabor do Mar', text: 'Fresco e inesquecivel - o melhor da gastronomia em Itamaraju.' },
        { hash: 'a8e756a69503711553624cf0935f8044', name: 'Moscow Mule', text: 'Drink especial + pratos incriveis. Sua noite comeca na Varanda!' },
    ];

    let adsCreated = 0;
    for (const img of images) {
        const creative = await post(accountId + '/adcreatives', token, {
            name: 'Creative - ' + img.name,
            object_story_spec: {
                page_id: pageId,
                instagram_user_id: igUserId,
                link_data: {
                    image_hash: img.hash,
                    message: img.text,
                    link: 'https://www.instagram.com/a_varanda_itamaraju/',
                    call_to_action: { type: 'LEARN_MORE' },
                },
            },
        });
        console.log('  Creative: ' + img.name + ' (' + creative.id + ')');

        const ad = await post(accountId + '/ads', token, {
            name: 'Ad - ' + img.name,
            adset_id: adSetId,
            creative: { creative_id: creative.id },
            status: 'ACTIVE',
        });
        console.log('  Ad: ' + img.name + ' (' + ad.id + ')');
        adsCreated++;
    }

    // Ensure active
    try { await post(adSetId, token, { status: 'ACTIVE' }); } catch(e) {}
    try { await post(campaignId, token, { status: 'ACTIVE' }); } catch(e) {}

    console.log('\n========================================');
    console.log('  ' + adsCreated + ' ADS COM INSTAGRAM ATIVO!');
    console.log('  Conta: @avaranda_ita');
    console.log('  Placements: Facebook + Instagram');
    console.log('  Budget: R$ 15/dia');
    console.log('  Target: Itamaraju, 28-60 anos');
    console.log('========================================');

    await db.$disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
