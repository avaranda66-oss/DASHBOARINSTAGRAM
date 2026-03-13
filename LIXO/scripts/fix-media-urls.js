
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- FIXING MEDIA URLS FOR RECENT IDEAS ---');
    
    // Find recent ideas that have the absolute path in mediaUrls
    const ideas = await prisma.content.findMany({
        where: {
            status: 'idea',
            mediaUrls: {
                contains: 'antigravity/brain'
            }
        }
    });

    console.log(`Found ${ideas.length} ideas to fix.`);

    for (const idea of ideas) {
        try {
            const oldUrls = JSON.parse(idea.mediaUrls);
            const newUrls = oldUrls.map(url => {
                // Extract filename from the absolute path
                const parts = url.split('/');
                const filename = parts[parts.length - 1];
                return '/uploads/' + filename;
            });
            
            await prisma.content.update({
                where: { id: idea.id },
                data: { mediaUrls: JSON.stringify(newUrls) }
            });
            console.log(`✅ Fixed: ${idea.title}`);
        } catch (e) {
            console.error(`❌ Error fixing ${idea.title}:`, e.message);
        }
    }
    console.log('--- END ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
