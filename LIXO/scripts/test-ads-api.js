const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    const acc = await db.account.findFirst({ where: { ads_token: { not: null } } });
    if (!acc || !acc.ads_token || !acc.ads_account_id) {
        console.log('No ads token/account found');
        return;
    }

    const token = acc.ads_token;
    const accountId = acc.ads_account_id;
    const baseUrl = 'https://graph.facebook.com/v25.0';

    console.log('=== Testing Facebook Ads API ===');
    console.log('Account:', accountId);

    // 1. Ad Account info
    console.log('\n--- Ad Account Info ---');
    try {
        const res = await fetch(`${baseUrl}/${accountId}?fields=id,account_id,name,currency,timezone_name,account_status,amount_spent&access_token=${token}`);
        const data = await res.json();
        if (data.error) {
            console.log('ERROR:', data.error.message);
            return;
        }
        console.log('Name:', data.name);
        console.log('Currency:', data.currency);
        console.log('Status:', data.account_status);
        console.log('Total Spent:', data.amount_spent);
    } catch (e) {
        console.log('Fetch error:', e.message);
        return;
    }

    // 2. Campaigns
    console.log('\n--- Campaigns ---');
    try {
        const res = await fetch(`${baseUrl}/${accountId}/campaigns?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,created_time&limit=50&access_token=${token}`);
        const data = await res.json();
        if (data.error) {
            console.log('ERROR:', data.error.message);
            return;
        }
        console.log('Total campaigns:', data.data.length);
        for (const c of data.data) {
            const budget = c.daily_budget ? `R$ ${(parseInt(c.daily_budget) / 100).toFixed(2)}/dia` : (c.lifetime_budget ? `R$ ${(parseInt(c.lifetime_budget) / 100).toFixed(2)} total` : 'sem budget');
            console.log(`  [${c.effective_status}] ${c.name} | Objetivo: ${c.objective} | Budget: ${budget} | ID: ${c.id}`);
        }
    } catch (e) {
        console.log('Fetch error:', e.message);
    }

    // 3. Account Insights (last 30 days)
    console.log('\n--- Account Insights (30 dias) ---');
    try {
        const res = await fetch(`${baseUrl}/${accountId}/insights?fields=impressions,clicks,spend,cpc,cpm,ctr,reach,frequency,actions&date_preset=last_30d&access_token=${token}`);
        const data = await res.json();
        if (data.error) {
            console.log('ERROR:', data.error.message);
        } else if (data.data && data.data.length > 0) {
            const d = data.data[0];
            console.log('Impressions:', d.impressions);
            console.log('Clicks:', d.clicks);
            console.log('Spend: R$', d.spend);
            console.log('CPC: R$', d.cpc);
            console.log('CTR:', d.ctr, '%');
            console.log('Reach:', d.reach);
            console.log('Frequency:', d.frequency);
        } else {
            console.log('No insights data for last 30 days');
        }
    } catch (e) {
        console.log('Fetch error:', e.message);
    }

    await db.$disconnect();
}

main().catch(console.error);
