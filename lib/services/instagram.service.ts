import { chromium, type Browser, type BrowserContext, type BrowserContextOptions } from 'playwright';
import path from 'path';
import fs from 'fs';
import db from '@/lib/db';

const SESSIONS_DIR = path.join(process.cwd(), 'sessions');

export class InstagramService {
    /**
     * Inicia o navegador com a sessão salva de um usuário específico.
     */
    private static normalizeHandle(handle?: string): string {
        if (!handle) return '';
        return handle.replace(/^@/, '').toLowerCase().trim();
    }

    /**
     * Inicia o navegador com a sessão salva de um usuário específico.
     */
    private static async getContext(username?: string, headless: boolean = true, isDesktop: boolean = false): Promise<{ browser: Browser, context: BrowserContext }> {
        if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

        const browser = await chromium.launch({
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            headless: headless,
            args: ['--disable-blink-features=AutomationControlled', '--disable-infobars', '--no-sandbox']
        });

        const contextOptions: BrowserContextOptions = isDesktop ? {
            viewport: { width: 1280, height: 800 },
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        } : {
            viewport: { width: 412, height: 915 }, // Dimensões modernas do S24 Ultra
            hasTouch: true,
            isMobile: true,
            userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36"
        };

        if (username) {
            const h = this.normalizeHandle(username);
            const sessionPath = path.join(SESSIONS_DIR, `${h}.json`);
            if (fs.existsSync(sessionPath)) {
                contextOptions.storageState = sessionPath;
            } else {
                const legacySession = path.join(process.cwd(), '.instagram_session.json');
                if (fs.existsSync(legacySession)) contextOptions.storageState = legacySession;
            }
        }

        const context = await browser.newContext(contextOptions);
        return { browser, context };
    }

    static async getCurrentUserHandle(context: BrowserContext): Promise<string | null> {
        const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
        try {
            await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => { });
            const profileLink = page.locator('a[href^="/"][href$="/"]').filter({ has: page.locator('img') }).first();
            const href = await profileLink.getAttribute('href');
            const handle = href ? href.replace(/\//g, '') : null;

            if (handle) {
                // Tentar capturar o avatar já que estamos aqui
                const img = profileLink.locator('img');
                const avatarUrl = await img.getAttribute('src');
                if (avatarUrl && avatarUrl.startsWith('http')) {
                    await db.account.update({
                        where: { providerAccountId: handle.toLowerCase() },
                        data: { picture: avatarUrl }
                    }).catch(() => { });
                }
            }

            return handle;
        } catch (e) { return null; }
    }

    private static async verifyAccountMatch(context: BrowserContext, targetUsername: string): Promise<void> {
        const pages = context.pages();
        const page = pages.length > 0 ? pages[0] : await context.newPage();

        // Se não estivermos no Instagram, vamos para a home
        if (!page.url().includes('instagram.com')) {
            await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => { });
        }

        const currentHandle = await this.getCurrentUserHandle(context);

        if (currentHandle && currentHandle.toLowerCase() !== targetUsername.toLowerCase()) {
            throw new Error(`SEGURANÇA: Sessão atual pertence a @${currentHandle}, mas você tentou agir como @${targetUsername}. Ação bloqueada.`);
        }

        // Tentar capturar foto de perfil de forma mais robusta
        try {
            // Seletor que busca o link do perfil que contém a imagem (comum na barra lateral/menu)
            const profileLink = page.locator(`a[href*="/${currentHandle || targetUsername}/"]`).filter({ has: page.locator('img') }).first();

            if (await profileLink.isVisible({ timeout: 5000 })) {
                const avatarImg = profileLink.locator('img');
                const avatarUrl = await avatarImg.getAttribute('src');

                if (avatarUrl && avatarUrl.startsWith('http')) {
                    await db.account.update({
                        where: { providerAccountId: targetUsername.replace('@', '').toLowerCase() },
                        data: { picture: avatarUrl }
                    }).catch(() => { });
                }
            } else {
                // Fallback: busca qualquer imagem que pareça um avatar
                const fallbackPic = page.locator('img[alt*="profile picture"], img[alt*="foto do perfil"], img[src*="profile_pc"]').first();
                if (await fallbackPic.isVisible({ timeout: 2000 })) {
                    const avatarUrl = await fallbackPic.getAttribute('src');
                    if (avatarUrl) {
                        await db.account.update({
                            where: { providerAccountId: targetUsername.replace('@', '').toLowerCase() },
                            data: { picture: avatarUrl }
                        }).catch(() => { });
                    }
                }
            }
        } catch (e: unknown) {
        }

    }

    static async checkLoginStatus(targetUsername?: string): Promise<boolean> {
        const { browser, context } = await this.getContext(targetUsername, true);
        try {
            const currentHandle = await this.getCurrentUserHandle(context);
            if (!targetUsername) return !!currentHandle;
            return currentHandle?.toLowerCase() === targetUsername.toLowerCase();
        } finally {
            await context.close();
            await browser.close();
        }
    }

    static async requestManualLogin(targetUsername?: string): Promise<string | null> {
        const cwd = process.cwd();
        const handle = targetUsername ? targetUsername.replace('@', '') : '';

        return new Promise((resolve) => {
            const { exec } = require('child_process');
            // No Windows, usamos 'start cmd.exe' para abrir uma janela visível
            const command = `start cmd.exe /K "cd /d "${cwd}" && node scripts/playwright-login.js ${handle}"`;

            exec(command, (error: any) => {
                if (error) {
                    console.error("Erro ao iniciar script de login via CMD:", error);
                    // Fallback para o modo anterior (sem janela de CMD separada) se o exec falhar
                    this.runInlineManualLogin(targetUsername).then(resolve);
                } else {
                    // Retornamos o handle que o usuário tentou logar, 
                    // a confirmação real virá da verificação de arquivo posterior
                    resolve(targetUsername || 'manual_login');
                }
            });
        });
    }

    private static async runInlineManualLogin(targetUsername?: string): Promise<string | null> {
        const { browser, context } = await this.getContext(targetUsername, false);
        const page = await context.newPage();
        await page.goto('https://www.instagram.com/');
        await new Promise<void>((resolve) => page.on('close', () => resolve()));
        const loggedUser = await this.getCurrentUserHandle(context);
        if (loggedUser) {
            const sessionPath = path.join(SESSIONS_DIR, `${loggedUser}.json`);
            await context.storageState({ path: sessionPath });

            // Tentar capturar foto de perfil
            try {
                const profilePic = page.locator('img[alt*="profile picture"], img[alt*="foto do perfil"]').first();
                if (await profilePic.isVisible({ timeout: 2000 })) {
                    const avatarUrl = await profilePic.getAttribute('src');
                    if (avatarUrl) {
                        await db.account.update({
                            where: { providerAccountId: loggedUser.toLowerCase() },
                            data: { picture: avatarUrl }
                        }).catch(() => { });
                    }
                }
            } catch (e) { }
        }
        await context.close();
        await browser.close();
        return loggedUser;
    }

    private static async attemptAutoLogin(handle: string, headless: boolean = true): Promise<boolean> {
        try {
            const account = await db.account.findUnique({
                where: { providerAccountId: handle.replace('@', '').toLowerCase() }
            }) as any;

            if (!account || !account.password) {
                return false;
            }


            return new Promise((resolve) => {
                const { exec } = require('child_process');
                const cwd = process.cwd();
                // Passa a senha como argumento para o script
                const command = `node scripts/playwright-login.js ${handle.replace('@', '')} "${account.password}" ${headless}`;

                exec(command, { cwd }, async (error: any, stdout: string) => {
                    // Tentar extrair avatar do stdout se houver
                    const avatarMatch = stdout?.match(/AVATAR_URL\|(.*)/);
                    if (avatarMatch && avatarMatch[1]) {
                        const avatarUrl = avatarMatch[1].trim();
                        await db.account.update({
                            where: { providerAccountId: handle.replace('@', '').toLowerCase() },
                            data: { picture: avatarUrl }
                        }).catch(console.error);
                    }

                    if (error) {
                        console.error("Auto-login script error:", error);
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            });
        } catch (e: unknown) {
            console.error("Erro na rotina de attemptAutoLogin:", e);
            return false;
        }
    }

    static async publishPost(username: string, imageUrls: string[], caption: string, headless: boolean = false): Promise<boolean> {
        const absoluteImagePaths = imageUrls.map(url => {
            const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
            const finalUrl = cleanUrl.includes('/') ? cleanUrl : `uploads/${cleanUrl}`;
            return path.join(process.cwd(), 'public', finalUrl);
        });

        const { browser, context } = await this.getContext(username, headless);
        const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
        const handle = this.normalizeHandle(username);

        // Intercept file chooser
        page.on('filechooser', async (fileChooser) => {
            await fileChooser.setFiles([absoluteImagePaths[0]]);
        });

        try {
            await this.verifyAccountMatch(context, handle);

            await page.goto('https://www.instagram.com/create/select/', { waitUntil: 'networkidle' });

            const isLoginPage = await page.locator('input[name="username"], :text-is("Log in"), :text-is("Entrar"), :text-is("Usar outro perfil")').first().isVisible({ timeout: 3000 });
            if (isLoginPage) {
                await context.close();
                await browser.close();
                const autoLoginSuccess = await this.attemptAutoLogin(username);
                if (!autoLoginSuccess) {
                    throw new Error("Sessão expirada. (Auto-login falhou/sem senha). Por favor, vá em Configurações > Contas e reconecte o Instagram manualmente.");
                }
                return await this.publishPost(username, imageUrls, caption, headless);
            }

            await page.waitForTimeout(2000);

            // Upload do arquivo (Primeira imagem)
            const fileInput = page.locator('input[type="file"]').first();
            try {
                await fileInput.waitFor({ state: 'attached', timeout: 5000 });
                await fileInput.evaluate((el: HTMLInputElement) => el.multiple = true);
                await fileInput.setInputFiles([absoluteImagePaths[0]]);
            } catch (e) {
                await page.goto('https://www.instagram.com/create/select/', { waitUntil: 'networkidle' });
                await page.waitForTimeout(2000);
                const retryInput = page.locator('input[type="file"]').first();
                await retryInput.waitFor({ state: 'attached', timeout: 5000 });
                await retryInput.evaluate((el: HTMLInputElement) => el.multiple = true);
                await retryInput.setInputFiles([absoluteImagePaths[0]]);
            }
            await page.waitForTimeout(3000);
            
            // Expandir a foto base
            try {
                const expandBtn = page.locator('button:has-text("Expandir"), button:has-text("Expand")').first();
                if (await expandBtn.isVisible({ timeout: 2000 })) await expandBtn.click({ force: true });
                else await page.mouse.click(28, 440);
                await page.waitForTimeout(1000);
            } catch (e) { }

            // Lógica CARROSSEL: Inserir as imagens adicionais se existirem
            if (absoluteImagePaths.length > 1) {
                
                const gallerySelectors = [
                    'button[aria-label="Open Media Gallery"]',
                    'button[aria-label="Abrir galeria de mídia"]',
                    'button[aria-label="Select multiple"]', 
                    'button[aria-label="Selecionar vários"]',
                    'svg[aria-label="Select Multiple"]',
                    'svg[aria-label="Selecionar vários"]',
                    'div[role="button"]:has(svg[aria-label="Selecionar vários"])'
                ];
                
                let galleryBtn = null;
                for (const sel of gallerySelectors) {
                    try {
                        const btn = page.locator(sel).first();
                        if (await btn.isVisible({ timeout: 3000 })) {
                            galleryBtn = btn;
                            break;
                        }
                    } catch (e) { }
                }

                if (galleryBtn) {
                    await galleryBtn.click({ force: true });
                    await page.waitForTimeout(2000);
                    
                    const addSelectors = [
                        'button[aria-label="Add"]',
                        'button[aria-label="Adicionar"]',
                        'svg[aria-label="Plus icon"]',
                        'svg[aria-label="Adicionar mídia"]'
                    ];
                    
                    let addBtn = null;
                    for (const sel of addSelectors) {
                        const btn = page.locator(sel).first();
                        if (await btn.isVisible({ timeout: 3000 })) {
                            addBtn = btn;
                            break;
                        }
                    }

                    if (addBtn) {
                        const [multiFileChooser] = await Promise.all([
                            page.waitForEvent('filechooser'),
                            addBtn.click({ force: true })
                        ]);
                        await multiFileChooser.setFiles(absoluteImagePaths.slice(1));
                        await page.waitForTimeout(3000);
                    } else {
                        console.warn('[InstagramService] Botão "+" não localizado na galeria do Carrossel.');
                    }
                } else {
                    console.warn('[InstagramService] Aviso: Ícone de Galeria (Carrossel) não encontrado na tela.');
                }
            }

            // Next steps
            let nextClicked = 0;
            for (let i = 0; i < 5; i++) {
                await page.waitForTimeout(2500);
                const captionCheck = page.locator('div[aria-label*="caption"], div[aria-label*="Legenda"], div[aria-label*="Write a caption"], div[aria-label*="Escreva uma legenda"]').first();
                if (await captionCheck.isVisible({ timeout: 1000 })) break;

                const nextSelectors = [
                    'div[role="dialog"] button:has-text("Next")',
                    'div[role="dialog"] button:has-text("Próximo")',
                    'div[role="dialog"] button:has-text("Avançar")',
                    'button:has-text("Next")',
                    'button:has-text("Próximo")',
                    'button:has-text("Avançar")'
                ];
                let foundNext = false;
                for (const sel of nextSelectors) {
                    const nextBtn = page.locator(sel).last();
                    if (await nextBtn.isVisible({ timeout: 1500 })) {
                        await nextBtn.click({ force: true });
                        nextClicked++;
                        foundNext = true;
                        break;
                    }
                }
                if (!foundNext && nextClicked > 0) break;
            }

            // Inserir a legenda
            const captionSelectors = [
                'div[aria-label*="Write a caption"]',
                'div[aria-label*="Escreva uma legenda"]',
                'div[role="textbox"]',
                'div[contenteditable="true"]'
            ];

            let captionField = null;
            for (const sel of captionSelectors) {
                const el = page.locator(sel).first();
                if (await el.isVisible({ timeout: 2000 })) {
                    captionField = el;
                    break;
                }
            }

            if (captionField) {
                await captionField.click({ timeout: 3000 });
                await page.keyboard.type(caption, { delay: 10 });
            } else {
                await page.keyboard.press('Tab');
                await page.waitForTimeout(500);
                await page.keyboard.type(caption, { delay: 10 });
            }

            await page.waitForTimeout(1000);

            // Compartilhar
            let shared = false;
            const shareSelectors = ['text="Compartilhar"', 'text="Share"', 'button:has-text("Compartilhar")', 'button:has-text("Share")'];
            for (const sel of shareSelectors) {
                const btn = page.locator(sel).last();
                if (await btn.isVisible({ timeout: 3000 })) {
                    await btn.click({ force: true });
                    shared = true;
                    break;
                }
            }
            if (!shared) throw new Error('Botão Compartilhar não encontrado.');

            await page.waitForTimeout(5000);
            const sessionPath = path.join(SESSIONS_DIR, `${handle}.json`);
            await context.storageState({ path: sessionPath });

            return true;
        } catch (error: unknown) {
            console.error("Instagram Bot Error:", error instanceof Error ? error.message : String(error));
            throw error;
        } finally {
            await context.close();
            await browser.close();
        }
    }

    static async publishReel(username: string, videoUrl: string, caption: string, headless: boolean = false): Promise<boolean> {
        const cleanUrl = videoUrl.startsWith('/') ? videoUrl.slice(1) : videoUrl;
        const finalUrl = cleanUrl.includes('/') ? cleanUrl : `uploads/${cleanUrl}`;
        const absolutePath = path.join(process.cwd(), 'public', finalUrl);

        const { browser, context } = await this.getContext(username, headless, true);
        const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
        const handle = this.normalizeHandle(username);

        // Intercept file chooser requests directly for safety
        page.on('filechooser', async (fileChooser) => {
            await fileChooser.setFiles(absolutePath).catch(() => {});
        });

        try {
            await this.verifyAccountMatch(context, handle);

            await page.goto('https://www.instagram.com/create/select/', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => { });

            const isLoginPage = await page.locator('input[name="username"], :text-is("Log in"), :text-is("Entrar"), :text-is("Usar outro perfil")').first().isVisible({ timeout: 3000 });
            if (isLoginPage) {

                await context.close();
                await browser.close();

                const autoLoginSuccess = await this.attemptAutoLogin(username, headless);

                if (!autoLoginSuccess) {
                    throw new Error("Sessão expirada. (Auto-login falhou/sem senha). Por favor, contecte novamente.");
                }

                return await this.publishReel(username, videoUrl, caption, headless);
            }

            await page.waitForTimeout(2000);

            const fileInput = page.locator('input[type="file"]').first();
            try {
                await fileInput.waitFor({ state: 'attached', timeout: 5000 });
                // Force video support overrides just in case
                await fileInput.evaluate((el: HTMLInputElement) => {
                    el.removeAttribute('accept');
                    el.setAttribute('accept', 'video/mp4,video/quicktime,video/x-m4v,video/*,image/*');
                });
                await fileInput.setInputFiles(absolutePath);
            } catch (e) {
                await page.goto('https://www.instagram.com/create/select/', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => { });
                await page.waitForTimeout(3000);
                
                const retryInput = page.locator('input[type="file"]').first();
                await retryInput.waitFor({ state: 'attached', timeout: 5000 });
                await retryInput.evaluate((el: HTMLInputElement) => {
                    el.removeAttribute('accept');
                    el.setAttribute('accept', 'video/mp4,video/quicktime,video/x-m4v,video/*,image/*');
                });
                await retryInput.setInputFiles(absolutePath);
            }
            
            await page.waitForTimeout(6000); // Vídeos grandes demoram pra bufferizar

            const nextSelectors = ['text="Next"', 'text="Próximo"', 'text="Avançar"'];
            for (let i = 0; i < 3; i++) {
                await page.waitForTimeout(2000);
                let clicked = false;
                for (const sel of nextSelectors) {
                    const btn = page.locator(sel).last();
                    if (await btn.isVisible({ timeout: 1500 })) {
                        await btn.click({ force: true });
                        clicked = true;
                        break;
                    }
                }
                if (!clicked && i > 0) break;
            }

            await page.waitForTimeout(2000);

            if (caption && caption.trim() !== '') {
                const captionSelectors = [
                    'div[aria-label="Write a caption..."]',
                    'div[aria-label="Escreva uma legenda..."]',
                    'div[aria-label="Escribe un pie de foto..."]',
                    'div[contenteditable="true"]',
                    'textarea[aria-label="Write a caption..."]',
                    'textarea[aria-label="Escreva uma legenda..."]',
                ];

                let captionClicked = false;
                for (const sel of captionSelectors) {
                    const el = page.locator(sel).first();
                    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                        await el.click();
                        await page.waitForTimeout(500);
                        captionClicked = true;
                        break;
                    }
                }

                if (!captionClicked) {
                    console.warn("[InstagramService] Campo de legenda não encontrado por seletor. Tentando Tab...");
                    await page.keyboard.press('Tab');
                    await page.waitForTimeout(500);
                }

                await page.keyboard.type(caption, { delay: 5 });
            }

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
                await page.keyboard.press('Tab');
                await page.waitForTimeout(500);
                await page.keyboard.press('Tab');
                await page.waitForTimeout(500);
                await page.keyboard.press('Enter');
            }

            await page.waitForTimeout(8000);

            const sessionPath = path.join(SESSIONS_DIR, `${handle}.json`);
            await context.storageState({ path: sessionPath });

            return true;
        } catch (error: unknown) {
            console.error("Instagram Bot Error:", error instanceof Error ? error.message : String(error));
            throw error;
        } finally {
            await context.close();
            await browser.close();
        }
    }

    static async publishStory(username: string, imageUrl: string, headless: boolean = false): Promise<boolean> {
        const cleanUrl = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
        const finalUrl = cleanUrl.includes('/') ? cleanUrl : `uploads/${cleanUrl}`;
        const absolutePath = path.join(process.cwd(), 'public', finalUrl);

        const { browser, context } = await this.getContext(username, headless);
        const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
        const handle = this.normalizeHandle(username);

        // Suplemento para evitar diálogos
        page.on('filechooser', async (fileChooser) => {
            await fileChooser.setFiles(absolutePath);
        });

        try {
            await this.verifyAccountMatch(context, handle);
            await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle' });

            // Checa se está na tela de login
            const isLoginPage = await page.locator('input[name="username"], :text-is("Log in"), :text-is("Entrar"), :text-is("Usar outro perfil")').first().isVisible({ timeout: 3000 });
            if (isLoginPage) {

                await context.close();
                await browser.close();

                const autoLoginSuccess = await this.attemptAutoLogin(username);

                if (!autoLoginSuccess) {
                    throw new Error("Sessão expirada. (Auto-login falhou/sem senha). Por favor, vá em Configurações > Contas e reconecte o Instagram manualmente.");
                }

                return await this.publishStory(username, imageUrl, headless);
            }

            await page.waitForTimeout(2000);

            // ATENÇÃO: Nunca clicar em "New Post" (o botão + inferior) para Stories, 
            // porque no desktop mobile-view ele pode abrir direto o upload de Feed!

            let clickedAddStory = false;
            try {
                // Tenta clicar no botão "Seu story" clássico da tela inicial
                const addStoryBtn = page.locator('button:has-text("Add to your story"), button:has-text("Adicionar ao seu story"), [aria-label="Add to your story"], button:has-text("Seu story")').first();
                if (await addStoryBtn.isVisible({ timeout: 2000 })) {
                    await addStoryBtn.click({ force: true });
                    clickedAddStory = true;
                }
            } catch (e) { }



            if (!clickedAddStory) {
                // Último recurso forçado (pode cair no feed dependendo do cache do React do Insta)
                await page.goto('https://www.instagram.com/create/story/', { waitUntil: 'networkidle' });
            }

            await page.waitForTimeout(2000);

            // Garantia final: se o Instagram nos jogou para a tela de Feed, forçamos o clique na aba "Story"
            try {
                const storyTab = page.locator('span:has-text("Story"), a:has-text("Story"), div[role="tab"]:has-text("Story")').first();
                if (await storyTab.isVisible({ timeout: 2000 })) {
                    await storyTab.click({ force: true });
                    await page.waitForTimeout(1000);
                }
            } catch (e) { }
            const fileInput = page.locator('input[type="file"]').first();
            await fileInput.setInputFiles(absolutePath);
            await page.waitForTimeout(8000);

            // Tenta clicar no botão final de compartilhar
            const shareStory = page.locator('button:has-text("Compartilhar story"), button:has-text("Add to your story"), button:has-text("Seu story"), [role="button"]:has-text("Compartilhar story")').last();

            let shared = false;
            try {
                if (await shareStory.isVisible({ timeout: 5000 })) {
                    await shareStory.click({ force: true });
                    shared = true;
                } else {
                    // Fallback para clique em coordenada (centro inferior do S24 Ultra)
                    await page.mouse.click(206, 895);
                    shared = true;
                }
            } catch (e) {
                console.error("Erro ao clicar no botão de compartilhar story:", e);
                // Tenta coordenada de qualquer forma
                await page.mouse.click(206, 895);
            }

            // AGUARDAR O UPLOAD CONCLUIR
            // Stories demoram mais para processar que posts comuns.
            await page.waitForTimeout(15000);

            // Salva a sessão atualizada
            const sessionPath = path.join(SESSIONS_DIR, `${handle}.json`);
            await context.storageState({ path: sessionPath });

            return true;
        } catch (error: unknown) {
            console.error("Instagram Bot Error:", error instanceof Error ? error.message : String(error));
            throw error;
        } finally {
            await context.close();
            await browser.close();
        }
    }

    static async batchRespondToComments(username: string, replies: { postShortCode: string, commentId: string, text: string, ownerUsername?: string }[], headless: boolean = false): Promise<{ success: boolean, results: { commentId: string, status: string, error?: string }[] }> {
        const { browser, context } = await this.getContext(username, headless);
        const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
        const handle = this.normalizeHandle(username);
        const results: { commentId: string, status: string, error?: string }[] = [];

        try {
            await this.verifyAccountMatch(context, handle);

            for (const reply of replies) {
                try {
                    let targetUrl = `https://www.instagram.com/p/${reply.postShortCode}/`;
                    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
                    await page.waitForTimeout(2000);

                    if (await page.locator('text="Página não encontrada"').isVisible()) {
                        await page.goto(`https://www.instagram.com/reels/${reply.postShortCode}/`, { waitUntil: 'networkidle' });
                    }

                    const commentTriggers = ['svg[aria-label="Comment"]', 'svg[aria-label="Comentar"]', 'span:has-text("Comentários")'];
                    for (const sel of commentTriggers) {
                        const btn = page.locator(sel).first();
                        if (await btn.isVisible({ timeout: 2000 })) { await btn.click(); break; }
                    }

                    let replyBtn = null;
                    if (reply.ownerUsername) {
                        const author = page.locator(`a[href*="/${reply.ownerUsername}/"]`).first();
                        if (await author.isVisible({ timeout: 4000 })) {
                            const container = page.locator(`div:has(a[href*="/${reply.ownerUsername}/"])`).last();
                            replyBtn = container.locator('span:has-text("Responder"), button:has-text("Responder"), text="Reply"').first();
                        }
                    }

                    if (!replyBtn || !(await replyBtn.isVisible())) {
                        replyBtn = page.locator('span:has-text("Responder"), text="Reply"').first();
                    }

                    if (await replyBtn.isVisible({ timeout: 4000 })) {
                        await replyBtn.click({ force: true });
                        await page.waitForTimeout(1000);
                        await page.keyboard.insertText(reply.text);
                        await page.waitForTimeout(1000);

                        const postBtn = page.locator('text="Publicar", text="Post"').last();
                        await postBtn.click({ force: true });
                        results.push({ commentId: reply.commentId, status: 'sent' });
                        await page.waitForTimeout(5000);
                    } else throw new Error("Botão Responder não encontrado.");
                } catch (err: unknown) {
                    results.push({ commentId: reply.commentId, status: 'error', error: err instanceof Error ? err.message : String(err) });
                }
            }
            return { success: true, results };
        } finally {
            await context.close();
            await browser.close();
        }
    }

    static async fetchProfileAvatar(targetHandle: string): Promise<string | null> {
        const { browser, context } = await this.getContext(undefined, true);
        const page = await context.newPage();
        const handle = this.normalizeHandle(targetHandle);
        try {
            await page.goto(`https://www.instagram.com/${handle}/`, { waitUntil: 'networkidle', timeout: 30000 });

            // Aguardo um pouco para garantir renderização de JS
            await page.waitForTimeout(3000);

            // Verificamos se caiu na tela de login
            const isLogin = await page.locator('input[name="username"]').isVisible({ timeout: 2000 });
            if (isLogin) {
                console.warn(`[InstagramService] Caiu na tela de login ao buscar @${handle}. Usando sessão padrão se existir...`);
                // Se cair na tela de login, o fetch anônimo falhou. 
                // Não vamos tentar logar aqui para não travar, retornamos null.
                return null;
            }

            // Seletores variados para a imagem de perfil
            const selectors = [
                'header img',
                `img[alt*="${handle}"]`,
                'img[alt*="profile picture"]',
                'img[alt*="perfil"]'
            ];

            for (const selector of selectors) {
                try {
                    const avatarImg = page.locator(selector).first();
                    if (await avatarImg.isVisible({ timeout: 3000 })) {
                        const avatarUrl = await avatarImg.getAttribute('src');
                        if (avatarUrl && avatarUrl.startsWith('http')) {
                            return avatarUrl;
                        }
                    }
                } catch (e) { }
            }

            return null;
        } catch (e: unknown) {
            console.error(`[InstagramService] Erro ao buscar avatar para @${handle}:`, e instanceof Error ? e.message : String(e));
            return null;
        } finally {
            await context.close();
            await browser.close();
        }
    }
}
