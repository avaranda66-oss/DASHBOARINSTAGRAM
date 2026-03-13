const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const BASE = 'https://graph.facebook.com/v25.0';

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
    const adSetId = '120241414391830412';
    const pageId = '764239866781806';

    // Approach 1: Use effective_instagram_media_id instead of instagram_actor_id
    console.log('=== Approach 1: image_url creative ===');
    const r1 = await post(`${accountId}/adcreatives`, token, {
        name: 'Test - Image URL',
        object_story_spec: {
            page_id: pageId,
            link_data: {
                image_hash: '356e7157fb053f0af90256f358ed35d1',
                message: 'Test mensagem',
                link: 'https://www.instagram.com/a_varanda_itamaraju/',
                call_to_action: { type: 'LEARN_MORE' },
            },
        },
    });
    console.log('Result 1:', JSON.stringify(r1, null, 2));

    // Approach 2: Use asset_feed_spec
    console.log('\n=== Approach 2: image_hash directly ===');
    const r2 = await post(`${accountId}/adcreatives`, token, {
        name: 'Test - Direct Image',
        image_hash: '356e7157fb053f0af90256f358ed35d1',
        object_story_spec: {
            page_id: pageId,
            link_data: {
                image_hash: '356e7157fb053f0af90256f358ed35d1',
                link: 'https://www.instagram.com/a_varanda_itamaraju/',
                message: 'Venha viver uma experiência gastronômica única.',
            },
        },
    });
    console.log('Result 2:', JSON.stringify(r2, null, 2));

    // Approach 3: Use effective_object_story_id from existing posts
    console.log('\n=== Approach 3: Check existing page posts ===');
    const postsRes = await fetch(`${BASE}/${pageId}/published_posts?fields=id,message,full_picture&limit=5&access_token=${token}`);
    const posts = await postsRes.json();
    console.log('Page posts:', JSON.stringify(posts, null, 2));

    // Approach 4: photo_data instead of link_data
    console.log('\n=== Approach 4: photo_data ===');
    const r4 = await post(`${accountId}/adcreatives`, token, {
        name: 'Test - Photo Data',
        object_story_spec: {
            page_id: pageId,
            photo_data: {
                image_hash: '356e7157fb053f0af90256f358ed35d1',
                message: 'Venha viver uma experiência gastronômica única.',
            },
        },
    });
    console.log('Result 4:', JSON.stringify(r4, null, 2));

    await db.$disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
