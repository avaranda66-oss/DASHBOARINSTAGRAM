const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
    const all = await db.content.findMany({ select: { id: true, title: true, status: true, mediaUrls: true } });
    for (const c of all) {
        console.log(`[${c.status}] ${c.title} | media: ${(c.mediaUrls || '').substring(0, 80)}`);
    }
    console.log('\nTotal:', all.length);
    await db.$disconnect();
})();
