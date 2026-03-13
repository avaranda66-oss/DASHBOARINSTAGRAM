const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const BASE = 'https://graph.facebook.com/v25.0';

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
    const acc = await db.account.findFirst({ where: { ads_token: { not: null } } });
    const token = acc.ads_token;
    const accountId = acc.ads_account_id;
    const adSetId = '120241415418150412';
    const campaignId = '120241415417830412';
    const pageId = '764239866781806';
    const igId = '17841439736892152';
    const businessId = '764250710114055';

    // Try to connect IG to ad account via business
    console.log('=== CONECTANDO IG AO AD ACCOUNT ===');
    
    // Method 1: via ad account
    console.log('\n1. Via ad account instagram_accounts...');
    const r1 = await fetch(`${BASE}/${accountId}/instagram_accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instagram_account: igId, access_token: token }),
    });
    console.log('  Result:', JSON.stringify(await r1.json()));

    // Method 2: via business owned_instagram_accounts
    console.log('\n2. Via business claim...');
    const r2 = await fetch(`${BASE}/${businessId}/owned_instagram_accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ig_user: igId, access_token: token }),
    });
    console.log('  Result:', JSON.stringify(await r2.json()));

    // Method 3: via business instagram_accounts  
    console.log('\n3. Via business instagram_accounts...');
    const r3 = await fetch(`${BASE}/${businessId}/instagram_accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ig_user: igId, page_id: pageId, access_token: token }),
    });
    console.log('  Result:', JSON.stringify(await r3.json()));

    // Check if connected now
    const igAcct = await get(`${accountId}/instagram_accounts?fields=id,username`, token);
    console.log('\nAd Account IGs agora:', JSON.stringify(igAcct));

    // Try creating WITHOUT instagram_actor_id
    console.log('\n=== TENTANDO SEM INSTAGRAM_ACTOR_ID ===');
    try {
        const creative = await post(`${accountId}/adcreatives`, token, {
            name: 'Creative — Prestígio - Risoto',
            object_story_spec: {
                page_id: pageId,
                link_data: {
                    image_hash: '356e7157fb053f0af90256f358ed35d1',
                    message: 'Venha viver uma experiência gastronômica única. A Varanda Itamaraju espera você!',
                    link: 'https://www.instagram.com/a_varanda_itamaraju/',
                    call_to_action: { type: 'LEARN_MORE' },
                },
            },
        });
        console.log('  FUNCIONOU sem IG! Creative:', creative.id);
        
        // Create all ads without IG actor
        const images = [
            { hash: '55d46f440fb0a6a5833b05e8f8cc1636', name: 'Descubra Sabores', text: 'Descubra sabores que encantam. Reserve sua mesa na Varanda!' },
            { hash: '1a193f285ce9caa477adbb5a793ce3b4', name: 'Sabor do Mar', text: 'Fresco e inesquecível — o melhor da gastronomia em Itamaraju.' },
            { hash: 'a8e756a69503711553624cf0935f8044', name: 'Moscow Mule', text: 'Drink especial + pratos incríveis. Sua noite começa na Varanda!' },
        ];

        // First ad
        const ad1 = await post(`${accountId}/ads`, token, {
            name: 'Ad — Prestígio - Risoto',
            adset_id: adSetId,
            creative: { creative_id: creative.id },
            status: 'PAUSED',
        });
        console.log('  Ad: Prestígio - Risoto (' + ad1.id + ')');
        let adsCreated = 1;

        for (const img of images) {
            try {
                const c = await post(`${accountId}/adcreatives`, token, {
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
                const ad = await post(`${accountId}/ads`, token, {
                    name: `Ad — ${img.name}`,
                    adset_id: adSetId,
                    creative: { creative_id: c.id },
                    status: 'PAUSED',
                });
                console.log(`  Ad: ${img.name} (${ad.id})`);
                adsCreated++;
            } catch (e) {
                console.log(`  FALHOU ${img.name}`);
            }
        }

        // Activate
        console.log(`\n=== ATIVANDO ${adsCreated} ADS ===`);
        await post(adSetId, token, { status: 'ACTIVE' });
        console.log('  Ad Set ATIVO');
        await post(campaignId, token, { status: 'ACTIVE' });
        console.log('  Campanha ATIVA');

        console.log('\n=== CAMPANHA NO AR! ===');
        console.log(`Ads: ${adsCreated}`);
        console.log('Budget: R$ 15/dia');
        
    } catch (e) {
        console.log('  Sem IG tambem falhou:', e.message);
        
        // Last resort: try with IG ID again (maybe connect worked)
        const igAcct2 = await get(`${accountId}/instagram_accounts?fields=id,username`, token);
        if (igAcct2.data && igAcct2.data.length > 0) {
            console.log('\n  IG conectado agora! Tentando com IG ID:', igAcct2.data[0].id);
        }
    }

    await db.$disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
