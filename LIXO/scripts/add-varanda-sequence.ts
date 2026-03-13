import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const contents = [
    {
      title: 'Tradição Italiana - Calzone',
      description: 'O verdadeiro sabor que acolhe! Nosso calzone é recheado generosamente e assado à perfeição para trazer a tradição da Itália direto para a sua mesa. Vem experimentar! 🍕🇮🇹\n\n#Calzone #ComidaItaliana #VarandaRestaurante #SaborQueAcolhe #Gastronomia',
      type: 'post',
      status: 'scheduled',
      hashtags: JSON.stringify(['#Calzone', '#ComidaItaliana', '#VarandaRestaurante', '#SaborQueAcolhe', '#Gastronomia']),
      mediaUrls: JSON.stringify(['/creatives/varanda/creative_calzone_seq.png']),
      order: 0,
    },
    {
      title: 'A Sobremesa Perfeita - Crepe Doce',
      description: 'Aquele momento doce que você merece! Nosso crepe feito com a massa fininha e recheios irresistíveis é de dar água na boca. A pedida ideal para adoçar o seu dia. 🍓🍫\n\n#MomentoDoce #CrepeDoce #Sobremesa #VarandaRestaurante #DoceTentacao',
      type: 'post',
      status: 'scheduled',
      hashtags: JSON.stringify(['#MomentoDoce', '#CrepeDoce', '#Sobremesa', '#VarandaRestaurante', '#DoceTentacao']),
      mediaUrls: JSON.stringify(['/creatives/varanda/creative_crepe_seq.png']),
      order: 1,
    },
    {
      title: 'Frescor em Taça - Sorvete',
      description: 'O toque final perfeito para a sua refeição. Nosso sorvete com frutas vermelhas e calda especial traz o frescor e a leveza que vão surpreender seu paladar. 🍨✨\n\n#Sorvete #SobremesaGelada #VarandaRestaurante #FrescorEmTaca #ToqueFinal',
      type: 'post',
      status: 'scheduled',
      hashtags: JSON.stringify(['#Sorvete', '#SobremesaGelada', '#VarandaRestaurante', '#FrescorEmTaca', '#ToqueFinal']),
      mediaUrls: JSON.stringify(['/creatives/varanda/creative_sorvete_seq.png']),
      order: 2,
    }
  ];

  for (const c of contents) {
    await prisma.content.create({ data: c });
  }
  console.log('Creative sequence (3 posts) added to database.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
