const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const BASE = 'https://graph.facebook.com/v25.0';

async function post(endpoint, token, body) {
    const res = await fetch(`${BASE}/${endpoint}`, {
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
    const campaignId = '120241414340580412';
    const pageId = '764239866781806';
    const igId = '17841439736892152';

    console.log('=== CRIANDO AD SET ===');
    const r = await post(`${accountId}/adsets`, token, {
        name: 'Itamaraju Stories — 28-60',
        campaign_id: campaignId,
        daily_budget: 1500,
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'REACH',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: {
            geo_locations: { cities: [{ key: '255700' }] },
            age_min: 28,
            age_max: 60,
            targeting_automation: { advantage_audience: 0 },
        },
        status: 'PAUSED',
    });
    const adSetId = r.id;
    console.log(`  Ad Set: ${adSetId}`);

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
            console.log(`  FALHOU ${img.name}`);
        }
    }

    if (adsCreated > 0) {
        console.log(`\n=== ATIVANDO ${adsCreated} ADS ===`);
        try { await post(adSetId, token, { status: 'ACTIVE' }); console.log('  Ad Set ATIVO'); } catch (e) { console.log(`  AdSet: ${e.message}`); }
        try { await post(campaignId, token, { status: 'ACTIVE' }); console.log('  Campanha ATIVA'); } catch (e) { console.log(`  Campaign: ${e.message}`); }
    }

    console.log('\n=== RESULTADO FINAL ===');
    console.log(`Campaign: ${campaignId}`);
    console.log(`Ad Set: ${adSetId}`);
    console.log(`Ads criados: ${adsCreated}`);
    console.log('Budget: R$ 15/dia');
    console.log('Target: Itamaraju, 28-60 anos');
    console.log('Objetivo: Alcance (REACH)');

    await db.$disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
