/** A single comment on a post */
export interface PostComment {
    id: string;
    text: string;
    ownerUsername: string;
    timestamp: string;
    likesCount: number;
    aiOpinion?: string;
    aiReplySuggestion?: string;
    replyStatus?: 'pending' | 'sent' | 'error';
    replyError?: string;
}

/** Metrics for a single Instagram post scraped via Apify */
export interface InstagramPostMetrics {
    id: string;
    shortCode: string;
    url: string;
    type: 'Image' | 'Video' | 'Sidecar';
    caption: string;
    hashtags: string[];
    likesCount: number;
    commentsCount: number;
    videoViewCount: number | null;
    videoPlayCount: number | null;
    timestamp: string;
    displayUrl: string;
    ownerUsername: string;
    ownerProfilePicUrl?: string;
    latestComments: PostComment[];
    engagementRate?: number;
}

/** Aggregated summary computed from an array of InstagramPostMetrics */
export interface AnalyticsSummary {
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalViews: number;
    avgLikesPerPost: number;
    avgCommentsPerPost: number;
    avgEngagementRate: number;
    bestPost: InstagramPostMetrics | null;
    // Per-type breakdown
    imageCount: number;
    videoCount: number;
    carouselCount: number;
    videosWithViews: number; // how many posts actually have view data
    // Per-type averages
    avgLikesImage: number;
    avgLikesVideo: number;
    avgLikesCarousel: number;
    // Sentiment & Quality
    commentSentiment: { pctPos: number, pctNeu: number, pctNeg: number, total: number, brand: number };
    qualifiedEngagement: number;
}

/** Apify Actor run status */
export interface ApifyRunStatus {
    id: string;
    status:
    | 'READY'
    | 'RUNNING'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'ABORTING'
    | 'ABORTED'
    | 'TIMING-OUT'
    | 'TIMED-OUT';
    datasetId: string | null;
}

/** Cached analytics data stored in localStorage, linked to an account handle */
export interface CachedAnalytics {
    id: string;
    accountHandle: string;
    posts: InstagramPostMetrics[];
    fetchedAt: string;
    avatarUrl?: string;
}
