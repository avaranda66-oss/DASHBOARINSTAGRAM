import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    try {
        console.log('--- START ---');
        const accounts = await prisma.account.findMany();
        console.log('Accounts found:', accounts.length);
        
        const account = accounts.find(a => a.providerAccountId.includes('avaranda') || (a as any).handle?.includes('avaranda'));
        
        if (!account) {
            console.error('Account "@avaranda" not found. Available accounts:', accounts.map(a => a.providerAccountId).join(', '));
            return;
        }

        const providerAccountId = account.providerAccountId;
        console.log('Using account:', providerAccountId);

        const mediaUrls = JSON.stringify([
            '/creatives/varanda/moscow_mule_1.png',
            '/creatives/varanda/moscow_mule_2.png',
            '/creatives/varanda/moscow_mule_3.png'
        ]);

        const hashtags = JSON.stringify(['AVaranda', 'MoscowMule', 'Ritual', 'Itamaraju']);

        const engagingDescription = `✨ **O segredo está no ritual.**

Muito antes de chegar à sua mesa na icônica caneca de cobre, nosso Moscow Mule começa nas raízes. O gengibre fresco é descascado à mão e fervido lentamente, extraindo cada nota picante para criar nosso xarope artesanal exclusivo.

A mágica se completa com a espuma de gengibre, leve e aerada, preparada com a maestria da Chef Tarcila Azevedo. Um brinde à autenticidade.

📍 **Nosso Endereço:**
Rua Roraima, 39 - Centro, Itamaraju

📲 **Reservas:** (73) 9914-6365
✨ **Link na Bio**`;

        const post = await prisma.content.create({
            data: {
                title: 'O Ritual do Moscow Mule',
                description: engagingDescription,
                type: 'carousel',
                status: 'idea',
                scheduledAt: null,
                accountId: providerAccountId,
                mediaUrls: mediaUrls,
                hashtags: hashtags
            }
        });

        console.log('✅ Post scheduled successfully ID:', post.id);
        console.log('--- END ---');
    } catch (e: any) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

run();
