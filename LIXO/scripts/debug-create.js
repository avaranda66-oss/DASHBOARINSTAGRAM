const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const BASE = 'https://graph.facebook.com/v25.0';

async function main() {
    const acc = await db.account.findFirst({ where: { ads_token: { not: null } } });
    const token = acc.ads_token;
    const accountId = acc.ads_account_id;

    // Test 1: Create campaign with minimal params via form-urlencoded
    console.log('=== Test 1: Form-encoded minimal ===');
    const form = new URLSearchParams();
    form.set('name', 'Test Campaign');
    form.set('objective', 'OUTCOME_AWARENESS');
    form.set('status', 'PAUSED');
    form.set('special_ad_categories', '[]');
    form.set('access_token', token);

    const res1 = await fetch(`${BASE}/${accountId}/campaigns`, {
        method: 'POST',
        body: form,
    });
    const data1 = await res1.json();
    console.log('Response:', JSON.stringify(data1, null, 2));

    // Test 2: Try with buying_type
    console.log('\n=== Test 2: With buying_type ===');
    const form2 = new URLSearchParams();
    form2.set('name', 'Test Campaign 2');
    form2.set('objective', 'OUTCOME_AWARENESS');
    form2.set('buying_type', 'AUCTION');
    form2.set('status', 'PAUSED');
    form2.set('special_ad_categories', '[]');
    form2.set('access_token', token);

    const res2 = await fetch(`${BASE}/${accountId}/campaigns`, {
        method: 'POST',
        body: form2,
    });
    const data2 = await res2.json();
    console.log('Response:', JSON.stringify(data2, null, 2));

    // Test 3: Check permissions on the ad account
    console.log('\n=== Test 3: Ad account permissions ===');
    const res3 = await fetch(`${BASE}/${accountId}?fields=id,name,account_status,disable_reason,funding_source,capabilities&access_token=${token}`);
    const data3 = await res3.json();
    console.log('Account:', JSON.stringify(data3, null, 2));

    // Test 4: Try without special_ad_categories
    console.log('\n=== Test 4: Without special_ad_categories ===');
    const form4 = new URLSearchParams();
    form4.set('name', 'Test 4');
    form4.set('objective', 'OUTCOME_TRAFFIC');
    form4.set('status', 'PAUSED');
    form4.set('access_token', token);

    const res4 = await fetch(`${BASE}/${accountId}/campaigns`, {
        method: 'POST',
        body: form4,
    });
    const data4 = await res4.json();
    console.log('Response:', JSON.stringify(data4, null, 2));

    await db.$disconnect();
}

main().catch(console.error);
