export interface Account {
    id: string;
    name: string;
    handle: string;
    avatarUrl: string | null;
    notes: string | null;
    password?: string | null;
    oauthToken: string | null;
    isAutomationConnected?: boolean;
    createdAt: string;
}
