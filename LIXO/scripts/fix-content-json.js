const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

(async () => {
    const all = await db.content.findMany();
    let fixed = 0;
    for (const c of all) {
        const updates = {};

        // Fix hashtags
        if (c.hashtags) {
            try { JSON.parse(c.hashtags); }
            catch {
                const tags = c.hashtags.split(/[,\s]+/).filter(Boolean);
                updates.hashtags = JSON.stringify(tags);
                console.log('Fix hashtags:', c.id, c.title, '->', tags);
            }
        }

        // Fix mediaUrls
        if (c.mediaUrls) {
            try { JSON.parse(c.mediaUrls); }
            catch {
                updates.mediaUrls = JSON.stringify([c.mediaUrls]);
                console.log('Fix mediaUrls:', c.id, c.title);
            }
        }

        if (Object.keys(updates).length > 0) {
            await db.content.update({ where: { id: c.id }, data: updates });
            fixed++;
        }
    }
    console.log('Total records:', all.length, '| Fixed:', fixed);
    await db.$disconnect();
})();
