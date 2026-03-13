const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function setupProfile() {
    const userDataDir = path.join(process.cwd(), '.chrome-session-maps');
    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
    }

    console.log('[Setup] Launching Chrome...');
    console.log('[Setup] PLEASE LOG IN TO YOUR GOOGLE ACCOUNT IN THE BROWSER WINDOW.');
    console.log('[Setup] Once you are fully logged in and can see your profile picture, just CLOSE the browser window.');

    const context = await chromium.launchPersistentContext(userDataDir, {
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: false,
        viewport: { width: 1280, height: 900 },
        args: [
            '--disable-blink-features=AutomationControlled', 
            '--no-sandbox', 
            '--disable-gpu',
        ],
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    await page.goto('https://www.google.com/maps');

    // Wait for the context to close (i.e. user closes the browser window manually)
    context.on('close', () => {
        console.log('[Setup] Browser closed. Profile should now be properly configured with your cookies.');
        process.exit(0);
    });

    console.log('[Setup] Waiting for you to close the browser...');
}

setupProfile().catch(err => {
    console.error(err);
    process.exit(1);
});
