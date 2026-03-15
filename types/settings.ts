export interface UserSettings {
    theme: 'dark' | 'light' | 'system';
    defaultView: 'board' | 'calendar';
    calendarView: 'month' | 'week' | 'day';
    sidebarCollapsed: boolean;
    apifyApiKey?: string;
    geminiApiKey?: string;
    firecrawlApiKey?: string;
    // AI Adapter settings (gemini = Google Gemini, antigravity = OpenRouter / Custom OpenAI-compatible)
    aiProvider?: 'gemini' | 'antigravity';
    aiModel?: string;
    antigravityApiKey?: string;
    antigravityBaseUrl?: string;
    // Scheduler tunnel
    tunnelUrl?: string;
    // Meta Graph API
    metaAccessToken?: string;
    metaTokenExpiresAt?: number; // Unix timestamp
    metaUsername?: string;
}
