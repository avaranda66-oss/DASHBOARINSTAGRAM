'use client';

import { create } from 'zustand';
import type { InstagramPostMetrics, AnalyticsSummary, CachedAnalytics } from '@/types/analytics';
import { analyzeCommentsSentiment } from '@/lib/utils/sentiment';
import { saveAnalyticsAction, getAnalyticsAction } from '@/app/actions/analytics.actions';
import { saveCompetitorAction, getCompetitorsAction } from '@/app/actions/competitor.actions';

interface AnalyticsSlice {
    posts: InstagramPostMetrics[];
    summary: AnalyticsSummary | null;
    isLoading: boolean;
    error: string | null;
    lastFetchedAt: string | null;
    profileUrl: string;
    selectedAccountHandle: string | null;
    insightsHtml: string | null;
    isLoadingInsights: boolean;
    avatarUrl: string | null;

    filterPeriod: 'all' | '7d' | '30d' | '60d' | '90d' | 'custom';
    setFilterPeriod: (period: 'all' | '7d' | '30d' | '60d' | '90d' | 'custom') => void;
    customDateRange: { start: string, end: string } | null;
    setCustomDateRange: (range: { start: string, end: string } | null) => void;
    fetchMetrics: (profileUrl: string, resultsLimit?: number, forceRefresh?: boolean, period?: number) => Promise<void>;
    fetchAndMerge: (profileUrl: string, resultsLimit?: number, period?: number) => Promise<void>;
    loadFromCache: (accountHandle: string) => Promise<boolean>;
    clearMetrics: () => void;
    generateInsights: () => Promise<void>;
    generateAiOpinions: (postShortCodes: string[]) => Promise<void>;
    updateCommentAiOpinion: (postShortCode: string, commentId: string, opinion: string) => Promise<void>;
    generateReplySuggestions: (postShortCodes: string[]) => Promise<void>;
    executeAutoReplies: (replies: { postShortCode: string, commentId: string, text: string, ownerUsername?: string }[]) => Promise<void>;
}

const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 horas

function extractHandle(profileUrl: string): string {
    let handle = profileUrl.trim().replace(/\/+$/, '');
    try {
        const url = new URL(handle);
        handle = url.pathname.split('/').filter(Boolean)[0] ?? handle;
    } catch {
        handle = handle.replace(/^@/, '');
    }
    return handle.toLowerCase();
}

function computeSummary(posts: InstagramPostMetrics[], period: 'all' | '7d' | '30d' | '60d' | '90d' | 'custom' = 'all', customRange?: { start: string; end: string } | null): AnalyticsSummary {
    let filteredPosts = posts;
    if (period === 'custom' && customRange?.start && customRange?.end) {
        // Add pseudo-timezone handling by just treating the input string as UTC date but adding full day for the end
        // Let's rely on standard parsing
        const start = new Date(customRange.start).getTime();
        const end = new Date(customRange.end).getTime() + 86399999; // add 1 day minus 1ms
        filteredPosts = posts.filter(p => !p.timestamp || (new Date(p.timestamp).getTime() >= start && new Date(p.timestamp).getTime() <= end));
    } else if (period !== 'all' && period !== 'custom') {
        const days = parseInt(period);
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        filteredPosts = posts.filter(p => !p.timestamp || new Date(p.timestamp).getTime() >= cutoff);
    }

    const totalPosts = filteredPosts.length;
    const totalLikes = filteredPosts.reduce((sum, p) => sum + p.likesCount, 0);
    const totalComments = filteredPosts.reduce((sum, p) => sum + p.commentsCount, 0);
    const totalViews = filteredPosts.reduce((sum, p) => sum + (p.videoViewCount ?? 0), 0);

    const avgLikesPerPost = totalPosts > 0 ? Math.round(totalLikes / totalPosts) : 0;
    const avgCommentsPerPost = totalPosts > 0 ? Math.round(totalComments / totalPosts) : 0;

    const images = filteredPosts.filter((p) => p.type === 'Image');
    const videos = filteredPosts.filter((p) => p.type === 'Video');
    const carousels = filteredPosts.filter((p) => p.type === 'Sidecar');

    const avgLikesImage = images.length > 0 ? Math.round(images.reduce((s, p) => s + p.likesCount, 0) / images.length) : 0;
    const avgLikesVideo = videos.length > 0 ? Math.round(videos.reduce((s, p) => s + p.likesCount, 0) / videos.length) : 0;
    const avgLikesCarousel = carousels.length > 0 ? Math.round(carousels.reduce((s, p) => s + p.likesCount, 0) / carousels.length) : 0;

    const postsWithViews = filteredPosts.filter(
        (p) => p.videoViewCount != null && p.videoViewCount > 0,
    );
    const avgEngagementRate =
        postsWithViews.length > 0
            ? Math.round(
                (postsWithViews.reduce((sum, p) => {
                    const rate = ((p.likesCount + p.commentsCount) / p.videoViewCount!) * 100;
                    return sum + rate;
                }, 0) / postsWithViews.length) * 100,
            ) / 100
            : 0;

    const bestPost =
        filteredPosts.length > 0
            ? filteredPosts.reduce((best, p) =>
                p.likesCount + p.commentsCount > best.likesCount + best.commentsCount ? p : best,
            )
            : null;

    const totalEng = filteredPosts.reduce((sum, p) => sum + Math.max(0, p.likesCount) + Math.max(0, p.commentsCount), 0);
    const avgEngagement = totalPosts > 0 ? Math.round((totalEng / totalPosts) * 10) / 10 : 0;
    const sentiment = analyzeCommentsSentiment(filteredPosts);
    const qualifiedEngagement = Math.round((avgEngagement * sentiment.positivityMultiplier) * 10) / 10;

    return {
        totalPosts,
        totalLikes,
        totalComments,
        totalViews,
        avgLikesPerPost,
        avgCommentsPerPost,
        avgEngagementRate,
        bestPost,
        imageCount: images.length,
        videoCount: videos.length,
        carouselCount: carousels.length,
        videosWithViews: postsWithViews.length,
        avgLikesImage,
        avgLikesVideo,
        avgLikesCarousel,
        commentSentiment: { pctPos: sentiment.pctPos, pctNeu: sentiment.pctNeu, pctNeg: sentiment.pctNeg, total: sentiment.total, brand: sentiment.brand },
        qualifiedEngagement,
    };
}

export const useAnalyticsStore = create<AnalyticsSlice>()((set, get) => ({
    posts: [],
    summary: null,
    isLoading: false,
    error: null,
    lastFetchedAt: null,
    profileUrl: '',
    selectedAccountHandle: null,
    insightsHtml: null,
    isLoadingInsights: false,
    avatarUrl: null,
    filterPeriod: 'all',
    customDateRange: null,

    setFilterPeriod: (period) => {
        const { posts, customDateRange } = get();
        set({ filterPeriod: period, summary: computeSummary(posts, period, customDateRange) });
    },

    setCustomDateRange: (range) => {
        const { posts, filterPeriod } = get();
        set({ customDateRange: range, summary: computeSummary(posts, filterPeriod, range) });
    },

    fetchMetrics: async (profileUrl: string, resultsLimit = 20, forceRefresh = false, period?: number) => {
        const handle = extractHandle(profileUrl);
        set({ isLoading: true, error: null, profileUrl, insightsHtml: null });

        // 1. Tentar Banco de Dados primeiro (Database-First)
        if (!forceRefresh) {
            const cached = await getAnalyticsAction(handle, 'account') || await getAnalyticsAction(handle, 'competitor');
            if (cached && cached.posts.length > 0) {
                const fetchedAt = new Date(cached.fetchedAt).getTime();
                const isFresh = (Date.now() - fetchedAt) < CACHE_MAX_AGE_MS;

                if (isFresh && !period && resultsLimit <= cached.posts.length) { // Só usa cache se não pediu período e já temos posts suficientes
                    console.log(`[Cache] Usando dados recentes do banco para ${handle}`);
                    const summary = computeSummary(cached.posts, get().filterPeriod, get().customDateRange);
                    set({
                        posts: cached.posts,
                        summary,
                        lastFetchedAt: cached.fetchedAt,
                        avatarUrl: cached.avatarUrl || null,
                        profileUrl: `https://www.instagram.com/${handle}/`,
                        selectedAccountHandle: handle,
                        isLoading: false,
                        error: null
                    });
                    return;
                }
            }
        }

        // 2. Se não tiver no banco ou estiver velho, buscar na API (Incremental)
        console.log(`[API] Buscando novos dados para ${handle}...`);
        if (period) {
            set({ filterPeriod: `${period}d` as any });
        }
        await get().fetchAndMerge(profileUrl, resultsLimit, period);
    },

    fetchAndMerge: async (profileUrl: string, resultsLimit = 10, period?: number) => {
        set({ isLoading: true, error: null, profileUrl, insightsHtml: null });
        try {
            const handle = extractHandle(profileUrl);
            const cached = await getAnalyticsAction(handle, 'account') || await getAnalyticsAction(handle, 'competitor');
            const existingPosts = cached?.posts ?? [];

            const res = await fetch('/api/apify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profileUrls: [profileUrl],
                    resultsLimit,
                    periodDays: period
                }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error ?? 'Erro ao buscar métricas');

            const newPosts: InstagramPostMetrics[] = json.data;
            const postMap = new Map<string, InstagramPostMetrics>();
            for (const p of existingPosts) postMap.set(p.shortCode, p);
            for (const p of newPosts) postMap.set(p.shortCode, p);

            const mergedPosts = Array.from(postMap.values())
                .sort((a, b) => {
                    const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                    const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                    return tB - tA;
                });

            const summary = computeSummary(mergedPosts, period ? `${period}d` as any : get().filterPeriod);

            set({
                posts: mergedPosts,
                summary,
                lastFetchedAt: new Date().toISOString(),
                selectedAccountHandle: handle,
                avatarUrl: cached?.avatarUrl || get().avatarUrl,
                isLoading: false,
                error: null
            });

            const newCached: CachedAnalytics = {
                id: `analytics-${handle}`,
                accountHandle: handle,
                posts: mergedPosts,
                fetchedAt: new Date().toISOString(),
                avatarUrl: cached?.avatarUrl || get().avatarUrl || undefined
            };
            const type = profileUrl.includes('competitor') ? 'competitor' : 'account';
            await saveAnalyticsAction(newCached, type);

            // Se for concorrente e temos a foto de perfil nas métricas (mas não no banco), atualizar o registro do concorrente
            if (!cached?.avatarUrl && handle) {
                const firstWithAvatar = mergedPosts.find(p => p.ownerProfilePicUrl);
                if (firstWithAvatar?.ownerProfilePicUrl) {
                    const comps = await getCompetitorsAction();
                    const currentComp = comps.find(c => c.handle.toLowerCase() === handle.toLowerCase());
                    if (currentComp) {
                        await saveCompetitorAction({
                            ...currentComp,
                            avatarUrl: firstWithAvatar.ownerProfilePicUrl
                        });
                        set({ avatarUrl: firstWithAvatar.ownerProfilePicUrl });
                    }
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido';
            set({ error: message, isLoading: false });
        }
    },

    loadFromCache: async (accountHandle: string) => {
        const handle = extractHandle(accountHandle);
        // Tenta carregar como conta primeiro, depois concorrente
        let cached = await getAnalyticsAction(handle, 'account');
        if (!cached) cached = await getAnalyticsAction(handle, 'competitor');

        if (cached && cached.posts.length > 0) {
            const freshSummary = computeSummary(cached.posts, get().filterPeriod, get().customDateRange);
            set({
                posts: cached.posts,
                summary: freshSummary,
                lastFetchedAt: cached.fetchedAt,
                avatarUrl: cached.avatarUrl || null,
                profileUrl: `https://www.instagram.com/${cached.accountHandle}/`,
                selectedAccountHandle: cached.accountHandle,
                error: null,
                insightsHtml: null,
            });
            return true;
        }
        return false;
    },

    clearMetrics: () => {
        set({
            posts: [],
            summary: null,
            error: null,
            lastFetchedAt: null,
            profileUrl: '',
            selectedAccountHandle: null,
            insightsHtml: null,
        });
    },

    generateInsights: async () => {
        const { posts, summary } = get();
        if (posts.length === 0 || !summary) return;
        set({ isLoadingInsights: true });
        try {
            const res = await fetch('/api/apify/insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    posts: posts.slice(0, 30).map((p) => ({
                        type: p.type,
                        caption: p.caption?.slice(0, 200),
                        hashtags: p.hashtags?.slice(0, 10),
                        likesCount: p.likesCount,
                        commentsCount: p.commentsCount,
                        videoViewCount: p.videoViewCount,
                        timestamp: p.timestamp,
                    })),
                    summary,
                }),
            });
            const json = await res.json();
            if (json.success) {
                set({ insightsHtml: json.data, isLoadingInsights: false });
            } else {
                set({ isLoadingInsights: false });
            }
        } catch {
            set({ isLoadingInsights: false });
        }
    },

    generateAiOpinions: async (postShortCodes: string[]) => {
        const { posts, selectedAccountHandle } = get();
        if (!posts.length || !selectedAccountHandle) return;

        const targetComments: { id: string; text: string; ownerUsername: string; postShortCode: string }[] = [];
        const hasCJK = (text: string) => /[\u3000-\u9fff\uac00-\ud7af]/.test(text);
        posts.forEach(p => {
            if (postShortCodes.includes(p.shortCode) && p.latestComments) {
                p.latestComments.forEach(c => {
                    if ((!c.aiOpinion || hasCJK(c.aiOpinion)) && c.text) {
                        targetComments.push({
                            id: c.id,
                            text: c.text,
                            ownerUsername: c.ownerUsername,
                            postShortCode: p.shortCode
                        });
                    }
                });
            }
        });

        if (targetComments.length === 0) return;
        set({ isLoadingInsights: true });

        try {
            const res = await fetch('/api/ai-comment-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comments: targetComments.slice(0, 50) })
            });

            const json = await res.json();
            if (json.success && json.opinions) {
                const updatedPosts = [...get().posts];
                const opinions = json.opinions;

                targetComments.forEach(tc => {
                    const opinion = opinions[tc.id];
                    if (opinion) {
                        const postIndex = updatedPosts.findIndex(p => p.shortCode === tc.postShortCode);
                        if (postIndex !== -1) {
                            const commentIndex = updatedPosts[postIndex].latestComments.findIndex(c => c.id === tc.id);
                            if (commentIndex !== -1) {
                                updatedPosts[postIndex].latestComments[commentIndex].aiOpinion = opinion;
                            }
                        }
                    }
                });

                const now = new Date().toISOString();
                const cached: CachedAnalytics = {
                    id: `analytics-${selectedAccountHandle}`,
                    accountHandle: selectedAccountHandle,
                    posts: updatedPosts,
                    fetchedAt: now,
                };
                const type = selectedAccountHandle.includes('competitor') ? 'competitor' : 'account';
                await saveAnalyticsAction(cached, type);
                set({ posts: updatedPosts, isLoadingInsights: false });
            } else {
                set({ isLoadingInsights: false, error: json.error || 'Erro ao gerar opiniões da IA' });
            }
        } catch (error) {
            set({ isLoadingInsights: false, error: 'Falha na conexão com a API de IA' });
        }
    },

    updateCommentAiOpinion: async (postShortCode: string, commentId: string, opinion: string) => {
        const { posts, selectedAccountHandle } = get();
        if (!selectedAccountHandle) return;

        const updatedPosts = [...posts];
        const postIndex = updatedPosts.findIndex(p => p.shortCode === postShortCode);
        if (postIndex !== -1) {
            const commentIndex = updatedPosts[postIndex].latestComments.findIndex(c => c.id === commentId);
            if (commentIndex !== -1) {
                updatedPosts[postIndex].latestComments[commentIndex].aiOpinion = opinion;
                const cached: CachedAnalytics = {
                    id: `analytics-${selectedAccountHandle}`,
                    accountHandle: selectedAccountHandle,
                    posts: updatedPosts,
                    fetchedAt: new Date().toISOString(),
                };
                const type = selectedAccountHandle.includes('competitor') ? 'competitor' : 'account';
                await saveAnalyticsAction(cached, type);
                set({ posts: updatedPosts });
            }
        }
    },

    generateReplySuggestions: async (postShortCodes: string[]) => {
        const { posts, selectedAccountHandle } = get();
        if (!posts.length || !selectedAccountHandle) return;

        const targetComments: { id: string; text: string; ownerUsername: string; postShortCode: string; aiOpinion?: string }[] = [];
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        posts.forEach(p => {
            if (postShortCodes.includes(p.shortCode) && p.latestComments) {
                p.latestComments.forEach(c => {
                    const commentDate = new Date(c.timestamp);
                    const isAuthor = c.ownerUsername === selectedAccountHandle;

                    // Ignora se: já tem sugestão, é do autor, texto vazio, velho, ou JÁ FOI RESPONDIDO
                    if (c.aiReplySuggestion || isAuthor || !c.text || commentDate < twoDaysAgo) return;
                    if (c.replyStatus === 'sent') return; // <<< Ignora comentários já respondidos com sucesso

                    // Heurística: Checar se o autor já respondeu ESTE USUÁRIO neste post
                    // Verifica se existe um comentário da marca que menciona explicitamente @usuario
                    const brandHasReplied = p.latestComments.some(other =>
                        other.ownerUsername === selectedAccountHandle &&
                        other.text.toLowerCase().includes(`@${c.ownerUsername.toLowerCase()}`)
                    );

                    if (!brandHasReplied) {
                        targetComments.push({
                            id: c.id,
                            text: c.text,
                            ownerUsername: c.ownerUsername,
                            postShortCode: p.shortCode,
                            aiOpinion: c.aiOpinion
                        });
                    }
                });
            }
        });

        if (targetComments.length === 0) return;
        set({ isLoadingInsights: true });

        try {
            // Reusing the AI analysis endpoint with a different prompt style or creating a new one
            // To keep it simple and consistent with the user's AI analysis request,
            // we'll assume the same AI endpoint can handle a "suggestion" mode if we prompt correctly,
            // or we create a specific one for replies. Let's create a specific one for better prompt engineering.
            const res = await fetch('/api/ai-comment-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    comments: targetComments.slice(0, 20),
                    mode: 'reply_suggestion'
                })
            });

            const json = await res.json();
            if (json.success && json.suggestions) {
                const updatedPosts = [...get().posts];
                const suggestions = json.suggestions;

                targetComments.forEach(tc => {
                    const suggestion = suggestions[tc.id];
                    if (suggestion) {
                        const postIndex = updatedPosts.findIndex(p => p.shortCode === tc.postShortCode);
                        if (postIndex !== -1) {
                            const commentIndex = updatedPosts[postIndex].latestComments.findIndex(c => c.id === tc.id);
                            if (commentIndex !== -1) {
                                updatedPosts[postIndex].latestComments[commentIndex].aiReplySuggestion = suggestion;
                                updatedPosts[postIndex].latestComments[commentIndex].replyStatus = 'pending';
                            }
                        }
                    }
                });

                const now = new Date().toISOString();
                const cached: CachedAnalytics = {
                    id: `analytics-${selectedAccountHandle}`,
                    accountHandle: selectedAccountHandle,
                    posts: updatedPosts,
                    fetchedAt: now,
                };
                const type = selectedAccountHandle.includes('competitor') ? 'competitor' : 'account';
                await saveAnalyticsAction(cached, type);
                set({ posts: updatedPosts, isLoadingInsights: false });
            } else {
                set({ isLoadingInsights: false, error: json.error || 'Erro ao gerar sugestões de resposta' });
            }
        } catch (error) {
            set({ isLoadingInsights: false, error: 'Falha na conexão com a API de IA' });
        }
    },

    executeAutoReplies: async (replies: { postShortCode: string, commentId: string, text: string, ownerUsername?: string }[]) => {
        const { selectedAccountHandle } = get();
        if (!selectedAccountHandle) return;

        set({ isLoadingInsights: true });

        try {
            const res = await fetch('/api/automation/respond-comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    replies,
                    accountHandle: selectedAccountHandle
                })
            });

            const json = await res.json();
            if (json.success && json.results) {
                const updatedPosts = [...get().posts];

                json.results.forEach((res: any) => {
                    updatedPosts.forEach(p => {
                        const cIdx = p.latestComments?.findIndex(c => c.id === res.commentId);
                        if (cIdx !== undefined && cIdx !== -1) {
                            p.latestComments[cIdx].replyStatus = res.status === 'sent' ? 'sent' : 'error';
                            if (res.error) p.latestComments[cIdx].replyError = res.error;
                        }
                    });
                });

                const now = new Date().toISOString();
                const cached: CachedAnalytics = {
                    id: `analytics-${selectedAccountHandle}`,
                    accountHandle: selectedAccountHandle,
                    posts: updatedPosts,
                    fetchedAt: now,
                };
                const type = selectedAccountHandle.includes('competitor') ? 'competitor' : 'account';
                await saveAnalyticsAction(cached, type);
                set({ posts: updatedPosts, isLoadingInsights: false });
            } else {
                set({ isLoadingInsights: false, error: json.error || 'Erro ao executar automação' });
            }
        } catch (error) {
            set({ isLoadingInsights: false, error: 'Falha na conexão com a API de automação' });
        }
    },
}));
