import { scrapeGoogleMapsWithPlaywright } from './lib/services/maps-playwright.service';

scrapeGoogleMapsWithPlaywright('A Varanda Itamaraju').then(r => {
    console.log('Success:', r.success);
    if (r.data) {
        console.log('Reviews count:', r.data.reviews?.length);
        console.log('Sample review:', JSON.stringify(r.data.reviews?.[0], null, 2));
    }
}).catch(console.error);
