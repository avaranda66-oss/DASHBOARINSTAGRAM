import { chromium, type BrowserContext } from 'playwright';
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
    private static async getContext(username?: string, headless: boolean = true, isDesktop: boolean = false): Promise<{ browser: any, context: BrowserContext }> {
        if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

        const browser = await chromium.launch({
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            headless: headless,
            args: ['--disable-blink-features=AutomationControlled', '--disable-infobars', '--no-sandbox']
        });

        const contextOptions: any = isDesktop ? {
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
                    console.log(`[InstagramService] Avatar detectado para @${targetUsername}: ${avatarUrl.slice(0, 40)}...`);
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
        } catch (e: any) {
            console.log(`[InstagramService] Não foi possível atualizar o avatar agora (opcional): ${e instanceof Error ? e.message : String(e)}`);
        }

        console.log(`Instagram Service: Verificação de segurança OK para @${targetUsername} (Logado: ${currentHandle || 'nenhum'})`);
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
            console.log(`Instagram Service: Tentando auto-login para @${handle}`);
            const account = await db.account.findUnique({
                where: { providerAccountId: handle.replace('@', '').toLowerCase() }
            }) as any;

            if (!account || !account.password) {
                console.log(`Instagram Service: Erro no Auto-Login. Conta encontrada? ${!!account}. Senha preenchida? ${!!account?.password}`);
                return false;
            }

            console.log(`Instagram Service: Senha para @${handle} recuperada com sucesso do banco de dados (tamanho: ${account.password.length} chars).`);

            return new Promise((resolve) => {
                const { exec } = require('child_process');
                const cwd = process.cwd();
                // Passa a senha como argumento para o script
                const command = `node scripts/playwright-login.js ${handle.replace('@', '')} "${account.password}" ${headless}`;

                console.log(`Instagram Service: Executando script de auto-login em background...`);
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
                        console.log(`Instagram Service: Auto-login concluído com aparente sucesso.`);
                        resolve(true);
                    }
                });
            });
        } catch (e) {
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

        // Suplemento para evitar que diálogos de sistema (file picker) apareçam e travem em modo headful
        page.on('filechooser', async (fileChooser) => {
            console.log("Instagram Service: Interceptando diálogo de seleção de arquivo...");
            await fileChooser.setFiles(absoluteImagePaths);
        });

        try {
            await this.verifyAccountMatch(context, handle);

            // Navega direto para a tela de criação (pula homepage redundante + busca de botão que nunca acha)
            console.log('[InstagramService] Navegando direto para /create/select/...');
            await page.goto('https://www.instagram.com/create/select/', { waitUntil: 'networkidle' });

            // Checa se caiu na tela de login (sessão expirada)
            const isLoginPage = await page.locator('input[name="username"], :text-is("Log in"), :text-is("Entrar"), :text-is("Usar outro perfil")').first().isVisible({ timeout: 3000 });
            if (isLoginPage) {
                console.log(`Aviso: Sessão expirada para @${username}. Tentando auto-login...`);

                await context.close();
                await browser.close();

                const autoLoginSuccess = await this.attemptAutoLogin(username);

                if (!autoLoginSuccess) {
                    throw new Error("Sessão expirada. (Auto-login falhou/sem senha). Por favor, vá em Configurações > Contas e reconecte o Instagram manualmente.");
                }

                return await this.publishPost(username, imageUrls, caption, headless);
            }

            await page.waitForTimeout(2000);

            // Tenta selecionar "Post" no menu de tipo
            try {
                const postMenuOption = page.locator('span:has-text("Post"), span:has-text("Publicação")').first();
                if (await postMenuOption.isVisible({ timeout: 2000 })) await postMenuOption.click({ force: true });
            } catch (e) { }

            // Upload do arquivo
            const fileInput = page.locator('input[type="file"]').first();
            try {
                await fileInput.waitFor({ state: 'attached', timeout: 5000 });
                await fileInput.evaluate((el: HTMLInputElement) => el.multiple = true);
                await fileInput.setInputFiles(absoluteImagePaths);
            } catch (e) {
                console.log('[InstagramService] File input não encontrado, tentando via /create/select/');
                await page.goto('https://www.instagram.com/create/select/', { waitUntil: 'networkidle' });
                await page.waitForTimeout(2000);
                const retryInput = page.locator('input[type="file"]').first();
                await retryInput.waitFor({ state: 'attached', timeout: 5000 });
                await retryInput.evaluate((el: HTMLInputElement) => el.multiple = true);
                await retryInput.setInputFiles(absoluteImagePaths);
            }
            await page.waitForTimeout(3000);
            console.log('[InstagramService] Arquivo(s) carregado(s). Avançando etapas...');

            // Expandir
            try {
                const expandBtn = page.locator('button:has-text("Expandir"), button:has-text("Expand")').first();
                if (await expandBtn.isVisible({ timeout: 2000 })) await expandBtn.click({ force: true });
                else await page.mouse.click(28, 440);
            } catch (e) { }

            // Next steps — clica "Próximo/Next" até chegar na tela de legenda
            let nextClicked = 0;
            for (let i = 0; i < 5; i++) {
                await page.waitForTimeout(2500);

                // Verifica se já chegamos na tela de legenda
                const captionCheck = page.locator('div[aria-label*="caption"], div[aria-label*="Legenda"], div[aria-label*="Write a caption"], div[aria-label*="Escreva uma legenda"]').first();
                try {
                    if (await captionCheck.isVisible({ timeout: 1000 })) {
                        console.log(`[InstagramService] Tela de legenda detectada após ${nextClicked} cliques em Next.`);
                        break;
                    }
                } catch (e) { }

                // Tenta clicar em Next/Próximo/Avançar
                const nextSelectors = [
                    'div[role="dialog"] button:has-text("Next")',
                    'div[role="dialog"] button:has-text("Próximo")',
                    'div[role="dialog"] button:has-text("Avançar")',
                    'text="Next"',
                    'text="Próximo"',
                    'text="Avançar"',
                ];
                let foundNext = false;
                for (const sel of nextSelectors) {
                    try {
                        const nextBtn = page.locator(sel).last();
                        if (await nextBtn.isVisible({ timeout: 1500 })) {
                            await nextBtn.click({ force: true });
                            nextClicked++;
                            foundNext = true;
                            console.log(`[InstagramService] Clicou Next (${nextClicked}x) via: ${sel}`);
                            break;
                        }
                    } catch (e) { }
                }
                if (!foundNext && nextClicked > 0) {
                    console.log('[InstagramService] Nenhum botão Next encontrado, assumindo que chegamos ao final.');
                    break;
                }
            }

            // Caption - O Instagram PT-BR não expõe o campo de legenda com seletores padrão.
            // A área de legenda fica entre o avatar do perfil e a miniatura da imagem no topo.
            // Estratégia: clicar na área onde o campo está e depois digitar.

            // Primeiro, tenta seletores padrão rapidamente
            const captionSelectors = [
                'div[aria-label*="Write a caption"]',
                'div[aria-label*="Escreva uma legenda"]',
                'div[aria-label*="caption"]',
                'div[aria-label*="legenda"]',
                'div[role="textbox"]',
                'div[contenteditable="true"]',
            ];

            let captionField = null;
            for (const sel of captionSelectors) {
                try {
                    const el = page.locator(sel).first();
                    if (await el.isVisible({ timeout: 1500 })) {
                        captionField = el;
                        console.log(`[InstagramService] Campo de legenda encontrado via seletor: ${sel}`);
                        break;
                    }
                } catch (e) { }
            }

            // Se nenhum seletor funcionou, usa Tab + clique para ativar o campo
            if (!captionField) {
                console.log('[InstagramService] Seletores falharam. Tentando ativar campo via Tab/clique...');

                // Estratégia 1: Tab para navegar até o campo de legenda
                // No Instagram, após carregar a tela de detalhes, o campo de legenda
                // é um dos primeiros elementos focáveis
                for (let tabAttempt = 0; tabAttempt < 8; tabAttempt++) {
                    await page.keyboard.press('Tab');
                    await page.waitForTimeout(300);

                    // Verifica se o elemento ativo agora é editável
                    const isEditable = await page.evaluate(() => {
                        const active = document.activeElement;
                        if (!active) return false;
                        return active.getAttribute('contenteditable') === 'true'
                            || active.getAttribute('role') === 'textbox'
                            || active.tagName === 'TEXTAREA';
                    });

                    if (isEditable) {
                        console.log(`[InstagramService] Campo editável focado após ${tabAttempt + 1} Tab(s)`);
                        // Tenta pegar o locator do elemento focado
                        try {
                            const focused = page.locator(':focus').first();
                            if (await focused.isVisible({ timeout: 1000 })) {
                                captionField = focused;
                            }
                        } catch (e) { }
                        break;
                    }
                }

                // Estratégia 2: Clique por coordenadas se Tab não funcionou
                if (!captionField) {
                    console.log('[InstagramService] Tab não encontrou campo editável. Tentando clique por coordenadas...');
                    const viewport = page.viewportSize() || { width: 412, height: 915 };

                    // Tenta múltiplas posições Y na área de legenda
                    for (const tryY of [130, 110, 150, 100]) {
                        const clickX = viewport.width * 0.35;
                        await page.mouse.click(clickX, tryY);
                        await page.waitForTimeout(800);

                        // Verifica se ativou um campo editável
                        const activated = await page.evaluate(() => {
                            const active = document.activeElement;
                            if (!active) return false;
                            return active.getAttribute('contenteditable') === 'true'
                                || active.getAttribute('role') === 'textbox'
                                || active.tagName === 'TEXTAREA';
                        });

                        if (activated) {
                            console.log(`[InstagramService] Campo ativado via clique em y=${tryY}`);
                            try {
                                const focused = page.locator(':focus').first();
                                if (await focused.isVisible({ timeout: 1000 })) {
                                    captionField = focused;
                                }
                            } catch (e) { }
                            break;
                        }
                    }
                }
            }

            // Inserir a legenda
            if (captionField) {
                console.log('[InstagramService] Campo de legenda localizado. Inserindo texto...');
                try {
                    await captionField.click({ timeout: 3000 });
                } catch (e) {
                    try { await captionField.evaluate((el: HTMLElement) => { el.focus(); }); } catch (e2) { }
                }
                await page.waitForTimeout(300);

                // Usa type() que simula teclas reais (mais confiável que insertText)
                await page.keyboard.type(caption, { delay: 5 });
                console.log('[InstagramService] Legenda digitada via type().');
            } else {
                // Último recurso: digita direto no que estiver focado
                console.log('[InstagramService] Campo não identificado. Usando Tab+type como último recurso...');
                // Pressiona Tab uma vez para tentar focar o campo
                await page.keyboard.press('Tab');
                await page.waitForTimeout(500);
                await page.keyboard.type(caption, { delay: 5 });
            }

            console.log('[InstagramService] Legenda inserida com sucesso.');
            await page.waitForTimeout(1000);

            // Share / Compartilhar
            let shareClicked = false;
            for (const shareSel of ['text="Compartilhar"', 'text="Share"']) {
                try {
                    const btn = page.locator(shareSel).last();
                    if (await btn.isVisible({ timeout: 3000 })) {
                        await btn.click({ force: true });
                        shareClicked = true;
                        console.log(`[InstagramService] Botão compartilhar clicado via: ${shareSel}`);
                        break;
                    }
                } catch (e) { }
            }
            if (!shareClicked) {
                // Fallback: procura pelo xpath de botão azul no topo
                console.log('[InstagramService] Botão compartilhar não encontrado via texto. Tentando seletores alternativos...');
                const altShareSelectors = [
                    'div[role="button"]:has-text("Compartilhar")',
                    'div[role="button"]:has-text("Share")',
                    'button:has-text("Compartilhar")',
                    'button:has-text("Share")',
                ];
                for (const sel of altShareSelectors) {
                    try {
                        const btn = page.locator(sel).last();
                        if (await btn.isVisible({ timeout: 2000 })) {
                            await btn.click({ force: true });
                            shareClicked = true;
                            console.log(`[InstagramService] Compartilhar clicado via: ${sel}`);
                            break;
                        }
                    } catch (e) { }
                }
            }
            if (!shareClicked) {
                throw new Error('Botão Compartilhar/Share não encontrado.');
            }
            await page.waitForTimeout(5000);

            // Salva a sessão atualizada após o sucesso
            const sessionPath = path.join(SESSIONS_DIR, `${handle}.json`);
            await context.storageState({ path: sessionPath });

            return true;
        } catch (error: any) {
            console.error("Instagram Bot Error:", error.message);
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
            console.log("[InstagramService] Filechooser disparado. Injetando:", absolutePath);
            await fileChooser.setFiles(absolutePath).catch(() => {});
        });

        try {
            await this.verifyAccountMatch(context, handle);

            console.log('[InstagramService] Navegando direto para /create/select/ no modo Desktop para Reel...');
            await page.goto('https://www.instagram.com/create/select/', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => { });

            const isLoginPage = await page.locator('input[name="username"], :text-is("Log in"), :text-is("Entrar"), :text-is("Usar outro perfil")').first().isVisible({ timeout: 3000 });
            if (isLoginPage) {
                console.log(`Aviso: Sessão expirada para @${username}. Tentando auto-login...`);

                await context.close();
                await browser.close();

                const autoLoginSuccess = await this.attemptAutoLogin(username, headless);

                if (!autoLoginSuccess) {
                    throw new Error("Sessão expirada. (Auto-login falhou/sem senha). Por favor, contecte novamente.");
                }

                return await this.publishReel(username, videoUrl, caption, headless);
            }

            await page.waitForTimeout(2000);

            console.log('[InstagramService] Upload do vídeo Reel...');
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
                console.log('[InstagramService] File input inicial não encontrado. Recarregando via /create/select/ e tentando novamente...');
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
            console.log('[InstagramService] Arquivo(s) carregado(s). Avançando...');

            console.log('[InstagramService] Avançando telas (Desktop)...');
            const nextSelectors = ['text="Next"', 'text="Próximo"', 'text="Avançar"'];
            for (let i = 0; i < 3; i++) {
                await page.waitForTimeout(2000);
                let clicked = false;
                for (const sel of nextSelectors) {
                    const btn = page.locator(sel).last();
                    if (await btn.isVisible({ timeout: 1500 })) {
                        await btn.click({ force: true });
                        clicked = true;
                        console.log(`[InstagramService] Clicou avançar via: ${sel}`);
                        break;
                    }
                }
                if (!clicked && i > 0) break;
            }

            console.log('[InstagramService] Escrevendo legenda...');
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
                console.log(`[InstagramService] Legenda inserida.`);
            }

            console.log('[InstagramService] Compartilhando Reel!');
            const shareSelectors = ['text="Share"', 'text="Compartilhar"'];
            let shared = false;
            for (const sel of shareSelectors) {
                const btn = page.locator(sel).last();
                if (await btn.isVisible({ timeout: 2000 })) {
                    await btn.click({ force: true });
                    shared = true;
                    console.log(`[InstagramService] Compartilhado via: ${sel}`);
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
            console.log("[InstagramService] 🎉 Reel Publicado com sucesso!");

            const sessionPath = path.join(SESSIONS_DIR, `${handle}.json`);
            await context.storageState({ path: sessionPath });

            return true;
        } catch (error: any) {
            console.error("Instagram Bot Error:", error.message);
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
                console.log(`Aviso: Sessão expirada para @${username}. Tentando auto-login...`);

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
            console.log("Arquivo injetado. Aguardando processamento e renderização do preview (8s)...");
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
                    console.log("Aviso: Botão de compartilhar não encontrado por texto. Tentando clique por coordenada...");
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
            console.log("Aguardando conclusão do upload do Story (15s)...");
            await page.waitForTimeout(15000);

            // Salva a sessão atualizada
            const sessionPath = path.join(SESSIONS_DIR, `${handle}.json`);
            await context.storageState({ path: sessionPath });

            return true;
        } catch (error: any) {
            console.error("Instagram Bot Error:", error.message);
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
                } catch (err: any) {
                    results.push({ commentId: reply.commentId, status: 'error', error: err.message });
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
            console.log(`[InstagramService] Buscando perfil de @${handle}...`);
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
                            console.log(`[InstagramService] Avatar capturado via seletor [${selector}]`);
                            return avatarUrl;
                        }
                    }
                } catch (e) { }
            }

            return null;
        } catch (e: any) {
            console.error(`[InstagramService] Erro ao buscar avatar para @${handle}:`, e.message);
            return null;
        } finally {
            await context.close();
            await browser.close();
        }
    }
}
