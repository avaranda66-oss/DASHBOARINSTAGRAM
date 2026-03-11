'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquareQuote, Search, SlidersHorizontal, ArrowDownAZ, Heart, CornerDownRight, Sparkles, Loader2, RefreshCw, CheckCircle2, X } from 'lucide-react';
import { InstagramPostMetrics, PostComment } from '@/types/analytics';
import { useAnalyticsStore } from '@/stores/analytics-slice';
import { analyzeSingleComment, SentimentResult } from '@/lib/utils/sentiment';

interface CommentsAnalysisProps {
    posts: InstagramPostMetrics[];
    metaToken?: string;
}

interface AnalyzedComment extends PostComment {
    sentiment: SentimentResult;
    sentimentScore: number;
    postShortCode: string;
}

type FilterOption = 'ALL' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'BRAND_REPLY' | 'SUPER_POSITIVE' | 'ELABORATED' | 'INTENT';
type SortOption = 'RECENT' | 'ENGAGEMENT';

export function CommentsAnalysis({ posts, metaToken }: CommentsAnalysisProps) {
    const [filter, setFilter] = useState<FilterOption>('ALL');
    const [sort, setSort] = useState<SortOption>('ENGAGEMENT');
    const [noRecentToast, setNoRecentToast] = useState(false);
    const [refreshResult, setRefreshResult] = useState<{ added: number; updated: number } | null>(null);

    const { generateAiOpinions, generateReplySuggestions, clearReplySuggestion, executeAutoReplies, isLoadingInsights, isRefreshingComments, refreshCommentsViaMeta, fetchAndMerge, profileUrl } = useAnalyticsStore();
    const [isApifyRefreshing, setIsApifyRefreshing] = useState(false);
    const [apifyResult, setApifyResult] = useState<string | null>(null);

    const handleRefreshViaMeta = async () => {
        if (!metaToken) return;
        setRefreshResult(null);
        const result = await refreshCommentsViaMeta(metaToken);
        if (result) {
            setRefreshResult(result);
            setTimeout(() => setRefreshResult(null), 5000);
        }
    };

    const handleRefreshViaApify = async () => {
        if (!profileUrl) return;
        setIsApifyRefreshing(true);
        setApifyResult(null);
        try {
            // Usa a quantidade de posts já carregados como limite — garante que comentários
            // novos em posts antigos também sejam atualizados (não apenas os N mais recentes)
            const limit = Math.max(posts.length, 20);
            await fetchAndMerge(profileUrl, limit);
            setApifyResult('ok');
            setTimeout(() => setApifyResult(null), 5000);
        } catch {
            setApifyResult('error');
            setTimeout(() => setApifyResult(null), 5000);
        } finally {
            setIsApifyRefreshing(false);
        }
    };

    const allComments = useMemo(() => {
        const extracted: AnalyzedComment[] = [];
        posts.forEach(p => {
            if (p.latestComments && Array.isArray(p.latestComments)) {
                p.latestComments.forEach(c => {
                    const result = analyzeSingleComment(c.text, c.ownerUsername, p.ownerUsername);
                    const netScore = result.positiveScore - result.negativeScore;
                    extracted.push({
                        ...c,
                        sentiment: result.sentiment,
                        sentimentScore: netScore,
                        postShortCode: p.shortCode
                    });
                });
            }
        });
        return extracted;
    }, [posts]);


    const stats = useMemo(() => {
        let pos = 0, neu = 0, neg = 0, brand = 0;
        allComments.forEach(c => {
            if (c.sentiment === 'POSITIVE') pos++;
            else if (c.sentiment === 'NEGATIVE') neg++;
            else if (c.sentiment === 'BRAND_REPLY') brand++;
            else neu++;
        });
        return { total: allComments.length, pos, neu, neg, brand };
    }, [allComments]);

    const displayedComments = useMemo(() => {
        let filtered = allComments;
        if (filter !== 'ALL') {
            if (filter === 'SUPER_POSITIVE') {
                filtered = filtered.filter(c => c.sentimentScore > 5);
            } else if (filter === 'ELABORATED') {
                filtered = filtered.filter(c => c.text.split(/[\s,.;!?'"()]+/).filter(w => w.length > 2).length > 5);
            } else if (filter === 'INTENT') {
                filtered = filtered.filter(c => {
                    const lower = c.text.toLowerCase();
                    return lower.includes('?') || /\b(valor|pre[çc]o|quanto|qual|onde|envia|entrega|card[áa]pio|menu|endere[çc]o)\b/i.test(lower);
                });
            } else {
                filtered = filtered.filter(c => c.sentiment === filter);
            }
        }

        return filtered.sort((a, b) => {
            if (sort === 'ENGAGEMENT') {
                return b.likesCount - a.likesCount;
            } else {
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            }
        });
    }, [allComments, filter, sort]);

    const commentsToAnalyze = useMemo(() => {
        // Inclui comentários sem opinião OU com opinião em idioma errado (caracteres CJK)
        const hasCJK = (text: string) => /[\u3000-\u9fff\uac00-\ud7af]/.test(text);
        return displayedComments.filter(c => !c.aiOpinion || hasCJK(c.aiOpinion)).map(c => c.postShortCode);
    }, [displayedComments]);

    const handleAiAnalysis = async () => {
        const uniqueShortCodes = Array.from(new Set(commentsToAnalyze));
        if (uniqueShortCodes.length > 0) {
            await generateAiOpinions(uniqueShortCodes);
        }
    };

    const fmtD = (ts: string) => {
        const d = new Date(ts);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    if (allComments.length === 0) {
        return (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground flex flex-col items-center justify-center">
                <MessageSquareQuote className="h-8 w-8 mb-3 opacity-20" />
                <p className="text-sm">Nenhum comentário encontrado neste período.</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Header */}
            <div className="p-4 md:p-5 border-b border-border bg-muted/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <MessageSquareQuote className="h-4 w-4 text-purple-400" />
                            Raio-X de Comentários
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-[10px] text-muted-foreground">Análise individual baseada nos últimos comentários raspados.</p>
                            {/* Botão: Atualizar via Apify (sempre disponível se há conta) */}
                            {profileUrl && (
                                <button
                                    onClick={handleRefreshViaApify}
                                    disabled={isApifyRefreshing || isLoadingInsights}
                                    title="Busca os 15 posts mais recentes via Apify para atualizar comentários"
                                    className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/5 px-2 py-0.5 text-[10px] font-medium text-orange-400 hover:bg-orange-500/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {isApifyRefreshing ? (
                                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                    ) : apifyResult === 'ok' ? (
                                        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                                    ) : (
                                        <RefreshCw className="h-2.5 w-2.5" />
                                    )}
                                    {isApifyRefreshing
                                        ? 'Buscando...'
                                        : apifyResult === 'ok'
                                            ? 'Atualizado!'
                                            : `Apify (${Math.max(posts.length, 20)} posts)`}
                                </button>
                            )}

                            {/* Botão: Atualizar via Meta API (só se token configurado) */}
                            {metaToken && (
                                <button
                                    onClick={handleRefreshViaMeta}
                                    disabled={isRefreshingComments}
                                    title="Busca apenas comentários NOVOS diretamente pelo Meta Graph API (mais rápido)"
                                    className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/5 px-2 py-0.5 text-[10px] font-medium text-blue-400 hover:bg-blue-500/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {isRefreshingComments ? (
                                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                    ) : refreshResult ? (
                                        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                                    ) : (
                                        <RefreshCw className="h-2.5 w-2.5" />
                                    )}
                                    {isRefreshingComments
                                        ? 'Buscando novos...'
                                        : refreshResult
                                            ? `+${refreshResult.added} novos`
                                            : 'Meta (só novos)'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        {/* Summary Badges */}
                        <div className="flex bg-background border border-border rounded-md px-1 py-1 gap-1 h-8 items-center text-[10px] font-medium mr-2">
                            <span className="px-1.5 py-0.5 rounded text-green-400 bg-green-400/10" title="Positivos">{stats.pos} Positivos</span>
                            <span className="px-1.5 py-0.5 rounded text-muted-foreground bg-muted" title="Neutros">{stats.neu} Neutros</span>
                            <span className="px-1.5 py-0.5 rounded text-red-400 bg-red-400/10" title="Negativos">{stats.neg} Negativos</span>
                            {stats.brand > 0 && <span className="px-1.5 py-0.5 rounded text-blue-400 bg-blue-400/10" title="Respostas da Marca">{stats.brand} Respostas</span>}
                        </div>

                        {/* Filter Buttons */}
                        <select
                            className="h-8 px-2 rounded-md border border-border bg-background text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as FilterOption)}
                        >
                            <option value="ALL">🎯 Todos os Sentimentos</option>
                            <option value="POSITIVE">🟢 Somente Positivos</option>
                            <option value="NEUTRAL">⚪ Somente Neutros</option>
                            <option value="NEGATIVE">🔴 Somente Negativos</option>
                            <option value="BRAND_REPLY">🔵 Respostas da Marca</option>
                            <option disabled>──────────</option>
                            <option value="SUPER_POSITIVE">🌟 Super Elogios (Score &gt; 5)</option>
                            <option value="ELABORATED">📝 Textos Elaborados (&gt; 5 palavras)</option>
                            <option value="INTENT">💰 Dúvidas ou Intenção de Compra</option>
                        </select>

                        <button
                            onClick={handleAiAnalysis}
                            disabled={isLoadingInsights || commentsToAnalyze.length === 0}
                            className="h-8 px-3 rounded-md bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[10px] font-bold flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/20"
                        >
                            {isLoadingInsights ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <Sparkles className="h-3 w-3" />
                            )}
                            {isLoadingInsights ? 'Analisando...' : `Analisar com IA (${commentsToAnalyze.length})`}
                        </button>

                        <button
                            onClick={async () => {
                                // Verifica se há comentários recentes elegíveis
                                const twoDaysAgo = new Date();
                                twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
                                const eligible = displayedComments.filter(c => {
                                    if (c.aiReplySuggestion) return false;
                                    if (c.replyStatus === 'sent') return false;
                                    if (c.sentiment === 'BRAND_REPLY') return false;
                                    if (new Date(c.timestamp) < twoDaysAgo) return false;
                                    return true;
                                });
                                if (eligible.length === 0) {
                                    setNoRecentToast(true);
                                    setTimeout(() => setNoRecentToast(false), 4000);
                                    return;
                                }
                                const shortCodes = Array.from(new Set(displayedComments.map(c => c.postShortCode)));
                                await generateReplySuggestions(shortCodes);
                            }}
                            disabled={isLoadingInsights}
                            className="h-8 px-3 rounded-md border border-purple-500/30 bg-purple-500/5 text-purple-400 text-[10px] font-bold flex items-center gap-1.5 hover:bg-purple-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <MessageSquareQuote className="h-3 w-3" />
                            Sugerir Respostas
                        </button>

                        <button
                            onClick={() => {
                                const postable = displayedComments.filter(c => {
                                    if (c.replyStatus !== 'pending' && c.replyStatus !== 'error') return false;
                                    if (!c.aiReplySuggestion) return false;
                                    // Verifica se a marca já respondeu este usuário no mesmo post
                                    const post = posts.find(p => p.shortCode === c.postShortCode);
                                    if (post?.latestComments?.some(other =>
                                        other.ownerUsername === post.ownerUsername &&
                                        other.text.toLowerCase().includes(`@${c.ownerUsername.toLowerCase()}`)
                                    )) return false;
                                    return true;
                                });
                                if (postable.length > 0) {
                                    executeAutoReplies(postable.map(c => ({
                                        postShortCode: c.postShortCode,
                                        commentId: c.id,
                                        text: c.aiReplySuggestion!,
                                        ownerUsername: c.ownerUsername
                                    })));
                                }
                            }}
                            disabled={isLoadingInsights || !displayedComments.some(c => {
                                if (c.replyStatus !== 'pending' && c.replyStatus !== 'error') return false;
                                if (!c.aiReplySuggestion) return false;
                                const post = posts.find(p => p.shortCode === c.postShortCode);
                                if (post?.latestComments?.some(other =>
                                    other.ownerUsername === post.ownerUsername &&
                                    other.text.toLowerCase().includes(`@${c.ownerUsername.toLowerCase()}`)
                                )) return false;
                                return true;
                            })}
                            className="h-8 px-3 rounded-md bg-foreground text-background text-[10px] font-bold flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            🚀 Postar ({displayedComments.filter(c => {
                                if (c.replyStatus !== 'pending' && c.replyStatus !== 'error') return false;
                                if (!c.aiReplySuggestion) return false;
                                const post = posts.find(p => p.shortCode === c.postShortCode);
                                if (post?.latestComments?.some(other =>
                                    other.ownerUsername === post.ownerUsername &&
                                    other.text.toLowerCase().includes(`@${c.ownerUsername.toLowerCase()}`)
                                )) return false;
                                return true;
                            }).length})
                        </button>

                        {/* Sort Order */}
                        <select
                            className="h-8 px-2 rounded-md border border-border bg-background text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                            value={sort}
                            onChange={(e) => setSort(e.target.value as SortOption)}
                        >
                            <option value="ENGAGEMENT">🔥 Mais Curtidos</option>
                            <option value="RECENT">⏱️ Mais Recentes</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="divide-y divide-border/50 max-h-[500px] overflow-y-auto">
                <AnimatePresence mode="popLayout">
                    {displayedComments.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center text-sm text-muted-foreground">
                            Nenhum comentário corresponde a esse filtro.
                        </motion.div>
                    ) : (
                        displayedComments.map((comment, i) => (
                            <motion.div
                                key={comment.id || i}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className={`p-4 hover:bg-muted/10 transition-colors flex gap-3 ${comment.sentiment === 'NEGATIVE' ? 'bg-red-500/5 hover:bg-red-500/10 border-l-2 border-l-red-500' : ''}`}
                            >
                                <div className="mt-1 flex-shrink-0">
                                    {comment.sentiment === 'POSITIVE' && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20 text-green-400 text-xs shadow-sm shadow-green-500/10">🟢</span>}
                                    {comment.sentiment === 'NEUTRAL' && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">⚪</span>}
                                    {comment.sentiment === 'NEGATIVE' && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-red-400 text-xs shadow-sm shadow-red-500/10">🔴</span>}
                                    {comment.sentiment === 'BRAND_REPLY' && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-xs shadow-sm shadow-blue-500/10">🔵</span>}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <p className="font-medium text-xs text-foreground truncate flex items-center gap-1.5">
                                            @{comment.ownerUsername}
                                            {comment.sentiment === 'BRAND_REPLY' && (
                                                <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] rounded uppercase font-bold">Autor</span>
                                            )}
                                        </p>
                                        <div className="flex items-center gap-3 whitespace-nowrap text-[10px] text-muted-foreground">
                                            <span>{fmtD(comment.timestamp)}</span>
                                            <a href={`https://instagram.com/p/${comment.postShortCode}`} target="_blank" rel="noopener noreferrer"
                                                className="hover:text-blue-400 flex items-center gap-0.5 transition-colors">
                                                Ver Post <CornerDownRight className="h-2.5 w-2.5" />
                                            </a>
                                        </div>
                                    </div>
                                    <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap break-words">
                                        {comment.text}
                                    </p>

                                    {comment.aiOpinion && (
                                        <div className="mt-2 p-2 rounded-lg bg-muted/30 border border-border/50 relative overflow-hidden group/ai">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-blue-500 opacity-50" />
                                            <div className="flex items-start gap-2">
                                                <Sparkles className="h-2.5 w-2.5 text-purple-400 mt-0.5" />
                                                <p className="text-[10px] italic text-muted-foreground leading-tight">
                                                    <span className="font-semibold text-purple-400/80 not-italic mr-1 text-[9px] uppercase tracking-wider">IA:</span>
                                                    {comment.aiOpinion}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {comment.aiReplySuggestion && (
                                        <div className="mt-2 p-2 rounded-lg bg-foreground/5 border border-dashed border-border flex flex-col gap-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-tighter">
                                                    🤖 Sugestão de Resposta
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    {comment.replyStatus === 'sent' && (
                                                        <span className="text-[9px] text-green-400 font-bold flex items-center gap-0.5"> ✅ Enviada</span>
                                                    )}
                                                    {comment.replyStatus === 'error' && (
                                                        <span className="text-[9px] text-red-400 font-bold flex items-center gap-0.5" title={comment.replyError}> ❌ Erro</span>
                                                    )}
                                                    {comment.replyStatus === 'pending' && (() => {
                                                        const post = posts.find(p => p.shortCode === comment.postShortCode);
                                                        const alreadyReplied = post?.latestComments?.some(other =>
                                                            other.ownerUsername === post.ownerUsername &&
                                                            other.text.toLowerCase().includes(`@${comment.ownerUsername.toLowerCase()}`)
                                                        );
                                                        return alreadyReplied
                                                            ? <span className="text-[9px] text-green-400 font-bold flex items-center gap-0.5"> ✅ Já respondido</span>
                                                            : <span className="text-[9px] text-purple-400 font-bold animate-pulse"> ⏳ Pendente</span>;
                                                    })()}
                                                    {comment.replyStatus !== 'sent' && (
                                                        <button
                                                            onClick={() => clearReplySuggestion(comment.postShortCode, comment.id)}
                                                            title="Limpar sugestão para gerar nova"
                                                            className="ml-1 h-4 w-4 flex items-center justify-center rounded text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                        >
                                                            <X className="h-2.5 w-2.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-foreground/70 leading-relaxed italic">
                                                "{comment.aiReplySuggestion}"
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                            <Heart className={`h-3 w-3 ${comment.likesCount > 0 ? 'text-pink-400 fill-pink-400/20' : ''}`} />
                                            {comment.likesCount} {comment.likesCount === 1 ? 'curtida' : 'curtidas'}
                                        </span>
                                        {comment.sentimentScore > 0 && (
                                            <span className="text-[9px] font-medium text-green-500/50 bg-green-500/10 px-1 rounded">Score: +{comment.sentimentScore}</span>
                                        )}
                                        {comment.sentimentScore < 0 && (
                                            <span className="text-[9px] font-medium text-red-500/50 bg-red-500/10 px-1 rounded">Score: {comment.sentimentScore}</span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Toast: sem comentários recentes */}
            <AnimatePresence>
                {noRecentToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mx-4 mb-3 mt-1 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2"
                    >
                        <span className="text-amber-400 text-sm">⚠️</span>
                        <p className="text-[10px] text-amber-300/90 font-medium">
                            Nenhum comentário recente elegível para sugestão de resposta. Comentários com mais de 2 dias, já respondidos ou do próprio autor são ignorados.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
