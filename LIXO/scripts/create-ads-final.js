const TOKEN = process.env.META_ACCESS_TOKEN; // REPLACED HARDCODED TOKEN FOR SECURITY
const BASE = 'https://graph.facebook.com/v25.0';
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function post(ep, body) {
    const r = await fetch(BASE+'/'+ep, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({...body, access_token:TOKEN}) });
    const d = await r.json();
    if (d.error) { console.log('  ERR:', d.error.error_user_msg||d.error.message); throw new Error(d.error.message); }
    return d;
}

async function main() {
    const acc = await db.account.findFirst({ where: { ads_token: { not: null } } });
    await db.account.update({ where: { id: acc.id }, data: { ads_token: TOKEN } });
    console.log('Token atualizado!');
    
    const acctId = acc.ads_account_id;
    const pageId = '764239866781806';
    const adSetId = '120241416199820412';
    const campaignId = '120241416199550412';

    const images = [
        { hash: '356e7157fb053f0af90256f358ed35d1', name: 'Prestigio - Risoto', text: 'Venha viver uma experiencia gastronomica unica. A Varanda Itamaraju espera voce!' },
        { hash: '55d46f440fb0a6a5833b05e8f8cc1636', name: 'Descubra Sabores', text: 'Descubra sabores que encantam. Reserve sua mesa na Varanda!' },
        { hash: '1a193f285ce9caa477adbb5a793ce3b4', name: 'Sabor do Mar', text: 'Fresco e inesquecivel - o melhor da gastronomia em Itamaraju.' },
        { hash: 'a8e756a69503711553624cf0935f8044', name: 'Moscow Mule', text: 'Drink especial + pratos incriveis. Sua noite comeca na Varanda!' },
    ];

    let n = 0;
    for (const img of images) {
        const c = await post(acctId+'/adcreatives', {
            name: 'Creative - '+img.name,
            object_story_spec: { page_id: pageId, link_data: { image_hash: img.hash, message: img.text, link: 'https://www.instagram.com/a_varanda_itamaraju/', call_to_action: { type: 'LEARN_MORE' } } },
        });
        console.log('Creative: '+img.name+' ('+c.id+')');
        const ad = await post(acctId+'/ads', { name: 'Ad - '+img.name, adset_id: adSetId, creative: { creative_id: c.id }, status: 'ACTIVE' });
        console.log('Ad: '+img.name+' ('+ad.id+')');
        n++;
    }

    await post(adSetId, { status: 'ACTIVE' });
    await post(campaignId, { status: 'ACTIVE' });
    console.log('\n=== '+n+' ADS ATIVOS! Facebook + Instagram (auto placement) ===');
    await db.$disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
