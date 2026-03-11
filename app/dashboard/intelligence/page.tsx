'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
    Radar,
    Globe,
    Instagram,
    MapPin,
    Search,
    Loader2,
    Star,
    MessageSquare,
    TrendingUp,
    ExternalLink,
    Copy,
    Flame,
    AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Types
interface ScrapeResult {
    success: boolean;
    data?: {
        markdown?: string;
        metadata?: Record<string, unknown>;
    };
    error?: string;
    source?: string;
}

interface MapsData {
    rating?: number;
    totalReviews?: number;
    highlights: string[];
}

// Helper to parse Maps data from markdown
function parseLocalMapsData(markdown: string): MapsData {
    const result: MapsData = { highlights: [] };

    const ratingMatch = markdown.match(/(\d[,.]\d)\s*(?:estrelas?|stars?|★)/i)
        || markdown.match(/(?:rating|avaliação|nota)[:\s]*(\d[,.]\d)/i);
    if (ratingMatch) {
        result.rating = parseFloat(ratingMatch[1].replace(',', '.'));
    }

    const reviewsMatch = markdown.match(/(\d[\d.,]*)\s*(?:reviews?|avaliações?|comentários?)/i);
    if (reviewsMatch) {
        result.totalReviews = parseInt(reviewsMatch[1].replace(/[.,]/g, ''), 10);
    }

    const lines = markdown.split('\n').filter(l => l.trim().length > 10).slice(0, 8);
    result.highlights = lines;

    return result;
}

export default function IntelligencePage() {
    // Scraper Universal
    const [scraperUrl, setScraperUrl] = useState('');
    const [scraperLoading, setScraperLoading] = useState(false);
    const [scraperResult, setScraperResult] = useState<ScrapeResult | null>(null);

    // Instagram
    const [igHandle, setIgHandle] = useState('');
    const [igLoading, setIgLoading] = useState(false);
    const [igResult, setIgResult] = useState<ScrapeResult | null>(null);

    // Google Maps
    const [mapsQuery, setMapsQuery] = useState('');
    const [mapsLoading, setMapsLoading] = useState(false);
    const [mapsResult, setMapsResult] = useState<ScrapeResult | null>(null);
    const [mapsData, setMapsData] = useState<MapsData | null>(null);

    // Active tab
    const [activeTab, setActiveTab] = useState<'scraper' | 'instagram' | 'maps'>('scraper');

    const callFirecrawl = async (url: string, type: string) => {
        const res = await fetch('/api/firecrawl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, type }),
        });
        return res.json();
    };

    const handleScrape = async () => {
        if (!scraperUrl.trim()) { toast.error('Cole uma URL para extrair.'); return; }
        setScraperLoading(true);
        setScraperResult(null);
        try {
            const result = await callFirecrawl(scraperUrl, 'scrape');
            setScraperResult(result);
            if (result.success) toast.success('Página extraída com sucesso!');
            else toast.error(result.error || 'Erro ao extrair.');
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setScraperLoading(false);
        }
    };

    const handleInstagram = async () => {
        if (!igHandle.trim()) { toast.error('Digite um @handle ou URL.'); return; }
        setIgLoading(true);
        setIgResult(null);
        try {
            const result = await callFirecrawl(igHandle, 'instagram');
            setIgResult(result);
            if (result.success) toast.success('Perfil analisado!');
            else toast.error(result.error || 'Erro ao analisar perfil.');
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIgLoading(false);
        }
    };

    const handleMaps = async () => {
        if (!mapsQuery.trim()) { toast.error('Digite um negócio ou URL do Maps.'); return; }
        setMapsLoading(true);
        setMapsResult(null);
        setMapsData(null);
        try {
            const result = await callFirecrawl(mapsQuery, 'maps');
            setMapsResult(result);
            if (result.success && result.data?.markdown) {
                const parsed = parseLocalMapsData(result.data.markdown);
                setMapsData(parsed);
                toast.success('Dados do Maps extraídos!');
            } else {
                toast.error(result.error || 'Erro ao buscar dados do Maps.');
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setMapsLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copiado!');
    };

    const tabs = [
        { id: 'scraper' as const, label: 'Scraper Universal', icon: Globe, color: 'text-blue-500' },
        { id: 'instagram' as const, label: 'Concorrente IG', icon: Instagram, color: 'text-pink-500' },
        { id: 'maps' as const, label: 'Google Maps Intel', icon: MapPin, color: 'text-green-500' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Radar className="h-6 w-6 text-orange-500" />
                        Inteligência Competitiva
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Análise de mercado powered by <Badge variant="outline" className="ml-1 text-orange-500 border-orange-500/30"><Flame className="h-3 w-3 mr-1" />Firecrawl</Badge>
                    </p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-muted p-1 rounded-lg">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all',
                            activeTab === tab.id
                                ? 'bg-background shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <tab.icon className={cn('h-4 w-4', activeTab === tab.id ? tab.color : '')} />
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ==================== SCRAPER UNIVERSAL ==================== */}
            {activeTab === 'scraper' && (
                <div className="space-y-4">
                    <Card className="border-blue-500/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Globe className="h-5 w-5 text-blue-500" />
                                Scraper Universal
                            </CardTitle>
                            <CardDescription>
                                Cole qualquer URL — extrai o conteúdo em texto limpo (markdown). Ideal para inspiração de legendas, pesquisa de tendências e extração de artigos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="https://exemplo.com/artigo-sobre-tendencias"
                                    value={scraperUrl}
                                    onChange={(e) => setScraperUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                                    className="flex-1"
                                />
                                <Button onClick={handleScrape} disabled={scraperLoading} className="bg-blue-600 hover:bg-blue-700">
                                    {scraperLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    <span className="ml-2 hidden sm:inline">Extrair</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {scraperResult && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {scraperResult.success ? '✅ Conteúdo Extraído' : '❌ Erro'}
                                </CardTitle>
                                {scraperResult.success && scraperResult.data?.markdown && (
                                    <div className="flex gap-2">
                                        <Badge variant="secondary" className="text-xs">
                                            {scraperResult.data.markdown.length.toLocaleString()} chars
                                        </Badge>
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(scraperResult.data?.markdown || '')}>
                                            <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent>
                                {scraperResult.success ? (
                                    <div className="max-h-[500px] overflow-y-auto rounded-lg bg-muted/50 p-4 text-sm font-mono whitespace-pre-wrap break-words">
                                        {scraperResult.data?.markdown || 'Sem conteúdo.'}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-destructive text-sm">
                                        <AlertCircle className="h-4 w-4" />
                                        {scraperResult.error}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* ==================== INSTAGRAM COMPETITOR ==================== */}
            {activeTab === 'instagram' && (
                <div className="space-y-4">
                    <Card className="border-pink-500/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Instagram className="h-5 w-5 text-pink-500" />
                                Análise de Concorrente
                            </CardTitle>
                            <CardDescription>
                                Cole um @handle ou URL de perfil público do Instagram. Extrai bio, posts recentes e informações visíveis publicamente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="@concorrente ou https://instagram.com/concorrente"
                                    value={igHandle}
                                    onChange={(e) => setIgHandle(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleInstagram()}
                                    className="flex-1"
                                />
                                <Button onClick={handleInstagram} disabled={igLoading} className="instagram-gradient border-0 text-white">
                                    {igLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    <span className="ml-2 hidden sm:inline">Analisar</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {igResult && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {igResult.success ? '📊 Dados do Perfil' : '❌ Erro'}
                                </CardTitle>
                                {igResult.success && igResult.data?.markdown && (
                                    <div className="flex gap-2">
                                        <Badge variant="secondary" className="text-xs">
                                            <Instagram className="h-3 w-3 mr-1" />
                                            {igHandle}
                                        </Badge>
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(igResult.data?.markdown || '')}>
                                            <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent>
                                {igResult.success ? (
                                    <div className="max-h-[500px] overflow-y-auto rounded-lg bg-muted/50 p-4 text-sm font-mono whitespace-pre-wrap break-words">
                                        {igResult.data?.markdown || 'Sem conteúdo. O perfil pode ser privado.'}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-destructive text-sm">
                                        <AlertCircle className="h-4 w-4" />
                                        {igResult.error}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* ==================== GOOGLE MAPS INTEL ==================== */}
            {activeTab === 'maps' && (
                <div className="space-y-4">
                    <Card className="border-green-500/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <MapPin className="h-5 w-5 text-green-500" />
                                Google Maps Intelligence
                            </CardTitle>
                            <CardDescription>
                                Pesquise um negócio ou cole uma URL do Google Maps. Extrai estrelas, quantidade de reviews e informações públicas do estabelecimento.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Nome do negócio ou URL do Google Maps"
                                    value={mapsQuery}
                                    onChange={(e) => setMapsQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleMaps()}
                                    className="flex-1"
                                />
                                <Button onClick={handleMaps} disabled={mapsLoading} className="bg-green-600 hover:bg-green-700">
                                    {mapsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    <span className="ml-2 hidden sm:inline">Pesquisar</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Maps KPI Cards */}
                    {mapsData && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/20">
                                            <Star className="h-6 w-6 text-yellow-500" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold">{mapsData.rating ?? '—'}</p>
                                            <p className="text-xs text-muted-foreground">Estrelas</p>
                                        </div>
                                    </div>
                                    {mapsData.rating && (
                                        <div className="mt-3 flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <Star key={i} className={cn('h-4 w-4', i <= Math.round(mapsData.rating!) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30')} />
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20">
                                            <MessageSquare className="h-6 w-6 text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold">{mapsData.totalReviews?.toLocaleString() ?? '—'}</p>
                                            <p className="text-xs text-muted-foreground">Reviews</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/20">
                                            <TrendingUp className="h-6 w-6 text-green-500" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold">
                                                {mapsData.rating
                                                    ? mapsData.rating >= 4.5 ? 'Excelente' : mapsData.rating >= 4.0 ? 'Bom' : mapsData.rating >= 3.0 ? 'Regular' : 'Baixo'
                                                    : '—'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Reputação</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Maps Raw Data */}
                    {mapsResult && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {mapsResult.success ? '📍 Dados Brutos do Maps' : '❌ Erro'}
                                </CardTitle>
                                {mapsResult.success && mapsResult.data?.markdown && (
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(mapsResult.data?.markdown || '')}>
                                        <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                {mapsResult.success ? (
                                    <div className="space-y-3">
                                        {mapsData && mapsData.highlights.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Destaques Extraídos</p>
                                                <ul className="space-y-1">
                                                    {mapsData.highlights.map((h, i) => (
                                                        <li key={i} className="text-sm text-muted-foreground bg-muted/50 rounded px-3 py-1.5">
                                                            {h}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        <details className="group">
                                            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
                                                Ver markdown completo
                                            </summary>
                                            <div className="mt-2 max-h-[400px] overflow-y-auto rounded-lg bg-muted/50 p-4 text-xs font-mono whitespace-pre-wrap break-words">
                                                {mapsResult.data?.markdown || 'Sem conteúdo.'}
                                            </div>
                                        </details>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-destructive text-sm">
                                        <AlertCircle className="h-4 w-4" />
                                        {mapsResult.error}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
