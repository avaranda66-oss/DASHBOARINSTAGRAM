const { exec } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        console.log("Fetching avaranda_ita from DB...");
        const account = await prisma.account.findUnique({ where: { providerAccountId: 'avaranda_ita' } });
        if (!account) {
            console.log("Account not found");
            return;
        }

        const handle = account.providerAccountId;
        const password = account.password;

        console.log(`Password length: ${password ? password.length : 0}`);

        const command = `node scripts/playwright-login.js ${handle.replace('@', '')} "${password}"`;
        console.log("Executing command:", command);

        exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
            console.log("EXEC COMPLETE.");
            if (error) console.error("Error:", error);
            if (stdout) console.log("STDOUT:", stdout);
            if (stderr) console.error("STDERR:", stderr);
        });

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
