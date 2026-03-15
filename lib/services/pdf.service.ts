import { existsSync } from 'fs';

// ─── Chrome/Edge Detection (Windows) ─────────────────────────────────────────

const CHROME_PATHS = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];

const EDGE_PATHS = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];

function findBrowserExecutable(): string | null {
    for (const p of [...CHROME_PATHS, ...EDGE_PATHS]) {
        if (existsSync(p)) return p;
    }
    return null;
}

// ─── PDF Generation ──────────────────────────────────────────────────────────

interface PdfOptions {
    html: string;
    filename?: string;
}

/**
 * Gera PDF a partir de HTML usando puppeteer-core + Chrome/Edge local.
 * Opção A: puppeteer-core + browser instalado (sem download de Chromium).
 */
export async function generatePdf(options: PdfOptions): Promise<Buffer> {
    const executablePath = findBrowserExecutable();
    if (!executablePath) {
        throw new Error(
            'Chrome ou Edge não encontrado. Instale Google Chrome ou Microsoft Edge para gerar PDFs.',
        );
    }

    // Dynamic import to avoid bundling on client
    const puppeteer = await import('puppeteer-core');
    const browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
        ],
    });

    try {
        const page = await browser.newPage();

        // Navigate to data URI with HTML content
        await page.setContent(options.html, {
            waitUntil: 'networkidle0',
            timeout: 30_000,
        });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm',
            },
            displayHeaderFooter: false,
        });

        return Buffer.from(pdfBuffer);
    } finally {
        await browser.close();
    }
}

/** Which browser engine was detected (for diagnostics) */
export function getDetectedBrowser(): string {
    const path = findBrowserExecutable();
    if (!path) return 'none';
    if (path.toLowerCase().includes('chrome')) return `chrome:${path}`;
    return `edge:${path}`;
}
