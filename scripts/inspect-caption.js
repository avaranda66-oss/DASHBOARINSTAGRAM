// Script de diagnóstico: inspeciona o DOM da tela de "Novo post" do Instagram
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SESSIONS_DIR = path.join(process.cwd(), 'sessions');
const handle = process.argv[2] || 'avaranda_ita';

(async () => {
    const sessionPath = path.join(SESSIONS_DIR, `${handle}.json`);
    if (!fs.existsSync(sessionPath)) {
        console.log('Session not found:', sessionPath);
        process.exit(1);
    }

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ storageState: sessionPath });
    const page = await context.newPage();

    await page.goto('https://www.instagram.com/create/select/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Upload a test image
    const testImage = path.join(process.cwd(), 'public', 'uploads');
    const images = fs.readdirSync(testImage).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.webp'));
    if (images.length === 0) {
        console.log('No images found in uploads');
        process.exit(1);
    }

    const imgPath = path.join(testImage, images[0]);
    console.log('Using image:', imgPath);

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 10000 });
    await fileInput.evaluate(el => el.multiple = true);
    await fileInput.setInputFiles(imgPath);
    await page.waitForTimeout(3000);

    // Click Next/Avançar until we reach the caption screen
    for (let i = 0; i < 5; i++) {
        await page.waitForTimeout(2000);
        const nextTexts = ['Next', 'Próximo', 'Avançar'];
        let found = false;
        for (const txt of nextTexts) {
            try {
                const btn = page.locator(`text="${txt}"`).last();
                if (await btn.isVisible({ timeout: 1500 })) {
                    await btn.click({ force: true });
                    console.log(`Clicked: ${txt} (${i + 1})`);
                    found = true;
                    break;
                }
            } catch (e) { }
        }
        if (!found) {
            console.log('No more Next buttons found');
            break;
        }
    }

    await page.waitForTimeout(3000);
    console.log('\n=== DOM INSPECTION ===\n');

    // Inspect all elements that could be a caption field
    const results = await page.evaluate(() => {
        const info = [];

        // Check contenteditable
        const editables = document.querySelectorAll('[contenteditable]');
        info.push(`Found ${editables.length} contenteditable elements:`);
        editables.forEach((el, i) => {
            const rect = el.getBoundingClientRect();
            info.push(`  [${i}] tag=${el.tagName} contenteditable="${el.getAttribute('contenteditable')}" role="${el.getAttribute('role')}" aria-label="${el.getAttribute('aria-label')}" class="${el.className.substring(0, 80)}" rect=${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)}x${Math.round(rect.height)} visible=${rect.width > 0 && rect.height > 0}`);
        });

        // Check role=textbox
        const textboxes = document.querySelectorAll('[role="textbox"]');
        info.push(`\nFound ${textboxes.length} role=textbox elements:`);
        textboxes.forEach((el, i) => {
            const rect = el.getBoundingClientRect();
            info.push(`  [${i}] tag=${el.tagName} contenteditable="${el.getAttribute('contenteditable')}" aria-label="${el.getAttribute('aria-label')}" class="${el.className.substring(0, 80)}" rect=${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)}x${Math.round(rect.height)}`);
        });

        // Check textareas
        const textareas = document.querySelectorAll('textarea');
        info.push(`\nFound ${textareas.length} textarea elements:`);
        textareas.forEach((el, i) => {
            const rect = el.getBoundingClientRect();
            info.push(`  [${i}] placeholder="${el.placeholder}" class="${el.className.substring(0, 80)}" rect=${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)}x${Math.round(rect.height)}`);
        });

        // Check for any divs with aria labels containing caption/legenda
        const ariaEls = document.querySelectorAll('[aria-label]');
        const captionAria = Array.from(ariaEls).filter(el => {
            const label = (el.getAttribute('aria-label') || '').toLowerCase();
            return label.includes('caption') || label.includes('legenda') || label.includes('write') || label.includes('escreva');
        });
        info.push(`\nFound ${captionAria.length} elements with caption/legenda aria-labels:`);
        captionAria.forEach((el, i) => {
            info.push(`  [${i}] tag=${el.tagName} aria-label="${el.getAttribute('aria-label')}" class="${el.className.substring(0, 60)}"`);
        });

        // Check dialog structure
        const dialogs = document.querySelectorAll('[role="dialog"]');
        info.push(`\nFound ${dialogs.length} dialogs`);

        // Look for the "Compartilhar" or "Share" text
        const shareTexts = document.querySelectorAll('*');
        let shareFound = false;
        for (const el of shareTexts) {
            if (el.textContent === 'Compartilhar' || el.textContent === 'Share') {
                shareFound = true;
                info.push(`\nShare/Compartilhar button parent: tag=${el.parentElement?.tagName} class="${el.parentElement?.className?.substring(0, 60)}"`);
                break;
            }
        }
        if (!shareFound) info.push('\nShare/Compartilhar text NOT found');

        return info.join('\n');
    });

    console.log(results);

    // Keep browser open for manual inspection
    console.log('\n=== Browser will stay open for 30s for manual inspection ===');
    await page.waitForTimeout(30000);

    await context.close();
    await browser.close();
})();
