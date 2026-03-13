const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const db = new PrismaClient();
const BASE = 'https://graph.facebook.com/v25.0';

async function post(endpoint, token, body) {
    const res = await fetch(BASE + '/' + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, access_token: token }),
    });
    const data = await res.json();
    if (data.error) {
        console.log('  ERR:', JSON.stringify(data.error, null, 2));
        throw new Error(data.error.message);
    }
    return data;
}

async function uploadImage(accountId, token, filePath, name) {
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'image/png' });

    const formData = new FormData();
    formData.append('access_token', token);
    formData.append('filename', name);
    formData.append('source', blob, name);

    const res = await fetch(BASE + '/' + accountId + '/adimages', {
        method: 'POST',
        body: formData,
    });
    const data = await res.json();
    if (data.error) {
        console.log('  Upload ERR:', JSON.stringify(data.error, null, 2));
        throw new Error(data.error.message);
    }
    // Extract hash from response
    const images = data.images || {};
    const key = Object.keys(images)[0];
    return images[key].hash;
}

async function main() {
    const acc = await db.account.findFirst({ where: { ads_token: { not: null } } });
    const token = acc.ads_token;
    const accountId = acc.ads_account_id;
    const pageId = '764239866781806';
    const igUserId = '17841439736892152';
    const campaignId = '120241416199550412'; // Campanha existente

    const creativesDir = path.join(__dirname, '..', 'public', 'creatives', 'varanda');

    // === 1. UPLOAD DAS 3 IMAGENS ===
    console.log('=== UPLOAD DAS 3 IMAGENS DO MOSCOW MULE ===');
    const slides = [
        { file: 'moscow_mule_1.png', headline: 'O Ritual Começa Aqui', desc: 'Moscow Mule artesanal na icônica caneca de cobre' },
        { file: 'moscow_mule_2.png', headline: 'Momentos que se Tornam Memórias', desc: 'Cada gole é uma experiência única' },
        { file: 'moscow_mule_3.png', headline: 'Sabor em sua Forma Mais Pura', desc: 'Frescor e sofisticação em cada detalhe' },
    ];

    for (const slide of slides) {
        const filePath = path.join(creativesDir, slide.file);
        console.log('  Uploading:', slide.file);
        slide.hash = await uploadImage(accountId, token, filePath, slide.file);
        console.log('  Hash:', slide.hash);
    }

    // === 2. CRIAR AD SET PRÓPRIO (R$ 20/dia) ===
    console.log('\n=== CRIANDO AD SET — R$ 20/dia ===');
    const adSet = await post(accountId + '/adsets', token, {
        name: 'Moscow Mule Carousel — R$20/dia — Itamaraju 28-60',
        campaign_id: campaignId,
        daily_budget: 2000, // R$ 20,00 em centavos
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'REACH',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: {
            geo_locations: { cities: [{ key: '255700' }] },
            age_min: 28,
            age_max: 60,
            publisher_platforms: ['facebook', 'instagram'],
            facebook_positions: ['feed', 'story'],
            instagram_positions: ['stream', 'story', 'reels'],
            targeting_automation: { advantage_audience: 0 },
        },
        start_time: new Date().toISOString(),
        status: 'ACTIVE',
    });
    console.log('  Ad Set ID:', adSet.id);

    // === 3. CRIAR CAROUSEL CREATIVE ===
    console.log('\n=== CRIANDO CAROUSEL CREATIVE ===');
    const childAttachments = slides.map(slide => ({
        image_hash: slide.hash,
        name: slide.headline,
        description: slide.desc,
        link: 'https://www.instagram.com/a_varanda_itamaraju/',
        call_to_action: { type: 'LEARN_MORE' },
    }));

    const creative = await post(accountId + '/adcreatives', token, {
        name: 'Carousel - O Ritual do Moscow Mule',
        object_story_spec: {
            page_id: pageId,
            instagram_user_id: igUserId,
            link_data: {
                message: 'O Ritual do Moscow Mule na Varanda. Drink especial + pratos incríveis. Sua noite perfeita começa aqui! 🥂',
                link: 'https://www.instagram.com/a_varanda_itamaraju/',
                child_attachments: childAttachments,
                multi_share_optimized: false, // Manter ordem das imagens
            },
        },
    });
    console.log('  Creative ID:', creative.id);

    // === 4. CRIAR AD ===
    console.log('\n=== CRIANDO AD ===');
    const ad = await post(accountId + '/ads', token, {
        name: 'Ad - Moscow Mule Carousel',
        adset_id: adSet.id,
        creative: { creative_id: creative.id },
        status: 'ACTIVE',
    });
    console.log('  Ad ID:', ad.id);

    // === RESUMO ===
    console.log('\n========================================');
    console.log('  CAROUSEL MOSCOW MULE ATIVO!');
    console.log('  Ad Set: ' + adSet.id + ' (R$ 20/dia)');
    console.log('  Creative: ' + creative.id);
    console.log('  Ad: ' + ad.id);
    console.log('  Slides: 3 imagens em sequência');
    console.log('  Target: Itamaraju, 28-60 anos');
    console.log('  Placements: FB + IG (Feed, Stories, Reels)');
    console.log('  Instagram: @avaranda_ita');
    console.log('========================================');

    await db.$disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
