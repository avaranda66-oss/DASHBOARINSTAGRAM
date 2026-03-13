const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testStoryUpload() {
    const handle = 'avaranda_ita';
    const SESSIONS_DIR = path.join(process.cwd(), 'sessions');
    const sessionPath = path.join(SESSIONS_DIR, `${handle}.json`);
    const publicDir = path.join(process.cwd(), 'public');

    const browser = await chromium.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: false,
        args: ['--disable-blink-features=AutomationControlled', '--disable-infobars', '--no-sandbox']
    });

    try {
        const context = await browser.newContext({
            viewport: { width: 412, height: 915 },
            hasTouch: true, isMobile: true,
            userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
            storageState: fs.existsSync(sessionPath) ? sessionPath : undefined
        });

        const page = await context.newPage();

        console.log('Navegando... /create/story/');
        await page.goto('https://www.instagram.com/create/story/', { waitUntil: 'networkidle' });
        await page.waitForTimeout(5000);

        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.count() > 0) {
            const targetFile = path.join(publicDir, 'canvas_9x16.png');
            if (fs.existsSync(targetFile)) {
                console.log(`Injetando: ${targetFile}`);
                await fileInput.setInputFiles(targetFile);

                console.log('Aguardando 12s para preview...');
                for (let i = 1; i <= 3; i++) {
                    await page.waitForTimeout(4000);
                    const snapPath = path.join(publicDir, `diag-gray-step-${i}.png`);
                    await page.screenshot({ path: snapPath });
                    console.log(`Snapshot ${i} salvo em ${snapPath}`);
                }

                const share = page.locator('button:has-text("Compartilhar story"), button:has-text("Add to your story"), [role="button"]:has-text("Seu story")').last();
                if (await share.isVisible({ timeout: 5000 })) {
                    console.log('Botão Share visível. Clicando...');
                    await share.click({ force: true });
                    await page.waitForTimeout(10000);
                    await page.screenshot({ path: path.join(publicDir, 'diag-gray-final.png') });
                    console.log('Fim do teste.');
                } else {
                    console.log('Botão Share não apareceu.');
                }
            } else {
                console.log('canvas_9x16.png não encontrado na public/');
            }
        } else {
            console.log('Input não encontrado.');
        }

    } catch (e) {
        console.error('Erro:', e);
    } finally {
        await browser.close();
    }
}

testStoryUpload();
