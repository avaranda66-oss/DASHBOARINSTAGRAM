const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const GRAPH = 'https://graph.facebook.com/v25.0';

(async () => {
    const acc = await db.account.findFirst({ where: { ads_token: { not: null } } });
    const token = acc.ads_token;
    const accountId = acc.ads_account_id;
    console.log('Using account:', accountId);

    const res = await fetch(`${GRAPH}/${accountId}/campaigns?fields=id,name,status,effective_status&access_token=${token}`);
    const json = await res.json();
    if (json.error) { console.error('Error:', json.error.message); return; }

    console.log('\nCampaigns:');
    for (const c of json.data) {
        console.log(`  ${c.id} | ${c.name} | ${c.effective_status}`);
    }
    await db.$disconnect();
})();
