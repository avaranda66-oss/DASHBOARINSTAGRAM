const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const BASE = 'https://graph.facebook.com/v25.0';

const NEW_TOKEN = process.env.META_ACCESS_TOKEN; // REPLACED HARDCODED TOKEN FOR SECURITY

async function get(endpoint, token) {
    const sep = endpoint.includes('?') ? '&' : '?';
    const res = await fetch(`${BASE}/${endpoint}${sep}access_token=${token}`);
    return res.json();
}

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
    // 1. Update token
    console.log('=== ATUALIZANDO TOKEN ===');
    const acc = await db.account.findFirst({ where: { ads_token: { not: null } } });
    await db.account.update({ where: { id: acc.id }, data: { ads_token: NEW_TOKEN } });
    console.log('  Token atualizado!');

    const token = NEW_TOKEN;
    const accountId = acc.ads_account_id;
    const pageId = '764239866781806';

    // 2. Verify
    console.log('\n=== VERIFICANDO TOKEN ===');
    const debug = await get(`debug_token?input_token=${token}`, token);
    console.log('  Scopes:', debug.data?.scopes?.join(', '));

    // 3. Get IG
    const igRes = await get(`${pageId}?fields=instagram_business_account{id,username}`, token);
    const igId = igRes.instagram_business_account?.id;
    console.log('  IG:', igRes.instagram_business_account?.username, igId);

    // 4. Clean old campaigns
    console.log('\n=== LIMPANDO ===');
    const camps = await get(`${accountId}/campaigns?fields=id,name&limit=100`, token);
    for (const c of (camps.data || [])) {
        try { await post(c.id, token, { status: 'DELETED' }); console.log(`  Deletada: ${c.name}`); } catch(e) {}
    }

    // 5. Create Campaign
    console.log('\n=== CRIANDO CAMPANHA ===');
    const campaign = await post(`${accountId}/campaigns`, token, {
        name: 'A Varanda — Prestígio (Stories)',
        objective: 'OUTCOME_AWARENESS',
        status: 'PAUSED',
        special_ad_categories: [],
        is_adset_budget_sharing_enabled: false,
    });
    console.log(`  Campanha: ${campaign.id}`);

    // 6. Create Ad Set
    console.log('\n=== CRIANDO AD SET ===');
    const adSet = await post(`${accountId}/adsets`, token, {
        name: 'Itamaraju Stories — 28-60',
        campaign_id: campaign.id,
        daily_budget: 1500,
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'REACH',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: {
            geo_locations: { cities: [{ key: '255700' }] },
            age_min: 28, age_max: 60,
            targeting_automation: { advantage_audience: 0 },
        },
        status: 'PAUSED',
    });
    console.log(`  Ad Set: ${adSet.id}`);

    // 7. Create Ads
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
            const storySpec = { page_id: pageId };
            if (igId) storySpec.instagram_actor_id = igId;
            storySpec.link_data = {
                image_hash: img.hash,
                message: img.text,
                link: 'https://www.instagram.com/a_varanda_itamaraju/',
                call_to_action: { type: 'LEARN_MORE' },
            };

            const creative = await post(`${accountId}/adcreatives`, token, {
                name: `Creative — ${img.name}`,
                object_story_spec: storySpec,
            });
            console.log(`  Creative: ${img.name} (${creative.id})`);

            const ad = await post(`${accountId}/ads`, token, {
                name: `Ad — ${img.name}`,
                adset_id: adSet.id,
                creative: { creative_id: creative.id },
                status: 'PAUSED',
            });
            console.log(`  Ad: ${img.name} (${ad.id})`);
            adsCreated++;
        } catch (e) {
            // Try without IG actor
            try {
                console.log(`  Tentando sem IG...`);
                const creative = await post(`${accountId}/adcreatives`, token, {
                    name: `Creative — ${img.name}`,
                    object_story_spec: {
                        page_id: pageId,
                        link_data: {
                            image_hash: img.hash,
                            message: img.text,
                            link: 'https://www.instagram.com/a_varanda_itamaraju/',
                            call_to_action: { type: 'LEARN_MORE' },
                        },
                    },
                });
                console.log(`  Creative (sem IG): ${img.name} (${creative.id})`);
                const ad = await post(`${accountId}/ads`, token, {
                    name: `Ad — ${img.name}`,
                    adset_id: adSet.id,
                    creative: { creative_id: creative.id },
                    status: 'PAUSED',
                });
                console.log(`  Ad: ${img.name} (${ad.id})`);
                adsCreated++;
            } catch (e2) {
                console.log(`  FALHOU TOTAL ${img.name}`);
            }
        }
    }

    if (adsCreated > 0) {
        console.log(`\n=== ATIVANDO ${adsCreated} ADS ===`);
        try { await post(adSet.id, token, { status: 'ACTIVE' }); console.log('  Ad Set ATIVO'); } catch(e) { console.log('  AdSet:', e.message); }
        try { await post(campaign.id, token, { status: 'ACTIVE' }); console.log('  Campanha ATIVA'); } catch(e) { console.log('  Campaign:', e.message); }

        console.log('\n=============================');
        console.log('  CAMPANHA NO AR!');
        console.log('=============================');
        console.log(`Campaign: ${campaign.id}`);
        console.log(`Ad Set: ${adSet.id}`);
        console.log(`Ads: ${adsCreated}`);
        console.log('Budget: R$ 15/dia');
        console.log('Target: Itamaraju, 28-60 anos');
    } else {
        console.log('\nNenhum ad criado.');
    }

    await db.$disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
