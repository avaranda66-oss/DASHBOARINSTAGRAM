const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    await prisma.content.update({
        where: { id: 'cmmje29kp000qq8x2e3mh25qp' },
        data: { mediaUrls: '["/uploads/chef_tarcila_hybrid_masterpiece.png"]' }
    });
    console.log('DB Fixed properly');
}

fix()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
