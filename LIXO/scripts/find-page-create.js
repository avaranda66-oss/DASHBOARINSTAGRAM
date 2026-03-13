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
    if (data.error) throw new Error(`${data.error.message} [${data.error.code}]`);
    return data;
}

async function main() {
    const acc = await db.account.findFirst({ where: { ads_token: { not: null } } });
    const token = acc.ads_token;
    const accountId = acc.ads_account_id;
    const businessId = '764250710114055';

    // 1. Get page from business
    console.log('=== Buscando Page via Business ===');
    const bpages = await gql(`${businessId}/owned_pages?fields=id,name,instagram_business_account{id,username}`, token);
    console.log('Business pages:', JSON.stringify(bpages, null, 2));

    let pageId = null;
    let igId = null;
    if (bpages.data && bpages.data.length > 0) {
        pageId = bpages.data[0].id;
        console.log(`Page: ${bpages.data[0].name} (${pageId})`);
        if (bpages.data[0].instagram_business_account) {
            igId = bpages.data[0].instagram_business_account.id;
            console.log(`IG: ${bpages.data[0].instagram_business_account.username} (${igId})`);
        }
    }

    // 2. Fallback: get page from existing creative
    if (!pageId) {
        console.log('\nTentando via creative existente...');
        const creative = await gql('842899628572567?fields=object_story_spec,effective_object_story_id', token);
        console.log('Creative:', JSON.stringify(creative, null, 2));
        if (creative.object_story_spec?.page_id) {
            pageId = creative.object_story_spec.page_id;
            console.log(`Page from creative: ${pageId}`);
        }
        if (creative.effective_object_story_id) {
            // Format: PAGE_ID_POST_ID
            const parts = creative.effective_object_story_id.split('_');
            if (parts.length >= 2 && !pageId) {
                pageId = parts[0];
                console.log(`Page from story ID: ${pageId}`);
            }
        }
    }

    if (!pageId) {
        console.log('ERRO: Não consegui encontrar Page ID de nenhuma forma.');
        await db.$disconnect();
        return;
    }

    // 3. Get IG Account from page
    if (!igId) {
        try {
            const igRes = await gql(`${pageId}?fields=instagram_business_account{id,username}`, token);
            if (igRes.instagram_business_account) {
                igId = igRes.instagram_business_account.id;
                console.log(`IG from page: ${igId}`);
            }
        } catch (e) { }
    }

    console.log(`\n✓ Page ID: ${pageId}`);
    console.log(`✓ IG ID: ${igId || 'N/A'}`);

    // 4. Delete all old campaigns
    console.log('\n=== Deletando campanhas antigas ===');
    const camps = await gql(`${accountId}/campaigns?fields=id,name,status&limit=50`, token);
    for (const c of (camps.data || [])) {
        try {
            await post(c.id, token, { status: 'DELETED' });
            console.log(`  Deletada: ${c.name}`);
        } catch (e) {
            console.log(`  Erro deletar ${c.name}: ${e.message}`);
        }
    }

    // 5. Create campaign
    console.log('\n=== Criando Campanha ===');
    let campaignId;
    const objectives = ['OUTCOME_AWARENESS', 'OUTCOME_ENGAGEMENT', 'OUTCOME_TRAFFIC'];

    for (const obj of objectives) {
        try {
            const r = await post(`${accountId}/campaigns`, token, {
                name: 'A Varanda — Prestígio (Stories)',
                objective: obj,
                status: 'PAUSED',
                special_ad_categories: [],
            });
            campaignId = r.id;
            console.log(`  ✓ Campanha criada (${obj}): ${campaignId}`);
            break;
        } catch (e) {
            console.log(`  ✗ ${obj}: ${e.message}`);
        }
    }

    if (!campaignId) {
        console.log('ERRO: Não conseguiu criar campanha.');
        await db.$disconnect();
        return;
    }

    // 6. Create Ad Set
    console.log('\n=== Criando Ad Set ===');
    let adSetId;
    const targetingConfigs = [
        // Config 1: Full targeting with positions
        {
            geo_locations: { cities: [{ key: '255700', radius: 15, distance_unit: 'kilometer' }] },
            age_min: 28,
            age_max: 60,
            publisher_platforms: ['instagram', 'facebook'],
            facebook_positions: ['story'],
            instagram_positions: ['story', 'reels'],
        },
        // Config 2: Without position restrictions
        {
            geo_locations: { cities: [{ key: '255700', radius: 15, distance_unit: 'kilometer' }] },
            age_min: 28,
            age_max: 60,
        },
    ];

    const optGoals = ['REACH', 'IMPRESSIONS', 'AD_RECALL_LIFT', 'LINK_CLICKS'];

    for (const targeting of targetingConfigs) {
        for (const goal of optGoals) {
            try {
                const r = await post(`${accountId}/adsets`, token, {
                    name: 'Itamaraju — Stories 28-60',
                    campaign_id: campaignId,
                    daily_budget: 1500,
                    billing_event: 'IMPRESSIONS',
                    optimization_goal: goal,
                    targeting: targeting,
                    status: 'PAUSED',
                });
                adSetId = r.id;
                console.log(`  ✓ Ad Set (${goal}): ${adSetId}`);
                break;
            } catch (e) {
                console.log(`  ✗ targeting ${JSON.stringify(targeting).length < 100 ? 'simple' : 'full'} + ${goal}: ${e.message.substring(0, 120)}`);
            }
        }
        if (adSetId) break;
    }

    if (!adSetId) {
        console.log('ERRO: Não conseguiu criar ad set.');
        await db.$disconnect();
        return;
    }

    // 7. Create Ads
    console.log('\n=== Criando Anúncios ===');
    const images = [
        { hash: '356e7157fb053f0af90256f358ed35d1', name: 'Prestígio - Risoto', text: 'Venha viver uma experiência gastronômica única. A Varanda Itamaraju espera você!' },
        { hash: '55d46f440fb0a6a5833b05e8f8cc1636', name: 'Descubra Sabores', text: 'Descubra sabores que encantam. Reserve sua mesa na Varanda!' },
        { hash: '1a193f285ce9caa477adbb5a793ce3b4', name: 'Sabor do Mar', text: 'Fresco e inesquecível — o melhor frutos do mar de Itamaraju.' },
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
            console.log(`  ✓ Creative: ${img.name} (${creative.id})`);

            const ad = await post(`${accountId}/ads`, token, {
                name: `Ad — ${img.name}`,
                adset_id: adSetId,
                creative: { creative_id: creative.id },
                status: 'PAUSED',
            });
            console.log(`  ✓ Ad: ${img.name} (${ad.id})`);
            adsCreated++;
        } catch (e) {
            console.log(`  ✗ ${img.name}: ${e.message}`);
        }
    }

    // 8. Activate
    if (adsCreated > 0) {
        console.log(`\n=== Ativando ${adsCreated} ads ===`);
        try { await post(adSetId, token, { status: 'ACTIVE' }); console.log('  ✓ Ad Set ATIVO'); } catch (e) { console.log(`  ✗ AdSet: ${e.message}`); }
        try { await post(campaignId, token, { status: 'ACTIVE' }); console.log('  ✓ Campanha ATIVA'); } catch (e) { console.log(`  ✗ Campaign: ${e.message}`); }
    }

    console.log('\n=== RESULTADO FINAL ===');
    console.log(`Campaign: ${campaignId}`);
    console.log(`Ad Set: ${adSetId}`);
    console.log(`Ads: ${adsCreated}`);
    console.log(`Budget: R$ 15/dia`);
    console.log(`Target: Itamaraju 15km, 28-60 anos`);

    await db.$disconnect();
}

main().catch(console.error);
