
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const ideas = await prisma.content.findMany({
        where: { status: 'idea' },
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    console.log(JSON.stringify(ideas, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
