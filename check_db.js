const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const posts = await prisma.content.findMany({
        where: {
            status: 'scheduled'
        }
    });

    if (posts.length === 0) {
        console.log("Nenhum post agendado encontrado.");
    } else {
        posts.forEach(p => {
            console.log(`ID: ${p.id}, Title: ${p.title}, Status: ${p.status}, ScheduledAt: ${p.scheduledAt.toLocaleString()}`);
        });
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
