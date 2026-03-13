
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const ideas = await prisma.content.findMany({
        where: { status: 'idea' },
        orderBy: { createdAt: 'desc' },
        take: 12
    });
    
    console.log('--- VERIFYING IDEA MEDIA URLS ---');
    ideas.forEach(idea => {
        console.log(`Title: ${idea.title}`);
        console.log(`MediaUrls: ${idea.mediaUrls}`);
        console.log('---');
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
