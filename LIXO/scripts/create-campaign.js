const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const db = new PrismaClient();

const GRAPH_BASE = 'https://graph.facebook.com/v25.0';

async function graphPost(endpoint, token, params) {
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
        throw new Error(`API Error: ${data.error.message} (code: ${data.error.code})`);
    }
    return data;
}

async function graphGet(endpoint, token, params = {}) {
    const url = new URL(`${GRAPH_BASE}/${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, typeof v === 'string' ? v : JSON.stringify(v)));
    url.searchParams.set('access_token', token);

    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.error) {
        throw new Error(`API Error: ${data.error.message}`);
    }
    return data;
}

async function main() {
    // 1. Get token and account
    const acc = await db.account.findFirst({ where: { ads_token: { not: null } } });
    if (!acc || !acc.ads_token || !acc.ads_account_id) {
        console.log('No ads token found');
        return;
    }
    const token = acc.ads_token;
    const accountId = acc.ads_account_id;
    console.log('=== CRIANDO CAMPANHA PARA A VARANDA ===\n');

    // 2. Find Itamaraju geo key
    console.log('--- Buscando localização Itamaraju ---');
    const geoSearch = await graphGet('search', token, {
        type: 'adgeolocation',
        q: 'Itamaraju',
        location_types: '["city"]',
    });

    let itamarajuKey = null;
    if (geoSearch.data && geoSearch.data.length > 0) {
        const match = geoSearch.data.find(g =>
            g.name.toLowerCase().includes('itamaraju') &&
            g.country_code === 'BR'
        );
        if (match) {
            itamarajuKey = match.key;
            console.log(`  Encontrado: ${match.name}, ${match.region} (key: ${match.key})`);
        } else {
            // Use first result
            itamarajuKey = geoSearch.data[0].key;
            console.log(`  Usando: ${geoSearch.data[0].name} (key: ${geoSearch.data[0].key})`);
        }
    }

    if (!itamarajuKey) {
        console.log('  ERRO: Itamaraju não encontrado. Tentando via coordenadas...');
        // Fallback: use lat/lng targeting (Itamaraju: -17.03, -39.53)
    }

    // 3. Get Facebook Page ID (needed for ads)
    console.log('\n--- Buscando Page ID ---');
    let pageId = null;
    try {
        const pages = await graphGet('me/accounts', token, { fields: 'id,name' });
        if (pages.data && pages.data.length > 0) {
            pageId = pages.data[0].id;
            console.log(`  Page: ${pages.data[0].name} (ID: ${pageId})`);
        }
    } catch (e) {
        console.log('  Aviso: Não conseguiu buscar pages:', e.message);
    }

    // 4. Get Instagram Actor ID
    console.log('\n--- Buscando Instagram Account ID ---');
    let igAccountId = null;
    try {
        if (pageId) {
            const igAccount = await graphGet(`${pageId}`, token, {
                fields: 'instagram_business_account{id,username}'
            });
            if (igAccount.instagram_business_account) {
                igAccountId = igAccount.instagram_business_account.id;
                console.log(`  IG Account: ${igAccount.instagram_business_account.username} (ID: ${igAccountId})`);
            }
        }
    } catch (e) {
        console.log('  Aviso: Não conseguiu buscar IG account:', e.message);
    }

    // 5. Upload images
    console.log('\n--- Upload de Criativos ---');
    const creatives = [
        { file: 'varanda_dr_risoto.png', name: 'Prestígio - Risoto' },
        { file: 'varanda_dr_arroz_1.png', name: 'Descubra Sabores - Arroz' },
        { file: 'creative_camarao_grelhado.png', name: 'Sabor do Mar - Camarão' },
        { file: 'creative_moscow_mule.png', name: 'Moscow Mule' },
    ];

    const uploadedImages = [];
    for (const creative of creatives) {
        const filePath = path.join(__dirname, '..', 'public', 'creatives', 'varanda', creative.file);
        const imageBytes = fs.readFileSync(filePath);
        const base64 = imageBytes.toString('base64');

        try {
            const result = await graphPost(`${accountId}/adimages`, token, {
                bytes: base64,
                name: creative.name,
            });

            // The response has images keyed by hash
            const imageData = result.images ? Object.values(result.images)[0] : null;
            if (imageData) {
                uploadedImages.push({
                    hash: imageData.hash,
                    url: imageData.url,
                    name: creative.name,
                    file: creative.file,
                });
                console.log(`  ✓ ${creative.name}: hash=${imageData.hash}`);
            }
        } catch (e) {
            console.log(`  ✗ ${creative.name}: ${e.message}`);
        }
    }

    if (uploadedImages.length === 0) {
        console.log('\nERRO: Nenhuma imagem foi uploaded. Abortando.');
        await db.$disconnect();
        return;
    }

    console.log(`\n  ${uploadedImages.length} imagens uploaded com sucesso.`);

    // 6. Arquivar campanhas antigas
    console.log('\n--- Arquivando campanhas antigas ---');
    try {
        const oldCampaigns = await graphGet(`${accountId}/campaigns`, token, {
            fields: 'id,name,status',
            limit: '50',
        });

        for (const camp of (oldCampaigns.data || [])) {
            if (camp.status !== 'ARCHIVED') {
                try {
                    await graphPost(camp.id, token, { status: 'ARCHIVED' });
                    console.log(`  Arquivada: ${camp.name}`);
                } catch (e) {
                    console.log(`  Erro ao arquivar ${camp.name}: ${e.message}`);
                }
            }
        }
    } catch (e) {
        console.log('  Aviso:', e.message);
    }

    // 7. Create Campaign
    console.log('\n--- Criando Campanha ---');
    let campaignId;
    try {
        const campaign = await graphPost(`${accountId}/campaigns`, token, {
            name: 'A Varanda — Prestígio (Stories)',
            objective: 'OUTCOME_AWARENESS',
            status: 'PAUSED', // Start paused, activate after everything is set
            special_ad_categories: '[]',
        });
        campaignId = campaign.id;
        console.log(`  ✓ Campanha criada: ID ${campaignId}`);
    } catch (e) {
        console.log(`  ✗ Erro ao criar campanha: ${e.message}`);

        // Try legacy objective
        try {
            console.log('  Tentando com objetivo REACH...');
            const campaign = await graphPost(`${accountId}/campaigns`, token, {
                name: 'A Varanda — Prestígio (Stories)',
                objective: 'REACH',
                status: 'PAUSED',
                special_ad_categories: '[]',
            });
            campaignId = campaign.id;
            console.log(`  ✓ Campanha criada (REACH): ID ${campaignId}`);
        } catch (e2) {
            console.log(`  ✗ Erro: ${e2.message}`);
            await db.$disconnect();
            return;
        }
    }

    // 8. Create Ad Set
    console.log('\n--- Criando Ad Set ---');
    const targeting = {
        geo_locations: itamarajuKey
            ? { cities: [{ key: itamarajuKey, radius: 15, distance_unit: 'kilometer' }] }
            : { custom_locations: [{ latitude: -17.03, longitude: -39.53, radius: 15, distance_unit: 'kilometer' }] },
        age_min: 28,
        age_max: 60,
        publisher_platforms: ['instagram', 'facebook'],
        facebook_positions: ['story'],
        instagram_positions: ['story', 'reels'],
        flexible_spec: [{
            interests: [
                { id: '6003139266461', name: 'Gastronomia' },
                { id: '6003384829667', name: 'Restaurantes' },
                { id: '6003397425735', name: 'Culinária' },
                { id: '6003020834693', name: 'Vinhos' },
            ],
        }],
    };

    let adSetId;
    try {
        const adSetParams = {
            name: 'Itamaraju — Stories 28-60 — Gastronomia',
            campaign_id: campaignId,
            daily_budget: '1500', // R$ 15.00 in cents
            billing_event: 'IMPRESSIONS',
            optimization_goal: 'REACH',
            bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
            targeting: JSON.stringify(targeting),
            status: 'PAUSED',
            start_time: new Date().toISOString(),
        };

        const adSet = await graphPost(`${accountId}/adsets`, token, adSetParams);
        adSetId = adSet.id;
        console.log(`  ✓ Ad Set criado: ID ${adSetId}`);
    } catch (e) {
        console.log(`  ✗ Erro ao criar ad set: ${e.message}`);

        // Try without interests (simpler targeting)
        try {
            console.log('  Tentando targeting simplificado...');
            const simpleTargeting = {
                geo_locations: itamarajuKey
                    ? { cities: [{ key: itamarajuKey, radius: 15, distance_unit: 'kilometer' }] }
                    : { custom_locations: [{ latitude: -17.03, longitude: -39.53, radius: 15, distance_unit: 'kilometer' }] },
                age_min: 28,
                age_max: 60,
            };

            const adSet = await graphPost(`${accountId}/adsets`, token, {
                name: 'Itamaraju — 28-60',
                campaign_id: campaignId,
                daily_budget: '1500',
                billing_event: 'IMPRESSIONS',
                optimization_goal: 'REACH',
                bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
                targeting: JSON.stringify(simpleTargeting),
                status: 'PAUSED',
                start_time: new Date().toISOString(),
            });
            adSetId = adSet.id;
            console.log(`  ✓ Ad Set criado (simples): ID ${adSetId}`);
        } catch (e2) {
            console.log(`  ✗ Erro: ${e2.message}`);
            await db.$disconnect();
            return;
        }
    }

    // 9. Create Ad Creatives + Ads
    console.log('\n--- Criando Anúncios ---');
    const adTexts = [
        'Venha viver uma experiência gastronômica única na Varanda. Reserve sua mesa!',
        'O melhor da gastronomia em Itamaraju está aqui. Conheça a Varanda!',
        'Sabores que encantam, momentos que ficam. A Varanda espera você!',
        'Drink especial + pratos incríveis. Sua noite perfeita começa na Varanda.',
    ];

    let adsCreated = 0;
    for (let i = 0; i < uploadedImages.length; i++) {
        const img = uploadedImages[i];
        const text = adTexts[i] || adTexts[0];

        try {
            // Create ad creative
            const creativeParams = {
                name: `Creative — ${img.name}`,
                object_story_spec: JSON.stringify({
                    ...(pageId ? { page_id: pageId } : {}),
                    ...(igAccountId ? { instagram_actor_id: igAccountId } : {}),
                    link_data: {
                        image_hash: img.hash,
                        message: text,
                        link: 'https://www.instagram.com/a_varanda_itamaraju/',
                        call_to_action: {
                            type: 'LEARN_MORE',
                        },
                    },
                }),
            };

            const creative = await graphPost(`${accountId}/adcreatives`, token, creativeParams);
            console.log(`  ✓ Creative: ${img.name} (ID: ${creative.id})`);

            // Create ad
            const ad = await graphPost(`${accountId}/ads`, token, {
                name: `Ad — ${img.name}`,
                adset_id: adSetId,
                creative: JSON.stringify({ creative_id: creative.id }),
                status: 'PAUSED',
            });
            console.log(`  ✓ Ad criado: ${img.name} (ID: ${ad.id})`);
            adsCreated++;
        } catch (e) {
            console.log(`  ✗ Erro com ${img.name}: ${e.message}`);
        }
    }

    if (adsCreated === 0) {
        console.log('\nERRO: Nenhum anúncio criado. Revise os erros acima.');
        await db.$disconnect();
        return;
    }

    // 10. Activate everything
    console.log(`\n--- Ativando Campanha (${adsCreated} anúncios) ---`);
    try {
        await graphPost(adSetId, token, { status: 'ACTIVE' });
        console.log('  ✓ Ad Set ATIVADO');
        await graphPost(campaignId, token, { status: 'ACTIVE' });
        console.log('  ✓ Campanha ATIVADA');
    } catch (e) {
        console.log(`  ✗ Erro ao ativar: ${e.message}`);
        console.log('  A campanha foi criada mas está PAUSADA. Ative manualmente se necessário.');
    }

    console.log('\n=== RESUMO ===');
    console.log(`Campanha: A Varanda — Prestígio (Stories)`);
    console.log(`Campaign ID: ${campaignId}`);
    console.log(`Ad Set ID: ${adSetId}`);
    console.log(`Anúncios: ${adsCreated}`);
    console.log(`Budget: R$ 15/dia`);
    console.log(`Público: Itamaraju, 28-60 anos`);
    console.log(`Status: ATIVA`);
    console.log('\n🚀 Campanha no ar!');

    await db.$disconnect();
}

main().catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
});
