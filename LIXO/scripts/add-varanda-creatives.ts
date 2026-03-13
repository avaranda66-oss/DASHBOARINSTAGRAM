import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const contents = [
    {
      title: 'Sabor do Mar - Camarão Grelhado',
      description: 'Nosso camarão grelhado é a escolha perfeita para quem busca o frescor do mar aliado a uma apresentação impecável. Venha viver essa experiência gastronômica na Varanda! ✨🦐\n\n#Gastronomia #CamaraoGrelhado #VarandaRestaurante #SaborDoMar #ExperienciaGastronomica',
      type: 'post',
      status: 'approved',
      hashtags: JSON.stringify(['#Gastronomia', '#CamaraoGrelhado', '#VarandaRestaurante', '#SaborDoMar', '#ExperienciaGastronomica']),
      mediaUrls: JSON.stringify(['/creatives/varanda/creative_camarao_grelhado.png']),
      order: 0,
    },
    {
      title: 'O Clássico Refrescante - Moscow Mule',
      description: 'Sexta-feira pede um clássico! Nosso Moscow Mule na canequinha de cobre é a pedida perfeita para refrescar e celebrar. Saúde! 🥂🍋\n\n#MoscowMule #Drinks #Sextou #VarandaRestaurante #Coquetelaria',
      type: 'post',
      status: 'approved',
      hashtags: JSON.stringify(['#MoscowMule', '#Drinks', '#Sextou', '#VarandaRestaurante', '#Coquetelaria']),
      mediaUrls: JSON.stringify(['/creatives/varanda/creative_moscow_mule.png']),
      order: 1,
    },
    {
      title: 'Arte e Sabor com Chef Tarcila',
      description: 'A cozinha é nossa galeria e a Chef Tarcila é nossa artista principal. Cada prato é uma obra de arte pensada para encantar o paladar e os olhos. Venha provar as criações exclusivas desta temporada! 👩‍🍳🎨\n\n#ChefTarcila #AltaGastronomia #VarandaRestaurante #CulinariaArtesanal #ArteNoPrato',
      type: 'post',
      status: 'idea',
      hashtags: JSON.stringify(['#ChefTarcila', '#AltaGastronomia', '#VarandaRestaurante', '#CulinariaArtesanal', '#ArteNoPrato']),
      mediaUrls: JSON.stringify(['/creatives/varanda/creative_cheff_tarcila.png']),
      order: 0,
    }
  ];

  for (const c of contents) {
    await prisma.content.create({ data: c });
  }
  console.log('Creatives added to database.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
