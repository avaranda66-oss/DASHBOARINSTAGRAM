import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function dumpDom() {
    console.log("Starting DOM dumper...");
    
    // Configurações exatas do serviço real (Desktop mode)
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

// Removido waitForEvent filechooser que causava timeout
    
    console.log("Navigating to /create/select/...");
    try {
        await page.goto('https://www.instagram.com/create/select/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (e) {
        console.log("Navigation timed out, proceeding anyway...");
    }
    
    await page.waitForTimeout(5000);

    // Tenta selecionar "Post" se o menu aparecer
    try {
        const postLocator = page.locator('span:has-text("Post"), span:has-text("Publicação")').first();
        if (await postLocator.isVisible({ timeout: 5000 })) {
            await postLocator.click();
            await page.waitForTimeout(2000);
        }
    } catch (e) { }

    // Aguarda o input file e injeta a 1ª imagem
    try {
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.waitFor({ state: 'attached', timeout: 10000 });
        await fileInput.setInputFiles([path.join(process.cwd(), 'public', 'creatives', 'varanda', 'varanda_dr_arroz_1.png')]);
        console.log("1ª imagem injetada.");
    } catch (e) {
        console.log("Input 1 falhou:", e);
    }
    
    console.log("Aguardando tela de crop renderizar...");
    await page.waitForTimeout(10000); 
    
    console.log("Extraindo DOM do Role Dialog...");
    try {
        const dialog = page.locator('div[role="dialog"]');
        if (await dialog.isVisible({ timeout: 5000 })) {
            const dialogHtml = await dialog.innerHTML();
            fs.writeFileSync('dom_dump.html', dialogHtml);
            console.log("DOM salvo em dom_dump.html");
        } else {
            console.log("Dialog não encontrado. Salvando DOM da página inteira.");
            const bodyHtml = await page.innerHTML('body');
            fs.writeFileSync('dom_dump.html', bodyHtml);
        }
    } catch (e) {
        console.error("Erro ao salvar DOM:", e);
    }
    
    await browser.close();
    console.log("Concluido.");
}

dumpDom().catch(console.error);
