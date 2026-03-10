const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPending() {
    try {
        const pendingPosts = await prisma.content.findMany({
            where: { status: 'scheduled' }
        });

        console.log(`Found ${pendingPosts.length} scheduled posts.`);
        for (const p of pendingPosts) {
            console.log(`\n--- Post ID: ${p.id} ---`);
            console.log(`Title: ${p.title}`);
            console.log(`Status: ${p.status}`);
            console.log(`ScheduledAt: ${p.scheduledAt}`);
            console.log(`Raw MediaUrls: ${p.mediaUrls}`);
            console.log(`Type: ${p.type}`);
        }
    } catch (e) {
        console.error("Error checking DB:", e);
    } finally {
        await prisma.$disconnect();
    }
}
checkPending();
