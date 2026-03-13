const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const BASE = 'https://graph.facebook.com/v25.0';

async function get(endpoint, token) {
    const sep = endpoint.includes('?') ? '&' : '?';
    const res = await fetch(`${BASE}/${endpoint}${sep}access_token=${token}`);
    return res.json();
}

async function main() {
    const acc = await db.account.findFirst({ where: { ads_token: { not: null } } });
    const token = acc.ads_token;
    const accountId = acc.ads_account_id;
    const pageId = '764239866781806';

    // 1. List all IG accounts on ad account with full details
    console.log('=== IG ACCOUNTS ON AD ACCOUNT ===');
    const ig1 = await get(`${accountId}/instagram_accounts?fields=id,username,ig_id,profile_pic`, token);
    console.log(JSON.stringify(ig1, null, 2));

    // 2. Check connected_instagram_accounts on page
    console.log('\n=== PAGE CONNECTED IG ===');
    const ig2 = await get(`${pageId}?fields=instagram_business_account{id,username,ig_id},connected_instagram_account{id,username,ig_id}`, token);
    console.log(JSON.stringify(ig2, null, 2));

    // 3. Try with ig_id instead of graph ID
    console.log('\n=== AD ACCOUNT INSTAGRAM_ACCOUNTS FULL ===');
    const ig3 = await get(`${accountId}/instagram_accounts?fields=id,username,ig_id,has_profile_picture,profile_pic`, token);
    for (const a of (ig3.data || [])) {
        console.log(`  ID: ${a.id}, ig_id: ${a.ig_id}, username: ${a.username}`);
    }

    // 4. Check promote_pages
    console.log('\n=== PROMOTE PAGES ===');
    const pp = await get(`${accountId}/promote_pages?fields=id,name,instagram_business_account{id,username}`, token);
    console.log(JSON.stringify(pp, null, 2));

    // 5. Try creating creative with different IG IDs
    const igIds = [];
    if (ig1.data) ig1.data.forEach(a => { igIds.push(a.id); if (a.ig_id) igIds.push(String(a.ig_id)); });
    if (ig2.instagram_business_account) igIds.push(ig2.instagram_business_account.id);
    if (ig2.connected_instagram_account) igIds.push(ig2.connected_instagram_account.id);
    
    const unique = [...new Set(igIds)];
    console.log('\n=== TESTANDO CADA IG ID ===');
    console.log('Candidatos:', unique);

    for (const id of unique) {
        console.log(`\nTestando ${id}...`);
        const res = await fetch(`${BASE}/${accountId}/adcreatives`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test',
                object_story_spec: {
                    page_id: pageId,
                    instagram_actor_id: id,
                    link_data: {
                        image_hash: '356e7157fb053f0af90256f358ed35d1',
                        message: 'Test',
                        link: 'https://www.instagram.com/a_varanda_itamaraju/',
                        call_to_action: { type: 'LEARN_MORE' },
                    },
                },
                access_token: token,
            }),
        });
        const data = await res.json();
        if (data.id) {
            console.log(`  FUNCIONA! Creative: ${data.id}`);
            // cleanup
            await fetch(`${BASE}/${data.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token: token }) });
        } else {
            console.log(`  Falhou: ${data.error?.message?.substring(0, 100)}`);
        }
    }

    await db.$disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
