const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        console.log("Checking accounts in DB...");
        const accounts = await prisma.account.findMany();
        console.log("Accounts found:", accounts.length);

        for (const acc of accounts) {
            console.log(`- Handle: ${acc.providerAccountId}, Username: ${acc.username}, Has Password: ${!!acc.password}, Password Length: ${acc.password ? acc.password.length : 0}`);
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
