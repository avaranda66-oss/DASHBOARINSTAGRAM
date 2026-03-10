export type ContentType = 'post' | 'story' | 'reel' | 'carousel';
export type ContentStatus = 'idea' | 'draft' | 'approved' | 'scheduled' | 'published' | 'failed';

export interface Content {
    id: string;
    title: string;
    description: string | null;
    type: ContentType;
    status: ContentStatus;
    scheduledAt: string | null;
    hashtags: string[];
    mediaUrls: string[];
    accountId: string | null;
    collectionIds: string[];
    order: number;
    createdAt: string;
    updatedAt: string;
}
