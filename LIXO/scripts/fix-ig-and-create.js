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
        console.log('  ERR:', JSON.stringify(data.error).substring(0, 300));
        throw new Error(data.error.message);
    }
    return data;
}

async function main() {
    const acc = await db.account.findFirst({ where: { ads_token: { not: null } } });
    const token = acc.ads_token;
    const accountId = acc.ads_account_id;
    const adSetId = '120241414391830412';
    const campaignId = '120241414340580412';
    const pageId = '764239866781806';

    // Find valid IG account
    console.log('=== BUSCANDO IG ACCOUNT VÁLIDO ===');
    
    // Method 1: Via ad account instagram_accounts
    const ig1 = await get(`${accountId}/instagram_accounts?fields=id,username`, token);
    console.log('Via ad account:', JSON.stringify(ig1));
    
    // Method 2: Via page
    const ig2 = await get(`${pageId}?fields=instagram_business_account{id,username},connected_instagram_account`, token);
    console.log('Via page:', JSON.stringify(ig2));
    
    // Method 3: Via promote pages
    const ig3 = await get(`${accountId}/promote_pages?fields=id,name,instagram_business_account{id,username}`, token);
    console.log('Via promote_pages:', JSON.stringify(ig3));

    // Method 4: Try without IG actor (Facebook only)
    console.log('\n=== TENTANDO SEM IG ACTOR ===');
    try {
        const creative = await post(`${accountId}/adcreatives`, token, {
            name: 'Test Creative - No IG',
            object_story_spec: {
                page_id: pageId,
                link_data: {
                    image_hash: '356e7157fb053f0af90256f358ed35d1',
                    message: 'Test',
                    link: 'https://www.instagram.com/a_varanda_itamaraju/',
                    call_to_action: { type: 'LEARN_MORE' },
                },
            },
        });
        console.log('  Creative SEM IG funcionou:', creative.id);
        
        // If it works, create all ads without IG actor
        const ad = await post(`${accountId}/ads`, token, {
            name: 'Test Ad',
            adset_id: adSetId,
            creative: { creative_id: creative.id },
            status: 'PAUSED',
        });
        console.log('  Ad:', ad.id);
        
        // Delete test ad
        await post(ad.id, token, { status: 'DELETED' });
        await post(creative.id, token, { status: 'DELETED' });
        console.log('  Test cleanup OK');
    } catch (e) {
        console.log('  Sem IG tambem falhou');
    }

    // Try each IG ID found
    let validIgId = null;
    const candidates = [];
    
    if (ig1.data) for (const a of ig1.data) candidates.push(a.id);
    if (ig2.instagram_business_account) candidates.push(ig2.instagram_business_account.id);
    if (ig3.data) for (const p of ig3.data) {
        if (p.instagram_business_account) candidates.push(p.instagram_business_account.id);
    }
    
    // Add the one we had before
    candidates.push('17841439736892152');
    
    // Deduplicate
    const unique = [...new Set(candidates)];
    console.log('\nCandidatos IG:', unique);

    for (const igId of unique) {
        console.log(`\nTestando IG ${igId}...`);
        try {
            const creative = await post(`${accountId}/adcreatives`, token, {
                name: 'Test Creative',
                object_story_spec: {
                    page_id: pageId,
                    instagram_actor_id: igId,
                    link_data: {
                        image_hash: '356e7157fb053f0af90256f358ed35d1',
                        message: 'Test',
                        link: 'https://www.instagram.com/a_varanda_itamaraju/',
                        call_to_action: { type: 'LEARN_MORE' },
                    },
                },
            });
            console.log(`  FUNCIONA com IG ${igId}!`);
            validIgId = igId;
            // Clean up
            try { await post(creative.id, token, { status: 'DELETED' }); } catch(e) {}
            break;
        } catch (e) {}
    }

    console.log(`\nIG válido: ${validIgId || 'NENHUM - usar sem IG'}`);
    await db.$disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
