export interface UserSettings {
    theme: 'dark' | 'light' | 'system';
    defaultView: 'board' | 'calendar';
    calendarView: 'month' | 'week' | 'day';
    sidebarCollapsed: boolean;
    apifyApiKey?: string;
    geminiApiKey?: string;
}
