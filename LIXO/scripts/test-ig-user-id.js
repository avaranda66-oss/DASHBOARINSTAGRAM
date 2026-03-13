const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const BASE = 'https://graph.facebook.com/v25.0';

async function main() {
    const acc = await db.account.findFirst({ where: { ads_token: { not: null } } });
    const token = acc.ads_token;
    const accountId = acc.ads_account_id;
    const pageId = '764239866781806';

    // Test with instagram_user_id instead of instagram_actor_id
    console.log('=== TESTANDO instagram_user_id ===');
    
    const igIds = ['17841439736892152', '39617220563'];
    
    for (const igId of igIds) {
        console.log('\nTestando ID:', igId);
        const res = await fetch(BASE + '/' + accountId + '/adcreatives', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test IG User ID',
                object_story_spec: {
                    page_id: pageId,
                    instagram_user_id: igId,
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
            console.log('  FUNCIONA! Creative:', data.id);
            // cleanup
            await fetch(BASE + '/' + data.id, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token: token }) });
            console.log('  Cleanup OK');
        } else {
            console.log('  Erro:', data.error?.message);
            console.log('  Detail:', data.error?.error_user_msg || 'N/A');
        }
    }

    await db.$disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
