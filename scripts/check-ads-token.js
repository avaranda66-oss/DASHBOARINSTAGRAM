const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    const acc = await db.account.findFirst({ where: { ads_token: { not: null } } });
    if (acc) {
        console.log('Account:', acc.username, '| ads_account_id:', acc.ads_account_id);
        console.log('Token exists:', Boolean(acc.ads_token));
        console.log('Token length:', acc.ads_token ? acc.ads_token.length : 0);
    } else {
        console.log('No ads token found');
    }
    await db.$disconnect();
}

main().catch(console.error);
