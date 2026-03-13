const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const BASE = 'https://graph.facebook.com/v25.0';

async function main() {
    const acc = await db.account.findFirst({ where: { ads_token: { not: null } } });
    const token = acc.ads_token;
    const accountId = acc.ads_account_id;

    // 1. Debug token
    console.log('=== TOKEN DEBUG ===');
    const debugRes = await fetch(`${BASE}/debug_token?input_token=${token}&access_token=${token}`);
    const debug = await debugRes.json();
    if (debug.data) {
        console.log('Type:', debug.data.type);
        console.log('App ID:', debug.data.app_id);
        console.log('User ID:', debug.data.user_id);
        console.log('Scopes:', debug.data.scopes?.join(', '));
        console.log('Expires:', debug.data.expires_at ? new Date(debug.data.expires_at * 1000).toISOString() : 'never');
    } else {
        console.log('Debug response:', JSON.stringify(debug));
    }

    // 2. Try different ways to get page
    console.log('\n=== PAGE SEARCH ===');

    // Via ad account connected pages
    const endpoints = [
        `${accountId}/promote_pages?fields=id,name`,
        `me/accounts?fields=id,name`,
        `me?fields=id,name`,
        `${accountId}?fields=id,name,business{id,name}`,
    ];

    for (const ep of endpoints) {
        try {
            const res = await fetch(`${BASE}/${ep}&access_token=${token}`);
            const data = await res.json();
            console.log(`\n${ep}:`);
            console.log(JSON.stringify(data, null, 2).substring(0, 500));
        } catch (e) {
            console.log(`${ep}: ${e.message}`);
        }
    }

    // 3. Check existing campaigns for page_id reference
    console.log('\n=== EXISTING ADS FOR PAGE ID ===');
    try {
        const res = await fetch(`${BASE}/${accountId}/ads?fields=creative{object_story_spec}&limit=5&access_token=${token}`);
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2).substring(0, 1000));
    } catch (e) {
        console.log('Error:', e.message);
    }

    // 4. Try to get Instagram account linked to ad account
    console.log('\n=== IG ACCOUNTS ===');
    try {
        const res = await fetch(`${BASE}/${accountId}/instagram_accounts?fields=id,username&access_token=${token}`);
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.log('Error:', e.message);
    }

    await db.$disconnect();
}

main().catch(console.error);
