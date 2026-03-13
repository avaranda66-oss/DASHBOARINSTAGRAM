import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const contents = [
    {
      title: 'O Seu Momento de Prestígio - Risoto de Salmão',
      description: 'O sabor inconfundível do salmão perfeito, feito para transformar a sua refeição em um momento único de prestígio. Viva esta experiência exclusíva.\n\n#AltaGastronomia #RisotoDeSalmao #ExperienciaVaranda #SaborPerfeito',
      type: 'post',
      status: 'scheduled',
      hashtags: JSON.stringify(['#AltaGastronomia', '#RisotoDeSalmao', '#ExperienciaVaranda', '#SaborPerfeito']),
      mediaUrls: JSON.stringify(['/creatives/varanda/varanda_dr_risoto.png']),
      order: 3,
    },
    {
      title: 'A Recompensa Que Você Merece - Crepe Doce',
      description: 'Sua semana pede este toque doce. Nossa receita autoral é a recompensa perfeita para terminar qualquer dia com chave de ouro.\n\n#CrepeDoce #RecompensaDoDia #MomentosDoces #ChefTarcila',
      type: 'post',
      status: 'scheduled',
      hashtags: JSON.stringify(['#CrepeDoce', '#RecompensaDoDia', '#MomentosDoces', '#ChefTarcila']),
      mediaUrls: JSON.stringify(['/creatives/varanda/varanda_dr_crepe.png']),
      order: 4,
    },
    {
      title: 'Descubra Nossos Sabores - Arroz de Frutos do Mar',
      description: 'A fusão perfeita da tradição e excelência no Arroz de Frutos do Mar da Varanda Restaurante. Um prato que é puro momento de lazer para você e quem você ama.\n\n#FrutosDoMar #Culinarialtaliana #ExperienciaGastronomica #VarandaRestaurante',
      type: 'post',
      status: 'scheduled',
      hashtags: JSON.stringify(['#FrutosDoMar', '#Culinarialtaliana', '#ExperienciaGastronomica', '#VarandaRestaurante']),
      mediaUrls: JSON.stringify(['/creatives/varanda/varanda_dr_arroz_1.png']),
      order: 5,
    },
    {
      title: 'Uma Jornada Gastronômica - Arroz Especial',
      description: 'Autenticidade em cada garfada. Nossa releitura especial traz sabores complexos que surpreendem os paladares mais exigentes. Viva esta experiência.\n\n#AltaGastronomia #SaborEPrazer #JornadaGastronomica #ChefTarcilaAzevedo',
      type: 'post',
      status: 'scheduled',
      hashtags: JSON.stringify(['#AltaGastronomia', '#SaborEPrazer', '#JornadaGastronomica', '#ChefTarcilaAzevedo']),
      mediaUrls: JSON.stringify(['/creatives/varanda/varanda_dr_arroz_2.png']),
      order: 6,
    }
  ];

  for (const c of contents) {
    await prisma.content.create({ data: c });
  }
  console.log('Direct Response creatives (4 posts) added to database.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
