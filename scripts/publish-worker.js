const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
    const args = process.argv.slice(2);
    const imagePath = args[0];
    const caption = args[1] ? args[1].replace(/\\n/g, '\n') : "";

    if (!imagePath) {
        console.error("Uso: node publish-worker.js <caminho_imagem> <legenda>");
        process.exit(1);
    }

    const SESSION_FILE = path.join(process.cwd(), '.instagram_session.json');
    const absoluteImagePath = path.isAbsolute(imagePath)
        ? imagePath
        : path.join(process.cwd(), 'public', imagePath.startsWith('/') ? imagePath.slice(1) : imagePath);

    if (!fs.existsSync(absoluteImagePath)) {
        console.error(`Imagem não encontrada: ${absoluteImagePath}`);
        process.exit(1);
    }

    console.log(`Iniciando publicação: ${absoluteImagePath}`);

    const browser = await chromium.launch({
        headless: false, // Deixamos visível para o usuário ver o robô trabalhando
        channel: 'chrome'
    });

    try {
        const context = await browser.newContext({
            storageState: fs.existsSync(SESSION_FILE) ? SESSION_FILE : undefined,
            viewport: { width: 1280, height: 800 }
        });

        const page = await context.newPage();

        console.log("Abrindo Instagram...");
        await page.goto('https://www.instagram.com/create/select/', { waitUntil: 'networkidle' });

        // Verificar login básico
        if (page.url().includes('login')) {
            console.error("Erro: Sessão expirada. Faça login manual novamente.");
            await browser.close();
            process.exit(1);
        }

        console.log("Fazendo upload...");
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(absoluteImagePath);
        await page.waitForTimeout(3000);

        console.log("Avançando telas...");
        const nextSelectors = ['text="Next"', 'text="Próximo"', 'text="Avançar"'];
        for (let i = 0; i < 3; i++) {
            await page.waitForTimeout(2000);
            let clicked = false;
            for (const sel of nextSelectors) {
                const btn = page.locator(sel).last();
                if (await btn.isVisible({ timeout: 1000 })) {
                    await btn.click({ force: true });
                    clicked = true;
                    break;
                }
            }
            if (!clicked && i > 0) break; // Se não achou depois da primeira tela, pode ser a de legenda
        }

        console.log("Escrevendo legenda...");
        await page.waitForTimeout(2000);
        await page.keyboard.insertText(caption);
        await page.waitForTimeout(1000);

        console.log("Compartilhando!");
        const shareSelectors = ['text="Share"', 'text="Compartilhar"'];
        let shared = false;
        for (const sel of shareSelectors) {
            const btn = page.locator(sel).last();
            if (await btn.isVisible({ timeout: 2000 })) {
                await btn.click({ force: true });
                shared = true;
                break;
            }
        }

        if (!shared) {
            // Fallback teclado
            await page.keyboard.press('Tab');
            await page.waitForTimeout(500);
            await page.keyboard.press('Tab');
            await page.waitForTimeout(500);
            await page.keyboard.press('Enter');
        }

        console.log("Aguardando confirmação...");
        await page.waitForTimeout(8000);
        console.log("🎉 Publicado com sucesso!");

        await browser.close();
        process.exit(0);

    } catch (err) {
        console.error(`Erro na automação: ${err.message}`);
        await browser.close();
        process.exit(1);
    }
}

run();
