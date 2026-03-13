'use client';

/* eslint-disable @next/next/no-img-element */
import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Ad } from '@/types/ads';
import {
    Image as ImageIcon, Eye, MousePointerClick, DollarSign,
    TrendingUp, Loader2, AlertCircle, LayoutGrid, List,
    ExternalLink, Search,
} from 'lucide-react';

interface Props {
    ads: Ad[];
    currency: string;
    isLoading: boolean;
    error: string | null;
    onFetchCreatives: () => void;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'spend' | 'impressions' | 'ctr' | 'cpc' | 'name';

function formatCurrency(value: number, currency: string = 'BRL'): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
}

function formatNumber(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString('pt-BR');
}

function statusBadge(status: string) {
    const map: Record<string, { label: string; classes: string }> = {
        ACTIVE: { label: 'Ativo', classes: 'bg-green-500/10 text-green-500 border-green-500/20' },
        PAUSED: { label: 'Pausado', classes: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
        CAMPAIGN_PAUSED: { label: 'Campanha Pausada', classes: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
        ADSET_PAUSED: { label: 'Conjunto Pausado', classes: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
        ARCHIVED: { label: 'Arquivado', classes: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
        DISAPPROVED: { label: 'Reprovado', classes: 'bg-red-500/10 text-red-500 border-red-500/20' },
        PENDING_REVIEW: { label: 'Em Análise', classes: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    };
    const info = map[status] || { label: status, classes: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${info.classes}`}>
            {info.label}
        </span>
    );
}

function getMetric(ad: Ad, key: string): number {
    const i = ad.insights;
    if (!i) return 0;
    const val = (i as unknown as Record<string, string | undefined>)[key];
    return parseFloat(val || '0') || 0;
}

function CreativeCard({ ad, currency, viewMode }: { ad: Ad; currency: string; viewMode: ViewMode }) {
    const imageUrl = ad.creative?.image_url || ad.creative?.thumbnail_url;
    const spend = getMetric(ad, 'spend');
    const impressions = getMetric(ad, 'impressions');
    const clicks = getMetric(ad, 'clicks');
    const ctr = getMetric(ad, 'ctr');
    const cpc = getMetric(ad, 'cpc');

    if (viewMode === 'list') {
        return (
            <Card className="flex items-center gap-4 p-3 hover:bg-muted/50 transition-colors">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {imageUrl ? (
                        <img
                            src={`/api/image-proxy?url=${encodeURIComponent(imageUrl)}`}
                            alt={ad.creative?.title || ad.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ad.name}</p>
                    {ad.creative?.title && (
                        <p className="text-xs text-muted-foreground truncate">{ad.creative.title}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                        {statusBadge(ad.effective_status)}
                    </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-6 text-xs shrink-0">
                    <div className="text-center">
                        <p className="text-muted-foreground">Gasto</p>
                        <p className="font-semibold">{formatCurrency(spend, currency)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-muted-foreground">Impressões</p>
                        <p className="font-semibold">{formatNumber(impressions)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-muted-foreground">Cliques</p>
                        <p className="font-semibold">{formatNumber(clicks)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-muted-foreground">CTR</p>
                        <p className="font-semibold">{ctr.toFixed(2)}%</p>
                    </div>
                    <div className="text-center">
                        <p className="text-muted-foreground">CPC</p>
                        <p className="font-semibold">{formatCurrency(cpc, currency)}</p>
                    </div>
                </div>
            </Card>
        );
    }

    // Grid view
    return (
        <Card className="overflow-hidden hover:shadow-lg transition-all group">
            {/* Image */}
            <div className="aspect-square bg-muted relative overflow-hidden">
                {imageUrl ? (
                    <img
                        src={`/api/image-proxy?url=${encodeURIComponent(imageUrl)}`}
                        alt={ad.creative?.title || ad.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <ImageIcon className="h-10 w-10" />
                        <span className="text-xs">Sem imagem</span>
                    </div>
                )}

                {/* Status overlay */}
                <div className="absolute top-2 left-2">
                    {statusBadge(ad.effective_status)}
                </div>

                {/* Link overlay */}
                {ad.creative?.link_url && (
                    <a
                        href={ad.creative.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => e.stopPropagation()}
                    >
                        <ExternalLink className="h-3 w-3" />
                    </a>
                )}
            </div>

            {/* Info */}
            <div className="p-3 space-y-2">
                <p className="text-sm font-medium truncate" title={ad.name}>{ad.name}</p>
                {ad.creative?.title && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{ad.creative.title}</p>
                )}
                {ad.creative?.body && (
                    <p className="text-[11px] text-muted-foreground/70 line-clamp-2">{ad.creative.body}</p>
                )}

                {/* Metrics grid */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2 border-t">
                    <div className="flex items-center gap-1.5">
                        <DollarSign className="h-3 w-3 text-red-500" />
                        <span className="text-[11px] text-muted-foreground">Gasto</span>
                        <span className="text-[11px] font-semibold ml-auto">{formatCurrency(spend, currency)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Eye className="h-3 w-3 text-blue-500" />
                        <span className="text-[11px] text-muted-foreground">Impr.</span>
                        <span className="text-[11px] font-semibold ml-auto">{formatNumber(impressions)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <MousePointerClick className="h-3 w-3 text-green-500" />
                        <span className="text-[11px] text-muted-foreground">Cliques</span>
                        <span className="text-[11px] font-semibold ml-auto">{formatNumber(clicks)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-3 w-3 text-purple-500" />
                        <span className="text-[11px] text-muted-foreground">CTR</span>
                        <span className="text-[11px] font-semibold ml-auto">{ctr.toFixed(2)}%</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}

export function CreativesGallery({ ads, currency, isLoading, error, onFetchCreatives }: Props) {
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [sortBy, setSortBy] = useState<SortBy>('spend');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Filtrar somente ads com criativos ou imagens
    const adsWithCreatives = useMemo(() => {
        let filtered = ads.filter(a => a.creative);

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(a =>
                a.name.toLowerCase().includes(q) ||
                a.creative?.title?.toLowerCase().includes(q) ||
                a.creative?.body?.toLowerCase().includes(q)
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(a => a.effective_status === statusFilter);
        }

        // Sort
        filtered.sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            return getMetric(b, sortBy) - getMetric(a, sortBy);
        });

        return filtered;
    }, [ads, searchQuery, statusFilter, sortBy]);

    const activeCount = ads.filter(a => a.effective_status === 'ACTIVE' && a.creative).length;
    const withImageCount = ads.filter(a => a.creative?.image_url || a.creative?.thumbnail_url).length;

    // Empty state — não carregou ainda
    if (!isLoading && ads.length === 0 && !error) {
        return (
            <Card className="p-8 flex flex-col items-center justify-center gap-4 text-center">
                <div className="p-4 rounded-full bg-muted">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Criativos das Campanhas</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                        Visualize todos os criativos dos seus anúncios ativos com métricas de performance individuais.
                    </p>
                </div>
                <Button onClick={onFetchCreatives} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                    Carregar Criativos
                </Button>
            </Card>
        );
    }

    // Loading
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-3 text-muted-foreground">Carregando criativos da Meta API...</span>
            </div>
        );
    }

    // Error
    if (error) {
        return (
            <Card className="p-4 border-red-500/30 bg-red-500/5 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                <div>
                    <p className="text-sm font-medium text-red-500">Erro ao carregar criativos</p>
                    <p className="text-xs text-muted-foreground">{error}</p>
                </div>
                <Button variant="outline" size="sm" className="ml-auto" onClick={onFetchCreatives}>
                    Tentar novamente
                </Button>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-sm">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{adsWithCreatives.length}</span>
                        <span className="text-muted-foreground">criativos</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {activeCount} ativos &middot; {withImageCount} com imagem
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar criativo..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="h-8 pl-8 pr-3 text-xs border rounded-md bg-background w-48"
                        />
                    </div>

                    {/* Status filter */}
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="h-8 px-2 text-xs border rounded-md bg-background"
                    >
                        <option value="all">Todos os status</option>
                        <option value="ACTIVE">Ativos</option>
                        <option value="PAUSED">Pausados</option>
                        <option value="CAMPAIGN_PAUSED">Camp. Pausada</option>
                        <option value="ADSET_PAUSED">Conj. Pausado</option>
                    </select>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as SortBy)}
                        className="h-8 px-2 text-xs border rounded-md bg-background"
                    >
                        <option value="spend">Maior gasto</option>
                        <option value="impressions">Mais impressões</option>
                        <option value="ctr">Maior CTR</option>
                        <option value="cpc">Maior CPC</option>
                        <option value="name">Nome A-Z</option>
                    </select>

                    {/* View toggle */}
                    <div className="flex border rounded-md overflow-hidden">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Gallery */}
            {adsWithCreatives.length === 0 ? (
                <Card className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        Nenhum criativo encontrado com os filtros atuais.
                    </p>
                </Card>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {adsWithCreatives.map(ad => (
                        <CreativeCard key={ad.id} ad={ad} currency={currency} viewMode="grid" />
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {adsWithCreatives.map(ad => (
                        <CreativeCard key={ad.id} ad={ad} currency={currency} viewMode="list" />
                    ))}
                </div>
            )}
        </div>
    );
}
