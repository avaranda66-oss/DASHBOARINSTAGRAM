const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const handleArg = process.argv[2] || "";
const handle = handleArg.replace('@', '');
const password = process.argv[3];
const headlessArg = process.argv[4] === 'true';

const SESSIONS_DIR = path.join(process.cwd(), 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

const SESSION_FILE = handle
    ? path.join(SESSIONS_DIR, `${handle}.json`)
    : path.join(process.cwd(), '.instagram_session.json');

const LOG_FILE = path.join(process.cwd(), 'public', 'login-log.txt');
function log(msg) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}\n`;
    console.log(msg);
    fs.appendFileSync(LOG_FILE, line);
}

log(`Argumentos recebidos: Handle=${handle}, PasswordProvided=${!!password && password !== "undefined" && password !== "null"}`);

// Limpa log anterior
fs.writeFileSync(LOG_FILE, `--- Início do Log para ${handle} ---\n`);

async function run() {
    log("Iniciando Playwright para Login Manual...");

    // Em vez de launchPersistentContext (que trava se o Chrome normal já estiver aberto), usamos launch simples + storage_state
    const browser = await chromium.launch({
        channel: 'chrome',
        headless: headlessArg,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--no-sandbox'
        ]
    });

    const contextOptions = {
        viewport: { width: 412, height: 915 },
        userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36"
    };

    if (fs.existsSync(SESSION_FILE)) {
        log(`Usando sessão existente: ${SESSION_FILE}`);
        contextOptions.storageState = SESSION_FILE;
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    if (password) {
        log(`Auto-login ativado para ${handle}. Navegando para tela de login explícita...`);
        await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded' });
    } else {
        log("Navegando para instagram.com...");
        await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
    }

    log("Aguardando interação...");

    let attemptedAutoLogin = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 * ~2s = ~60s
    const startTime = Date.now();

    // Fica em loop verificando se o login foi feito
    while (attempts < maxAttempts) {
        attempts++;
        try {
            await page.waitForTimeout(2000);
            const currentUrl = page.url();
            log(`[Tentativa ${attempts}/${maxAttempts}] Status: URL=${currentUrl}`);

            // Se passarem mais de 90 segundos no total, aborta por precaução
            if (Date.now() - startTime > 90000) {
                log("ERRO: Tempo limite de login (90s) excedido. Abortando.");
                await browser.close().catch(() => { });
                process.exit(1);
            }

            await page.screenshot({ path: path.join(process.cwd(), 'public', 'login-debug.png') }).catch(() => { });

            // Tenta clicar em botões de "Log in as" ou no nome do usuário se aparecerem
            if (handle && !password) {
                try {
                    const cleanHandle = handle.toLowerCase();
                    // Seletores para o seletor de contas do Instagram
                    const selectors = [
                        `text="${cleanHandle}"`
                    ];

                    for (const sel of selectors) {
                        const element = page.locator(sel).first();
                        if (await element.isVisible({ timeout: 500 })) {
                            log(`Conta "${cleanHandle}" visível na tela.`);

                            // Tenta obter as coordenadas exatas do elemento para clicar
                            const box = await element.boundingBox();
                            if (box) {
                                // Clica mais para a direita para evitar a foto de perfil
                                const clickX = box.x + (box.width * 0.8);
                                const clickY = box.y + (box.height / 2);
                                log(`Clicando nas coordenadas: X=${clickX}, Y=${clickY}`);
                                await page.mouse.click(clickX, clickY);
                                log(`Clique realizado para ${cleanHandle}`);
                            } else {
                                await element.click({ force: true }).catch(() => { });
                            }
                            break;
                        }
                    }
                } catch (e) {
                    log(`Erro ao tentar clique automático: ${e.message}`);
                }
            }

            await context.storageState({ path: SESSION_FILE });

            // AUTO-LOGIN COM SENHA
            if (password && !attemptedAutoLogin) {
                try {
                    let isLoginPage = await page.locator('input[name="password"]').isVisible({ timeout: 500 });

                    if (!isLoginPage) {
                        try {
                            const cleanHandle = handle.toLowerCase();
                            const accountBtn = page.locator(`text="${cleanHandle}"`).first();
                            if (await accountBtn.isVisible({ timeout: 1000 })) {
                                log(`Conta salva detectada na tela. Clicando em ${cleanHandle}...`);

                                const box = await accountBtn.boundingBox();
                                if (box) {
                                    // Clique estratégico no centro-direita do card da conta
                                    await page.mouse.click(box.x + (box.width * 0.7), box.y + (box.height / 2));
                                } else {
                                    await accountBtn.click({ force: true });
                                }

                                await page.waitForTimeout(3000);
                                isLoginPage = await page.locator('input[name="password"]').isVisible({ timeout: 1000 });
                            }
                        } catch (e) {
                            log(`Erro ao tentar selecionar conta: ${e.message}`);
                        }
                    }

                    if (!isLoginPage) {
                        const hasSession = (await context.cookies()).some(c => c.name === 'sessionid');
                        const hasFeedElements = await page.locator('article, svg[aria-label="Home"], svg[aria-label="Página inicial"]').count() > 0;
                        if (hasSession && hasFeedElements) {
                            log(`Sessão já ativa e Feed detectado. Pulando injeção de senha.`);
                            isLoginPage = false;
                            attemptedAutoLogin = true;
                        } else {
                            try {
                                const revealBtn = page.locator(':text-is("Log in"), :text-is("Entrar"), button:has-text("Log in"), button:has-text("Entrar")').first();
                                if (await revealBtn.isVisible({ timeout: 500 })) {
                                    log(`Botão Log In genérico detectado. Clicando...`);
                                    await revealBtn.click({ force: true }).catch(() => { });
                                    await page.waitForTimeout(2000);
                                    isLoginPage = await page.locator('input[name="password"]').isVisible({ timeout: 500 });
                                }
                            } catch (e) { }
                        }
                    }

                    if (!isLoginPage) {
                        log(`Nenhum botão de revelação funcionou. Tirando screenshot de debug...`);
                        try {
                            await page.screenshot({ path: 'public/debug-login.png' });
                            fs.writeFileSync('public/debug-login.html', await page.content());
                        } catch (e) { }
                    }

                    if (isLoginPage) {
                        log(`Tela de login detectada. Inserindo credenciais automáticas...`);

                        // Ocasionalmente o Instagram já preencheu o username quando clicamos no card da conta cacheada
                        const isUsernameVisible = await page.locator('input[name="username"]').isVisible({ timeout: 500 });
                        if (isUsernameVisible) {
                            await page.locator('input[name="username"]').fill(handle);
                        }
                        await page.locator('input[name="password"]').fill(password);
                        await page.locator('button[type="submit"], :text-is("Log in"), :text-is("Entrar")').first().click();
                        log(`Clique em Entrar realizado. Aguardando processamento...`);
                        attemptedAutoLogin = true; // Previne ficar clicando repetidamente
                        await page.waitForTimeout(5000); // Dá tempo para o Instagram processar o login

                        // Lidar com popups "Salvar informações?" ou "Ativar notificações?"
                        try {
                            const notNowBtn = page.locator('button:has-text("Not now"), button:has-text("Agora não"), :text-is("Not now"), :text-is("Agora não")').first();
                            if (await notNowBtn.isVisible({ timeout: 3000 })) {
                                log(`Popup interceptado. Clicando em "Agora Não"...`);
                                await notNowBtn.click({ force: true });
                                await page.waitForTimeout(2000);
                            }
                        } catch (e) { }

                        continue;
                    }
                } catch (e) {
                    log("Erro no bloco de auto-login: " + e.message);
                }
            }

            // Verifica se os cookies já tem o sessionid (marca de login de fato)
            const cookies = await context.cookies();
            const hasSession = cookies.some(c => c.name === 'sessionid');

            // CRITÉRIO DE SUCESSO:
            // 1. Tem cookie de sessão
            // 2. Aparece o ícone de Home ou de Nova Publicação (indica que entrou)
            // 3. NÃO estamos em páginas de /accounts/
            // 4. A tela NÃO tem o texto "Usar outro perfil" (que aparece na lista de contas)
            const isAccountsList = await page.locator('text="Usar outro perfil", text="Log in to another account", text="Criar nova conta"').isVisible({ timeout: 500 });
            const isPasswordVisible = await page.locator('input[name="password"]').isVisible({ timeout: 500 });
            const isUsernameVisible = await page.locator('input[name="username"]').isVisible({ timeout: 500 });

            // Feed elements: article, or bottom nav SVGs. Do NOT use main[role="main"] because the login page has it.
            const hasFeedElements = await page.locator('article, svg[aria-label="Home"], svg[aria-label="Página inicial"]').count() > 0;

            const isFullyLoggedIn =
                hasSession &&
                !currentUrl.includes('/accounts/login') &&
                !isAccountsList &&
                !isPasswordVisible &&
                !isUsernameVisible &&
                hasFeedElements;

            if (isFullyLoggedIn) {
                log("[OK] Login CONFIRMADO! Finalizando...");

                // EXTRAÇÃO DA FOTO DE PERFIL
                try {
                    const profilePic = await page.locator('img[alt*="profile picture"], img[alt*="foto do perfil"]').first();
                    if (await profilePic.isVisible({ timeout: 2000 })) {
                        const avatarUrl = await profilePic.getAttribute('src');
                        if (avatarUrl) {
                            console.log(`AVATAR_URL|${avatarUrl}`);
                        }
                    }
                } catch (e) {
                    log(`Erro ao extrair foto de perfil: ${e.message}`);
                }

                await page.waitForTimeout(3000);
                await context.storageState({ path: SESSION_FILE });
                await browser.close();
                process.exit(0);
            }
        } catch (e) {
            if (e.message && (e.message.includes('closed') || e.message.includes('target closed'))) {
                log("Navegador fechado. Encerrando robô.");
                process.exit(0);
            }
            // Outros erros a gente ignora e continua o loop
        }
    }

    log("ERRO: O loop de login esgotou todas as tentativas sem confirmar o sucesso.");
    await browser.close().catch(() => { });
    process.exit(1);
}

run().catch(err => {
    console.error("Erro fatal:", err);
    process.exit(1);
});
