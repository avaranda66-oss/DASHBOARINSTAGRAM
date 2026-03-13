const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const BASE = 'https://graph.facebook.com/v25.0';

async function gql(endpoint, token) {
    const res = await fetch(`${BASE}/${endpoint}${endpoint.includes('?') ? '&' : '?'}access_token=${token}`);
    return res.json();
}

async function post(endpoint, token, body) {
    const res = await fetch(`${BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, access_token: token }),
    });
    const data = await res.json();
    if (data.error) throw new Error(`${data.error.message} [code:${data.error.code}, sub:${data.error.error_subcode || '-'}]`);
    return data;
}

async function main() {
    const acc = await db.account.findFirst({ where: { ads_token: { not: null } } });
    const token = acc.ads_token;
    const accountId = acc.ads_account_id;
    const pageId = '764239866781806';
    const igId = '17841439736892152';

    // 1. Delete ALL old campaigns
    console.log('=== DELETANDO TODAS AS CAMPANHAS ANTIGAS ===');
    const camps = await gql(`${accountId}/campaigns?fields=id,name,status&limit=100`, token);
    for (const c of (camps.data || [])) {
        try {
            await post(c.id, token, { status: 'DELETED' });
            console.log(`  Deletada: ${c.name} (${c.id})`);
        } catch (e) {
            console.log(`  Erro deletar ${c.name}: ${e.message}`);
        }
    }

    // 2. Create campaign WITH is_adset_budget_sharing_enabled
    console.log('\n=== CRIANDO CAMPANHA ===');
    let campaignId;
    const result = await post(`${accountId}/campaigns`, token, {
        name: 'A Varanda — Prestígio (Stories)',
        objective: 'OUTCOME_AWARENESS',
        status: 'PAUSED',
        special_ad_categories: [],
        is_adset_budget_sharing_enabled: false,
    });
    campaignId = result.id;
    console.log(`  Campanha: ${campaignId}`);

    // 3. Create Ad Set
    console.log('\n=== CRIANDO AD SET ===');
    const adSetResult = await post(`${accountId}/adsets`, token, {
        name: 'Itamaraju Stories — 28-60',
        campaign_id: campaignId,
        daily_budget: 1500,
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'REACH',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: {
            geo_locations: { cities: [{ key: '255700', radius: 15, distance_unit: 'kilometer' }] },
            age_min: 28,
            age_max: 60,
        },
        status: 'PAUSED',
    });
    const adSetId = adSetResult.id;
    console.log(`  Ad Set: ${adSetId}`);

    // 4. Create Ads with the 4 approved creatives
    console.log('\n=== CRIANDO ANUNCIOS ===');
    const images = [
        { hash: '356e7157fb053f0af90256f358ed35d1', name: 'Prestígio - Risoto', text: 'Venha viver uma experiência gastronômica única. A Varanda Itamaraju espera você!' },
        { hash: '55d46f440fb0a6a5833b05e8f8cc1636', name: 'Descubra Sabores', text: 'Descubra sabores que encantam. Reserve sua mesa na Varanda!' },
        { hash: '1a193f285ce9caa477adbb5a793ce3b4', name: 'Sabor do Mar', text: 'Fresco e inesquecível — o melhor da gastronomia em Itamaraju.' },
        { hash: 'a8e756a69503711553624cf0935f8044', name: 'Moscow Mule', text: 'Drink especial + pratos incríveis. Sua noite começa na Varanda!' },
    ];

    let adsCreated = 0;
    for (const img of images) {
        try {
            const creative = await post(`${accountId}/adcreatives`, token, {
                name: `Creative — ${img.name}`,
                object_story_spec: {
                    page_id: pageId,
                    instagram_actor_id: igId,
                    link_data: {
                        image_hash: img.hash,
                        message: img.text,
                        link: 'https://www.instagram.com/a_varanda_itamaraju/',
                        call_to_action: { type: 'LEARN_MORE' },
                    },
                },
            });
            console.log(`  Creative: ${img.name} (${creative.id})`);

            const ad = await post(`${accountId}/ads`, token, {
                name: `Ad — ${img.name}`,
                adset_id: adSetId,
                creative: { creative_id: creative.id },
                status: 'PAUSED',
            });
            console.log(`  Ad: ${img.name} (${ad.id})`);
            adsCreated++;
        } catch (e) {
            console.log(`  ERRO ${img.name}: ${e.message}`);
        }
    }

    if (adsCreated === 0) {
        console.log('\nNenhum anuncio criado!');
        await db.$disconnect();
        return;
    }

    // 5. Activate
    console.log(`\n=== ATIVANDO (${adsCreated} ads) ===`);
    try { await post(adSetId, token, { status: 'ACTIVE' }); console.log('  Ad Set ATIVO'); } catch (e) { console.log(`  AdSet: ${e.message}`); }
    try { await post(campaignId, token, { status: 'ACTIVE' }); console.log('  Campanha ATIVA'); } catch (e) { console.log(`  Campaign: ${e.message}`); }

    console.log('\n=== RESULTADO ===');
    console.log(`Campaign: ${campaignId}`);
    console.log(`Ad Set: ${adSetId}`);
    console.log(`Ads: ${adsCreated}`);
    console.log(`Budget: R$ 15/dia`);
    console.log(`Target: Itamaraju 15km, 28-60 anos`);
    console.log(`Objetivo: Alcance/Awareness`);

    await db.$disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
