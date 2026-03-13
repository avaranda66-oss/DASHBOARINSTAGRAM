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
    return res.json();
}

async function main() {
    const acc = await db.account.findFirst({ where: { ads_token: { not: null } } });
    const token = acc.ads_token;
    const accountId = acc.ads_account_id;
    const pageId = '764239866781806';
    const igId = '17841439736892152';
    const businessId = '764250710114055';

    // 1. Check the app status
    console.log('=== APP INFO ===');
    const debug = await get(`debug_token?input_token=${token}`, token);
    console.log('App ID:', debug.data?.app_id);
    console.log('Scopes:', debug.data?.scopes?.join(', '));

    // 2. Get app info
    if (debug.data?.app_id) {
        const app = await get(`${debug.data.app_id}?fields=id,name,status,app_type`, token);
        console.log('App:', JSON.stringify(app));
    }

    // 3. Try to connect IG account to ad account
    console.log('\n=== CONNECTING IG TO AD ACCOUNT ===');
    const connectRes = await post(`${accountId}/instagram_accounts`, token, {
        instagram_account: igId,
    });
    console.log('Connect result:', JSON.stringify(connectRes));

    // 4. Try via business
    console.log('\n=== CONNECTING IG VIA BUSINESS ===');
    const bizConnect = await post(`${businessId}/instagram_accounts`, token, {
        ig_user: igId,
        page_id: pageId,
    });
    console.log('Business connect:', JSON.stringify(bizConnect));

    // 5. Check ad account's instagram accounts again
    const ig = await get(`${accountId}/instagram_accounts?fields=id,username`, token);
    console.log('\nAd account IG accounts:', JSON.stringify(ig));

    // 6. Get page access token - maybe we need page token for IG operations
    console.log('\n=== PAGE TOKEN ===');
    const pageInfo = await get(`${pageId}?fields=access_token,name`, token);
    if (pageInfo.access_token) {
        console.log('Page token obtido!');
        
        // 7. Try creating creative with page token
        console.log('\n=== CREATIVE COM PAGE TOKEN ===');
        const creative = await post(`${accountId}/adcreatives`, pageInfo.access_token, {
            name: 'Test Creative - Page Token',
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
        console.log('Creative result:', JSON.stringify(creative));
    } else {
        console.log('Sem page token:', JSON.stringify(pageInfo));
    }

    await db.$disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
