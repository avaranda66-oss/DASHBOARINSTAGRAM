import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'public', 'maps-screenshots');

export interface MapsReview {
    author: string;
    rating: number;
    text: string;
    date: string;
}

export interface MapsScrapedData {
    name: string;
    rating: number | null;
    totalReviews: number | null;
    address: string | null;
    phone: string | null;
    category: string | null;
    hours: string | null;
    website: string | null;
    photoUrl: string | null;
    screenshotPath: string | null;
    highlights: string[];
    reviews?: MapsReview[];
}

/**
 * Scrape a Google Maps business page using Playwright for rich data extraction.
 */
export async function scrapeGoogleMapsWithPlaywright(query: string): Promise<{
    success: boolean;
    data?: MapsScrapedData;
    error?: string;
}> {
    if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

    let context;
    try {
        const userDataDir = path.join(process.cwd(), '.chrome-session-maps');
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
        }
        
        console.log('[MapsPlaywright] Launching Chrome...');
        
        context = await chromium.launchPersistentContext(userDataDir, {
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            headless: false,
            viewport: { width: 1280, height: 900 },
            locale: 'pt-BR',
            args: [
                '--disable-blink-features=AutomationControlled', 
                '--no-sandbox', 
                '--disable-gpu',
            ],
        });

        const pages = context.pages();
        const page = pages.length > 0 ? pages[0] : await context.newPage();

        let url = query.trim();
        if (!url.startsWith('http')) {
            url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
        }

        console.log('[MapsPlaywright] Navigating to:', url);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);

        try {
            const acceptBtn = page.locator('button:has-text("Accept all"), button:has-text("Aceitar tudo")');
            if (await acceptBtn.isVisible({ timeout: 2000 })) {
                await acceptBtn.click();
                await page.waitForTimeout(1000);
            }
        } catch { /* ignore */ }

        try {
            const firstResult = page.locator('div[role="feed"] > div > div > a').first();
            if (await firstResult.isVisible({ timeout: 3000 })) {
                await firstResult.click();
                await page.waitForTimeout(2500);
            }
        } catch { /* ignore */ }

        const getText = async (selectors: string[]) => {
            for (const sel of selectors) {
                const el = page.locator(sel).first();
                if (await el.count() > 0) {
                    const text = await el.textContent().catch(() => null);
                    if (text?.trim()) return text.trim();
                }
            }
            return null;
        };

        const name = await getText(['h1.DUwDvf', 'h1[data-attrid]']) || '';
        
        let rating: number | null = null;
        const ratingText = await page.locator('div.F7nice span[aria-hidden="true"]').first().textContent().catch(() => null);
        if (ratingText) {
            const val = parseFloat(ratingText.replace(',', '.'));
            if (val >= 1 && val <= 5) rating = val;
        }

        let totalReviews: number | null = null;
        const reviewEl = page.locator('div.F7nice span[aria-label]').first();
        if (await reviewEl.count() > 0) {
            const label = await reviewEl.getAttribute('aria-label').catch(() => '') || '';
            const match = label.match(/([\d.,]+)/);
            if (match) totalReviews = parseInt(match[1].replace(/[.,]/g, ''), 10);
        }

        const address = await getText(['button[data-item-id="address"] div.fontBodyMedium']);
        const phone = await getText(['button[data-item-id^="phone"] div.fontBodyMedium']);
        const category = await getText(['button.DkEaL', 'span.DkEaL']);
        const hours = await getText(['div.o0t4Ib span span']);
        
        let website: string | null = null;
        const webEl = page.locator('a[data-item-id="authority"]').first();
        if (await webEl.count() > 0) website = await webEl.getAttribute('href').catch(() => null);

        let photoUrl: string | null = null;
        const photoEl = page.locator('button.aoRNLd img, div.ZKCDEc img').first();
        if (await photoEl.count() > 0) photoUrl = await photoEl.getAttribute('src').catch(() => null);

        const data: MapsScrapedData = { 
            name, rating, totalReviews, address, phone, category, hours, website, photoUrl, 
            reviews: [], highlights: [], screenshotPath: '' 
        };

        const screenshotName = `maps-${Date.now()}.png`;
        const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName);
        await page.screenshot({ path: screenshotPath });

        let finalReviews: MapsReview[] = [];
        try {
            const reviewTabClicked = await page.evaluate(() => {
                const elements = Array.from(document.querySelectorAll('button, div[role="tab"]'));
                for (const el of elements) {
                    const text = el.textContent || '';
                    if (text.includes('Avaliações') || text.includes('Reviews')) {
                        (el as HTMLElement).click();
                        return true;
                    }
                }
                const ratingBlock = document.querySelector('div.F7nice');
                if (ratingBlock) {
                    (ratingBlock as HTMLElement).click();
                    return true;
                }
                return false;
            });
            
            if (reviewTabClicked) {
                await page.waitForTimeout(3000);
                const uniqueReviewsMap = new Map<string, MapsReview>();
                const filterChips = await page.locator('button[aria-label*="filtro"], div[role="radio"]').all().catch(() => []);
                const chipsToClick = filterChips.length > 0 ? filterChips : [null];

                for (const chip of chipsToClick) {
                    if (chip) {
                        try {
                            const chipText = await chip.textContent();
                            console.log(`[MapsPlaywright] Chip: ${chipText?.trim()}`);
                            await chip.click({ force: true });
                            await page.waitForTimeout(1500);
                        } catch (e) {}
                    }

                    await page.mouse.move(300, 400);
                    await page.mouse.click(250, 400);

                    let previousHeight = 0;
                    let stuckCount = 0;
                    for (let i = 0; i < 20; i++) {
                        const newHeight = await page.evaluate(() => {
                            const scrollable = Array.from(document.querySelectorAll('div[role="main"], div.m6QErb'))
                                .find(el => el.scrollHeight > el.clientHeight || el.scrollTop > 0);
                            if (scrollable) {
                                scrollable.scrollTop = scrollable.scrollHeight;
                                scrollable.scrollBy(0, 5000);
                                return scrollable.scrollHeight;
                            }
                            return 0;
                        });
                        await page.waitForTimeout(700);
                        if (newHeight === previousHeight && newHeight > 0) {
                            stuckCount++;
                            if (stuckCount >= 2) break;
                        } else {
                            stuckCount = 0;
                            previousHeight = newHeight;
                        }
                        const moreBtns = await page.locator('button.w8nwRe:has-text("Mais")').all();
                        for (const b of moreBtns) { try { await b.click(); await page.waitForTimeout(50); } catch {} }
                    }

                    const nodes = await page.locator('div.jJc9Ad, div.jftiEf, div.GHT2ce').all();
                    for (const node of nodes) {
                        try {
                            const author = await node.locator('div.d4r55, div.TSUbDb, a').first().textContent().catch(() => '') || '';
                            const text = await node.locator('span.wiI7pd').first().textContent().catch(() => '') || '';
                            const date = await node.locator('span.rsqaWe').first().textContent().catch(() => '') || '';
                            let ratingVal = 5;
                            const label = await node.locator('span[aria-label*="estrela"]').first().getAttribute('aria-label').catch(() => null);
                            if (label) {
                                const m = label.match(/(\d+)/);
                                if (m) ratingVal = parseInt(m[1]);
                            }

                            if (author.trim() && text.trim()) {
                                const key = `${author.trim()}-${text.trim().substring(0, 30)}`;
                                if (!uniqueReviewsMap.has(key)) {
                                    uniqueReviewsMap.set(key, { author: author.trim(), text: text.trim(), date: date.trim(), rating: ratingVal });
                                }
                            }
                        } catch (e) {}
                    }
                }
                finalReviews = Array.from(uniqueReviewsMap.values());
            }
        } catch (e: any) {
            console.error('[MapsPlaywright] Error:', e.message);
        }

        if (context) await context.close().catch(() => {});

        return {
            success: true,
            data: {
                ...data,
                screenshotPath: `/maps-screenshots/${screenshotName}`,
                reviews: finalReviews,
            },
        };
    } catch (error: any) {
        console.error('[MapsPlaywright] Fatal:', error.message);
        if (context) await context.close().catch(() => {});
        return { success: false, error: error.message };
    }
}
