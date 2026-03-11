'use server';

import prisma from '@/lib/db';

export type ApiStatusResult = {
    geminiOnline: boolean;
    apifyOnline: boolean;
    firecrawlOnline: boolean;
};

export async function checkApiStatusAction(): Promise<ApiStatusResult> {
    try {
        const result: ApiStatusResult = {
            geminiOnline: false,
            apifyOnline: false,
            firecrawlOnline: false,
        };

        // 1. First, prioritize DB custom keys
        const setting = await prisma.setting.findUnique({
            where: { key: 'global-settings' },
        });

        if (setting?.value) {
            try {
                const parsed = JSON.parse(setting.value);
                if (parsed.geminiApiKey && parsed.geminiApiKey.trim() !== '') {
                    result.geminiOnline = true;
                }
                if (parsed.apifyApiKey && parsed.apifyApiKey.trim() !== '') {
                    result.apifyOnline = true;
                }
                if (parsed.firecrawlApiKey && parsed.firecrawlApiKey.trim() !== '') {
                    result.firecrawlOnline = true;
                }
            } catch (e) {
                console.error('Failed to parse settings JSON:', e);
            }
        }

        // 2. If DB was empty or not set for a specific key, check ENV (.env)
        if (!result.geminiOnline && process.env.GEMINI_API_KEY) {
            result.geminiOnline = true;
        }

        if (!result.apifyOnline && process.env.APIFY_API_TOKEN) {
            result.apifyOnline = true;
        }

        if (!result.firecrawlOnline && process.env.FIRECRAWL_API_KEY) {
            result.firecrawlOnline = true;
        }

        return result;
    } catch (error) {
        console.error('Failed to check API status:', error);
        return { geminiOnline: false, apifyOnline: false, firecrawlOnline: false };
    }
}
