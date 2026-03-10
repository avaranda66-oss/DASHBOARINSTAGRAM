const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function repair() {
    const account = await prisma.account.findFirst();
    if (!account) {
        console.error("Nenhuma conta encontrada no banco para usar como alvo.");
        return;
    }

    const targetHandle = account.providerAccountId; // 'avaranda_ita'
    console.log(`Migrando todos os posts órfãos para a conta: ${targetHandle}`);

    const result = await prisma.content.updateMany({
        where: {
            OR: [
                { accountId: null },
                { accountId: { notIn: [account.id, account.providerAccountId] } }
            ]
        },
        data: {
            accountId: targetHandle
        }
    });

    console.log(`Reparado(s): ${result.count} post(s).`);
    await prisma.$disconnect();
}

repair();
