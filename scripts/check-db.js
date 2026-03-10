const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPending() {
    const now = new Date();
    const pending = await prisma.content.findMany({
        where: {
            status: 'scheduled',
            scheduledAt: { lte: now }
        }
    });

    console.log(`Pendente(s): ${pending.length}`);
    for (const p of pending) {
        console.log(`- ID: ${p.id}, Title: ${p.title}, AccountRef: ${p.accountId}`);
        const account = await prisma.account.findUnique({
            where: { providerAccountId: p.accountId || "" }
        }) || await prisma.account.findFirst({
            where: { id: p.accountId || "" }
        });

        if (account) {
            console.log(`  -> Conta Encontrada: ${account.username}, ID: ${account.id}, ProviderID: ${account.providerAccountId}, TemSenha: ${!!account.password}`);
        } else {
            console.log(`  -> !!! CONTA NÃO ENCONTRADA !!!`);
        }
    }
    await prisma.$disconnect();
}

checkPending();
