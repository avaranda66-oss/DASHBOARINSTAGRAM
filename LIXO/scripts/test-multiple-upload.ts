import { chromium } from 'playwright';
import path from 'path';

async function testMultipleUpload() {
    console.log("Starting Multiple Upload Test...");
    
    const browser = await chromium.launch({ 
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: false 
    });
    const context = await browser.newContext({
        storageState: path.join(process.cwd(), 'sessions', 'avaranda_ita.json'),
        viewport: { width: 1280, height: 800 },
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    });
    const page = await context.newPage();

    console.log("Navigating to /create/select/...");
    await page.goto('https://www.instagram.com/create/select/', { waitUntil: 'domcontentloaded' });
    
    const img1 = path.join(process.cwd(), 'public', 'creatives', 'varanda', 'varanda_dr_arroz_1.png');
    const img2 = path.join(process.cwd(), 'public', 'creatives', 'varanda', 'varanda_dr_arroz_2.png');

    try {
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.waitFor({ state: 'attached', timeout: 10000 });
        
        console.log("Injetando 2 imagens de uma vez só...");
        // Tenta setar multiple=true via JS antes de injetar
        await fileInput.evaluate((el: HTMLInputElement) => el.multiple = true);
        await fileInput.setInputFiles([img1, img2]);
        
        console.log("Injeção concluída. Aguardando 10 segundos para ver se o Instagram aceitou as duas...");
        await page.waitForTimeout(10000);
        
        const screenshotPath = 'multiple_upload_result.png';
        await page.screenshot({ path: screenshotPath });
        console.log(`Screenshot salva em ${screenshotPath}`);
        
    } catch (e) {
        console.error("Erro durante o teste:", e);
    }
    
    await browser.close();
    console.log("Teste finalizado.");
}

testMultipleUpload().catch(console.error);
