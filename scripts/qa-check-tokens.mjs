import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const accounts = await prisma.account.findMany({
  select: { id: true, name: true, ads_account_id: true, access_token: true, ads_token: true }
});
await prisma.$disconnect();

for (const a of accounts) {
  console.log(JSON.stringify({
    name: a.name,
    ads_account_id: a.ads_account_id,
    access_token_preview: a.access_token ? a.access_token.substring(0, 12) + '...' : null,
    ads_token_preview: a.ads_token ? a.ads_token.substring(0, 12) + '...' : null,
    access_token_prefix: a.access_token ? a.access_token.substring(0, 4) : null,
    ads_token_prefix: a.ads_token ? a.ads_token.substring(0, 4) : null,
  }));
}
