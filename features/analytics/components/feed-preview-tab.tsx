'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, Reorder } from 'framer-motion';
import { Calendar, Eye, EyeOff, RefreshCw, Sparkles, GripVertical, ArrowUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FeedPreviewPhone } from './feed-preview-phone';
import { FeedAnalysisPanel, type FeedAnalysisResult } from './feed-analysis-panel';
import type { InstagramPostMetrics } from '@/types/analytics';
import type { Content } from '@/types/content';

interface AccountData {
    username: string;
    name?: string | null;
    biography?: string | null;
    picture?: string | null;
    followers_count?: number | null;
    follows_count?: number | null;
    media_count?: number | null;
    website?: string | null;
}

export interface FeedPost {
    id: string;
    displayUrl: string;
    thumbnailUrl?: string;
    type: 'Image' | 'Video' | 'Sidecar';
    likesCount: number;
    commentsCount: number;
    caption?: string;
    isScheduled?: boolean;
    scheduledAt?: string;
    title?: string;
    isPinned?: boolean;
}

interface Props {
    posts: InstagramPostMetrics[];
    account: AccountData;
    avgEngagement: number;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } };

function contentTypeToPostType(type: string): 'Image' | 'Video' | 'Sidecar' {
    if (type === 'reel' || type === 'story') return 'Video';
    if (type === 'carousel') return 'Sidecar';
    return 'Image';
}

function resolveThumbUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    if (!url.startsWith('http') && !url.startsWith('/api/')) {
        return `/${url.replace(/^\//, '')}`;
    }
    if (url.startsWith('/')) return url;
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

export function FeedPreviewTab({ posts, account, avgEngagement }: Props) {
    const [analysisResult, setAnalysisResult] = useState<FeedAnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null);
    const [highlightedIndices, setHighlightedIndices] = useState<number[]>([]);
    const [scheduledContents, setScheduledContents] = useState<Content[]>([]);
    const [showScheduled, setShowScheduled] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isAIReordering, setIsAIReordering] = useState(false);
    const [aiReorderReason, setAiReorderReason] = useState<string | null>(null);
    const [orderChanged, setOrderChanged] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [realHighlights, setRealHighlights] = useState<{ name: string; coverUrl: string }[]>([]);
    const [highlightsScreenshot, setHighlightsScreenshot] = useState<string | undefined>();
    const [isLoadingHighlights, setIsLoadingHighlights] = useState(false);
    const [pinnedShortcodes, setPinnedShortcodes] = useState<string[]>([]);
    const [gridOrder, setGridOrder] = useState<string[]>([]);
    const [gridThumbnails, setGridThumbnails] = useState<Record<string, string>>({});
    const [apifyThumbnails, setApifyThumbnails] = useState<Record<string, string>>({});
    const [aiScheduledDates, setAiScheduledDates] = useState<{ id: string; datetime: string }[]>([]);

    // Buscar destaques reais do Instagram via Playwright (usa sessão salva do login)
    useEffect(() => {
        if (!account.username) return;
        const handle = account.username.replace('@', '');
        setIsLoadingHighlights(true);
        fetch(`/api/instagram-highlights?username=${encodeURIComponent(handle)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.highlights?.length > 0) {
                    setRealHighlights(data.highlights);
                }
                if (data.screenshotUrl) {
                    setHighlightsScreenshot(data.screenshotUrl);
                }
                if (data.pinnedShortcodes?.length > 0) {
                    setPinnedShortcodes(data.pinnedShortcodes);
                }
                if (data.gridOrder?.length > 0) {
                    setGridOrder(data.gridOrder);
                }
                if (data.gridThumbnails && Object.keys(data.gridThumbnails).length > 0) {
                    setGridThumbnails(data.gridThumbnails);
                }
            })
            .catch(err => console.warn('[FeedPreview] Highlights fetch error:', err))
            .finally(() => setIsLoadingHighlights(false));
    }, [account.username]);

    // Carregar análise visual do feed do cache (persiste entre F5)
    useEffect(() => {
        if (!account.username) return;
        import('@/app/actions/analytics.actions').then(({ getFeedAnalysisAction }) => {
            getFeedAnalysisAction(account.username).then(cached => {
                if (cached?.analysis) {
                    setAnalysisResult(cached.analysis);
                }
            }).catch(() => {});
        }).catch(() => {});
    }, [account.username]);

    // Buscar thumbnails do Apify como fallback (dados salvos na aba individual)
    useEffect(() => {
        if (!account.username) return;
        const handle = account.username.replace('@', '').toLowerCase();
        import('@/app/actions/analytics.actions').then(({ getAnalyticsAction }) => {
            getAnalyticsAction(handle, 'account').then(cached => {
                if (!cached?.posts?.length) return;
                const thumbs: Record<string, string> = {};
                for (const p of cached.posts) {
                    if (p.displayUrl && !p.displayUrl.toLowerCase().includes('.mp4') && p.shortCode) {
                        thumbs[p.shortCode] = p.displayUrl;
                    }
                }
                if (Object.keys(thumbs).length > 0) {
                    console.log(`[FeedPreview] Loaded ${Object.keys(thumbs).length} thumbnails from Apify cache`);
                    setApifyThumbnails(thumbs);
                }
            }).catch(() => {});
        }).catch(() => {});
    }, [account.username]);

    // Buscar conteúdos agendados do storyboard
    const fetchScheduled = useCallback(() => {
        setIsRefreshing(true);
        import('@/app/actions/content.actions').then(({ getContentsAction }) => {
            getContentsAction().then((contents) => {
                const scheduled = contents.filter(c => {
                    const hasMedia = c.mediaUrls && c.mediaUrls.length > 0;
                    const isReady = c.status === 'scheduled' || c.status === 'approved';
                    const isPostType = c.type === 'post' || c.type === 'carousel' || c.type === 'reel';
                    return hasMedia && isReady && isPostType;
                });
                // Ordenar por data de agendamento (mais cedo primeiro = publica primeiro)
                scheduled.sort((a, b) => {
                    const da = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
                    const db = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
                    return da - db;
                });
                setScheduledContents(scheduled);
                setOrderChanged(false);
                setAiReorderReason(null);
            }).finally(() => setIsRefreshing(false));
        }).catch(() => setIsRefreshing(false));
    }, []);

    useEffect(() => { fetchScheduled(); }, [account.username, fetchScheduled]);

    // Posts existentes do feed — usar gridOrder do Playwright para espelhar a ordem real do Instagram
    const existingPosts: FeedPost[] = (() => {
        const toFeedPost = (p: InstagramPostMetrics): FeedPost => {
            // Detectar pinned: via aria-label OU via posição no grid
            // Se o post aparece no topo do gridOrder mas é cronologicamente antigo → pinned
            const isPinnedByLabel = pinnedShortcodes.length > 0 && (
                pinnedShortcodes.includes(p.shortCode) ||
                pinnedShortcodes.some(sc => p.url?.includes(sc))
            );
            // Detectar por posição: se está no top-3 do grid mas não no top-3 cronológico
            let isPinnedByPosition = false;
            if (gridOrder.length > 3) {
                const gridPos = gridOrder.findIndex(sc => sc === p.shortCode || p.url?.includes(sc));
                const chronoPos = posts.indexOf(p); // posts já vem em ordem cronológica (mais recente primeiro)
                // Se aparece no top-3 do grid mas está na posição 4+ cronologicamente
                if (gridPos >= 0 && gridPos < 3 && chronoPos >= 3) {
                    isPinnedByPosition = true;
                }
            }

            // Prioridade de thumbnail: Playwright (grid real) > Apify (scraping) > Meta (auto-gerado)
            // O Playwright captura a imagem exata do grid do Instagram (capa real)
            // O Apify captura o displayUrl real do scraping (também capa real para vídeos)
            // O Meta API retorna thumbnail_url que pode ser o primeiro frame (preto)
            let thumbnailUrl = (p as any).thumbnailUrl;
            if (gridThumbnails[p.shortCode]) {
                thumbnailUrl = gridThumbnails[p.shortCode];
            } else if (apifyThumbnails[p.shortCode]) {
                thumbnailUrl = apifyThumbnails[p.shortCode];
            }

            return {
                id: p.id,
                displayUrl: p.displayUrl,
                thumbnailUrl,
                type: p.type,
                likesCount: p.likesCount,
                commentsCount: p.commentsCount,
                caption: p.caption,
                isPinned: isPinnedByLabel || isPinnedByPosition,
            };
        };

        // Se temos gridOrder do Playwright, usá-lo como ordem definitiva
        if (gridOrder.length > 0) {
            const postMap = new Map(posts.map(p => [p.shortCode, p]));
            // Também indexar por shortcode na URL para match
            posts.forEach(p => {
                if (p.url) {
                    const match = p.url.match(/\/(p|reel)\/([^/]+)/);
                    if (match) postMap.set(match[2], p);
                }
            });

            const ordered: FeedPost[] = [];
            const usedIds = new Set<string>();

            // 1. Posts na ordem do grid real
            for (const sc of gridOrder) {
                const p = postMap.get(sc);
                if (p && !usedIds.has(p.id)) {
                    ordered.push(toFeedPost(p));
                    usedIds.add(p.id);
                }
            }

            // 2. Posts do Meta API que não estavam no grid (ex: mais antigos)
            for (const p of posts) {
                if (!usedIds.has(p.id)) {
                    ordered.push(toFeedPost(p));
                    usedIds.add(p.id);
                }
            }

            return ordered.slice(0, 30);
        }

        // Fallback: sem gridOrder, usar ordem cronológica do Meta API
        return posts.slice(0, 30).map(p => toFeedPost(p));
    })();

    // Posts agendados (ordem local do state)
    const scheduledPosts: FeedPost[] = scheduledContents.map(c => ({
        id: c.id,
        displayUrl: c.mediaUrls[0] ?? '',
        type: contentTypeToPostType(c.type),
        likesCount: 0,
        commentsCount: 0,
        caption: c.description ?? c.title,
        isScheduled: true,
        scheduledAt: c.scheduledAt ?? undefined,
        title: c.title,
    }));

    // No Instagram, o post mais recente aparece PRIMEIRO no grid (posição 1 = topo-esquerda).
    // O mini storyboard mostra a "Ordem de Publicação" (1 = publica primeiro = data mais antiga).
    // Portanto, invertemos para que o último a ser publicado (mais recente) fique no topo do grid.
    const scheduledForGrid = [...scheduledPosts].reverse();

    // Combinar: existingPosts já está na ordem real do grid do Instagram
    // (fixados no topo, depois cronológicos). Agendados são inseridos APÓS os fixados.
    const allPosts = (() => {
        if (!showScheduled || scheduledForGrid.length === 0) return existingPosts;

        // Inserir agendados logo após os posts fixados
        const pinnedCount = existingPosts.filter(p => p.isPinned).length;
        const result = [
            ...existingPosts.slice(0, pinnedCount),       // fixados
            ...scheduledForGrid,                            // agendados
            ...existingPosts.slice(pinnedCount),            // cronológicos
        ];
        return result.slice(0, 30);
    })();

    const profileData = {
        username: account.username ?? '',
        name: account.name ?? undefined,
        biography: account.biography ?? undefined,
        picture: account.picture ?? undefined,
        followers_count: account.followers_count ?? undefined,
        follows_count: account.follows_count ?? undefined,
        media_count: account.media_count ?? posts.length,
        website: account.website ?? undefined,
    };

    // Drag-and-drop reorder dos scheduled contents
    const handleReorder = (newOrder: Content[]) => {
        setScheduledContents(newOrder);
        setOrderChanged(true);
    };

    // Salvar nova ordem + datas sugeridas pela IA no banco
    const handleSaveOrder = async () => {
        setIsSavingOrder(true);
        try {
            if (aiScheduledDates.length > 0) {
                // Usar datas sugeridas pela IA
                const { rescheduleContentsAction, reorderContentsAction } = await import('@/app/actions/content.actions');
                await reorderContentsAction(scheduledContents.map(c => c.id));
                await rescheduleContentsAction(aiScheduledDates);
            } else {
                // Apenas reordenar (troca datas existentes)
                const { reorderContentsAction } = await import('@/app/actions/content.actions');
                await reorderContentsAction(scheduledContents.map(c => c.id));
            }
            setAiScheduledDates([]);
            fetchScheduled();
        } catch (err) {
            console.error('Erro ao salvar ordem:', err);
        } finally {
            setIsSavingOrder(false);
        }
    };

    // IA organizar: pedir sugestão de ordem + datas/horários
    const handleAIReorder = async () => {
        if (scheduledContents.length < 2) return;
        setIsAIReordering(true);
        setAiReorderReason(null);

        try {
            const res = await fetch('/api/feed-ai-reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scheduledPosts: scheduledContents.map(c => ({
                        id: c.id,
                        title: c.title,
                        type: c.type,
                        mediaUrl: c.mediaUrls[0] ?? '',
                    })),
                    existingImageUrls: existingPosts.slice(0, 6).map(p => {
                        const url = p.thumbnailUrl || p.displayUrl;
                        if (!url) return '';
                        if (url.startsWith('/') || url.startsWith('http')) return url;
                        return `/${url.replace(/^\//, '')}`;
                    }).filter(Boolean),
                    bio: account.biography ?? '',
                    username: account.username,
                }),
            });

            const json = await res.json();
            if (!json.success) {
                console.error('AI reorder error:', json.error);
                return;
            }

            // Reordenar com base na resposta da IA
            const orderedIds: string[] = json.ordered_ids ?? [];
            if (orderedIds.length > 0) {
                const idToContent = new Map(scheduledContents.map(c => [c.id, c]));
                const reordered: Content[] = [];
                for (const id of orderedIds) {
                    const c = idToContent.get(id);
                    if (c) reordered.push(c);
                }
                // Adicionar qualquer que a IA esqueceu
                for (const c of scheduledContents) {
                    if (!reordered.find(r => r.id === c.id)) reordered.push(c);
                }

                // Aplicar datas sugeridas no state local para preview
                const scheduledDatesMap = new Map<string, string>();
                if (json.scheduled_dates?.length > 0) {
                    for (const sd of json.scheduled_dates) {
                        scheduledDatesMap.set(sd.id, sd.datetime);
                    }
                    setAiScheduledDates(json.scheduled_dates);
                }

                // Atualizar scheduledAt no state local para mostrar na UI
                const reorderedWithDates = reordered.map(c => {
                    const newDate = scheduledDatesMap.get(c.id);
                    if (newDate) {
                        return { ...c, scheduledAt: newDate };
                    }
                    return c;
                });

                setScheduledContents(reorderedWithDates);
                setOrderChanged(true);
            }
            if (json.reasoning) {
                setAiReorderReason(json.reasoning);
            }
        } catch (err) {
            console.error('AI reorder fetch error:', err);
        } finally {
            setIsAIReordering(false);
        }
    };

    // Análise visual completa do feed
    const handleAnalyze = useCallback(async () => {
        setIsAnalyzing(true);
        setAnalysisError(null);
        setHighlightedIndices([]);

        try {
            const imageUrls = allPosts.map(p => {
                if (p.displayUrl && !p.displayUrl.startsWith('http') && !p.displayUrl.startsWith('/api/')) {
                    return `/${p.displayUrl.replace(/^\//, '')}`;
                }
                return p.displayUrl;
            }).filter(Boolean);

            const images = posts.filter(p => p.type === 'Image').length;
            const videos = posts.filter(p => p.type === 'Video').length;
            const carousels = posts.filter(p => p.type === 'Sidecar').length;

            const pinnedCount = allPosts.filter(p => p.isPinned).length;

            const res = await fetch('/api/feed-visual-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrls,
                    bio: account.biography ?? '',
                    username: account.username,
                    followersCount: account.followers_count ?? 0,
                    avgEngagement,
                    contentBreakdown: { images, videos, carousels },
                    scheduledCount: showScheduled ? scheduledPosts.length : 0,
                    scheduledTitles: showScheduled ? scheduledPosts.map(p => p.title ?? '').filter(Boolean) : [],
                    pinnedCount,
                }),
            });

            const json = await res.json();
            if (!json.success) {
                setAnalysisError(json.error ?? 'Erro ao analisar feed.');
                return;
            }

            setAnalysisResult(json.analysis);

            // Persistir no banco para carregar no próximo F5
            import('@/app/actions/analytics.actions').then(({ saveFeedAnalysisAction }) => {
                saveFeedAnalysisAction(account.username, json.analysis).catch(console.error);
            });
        } catch (err: any) {
            setAnalysisError(err.message ?? 'Erro de rede.');
        } finally {
            setIsAnalyzing(false);
        }
    }, [allPosts, account, avgEngagement, posts, scheduledPosts]);

    const proxyUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('/') || url.startsWith('uploads/') || url.startsWith('creatives/')) {
            return `/${url.replace(/^\//, '')}`;
        }
        if (url.startsWith('data:')) return url;
        return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    };

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
            {/* Toolbar: toggle agendados + atualizar + IA organizar */}
            {scheduledPosts.length > 0 && (
                <motion.div variants={item} className="flex flex-wrap items-center justify-between gap-2 rounded-xl v2-glass p-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-[var(--v2-text-secondary)]">
                            <strong className="text-[var(--v2-text-primary)]">{scheduledPosts.length}</strong> criativos agendados
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[10px] gap-1"
                            onClick={fetchScheduled}
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[10px] gap-1 text-purple-400 hover:text-purple-300"
                            onClick={handleAIReorder}
                            disabled={isAIReordering || scheduledContents.length < 2}
                        >
                            <Sparkles className={`w-3 h-3 ${isAIReordering ? 'animate-pulse' : ''}`} />
                            {isAIReordering ? 'Organizando...' : 'IA Organizar'}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[10px] gap-1"
                            onClick={() => setShowScheduled(!showScheduled)}
                        >
                            {showScheduled ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            {showScheduled ? 'Ocultar' : 'Mostrar'}
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* AI Reorder reasoning */}
            {aiReorderReason && (
                <motion.div variants={item} className="rounded-xl v2-glass p-3 border border-purple-500/20">
                    <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-[var(--v2-text-secondary)] leading-relaxed">{aiReorderReason}</p>
                    </div>
                </motion.div>
            )}

            <motion.div variants={item}>
                <div className="flex flex-col xl:flex-row gap-6 items-start">
                    {/* Left: Mini storyboard (drag-and-drop dos agendados) */}
                    {showScheduled && scheduledContents.length > 0 && (
                        <div className="w-full xl:w-56 shrink-0 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-[var(--v2-text-secondary)] uppercase tracking-wider flex items-center gap-1">
                                    <ArrowUpDown className="w-3 h-3" />
                                    Ordem de Publicação
                                </span>
                                {orderChanged && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 text-[9px] gap-1 text-green-400 hover:text-green-300"
                                        onClick={handleSaveOrder}
                                        disabled={isSavingOrder}
                                    >
                                        <Check className="w-3 h-3" />
                                        {isSavingOrder ? 'Salvando...' : 'Salvar'}
                                    </Button>
                                )}
                            </div>
                            <Reorder.Group
                                axis="y"
                                values={scheduledContents}
                                onReorder={handleReorder}
                                className="space-y-1.5"
                            >
                                {scheduledContents.map((content, idx) => (
                                    <Reorder.Item
                                        key={content.id}
                                        value={content}
                                        className="flex items-center gap-2 rounded-lg v2-glass p-1.5 cursor-grab active:cursor-grabbing hover:ring-1 hover:ring-blue-500/30 transition-all"
                                    >
                                        <GripVertical className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                        <span className="text-[11px] font-bold text-blue-400 w-4 shrink-0">{idx + 1}</span>
                                        <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-zinc-800">
                                            {content.mediaUrls[0] && (
                                                <img
                                                    src={resolveThumbUrl(content.mediaUrls[0])}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] text-[var(--v2-text-primary)] truncate leading-tight">{content.title}</p>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[9px] text-[var(--v2-text-tertiary)]">{content.type}</span>
                                                {content.scheduledAt && (
                                                    <span className="text-[8px] text-blue-400/70">
                                                        {new Date(content.scheduledAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Reorder.Item>
                                ))}
                            </Reorder.Group>
                            {orderChanged && (
                                <p className="text-[9px] text-amber-400/70 text-center">
                                    {aiScheduledDates.length > 0
                                        ? 'Ordem + datas sugeridas pela IA. Clique "Salvar" para aplicar.'
                                        : 'Ordem alterada. Clique "Salvar" para atualizar o storyboard.'}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Center: Phone mockup */}
                    <div className="shrink-0">
                        <FeedPreviewPhone
                            profile={profileData}
                            posts={allPosts}
                            selectedPostIndex={selectedPostIndex}
                            onSelectPost={setSelectedPostIndex}
                            highlightedIndices={highlightedIndices}
                            highlightNames={analysisResult?.destaques_sugeridos}
                            realHighlights={realHighlights}
                            highlightsScreenshot={highlightsScreenshot}
                        />
                    </div>

                    {/* Right: Analysis panel */}
                    <div className="flex-1 min-w-0 w-full">
                        <FeedAnalysisPanel
                            username={account.username ?? ''}
                            onAnalyze={handleAnalyze}
                            result={analysisResult}
                            isLoading={isAnalyzing}
                            error={analysisError}
                            onHighlightPosts={setHighlightedIndices}
                        />
                    </div>
                </div>
            </motion.div>

            {/* Selected post detail */}
            {selectedPostIndex !== null && allPosts[selectedPostIndex] && (
                <motion.div
                    variants={item}
                    className="rounded-xl v2-glass p-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-start gap-4">
                        <img
                            src={proxyUrl(allPosts[selectedPostIndex].displayUrl)}
                            alt=""
                            className="w-24 h-24 rounded-lg object-cover shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                        />
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-[var(--v2-text-primary)]">
                                    {allPosts[selectedPostIndex].isScheduled ? allPosts[selectedPostIndex].title ?? 'Agendado' : `Post #${selectedPostIndex + 1}`}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                                    {allPosts[selectedPostIndex].type}
                                </span>
                                {allPosts[selectedPostIndex].isScheduled && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">
                                        AGENDADO
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-[var(--v2-text-secondary)] line-clamp-3 leading-relaxed">
                                {allPosts[selectedPostIndex].caption || 'Sem legenda'}
                            </p>
                            {allPosts[selectedPostIndex].isScheduled ? (
                                <div className="flex items-center gap-3 mt-2 text-[10px] text-blue-400">
                                    <Calendar className="w-3 h-3" />
                                    <span>{allPosts[selectedPostIndex].scheduledAt ? new Date(allPosts[selectedPostIndex].scheduledAt!).toLocaleDateString('pt-BR') : 'Data não definida'}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--v2-text-tertiary)]">
                                    <span>{allPosts[selectedPostIndex].likesCount.toLocaleString('pt-BR')} curtidas</span>
                                    <span>{allPosts[selectedPostIndex].commentsCount.toLocaleString('pt-BR')} comentários</span>
                                </div>
                            )}
                            {analysisResult?.posts_problematicos.find(p => p.posicao === selectedPostIndex + 1) && (
                                <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <p className="text-[11px] text-red-300">
                                        {analysisResult.posts_problematicos.find(p => p.posicao === selectedPostIndex + 1)?.motivo}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
