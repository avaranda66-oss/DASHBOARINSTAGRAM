const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
    // Find records with uppercase status
    const all = await db.content.findMany();
    let fixed = 0;
    for (const c of all) {
        if (c.status !== c.status.toLowerCase()) {
            await db.content.update({
                where: { id: c.id },
                data: { status: c.status.toLowerCase() },
            });
            console.log('Fixed:', c.title, '| was:', c.status, '-> now:', c.status.toLowerCase());
            fixed++;
        }
    }
    console.log('Fixed', fixed, 'records');
    await db.$disconnect();
})();
