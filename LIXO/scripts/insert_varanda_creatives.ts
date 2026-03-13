import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const criativos = [
    {
      title: 'Fase 1 — A Alma da Varanda',
      description: 'Por trás de cada prato, existe uma história de paixão e raízes. A Chef Tarcila Azevedo traz a essência do Brasil para o coração de Itamaraju. Convidamos você a descobrir o sabor da autenticidade.\n\nHeadline: A ALMA DA VARANDA\nCTA: Reserve sua mesa\nFase: Alcance\nTemplate: Senior Standard (B)',
      type: 'post',
      status: 'idea',
      hashtags: JSON.stringify([
        '#VarandaRestaurante', '#ChefTarcila', '#Gastronomia',
        '#Itamaraju', '#ExperienciaGastronomica'
      ]),
      mediaUrls: JSON.stringify(['/creatives/varanda/criativo_01_alma_varanda.png']),
      order: 0,
    },
    {
      title: 'Fase 1 — Excelência em Cada Detalhe',
      description: 'Selecionamos os melhores ingredientes para garantir frescor e sabor inigualáveis. Uma experiência gastronômica de elite, aqui na sua cidade.\n\nHeadline: EXCELÊNCIA EM CADA DETALHE\nCTA: Descubra nossos sabores\nFase: Alcance\nTemplate: Moldura Ouro (A)',
      type: 'post',
      status: 'idea',
      hashtags: JSON.stringify([
        '#VarandaRestaurante', '#AltaGastronomia', '#FrutosDoMar',
        '#Itamaraju', '#CamaraoGrelhado'
      ]),
      mediaUrls: JSON.stringify(['/creatives/varanda/criativo_02_excelencia_detalhe.png']),
      order: 1,
    },
    {
      title: 'Fase 1 — Onde a Bélgica Encontra o Brasil',
      description: 'Sofisticação, calor e gastronomia de alto nível. Na Varanda, cada detalhe é pensado para um momento inesquecível.\n\nHeadline: ONDE A BÉLGICA ENCONTRA O BRASIL\nCTA: \nFase: Alcance\nTemplate: Colagem (C)',
      type: 'post',
      status: 'idea',
      hashtags: JSON.stringify([
        '#VarandaRestaurante', '#Confraternizacao', '#Momentos',
        '#Itamaraju', '#Restaurante'
      ]),
      mediaUrls: JSON.stringify(['/creatives/varanda/criativo_03_belgica_brasil.png']),
      order: 2,
    },
    {
      title: 'Fase 1 — Tradição em Cada Gesto',
      description: 'A culinária é uma forma de arte. Na Varanda, honramos origens brasileiras com o toque refinado da escola europeia.\n\nHeadline: TRADIÇÃO EM CADA GESTO\nCTA: Viva esta experiência\nFase: Alcance\nTemplate: Gesto Artístico (D)',
      type: 'post',
      status: 'idea',
      hashtags: JSON.stringify([
        '#VarandaRestaurante', '#CulinariaEuropeia', '#ChefTarcila',
        '#Itamaraju', '#ArteGastronomica'
      ]),
      mediaUrls: JSON.stringify(['/creatives/varanda/criativo_04_tradicao_gesto.png']),
      order: 3,
    }
  ];

  for (const c of criativos) {
    await prisma.content.create({ data: c });
    console.log('Inserido:', c.title);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
