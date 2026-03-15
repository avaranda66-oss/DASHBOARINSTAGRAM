import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

export interface InstagramHighlight {
    name: string;
    coverUrl: string;
}

export interface HighlightsResult {
    success: boolean;
    highlights: InstagramHighlight[];
    pinnedShortcodes: string[];
    gridOrder: string[];       // Shortcodes na ordem exata do grid real do Instagram
    gridThumbnails: Record<string, string>; // shortcode → URL da imagem real do grid
    screenshotUrl?: string;
    error?: string;
}

const SCREENSHOTS_DIR = path.join(process.cwd(), 'public', 'ig-highlights');
const SESSIONS_DIR = path.join(process.cwd(), 'sessions');
const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hora

/** Retorna cache salvo se ainda for recente */
export function getCachedHighlights(username: string): HighlightsResult | null {
    const handle = username.replace('@', '').toLowerCase();
    const cacheFile = path.join(SCREENSHOTS_DIR, `${handle}-cache.json`);
    try {
        if (!fs.existsSync(cacheFile)) return null;
        const raw = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
        const age = Date.now() - (raw.cachedAt ?? 0);
        if (age > CACHE_MAX_AGE_MS) return null;
        return {
            success: raw.success ?? true,
            highlights: raw.highlights ?? [],
            pinnedShortcodes: raw.pinnedShortcodes ?? [],
            gridOrder: raw.gridOrder ?? [],
            gridThumbnails: raw.gridThumbnails ?? {},
            screenshotUrl: raw.screenshotUrl,
        };
    } catch { return null; }
}

function saveCacheHighlights(username: string, result: HighlightsResult): void {
    const handle = username.replace('@', '').toLowerCase();
    const cacheFile = path.join(SCREENSHOTS_DIR, `${handle}-cache.json`);
    try {
        fs.writeFileSync(cacheFile, JSON.stringify({
            ...result,
            cachedAt: Date.now(),
        }), 'utf-8');
    } catch (err) {
        console.warn('[IGHighlights] Failed to save cache:', err);
    }
}

/**
 * Scrape Instagram profile highlights using Playwright.
 * Uses the SAME session files saved by playwright-login.js (sessions/{handle}.json).
 */
export async function scrapeInstagramHighlights(username: string): Promise<HighlightsResult> {
    if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

    const handle = username.replace('@', '').toLowerCase();
    const sessionFile = path.join(SESSIONS_DIR, `${handle}.json`);

    // Verificar se existe sessão salva do login
    const hasSession = fs.existsSync(sessionFile);
    if (!hasSession) {
        return {
            success: false,
            highlights: [],
            pinnedShortcodes: [],
            gridOrder: [],
            gridThumbnails: {},
            error: `Sessão de login não encontrada para @${handle}. Faça login primeiro via Minha Conta.`,
        };
    }

    let browser;
    try {

        // Usar chromium.launch + storageState (mesmo padrão do playwright-login.js)
        browser = await chromium.launch({
            channel: 'chrome',
            headless: false,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-gpu',
                '--window-position=-2000,-2000', // Janela fora da tela
            ],
        });

        const context = await browser.newContext({
            viewport: { width: 412, height: 915 },
            userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
            storageState: sessionFile,
        });

        const page = await context.newPage();

        // Remover indicador de webdriver
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        await page.goto(`https://www.instagram.com/${handle}/`, {
            waitUntil: 'networkidle',
            timeout: 20000,
        });

        // Esperar carregamento completo do perfil
        await page.waitForTimeout(4000);

        // Fechar popups (login, cookies, notificações)
        for (const text of [
            'Agora não', 'Not now', 'Not Now',
            'Permitir todos os cookies', 'Allow all cookies',
            'Recusar cookies opcionais', 'Decline optional cookies',
        ]) {
            try {
                const btn = page.locator(`button:has-text("${text}")`);
                if (await btn.count() > 0) {
                    await btn.first().click({ timeout: 1500 });
                    await page.waitForTimeout(500);
                }
            } catch { /* ignorar */ }
        }

        await page.waitForTimeout(1500);

        // ─── Screenshot de debug do perfil ─────────────────────────────────
        const debugPath = path.join(SCREENSHOTS_DIR, `${handle}-profile-debug.png`);
        await page.screenshot({ path: debugPath, fullPage: false });

        // ─── Extrair highlights do DOM ──────────────────────────────────────
        const highlights: InstagramHighlight[] = await page.evaluate((profileHandle) => {
            const results: { name: string; coverUrl: string }[] = [];
            const seenUrls = new Set<string>();

            // Estratégia 1: Links para /stories/highlights/
            const highlightLinks = document.querySelectorAll('a[href*="/stories/highlights/"]');

            highlightLinks.forEach(link => {
                const imgs = link.querySelectorAll('img');
                let coverUrl = '';
                let name = '';

                // Pegar a imagem de capa
                imgs.forEach(img => {
                    if (img.src && !seenUrls.has(img.src)) {
                        coverUrl = img.src;
                    }
                });

                // Pegar o nome - pode estar no alt da imagem ou num span
                imgs.forEach(img => {
                    if (img.alt && !img.alt.toLowerCase().includes('profile') && img.alt.length < 30) {
                        name = img.alt.trim();
                    }
                });

                // Se não achou o nome na imagem, buscar no container pai
                if (!name) {
                    const parent = link.parentElement;
                    if (parent) {
                        const allText = parent.querySelectorAll('span, div');
                        for (const el of allText) {
                            const t = (el as HTMLElement).textContent?.trim() ?? '';
                            if (t.length > 0 && t.length < 25 && !t.includes('@') && !t.includes(profileHandle)) {
                                name = t;
                                break;
                            }
                        }
                    }
                }

                if (coverUrl && !seenUrls.has(coverUrl)) {
                    seenUrls.add(coverUrl);
                    results.push({
                        name: name || `Destaque ${results.length + 1}`,
                        coverUrl,
                    });
                }
            });

            // Estratégia 2: Canvas em containers de highlight
            if (results.length === 0) {
                const canvases = document.querySelectorAll('canvas');
                canvases.forEach(canvas => {
                    const nearLink = canvas.closest('a[href*="highlights"]');
                    if (nearLink) {
                        try {
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                            if (dataUrl.length > 100) {
                                results.push({
                                    name: `Destaque ${results.length + 1}`,
                                    coverUrl: dataUrl,
                                });
                            }
                        } catch { /* CORS */ }
                    }
                });
            }

            // Estratégia 3: Imagens circulares na zona de highlights (entre bio e grid)
            if (results.length === 0) {
                const allImgs = document.querySelectorAll('img') as NodeListOf<HTMLImageElement>;
                const profilePics = new Set<string>();

                // Excluir avatar
                document.querySelectorAll('header img, img[alt*="profile picture"], img[alt*="foto do perfil"]').forEach(img => {
                    profilePics.add((img as HTMLImageElement).src);
                });

                allImgs.forEach(img => {
                    if (profilePics.has(img.src)) return;
                    if (!img.src || img.src.includes('data:image/svg')) return;

                    const rect = img.getBoundingClientRect();
                    // Highlights têm imagens circulares de ~56-77px
                    const isCircular = rect.width > 40 && rect.width < 100 && Math.abs(rect.width - rect.height) < 5;
                    // Na zona de highlights (aprox 250-500px do topo na viewport mobile)
                    const isHighlightZone = rect.top > 200 && rect.top < 550;

                    if (isCircular && isHighlightZone && !seenUrls.has(img.src)) {
                        seenUrls.add(img.src);
                        const alt = img.alt?.trim();
                        results.push({
                            name: (alt && alt.length < 25 && !alt.includes(profileHandle)) ? alt : `Destaque ${results.length + 1}`,
                            coverUrl: img.src,
                        });
                    }
                });
            }

            return results;
        }, handle);

        // Processar URLs - usar image proxy para evitar CORS
        const savedHighlights: InstagramHighlight[] = highlights.slice(0, 8).map(hl => ({
            name: hl.name,
            coverUrl: hl.coverUrl.startsWith('data:')
                ? hl.coverUrl
                : `/api/image-proxy?url=${encodeURIComponent(hl.coverUrl)}`,
        }));

        // Se DOM não achou highlights, usar screenshot da seção
        let screenshotUrl: string | undefined;
        if (savedHighlights.length === 0) {
            try {
                const screenshotPath = path.join(SCREENSHOTS_DIR, `${handle}-highlights.png`);
                await page.screenshot({
                    path: screenshotPath,
                    clip: { x: 0, y: 350, width: 412, height: 130 },
                });
                screenshotUrl = `/ig-highlights/${handle}-highlights.png`;
            } catch (ssErr) {
                console.warn('[IGHighlights] Screenshot fallback failed:', ssErr);
            }
        }


        // ─── Extrair ordem REAL do grid (shortcodes na ordem de exibição) ──
        // Scrollar para garantir que o grid está carregado
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(2000);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);

        const gridData: { shortcode: string; thumbnailUrl: string }[] = await page.evaluate(() => {
            const data: { shortcode: string; thumbnailUrl: string }[] = [];
            const seen = new Set<string>();
            // Selecionar todos os links de posts no grid, na ordem DOM (que é a ordem visual)
            const postLinks = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]');

            postLinks.forEach(link => {
                const href = link.getAttribute('href') ?? '';
                const match = href.match(/\/(p|reel)\/([^/]+)/);
                if (!match) return;
                const shortcode = match[2];
                if (seen.has(shortcode)) return;
                seen.add(shortcode);

                // Capturar a imagem do grid — o Instagram SEMPRE renderiza uma img para o thumbnail
                // mesmo para vídeos (mostra a capa, não o vídeo)
                let thumbnailUrl = '';
                const img = link.querySelector('img');
                if (img && img.src && !img.src.includes('data:image/svg')) {
                    thumbnailUrl = img.src;
                }

                data.push({ shortcode, thumbnailUrl });
            });

            return data;
        });

        const gridOrder = gridData.map(d => d.shortcode);
        const gridThumbnails: Record<string, string> = {};
        for (const d of gridData) {
            if (d.thumbnailUrl) {
                // Proxy para evitar CORS
                gridThumbnails[d.shortcode] = `/api/image-proxy?url=${encodeURIComponent(d.thumbnailUrl)}`;
            }
        }


        // Detectar posts fixados: posts que aparecem no topo do grid mas são mais antigos
        // que posts posteriores. Instagram permite no máximo 3 pins.
        // Método: os primeiros posts no gridOrder que NÃO estão nos primeiros da ordem cronológica
        // serão os fixados. Mas como não temos timestamps aqui, vamos só retornar a ordem
        // e deixar o frontend detectar pelos timestamps dos posts Meta API.
        // Também tentar via aria-label como fallback rápido:
        const pinnedShortcodes: string[] = await page.evaluate(() => {
            const pinned: string[] = [];
            const postLinks = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]');

            postLinks.forEach(link => {
                const href = link.getAttribute('href') ?? '';
                const match = href.match(/\/(p|reel)\/([^/]+)/);
                if (!match) return;

                // Buscar qualquer indicador de pin no container do post
                const container = link.closest('div') ?? link;
                const allSvgs = container.querySelectorAll('svg');
                for (const svg of allSvgs) {
                    const label = svg.getAttribute('aria-label')?.toLowerCase() ?? '';
                    if (label.includes('pin') || label.includes('fixad')) {
                        pinned.push(match[2]);
                        break;
                    }
                }
            });

            return [...new Set(pinned)];
        });


        const result: HighlightsResult = { success: true, highlights: savedHighlights, pinnedShortcodes, gridOrder, gridThumbnails, screenshotUrl };
        saveCacheHighlights(handle, result);
        return result;
    } catch (err: unknown) {
        console.error('[IGHighlights] Error:', err instanceof Error ? err.message : String(err));
        return { success: false, highlights: [], pinnedShortcodes: [], gridOrder: [], gridThumbnails: {}, error: err instanceof Error ? err.message : String(err) };
    } finally {
        if (browser) {
            try { await browser.close(); } catch { /* ignore */ }
        }
    }
}
