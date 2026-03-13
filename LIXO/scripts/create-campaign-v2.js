const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const db = new PrismaClient();

const GRAPH_BASE = 'https://graph.facebook.com/v25.0';

async function graphPost(endpoint, token, body) {
    const url = `${GRAPH_BASE}/${endpoint}`;

    // Use JSON body instead of form-urlencoded for complex params
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, access_token: token }),
    });
    const data = await res.json();
    if (data.error) {
        console.log('    DEBUG body:', JSON.stringify(body, null, 2));
        throw new Error(`${data.error.message} (code: ${data.error.code}, subcode: ${data.error.error_subcode || 'none'})`);
    }
    return data;
}

async function graphPostForm(endpoint, token, params) {
    const url = `${GRAPH_BASE}/${endpoint}`;
    const formData = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        formData.set(k, typeof v === 'string' ? v : JSON.stringify(v));
    });
    formData.set('access_token', token);

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
    });
    const data = await res.json();
    if (data.error) {
        throw new Error(`${data.error.message} (code: ${data.error.code})`);
    }
    return data;
}

async function graphGet(endpoint, token, params = {}) {
    const url = new URL(`${GRAPH_BASE}/${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, typeof v === 'string' ? v : JSON.stringify(v)));
    url.searchParams.set('access_token', token);
    const res = await fetch(url.toString());
    return res.json();
}

async function main() {
    const acc = await db.account.findFirst({ where: { ads_token: { not: null } } });
    if (!acc) { console.log('No ads token'); return; }
    const token = acc.ads_token;
    const accountId = acc.ads_account_id;
    console.log('=== CRIANDO CAMPANHA A VARANDA v2 ===\n');

    // Already uploaded images from v1 run - reuse hashes
    const imageHashes = [
        { hash: '356e7157fb053f0af90256f358ed35d1', name: 'Prestígio - Risoto' },
        { hash: '55d46f440fb0a6a5833b05e8f8cc1636', name: 'Descubra Sabores - Arroz' },
        { hash: '1a193f285ce9caa477adbb5a793ce3b4', name: 'Sabor do Mar - Camarão' },
        { hash: 'a8e756a69503711553624cf0935f8044', name: 'Moscow Mule' },
    ];

    // Get Page ID + IG Account
    console.log('--- Buscando Page e IG Account ---');
    let pageId = null;
    let igAccountId = null;

    // Try via ad account's promoted pages
    try {
        const adAccount = await graphGet(accountId, token, {
            fields: 'id,name'
        });
        console.log('  Ad Account:', adAccount.name);
    } catch (e) {
        console.log('  Ad Account info error:', e.message);
    }

    // Get pages linked to the ad account
    try {
        const pagesRes = await graphGet(`${accountId}/promote_pages`, token, {
            fields: 'id,name,instagram_business_account{id,username}'
        });
        if (pagesRes.data && pagesRes.data.length > 0) {
            pageId = pagesRes.data[0].id;
            console.log(`  Page: ${pagesRes.data[0].name} (${pageId})`);
            if (pagesRes.data[0].instagram_business_account) {
                igAccountId = pagesRes.data[0].instagram_business_account.id;
                console.log(`  IG: ${pagesRes.data[0].instagram_business_account.username} (${igAccountId})`);
            }
        }
    } catch (e) {
        console.log('  Pages error:', e.message);
    }

    // Fallback: try me/accounts
    if (!pageId) {
        try {
            const mePages = await graphGet('me/accounts', token, { fields: 'id,name' });
            if (mePages.data && mePages.data.length > 0) {
                pageId = mePages.data[0].id;
                console.log(`  Page (me/accounts): ${mePages.data[0].name} (${pageId})`);
            }
        } catch (e) { }
    }

    // Get IG account via page
    if (pageId && !igAccountId) {
        try {
            const igRes = await graphGet(pageId, token, {
                fields: 'instagram_business_account{id,username}'
            });
            if (igRes.instagram_business_account) {
                igAccountId = igRes.instagram_business_account.id;
                console.log(`  IG (via page): ${igRes.instagram_business_account.username} (${igAccountId})`);
            }
        } catch (e) { }
    }

    if (!pageId) {
        console.log('\n  ERRO CRÍTICO: Nenhuma Facebook Page vinculada à conta de ads.');
        console.log('  Isso é necessário para criar anúncios. Verifique no Business Manager.');
        await db.$disconnect();
        return;
    }

    // Create Campaign with JSON body
    console.log('\n--- Criando Campanha ---');
    let campaignId;
    try {
        const result = await graphPost(`${accountId}/campaigns`, token, {
            name: 'A Varanda — Prestígio (Stories)',
            objective: 'OUTCOME_AWARENESS',
            status: 'PAUSED',
            special_ad_categories: [],
        });
        campaignId = result.id;
        console.log(`  ✓ Campanha: ${campaignId}`);
    } catch (e) {
        console.log(`  ✗ OUTCOME_AWARENESS falhou: ${e.message}`);

        // Try OUTCOME_TRAFFIC
        try {
            console.log('  Tentando OUTCOME_TRAFFIC...');
            const result = await graphPost(`${accountId}/campaigns`, token, {
                name: 'A Varanda — Prestígio (Stories)',
                objective: 'OUTCOME_TRAFFIC',
                status: 'PAUSED',
                special_ad_categories: [],
            });
            campaignId = result.id;
            console.log(`  ✓ Campanha (TRAFFIC): ${campaignId}`);
        } catch (e2) {
            console.log(`  ✗ OUTCOME_TRAFFIC falhou: ${e2.message}`);

            // Try OUTCOME_ENGAGEMENT
            try {
                console.log('  Tentando OUTCOME_ENGAGEMENT...');
                const result = await graphPost(`${accountId}/campaigns`, token, {
                    name: 'A Varanda — Prestígio (Stories)',
                    objective: 'OUTCOME_ENGAGEMENT',
                    status: 'PAUSED',
                    special_ad_categories: [],
                });
                campaignId = result.id;
                console.log(`  ✓ Campanha (ENGAGEMENT): ${campaignId}`);
            } catch (e3) {
                console.log(`  ✗ Todos falharam: ${e3.message}`);
                await db.$disconnect();
                return;
            }
        }
    }

    // Create Ad Set
    console.log('\n--- Criando Ad Set ---');
    const targeting = {
        geo_locations: {
            cities: [{ key: '255700', radius: 15, distance_unit: 'kilometer' }],
        },
        age_min: 28,
        age_max: 60,
    };

    let adSetId;
    try {
        const result = await graphPost(`${accountId}/adsets`, token, {
            name: 'Itamaraju Stories — 28-60',
            campaign_id: campaignId,
            daily_budget: 1500, // centavos = R$ 15
            billing_event: 'IMPRESSIONS',
            optimization_goal: 'REACH',
            bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
            targeting: targeting,
            status: 'PAUSED',
        });
        adSetId = result.id;
        console.log(`  ✓ Ad Set: ${adSetId}`);
    } catch (e) {
        console.log(`  ✗ Erro ad set: ${e.message}`);

        // Try with LINK_CLICKS optimization if REACH fails
        try {
            console.log('  Tentando optimization_goal IMPRESSIONS...');
            const result = await graphPost(`${accountId}/adsets`, token, {
                name: 'Itamaraju Stories — 28-60',
                campaign_id: campaignId,
                daily_budget: 1500,
                billing_event: 'IMPRESSIONS',
                optimization_goal: 'IMPRESSIONS',
                targeting: targeting,
                status: 'PAUSED',
            });
            adSetId = result.id;
            console.log(`  ✓ Ad Set (IMPRESSIONS): ${adSetId}`);
        } catch (e2) {
            console.log(`  ✗ Erro: ${e2.message}`);
            await db.$disconnect();
            return;
        }
    }

    // Create ads
    console.log('\n--- Criando Anúncios ---');
    const texts = [
        'Venha viver uma experiência gastronômica única. A Varanda Itamaraju espera você!',
        'Descubra sabores que encantam. Reserve sua mesa na Varanda!',
        'Fresco e inesquecível — o melhor da gastronomia está aqui na Varanda.',
        'Drink especial + pratos incríveis. Sua noite começa na Varanda!',
    ];

    let adsCreated = 0;
    for (let i = 0; i < imageHashes.length; i++) {
        const img = imageHashes[i];
        const text = texts[i];

        try {
            // Create creative
            const storySpec = {
                page_id: pageId,
            };
            if (igAccountId) storySpec.instagram_actor_id = igAccountId;
            storySpec.link_data = {
                image_hash: img.hash,
                message: text,
                link: 'https://www.instagram.com/a_varanda_itamaraju/',
                call_to_action: { type: 'LEARN_MORE' },
            };

            const creative = await graphPost(`${accountId}/adcreatives`, token, {
                name: `Creative — ${img.name}`,
                object_story_spec: storySpec,
            });
            console.log(`  ✓ Creative: ${img.name} (${creative.id})`);

            // Create ad
            const ad = await graphPost(`${accountId}/ads`, token, {
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

    if (adsCreated === 0) {
        console.log('\nNenhum anúncio criado. Revise os erros.');
        await db.$disconnect();
        return;
    }

    // Activate
    console.log(`\n--- Ativando (${adsCreated} ads) ---`);
    try {
        await graphPost(adSetId, token, { status: 'ACTIVE' });
        console.log('  ✓ Ad Set ATIVO');
    } catch (e) {
        console.log(`  ✗ Ad Set: ${e.message}`);
    }
    try {
        await graphPost(campaignId, token, { status: 'ACTIVE' });
        console.log('  ✓ Campanha ATIVA');
    } catch (e) {
        console.log(`  ✗ Campanha: ${e.message}`);
    }

    console.log('\n=== RESUMO ===');
    console.log(`Campanha ID: ${campaignId}`);
    console.log(`Ad Set ID: ${adSetId}`);
    console.log(`Ads criados: ${adsCreated}`);
    console.log(`Budget: R$ 15/dia`);
    console.log(`Público: Itamaraju 15km, 28-60 anos`);

    await db.$disconnect();
}

main().catch(console.error);
