import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'public', 'maps-screenshots');

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
}

/**
 * Scrape a Google Maps business page using Playwright for rich data extraction.
 * Opens a real Chrome browser, navigates to the Maps page, and extracts structured data from the DOM.
 */
export async function scrapeGoogleMapsWithPlaywright(query: string): Promise<{
    success: boolean;
    data?: MapsScrapedData;
    error?: string;
}> {
    if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

    let browser;
    try {
        browser = await chromium.launch({
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            headless: true,
            args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-gpu'],
        });

        const context = await browser.newContext({
            viewport: { width: 1280, height: 900 },
            locale: 'pt-BR',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        });

        const page = await context.newPage();

        // Build URL
        let url = query.trim();
        if (!url.startsWith('http')) {
            url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
        }

        console.log('[MapsPlaywright] Navigating to:', url);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

        // Wait for Maps to render
        await page.waitForTimeout(3000);

        // Accept cookies if dialog appears
        try {
            const acceptBtn = page.locator('button:has-text("Accept all"), button:has-text("Aceitar tudo")');
            if (await acceptBtn.isVisible({ timeout: 2000 })) {
                await acceptBtn.click();
                await page.waitForTimeout(1000);
            }
        } catch { /* no consent dialog */ }

        // Click first result if we're on search results
        try {
            const firstResult = page.locator('div[role="feed"] > div > div > a').first();
            if (await firstResult.isVisible({ timeout: 3000 })) {
                await firstResult.click();
                await page.waitForTimeout(2500);
            }
        } catch { /* already on business page */ }

        // Extract data from DOM
        const data = await page.evaluate(() => {
            const getText = (selectors: string[]): string | null => {
                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el && el.textContent?.trim()) return el.textContent.trim();
                }
                return null;
            };

            // Name
            const name = getText([
                'h1.DUwDvf', 'h1[data-attrid]', 'div.lMbq3e h1',
                'h1.fontHeadlineLarge', 'h1',
            ]) || '';

            // Rating
            let rating: number | null = null;
            const ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"]');
            if (ratingEl) {
                const val = parseFloat(ratingEl.textContent?.replace(',', '.') || '');
                if (val >= 1 && val <= 5) rating = val;
            }

            // Reviews count
            let totalReviews: number | null = null;
            const reviewEl = document.querySelector('div.F7nice span[aria-label]');
            if (reviewEl) {
                const label = reviewEl.getAttribute('aria-label') || '';
                const match = label.match(/([\d.,]+)/);
                if (match) totalReviews = parseInt(match[1].replace(/[.,]/g, ''), 10);
            }
            // Fallback: text like "(123)"
            if (!totalReviews) {
                const spans = document.querySelectorAll('div.F7nice span');
                spans.forEach(s => {
                    const m = s.textContent?.match(/\(([\d.,]+)\)/);
                    if (m) totalReviews = parseInt(m[1].replace(/[.,]/g, ''), 10);
                });
            }

            // Address
            const address = getText([
                'button[data-item-id="address"] div.fontBodyMedium',
                'div[data-attrid="kc:/location/location:address"] span',
            ]);

            // Phone
            const phone = getText([
                'button[data-item-id^="phone"] div.fontBodyMedium',
                'span[data-phone-number]',
            ]);

            // Category
            const category = getText([
                'button.DkEaL', 'span.DkEaL',
                'div.skqShb span',
            ]);

            // Hours
            const hours = getText([
                'div.o0t4Ib span span', 'div[aria-label*="hours"] span',
                'span.ZDu9vd span',
            ]);

            // Website
            let website: string | null = null;
            const webEl = document.querySelector('a[data-item-id="authority"]');
            if (webEl) website = (webEl as HTMLAnchorElement).href;

            // Photo URL (first photo)
            let photoUrl: string | null = null;
            const photoEl = document.querySelector('button.aoRNLd img, div.ZKCDEc img, img.p0Gie');
            if (photoEl) photoUrl = (photoEl as HTMLImageElement).src;

            return { name, rating, totalReviews, address, phone, category, hours, website, photoUrl };
        });

        // Take screenshot
        const screenshotName = `maps-${Date.now()}.png`;
        const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        await browser.close();

        console.log('[MapsPlaywright] Extracted:', JSON.stringify(data, null, 2));

        return {
            success: true,
            data: {
                ...data,
                screenshotPath: `/maps-screenshots/${screenshotName}`,
                highlights: [],
            },
        };
    } catch (error: any) {
        console.error('[MapsPlaywright] Error:', error.message);
        if (browser) await browser.close().catch(() => {});
        return { success: false, error: error.message };
    }
}
