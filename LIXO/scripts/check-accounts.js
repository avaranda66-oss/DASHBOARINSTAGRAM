const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
    const accs = await db.account.findMany();
    for (const a of accs) {
        console.log('Account:', a.id, '| ads_account_id:', a.ads_account_id, '| has token:', a.ads_token ? 'YES (' + a.ads_token.substring(0,20) + '...)' : 'NO');
    }
    await db.$disconnect();
})();
