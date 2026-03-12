'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
    Radar, Globe, Instagram, MapPin, Search, Loader2, Star, MessageSquare,
    TrendingUp, Copy, Flame, AlertCircle, Clock, Phone, MapPinned, Tag,
    Link2, Info, Save, Trash2, Users, BarChart3, Building2, Edit3, Check, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    saveMapsBusinessAction,
    getMapsBusinessesAction,
    deleteMapsBusinessAction,
    updateMapsReviewCountAction,
} from '@/app/actions/maps.actions';

// Types
interface ScrapeResult {
    success: boolean;
    data?: { markdown?: string; metadata?: Record<string, unknown> };
    error?: string;
}

interface MapsReview {
    author: string;
    rating: number;
    text: string;
    date: string;
}

interface MapsData {
    id?: string;
    name?: string;
    rating?: number | null;
    totalReviews?: number | null;
    address?: string | null;
    phone?: string | null;
    category?: string | null;
    hours?: string | null;
    website?: string | null;
    photoUrl?: string | null;
    screenshotPath?: string | null;
    highlights: string[];
    reviews?: MapsReview[];
    aiAnalysis?: any;
    scrapedAt?: Date | string;
}

// Parse Maps data client-side from markdown
function parseLocalMapsData(markdown: string): MapsData {
    const result: MapsData = { highlights: [] };

    const nameMatch = markdown.match(/^#\s+(.+)$/m);
    if (nameMatch) result.name = nameMatch[1].trim();

    // Rating — multiple patterns
    const ratingPatterns = [
        /\n(\d\.\d)\n/m,
        /^(\d\.\d)\s*$/m,
        /(\d[,.]\d)\s*(?:estrelas?|stars?|★)/i,
        /rating[:\s]*(\d[,.]\d)/i,
    ];
    for (const pattern of ratingPatterns) {
        const m = markdown.match(pattern);
        if (m) {
            const val = parseFloat(m[1].replace(',', '.'));
            if (val >= 1.0 && val <= 5.0) { result.rating = val; break; }
        }
    }

    // Reviews count — multiple patterns
    const reviewPatterns = [
        /(\d[\d.,]*)\s*(?:reviews?|avaliações?|opiniões?)/i,
        /\((\d[\d.,]*)\)\s*$/m,
        /(\d[\d.,]*)\s*(?:Google\s+reviews?)/i,
        /reviews?\s*[:\(]\s*(\d[\d.,]*)/i,
    ];
    for (const pattern of reviewPatterns) {
        const m = markdown.match(pattern);
        if (m) {
            const val = parseInt(m[1].replace(/[.,]/g, ''), 10);
            if (val > 0) { result.totalReviews = val; break; }
        }
    }

    // Category after rating
    const categoryMatch = markdown.match(/\n\d\.\d\n+(.+)\n/m);
    if (categoryMatch && categoryMatch[1].trim().length < 50) result.category = categoryMatch[1].trim();

    // Address
    const addressMatch = markdown.match(/((?:R\.|Rua|Av\.|Tv\.|Travessa|Alameda|Praça).+?(?:Brazil|Brasil|\d{5}-\d{3}))/i);
    if (addressMatch) result.address = addressMatch[1].trim();

    // Phone
    const phoneMatch = markdown.match(/(\+?\d{2}\s?\d{2}\s?\d{4,5}[-\s]?\d{4})/);
    if (phoneMatch) result.phone = phoneMatch[1].trim();

    // Hours
    const hoursMatch = markdown.match(/((?:Closed|Aberto|Fechado|Opens?|Abre)\s*[·\-–]\s*.+)/i);
    if (hoursMatch) result.hours = hoursMatch[1].trim();

    // Website
    const websiteMatch = markdown.match(/\[.*?\]\((https?:\/\/(?!www\.google|accounts\.google|support\.google|lh3\.googleusercontent)[^\s)]+)\)/);
    if (websiteMatch) result.website = websiteMatch[1];

    // Highlights
    const junkPatterns = /collapse|drag|zoom|sign in|google apps|map data|layers|transit|traffic|saved|recents|street view|map type|globe view|labels|default|satellite|wildfires|air quality|map tools|measure|travel time|200 ft|show your|learn more|unavailable|get app|see photos|suggest|about this data|write a review|add photos|get the most|limited view|nearby|things to do|groceries|directions|send to phone/i;
    const lines = markdown.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 8 && !l.startsWith('![') && !l.startsWith('[') && !l.startsWith('|') && !l.startsWith('-') && !l.startsWith('#') && !junkPatterns.test(l));
    result.highlights = lines.slice(0, 8);

    return result;
}

export default function IntelligencePage() {
    // Scraper
    const [scraperUrl, setScraperUrl] = useState('');
    const [scraperLoading, setScraperLoading] = useState(false);
    const [scraperResult, setScraperResult] = useState<ScrapeResult | null>(null);
    // Maps
    const [mapsQuery, setMapsQuery] = useState('');
    const [mapsLoading, setMapsLoading] = useState(false);
    const [mapsResult, setMapsResult] = useState<ScrapeResult | null>(null);
    const [mapsData, setMapsData] = useState<MapsData | null>(null);
    const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
    const [savedBusinesses, setSavedBusinesses] = useState<MapsData[]>([]);
    const [savingMaps, setSavingMaps] = useState(false);
    const [editingReviews, setEditingReviews] = useState<string | null>(null);
    const [reviewInput, setReviewInput] = useState('');
    // Tabs
    const [activeTab, setActiveTab] = useState<'scraper' | 'maps'>('maps');
    const [mapsSubTab, setMapsSubTab] = useState<'search' | 'saved' | 'vs'>('search');
    // VS Comparison
    const [vsSelection, setVsSelection] = useState<string[]>([]);

    const loadSavedBusinesses = useCallback(async () => {
        const data = await getMapsBusinessesAction();
        setSavedBusinesses(data as MapsData[]);
    }, []);

    useEffect(() => { loadSavedBusinesses(); }, [loadSavedBusinesses]);

    const callFirecrawl = async (url: string, type: string) => {
        const res = await fetch('/api/firecrawl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, type }),
        });
        return res.json();
    };

    const handleScrape = async () => {
        if (!scraperUrl.trim()) { toast.error('Cole uma URL.'); return; }
        setScraperLoading(true); setScraperResult(null);
        try {
            const result = await callFirecrawl(scraperUrl, 'scrape');
            setScraperResult(result);
            result.success ? toast.success('Extraído!') : toast.error(result.error || 'Erro.');
        } catch (e: any) { toast.error(e.message); }
        finally { setScraperLoading(false); }
    };



    const handleMaps = async () => {
        if (!mapsQuery.trim()) { toast.error('Digite um negócio.'); return; }
        setMapsLoading(true); setMapsResult(null); setMapsData(null);
        try {
            // Use Playwright-based scraper for rich data
            const res = await fetch('/api/maps-scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: mapsQuery }),
            });
            const result = await res.json();
            setMapsResult(result);
            if (result.success && result.data) {
                setMapsData({ ...result.data, highlights: result.data.highlights || [] });
                toast.success('Dados extraídos via Playwright!');
            } else {
                toast.error(result.error || 'Erro ao buscar dados.');
            }
        } catch (e: any) { toast.error(e.message); }
        finally { setMapsLoading(false); }
    };

    const handleAnalyzeAI = async (business: MapsData) => {
        if (!business.reviews || business.reviews.length === 0) {
            toast.error('Nenhum review para analisar.');
            return;
        }
        setIsAnalyzingAI(true);
        try {
            const res = await fetch('/api/maps-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessName: business.name, reviews: business.reviews }),
            });
            const result = await res.json();
            
            if (result.success && result.data) {
                toast.success('Análise de IA concluída!');
                
                // Update local state
                if (mapsData?.name === business.name) {
                    setMapsData(prev => prev ? { ...prev, aiAnalysis: result.data } : prev);
                }
                
                setSavedBusinesses(prev => prev.map(b => b.id === business.id ? { ...b, aiAnalysis: result.data } : b));
                
                // Save to DB if it's already a saved business
                if (business.id) {
                    import('@/app/actions/maps.actions').then(m => m.saveMapsAnalysisAction(business.id!, result.data));
                }
            } else {
                toast.error(result.error || 'Erro na análise de IA.');
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsAnalyzingAI(false);
        }
    };

    const handleSaveBusiness = async () => {
        if (!mapsData?.name) return;
        setSavingMaps(true);
        try {
            const res = await saveMapsBusinessAction({
                name: mapsData.name,
                rating: mapsData.rating,
                totalReviews: mapsData.totalReviews,
                address: mapsData.address,
                phone: mapsData.phone,
                category: mapsData.category,
                hours: mapsData.hours,
                website: mapsData.website,
                highlights: mapsData.highlights,
                rawMarkdown: mapsResult?.data?.markdown,
            });
            if (res.success) {
                toast.success(res.isUpdate ? 'Dados atualizados!' : 'Negócio salvo!');
                await loadSavedBusinesses();
            } else {
                toast.error(res.error || 'Erro ao salvar.');
            }
        } catch (e: any) { toast.error(e.message); }
        finally { setSavingMaps(false); }
    };

    const handleDeleteBusiness = async (id: string) => {
        const res = await deleteMapsBusinessAction(id);
        if (res.success) {
            toast.success('Removido!');
            setVsSelection(prev => prev.filter(v => v !== id));
            await loadSavedBusinesses();
        }
    };

    const handleSaveReviews = async (id: string) => {
        const val = parseInt(reviewInput, 10);
        if (isNaN(val) || val < 0) { toast.error('Número inválido.'); return; }
        const res = await updateMapsReviewCountAction(id, val);
        if (res.success) {
            toast.success('Reviews atualizado!');
            setEditingReviews(null);
            await loadSavedBusinesses();
        }
    };

    const toggleVsSelection = (id: string) => {
        setVsSelection(prev =>
            prev.includes(id) ? prev.filter(v => v !== id) : prev.length < 4 ? [...prev, id] : prev
        );
    };

    const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copiado!'); };

    const reputationLabel = (r?: number | null) =>
        !r ? '—' : r >= 4.5 ? 'Excelente' : r >= 4.0 ? 'Bom' : r >= 3.0 ? 'Regular' : 'Baixo';
    const reputationColor = (r?: number | null) =>
        !r ? 'text-muted-foreground' : r >= 4.5 ? 'text-green-500' : r >= 4.0 ? 'text-blue-500' : r >= 3.0 ? 'text-yellow-500' : 'text-red-500';

    const tabs = [
        { id: 'maps' as const, label: 'Métricas Google Maps', icon: MapPin, color: 'text-green-500' },
        { id: 'scraper' as const, label: 'Scraper Universal', icon: Globe, color: 'text-blue-500' },
    ];

    const vsBusinesses = savedBusinesses.filter(b => vsSelection.includes(b.id!));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Radar className="h-6 w-6 text-orange-500" />
                    Métricas Google Maps & Inteligência
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Ferramentas de extração competitiva via Playwright e <Badge variant="outline" className="ml-1 text-orange-500 border-orange-500/30"><Flame className="h-3 w-3 mr-1" />Firecrawl</Badge>
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-muted p-1 rounded-lg">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all',
                            activeTab === tab.id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
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
                            <CardTitle className="flex items-center gap-2 text-lg"><Globe className="h-5 w-5 text-blue-500" />Scraper Universal</CardTitle>
                            <CardDescription>Cole qualquer URL — extrai conteúdo em markdown. Ideal para inspiração e pesquisa.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2">
                                <Input placeholder="https://exemplo.com/artigo" value={scraperUrl} onChange={e => setScraperUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScrape()} className="flex-1" />
                                <Button onClick={handleScrape} disabled={scraperLoading} className="bg-blue-600 hover:bg-blue-700">
                                    {scraperLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1"><Info className="h-3 w-3" />Não suporta Instagram, Facebook ou sites que exigem login.</p>
                        </CardContent>
                    </Card>
                    {scraperResult && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm">{scraperResult.success ? '✅ Extraído' : '❌ Erro'}</CardTitle>
                                {scraperResult.success && scraperResult.data?.markdown && (
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(scraperResult.data?.markdown || '')}><Copy className="h-3.5 w-3.5" /></Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                {scraperResult.success ? (
                                    <div className="max-h-[500px] overflow-y-auto rounded-lg bg-muted/50 p-4 text-sm font-mono whitespace-pre-wrap break-words">{scraperResult.data?.markdown || 'Sem conteúdo.'}</div>
                                ) : (
                                    <div className="flex items-center gap-2 text-destructive text-sm"><AlertCircle className="h-4 w-4" />{scraperResult.error}</div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}


            {/* ==================== GOOGLE MAPS INTEL ==================== */}
            {activeTab === 'maps' && (
                <div className="space-y-4">
                    {/* Maps Sub-tabs */}
                    <div className="flex gap-2">
                        {([
                            { id: 'search', label: 'Pesquisar', icon: Search },
                            { id: 'saved', label: `Salvos (${savedBusinesses.length})`, icon: Building2 },
                            { id: 'vs', label: 'VS Comparativo', icon: Users },
                        ] as const).map(tab => (
                            <button key={tab.id} onClick={() => setMapsSubTab(tab.id)}
                                className={cn('flex items-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium border transition-all',
                                    mapsSubTab === tab.id ? 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400' : 'border-border text-muted-foreground hover:text-foreground')}>
                                <tab.icon className="h-3.5 w-3.5" />{tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ---- SEARCH ---- */}
                    {mapsSubTab === 'search' && (
                        <>
                            <Card className="border-green-500/20">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-lg"><MapPin className="h-5 w-5 text-green-500" />Métricas Google Maps</CardTitle>
                                    <CardDescription>Pesquise um negócio e salve para comparar depois.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-2">
                                        <Input placeholder="Restaurante Centro SP" value={mapsQuery} onChange={e => setMapsQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleMaps()} className="flex-1" />
                                        <Button onClick={handleMaps} disabled={mapsLoading} className="bg-green-600 hover:bg-green-700">
                                            {mapsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                            <span className="ml-2 hidden sm:inline">Pesquisar</span>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Business Card + Save Button */}
                            {mapsData && mapsData.name && (
                                <Card className="bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/20">
                                    <CardContent className="pt-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-start gap-3">
                                                {mapsData.photoUrl && (
                                                    <img src={mapsData.photoUrl} alt={mapsData.name} className="h-16 w-16 rounded-lg object-cover border border-border shadow-sm" />
                                                )}
                                                <div>
                                                    <h2 className="text-xl font-bold">{mapsData.name}</h2>
                                                    {mapsData.category && <Badge variant="secondary" className="mt-1"><Tag className="h-3 w-3 mr-1" />{mapsData.category}</Badge>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {mapsData.website && (
                                                    <a href={mapsData.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs flex items-center gap-1"><Link2 className="h-3 w-3" />Site</a>
                                                )}
                                                <Button onClick={handleSaveBusiness} disabled={savingMaps} size="sm" className="bg-green-600 hover:bg-green-700">
                                                    {savingMaps ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                                    <span className="ml-1.5">Salvar</span>
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                            {mapsData.address && <div className="flex items-start gap-2 text-muted-foreground"><MapPinned className="h-4 w-4 shrink-0 mt-0.5" />{mapsData.address}</div>}
                                            {mapsData.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4 shrink-0" />{mapsData.phone}</div>}
                                            {mapsData.hours && <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4 shrink-0" />{mapsData.hours}</div>}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* KPI Cards */}
                            {mapsData && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
                                        <CardContent className="pt-6">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/20"><Star className="h-6 w-6 text-yellow-500" /></div>
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
                                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20"><MessageSquare className="h-6 w-6 text-blue-500" /></div>
                                                <div>
                                                    <p className="text-2xl font-bold">{mapsData.totalReviews?.toLocaleString() ?? <span className="text-sm text-muted-foreground">Não detectado</span>}</p>
                                                    <p className="text-xs text-muted-foreground">Reviews</p>
                                                </div>
                                            </div>

                                        </CardContent>
                                    </Card>
                                    <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                                        <CardContent className="pt-6">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/20"><TrendingUp className="h-6 w-6 text-green-500" /></div>
                                                <div>
                                                    <p className={cn('text-2xl font-bold', reputationColor(mapsData.rating))}>{reputationLabel(mapsData.rating)}</p>
                                                    <p className="text-xs text-muted-foreground">Reputação</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* AI Analysis and Reviews Section */}
                            {mapsData?.reviews && mapsData.reviews.length > 0 && (
                                <div className="space-y-4 mt-6">
                                    <h3 className="text-lg font-bold flex items-center justify-between">
                                        <span className="flex items-center gap-2"><Star className="h-5 w-5 text-yellow-500" /> Reviews Extraídos ({mapsData.reviews.length})</span>
                                        <Button 
                                            size="sm" 
                                            variant="secondary" 
                                            className="bg-purple-600/10 text-purple-600 hover:bg-purple-600/20 hover:text-purple-700 border border-purple-500/30"
                                            onClick={() => handleAnalyzeAI(mapsData)}
                                            disabled={isAnalyzingAI}
                                        >
                                            {isAnalyzingAI ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Flame className="h-4 w-4 mr-2" />}
                                            Gerar Análise com IA
                                        </Button>
                                    </h3>
                                    
                                    {mapsData.aiAnalysis && (
                                        <Card className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-500/20">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-lg flex items-center gap-2 text-purple-700 dark:text-purple-400">
                                                    <Flame className="h-5 w-5" /> Inteligência Competitiva e Sentimento
                                                </CardTitle>
                                                <CardDescription className="text-purple-600/80 dark:text-purple-300/80">
                                                    {mapsData.aiAnalysis.summary}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex items-center gap-4 mb-6">
                                                    <div className="flex-1">
                                                        <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
                                                            <div className="bg-green-500 h-full" style={{ width: `${mapsData.aiAnalysis.sentimentScore?.positive || 0}%` }} title="Positivo"></div>
                                                            <div className="bg-yellow-500 h-full" style={{ width: `${mapsData.aiAnalysis.sentimentScore?.neutral || 0}%` }} title="Neutro"></div>
                                                            <div className="bg-red-500 h-full" style={{ width: `${mapsData.aiAnalysis.sentimentScore?.negative || 0}%` }} title="Negativo"></div>
                                                        </div>
                                                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                                                            <span className="text-green-600 dark:text-green-400 font-medium">Positivo ({mapsData.aiAnalysis.sentimentScore?.positive || 0}%)</span>
                                                            <span className="text-red-600 dark:text-red-400 font-medium">Negativo ({mapsData.aiAnalysis.sentimentScore?.negative || 0}%)</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="bg-green-500/5 border border-green-500/20 rounded-md p-3">
                                                        <h4 className="text-xs font-bold text-green-700 dark:text-green-400 mb-2">Pontos Fortes Recorrentes</h4>
                                                        <ul className="space-y-1.5 text-xs">
                                                            {mapsData.aiAnalysis.positiveHighlights?.map((h: string, i: number) => <li key={i} className="flex gap-1.5"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" />{h}</li>)}
                                                        </ul>
                                                    </div>
                                                    <div className="bg-red-500/5 border border-red-500/20 rounded-md p-3">
                                                        <h4 className="text-xs font-bold text-red-700 dark:text-red-400 mb-2">Principais Reclamações</h4>
                                                        <ul className="space-y-1.5 text-xs">
                                                            {mapsData.aiAnalysis.negativeHighlights?.map((h: string, i: number) => <li key={i} className="flex gap-1.5"><X className="h-3.5 w-3.5 text-red-500 shrink-0" />{h}</li>)}
                                                        </ul>
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-4 bg-purple-500/5 border border-purple-500/20 rounded-md p-3">
                                                    <h4 className="text-xs font-bold text-purple-700 dark:text-purple-400 mb-2">Ações Recomendadas</h4>
                                                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                                                        {mapsData.aiAnalysis.recommendations?.map((r: string, i: number) => <li key={i} className="flex gap-1.5">— {r}</li>)}
                                                    </ul>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1 pb-1 custom-scrollbar">
                                        {mapsData.reviews.map((r, i) => (
                                            <Card key={i} className="bg-card shadow-sm text-sm border-border/50">
                                                <CardContent className="p-4 flex flex-col h-full">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="font-semibold text-xs truncate max-w-[150px]">{r.author}</span>
                                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{r.date || 'Recente'}</span>
                                                    </div>
                                                    <div className="flex gap-0.5 mb-2">
                                                        {Array.from({length: 5}).map((_, idx) => <Star key={idx} className={cn("h-3 w-3", idx < r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30")} />)}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground italic flex-1 line-clamp-4">{r.text || 'Sem comentário escrito.'}</p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Screenshot (collapsible) */}
                            {mapsData?.screenshotPath && (
                                <details className="group mt-4 mb-4">
                                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"><Info className="h-3.5 w-3.5" /> Ver Screenshot completo</summary>
                                    <Card className="mt-2">
                                        <CardContent className="p-2">
                                            <img src={mapsData.screenshotPath} alt="Maps Screenshot" className="w-full rounded-lg border border-border shadow-sm max-h-[400px] object-cover object-top" />
                                        </CardContent>
                                    </Card>
                                </details>
                            )}
                        </>
                    )}

                    {/* ---- SAVED ---- */}
                    {mapsSubTab === 'saved' && (
                        <div className="space-y-3">
                            {savedBusinesses.length === 0 ? (
                                <Card><CardContent className="pt-6 text-center text-muted-foreground text-sm py-12">
                                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    Nenhum negócio salvo. Use a aba "Pesquisar" para buscar e salvar.
                                </CardContent></Card>
                            ) : (
                                savedBusinesses.map(b => (
                                    <Card key={b.id} className="hover:border-green-500/30 transition-colors">
                                        <CardContent className="pt-5 pb-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-semibold text-sm truncate">{b.name}</h3>
                                                        {b.category && <Badge variant="secondary" className="text-[10px] shrink-0">{b.category}</Badge>}
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />{b.rating ?? '—'}</span>
                                                        <span className="flex items-center gap-1">
                                                            <MessageSquare className="h-3 w-3" />
                                                            {editingReviews === b.id ? (
                                                                <span className="flex items-center gap-1">
                                                                    <input type="number" value={reviewInput} onChange={e => setReviewInput(e.target.value)} className="w-16 h-5 text-xs border rounded px-1 bg-transparent" autoFocus />
                                                                    <button onClick={() => handleSaveReviews(b.id!)} className="text-green-500 hover:text-green-400"><Check className="h-3 w-3" /></button>
                                                                    <button onClick={() => setEditingReviews(null)} className="text-red-500 hover:text-red-400"><X className="h-3 w-3" /></button>
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1">
                                                                    {b.totalReviews?.toLocaleString() ?? '—'} reviews
                                                                    <button onClick={() => { setEditingReviews(b.id!); setReviewInput(String(b.totalReviews ?? '')); }} className="text-muted-foreground/50 hover:text-foreground"><Edit3 className="h-2.5 w-2.5" /></button>
                                                                </span>
                                                            )}
                                                        </span>
                                                        {b.address && <span className="flex items-center gap-1 truncate max-w-[200px]"><MapPinned className="h-3 w-3 shrink-0" />{b.address}</span>}
                                                        {b.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{b.phone}</span>}
                                                    </div>
                                                    {b.scrapedAt && <p className="text-[10px] text-muted-foreground/50 mt-1">Scrapeado em {new Date(b.scrapedAt).toLocaleDateString('pt-BR')}</p>}
                                                </div>
                                                <div className="flex items-center gap-1 ml-2">
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500/50 hover:text-red-500" onClick={() => handleDeleteBusiness(b.id!)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    )}

                    {/* ---- VS COMPARISON ---- */}
                    {mapsSubTab === 'vs' && (
                        <div className="space-y-4">
                            {savedBusinesses.length < 2 ? (
                                <Card><CardContent className="pt-6 text-center text-muted-foreground text-sm py-12">
                                    <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    Salve pelo menos 2 negócios para comparar.
                                </CardContent></Card>
                            ) : (
                                <>
                                    {/* Selection */}
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-green-500" />Selecione até 4 negócios para comparar</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex flex-wrap gap-2">
                                                {savedBusinesses.map(b => (
                                                    <button key={b.id} onClick={() => toggleVsSelection(b.id!)}
                                                        className={cn('py-1.5 px-3 rounded-full text-xs font-medium border transition-all',
                                                            vsSelection.includes(b.id!)
                                                                ? 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400'
                                                                : 'border-border text-muted-foreground hover:border-muted-foreground/50')}>
                                                        {b.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Comparison Table */}
                                    {vsBusinesses.length >= 2 && (
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-green-500" />Comparativo</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="border-b">
                                                                <th className="text-left py-2 pr-4 text-xs text-muted-foreground font-medium">Indicador</th>
                                                                {vsBusinesses.map(b => (
                                                                    <th key={b.id} className="text-center py-2 px-3 text-xs font-semibold">{b.name}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr className="border-b border-border/50">
                                                                <td className="py-2.5 pr-4 text-xs text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500" /> Estrelas</td>
                                                                {vsBusinesses.map(b => {
                                                                    const best = Math.max(...vsBusinesses.map(v => v.rating ?? 0));
                                                                    return <td key={b.id} className={cn('text-center py-2.5 px-3 font-bold', b.rating === best ? 'text-green-500' : '')}>{b.rating ?? '—'}</td>;
                                                                })}
                                                            </tr>
                                                            <tr className="border-b border-border/50">
                                                                <td className="py-2.5 pr-4 text-xs text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3 text-blue-500" /> Reviews</td>
                                                                {vsBusinesses.map(b => {
                                                                    const best = Math.max(...vsBusinesses.map(v => v.totalReviews ?? 0));
                                                                    return <td key={b.id} className={cn('text-center py-2.5 px-3 font-bold', b.totalReviews === best ? 'text-green-500' : '')}>{b.totalReviews?.toLocaleString() ?? '—'}</td>;
                                                                })}
                                                            </tr>
                                                            <tr className="border-b border-border/50">
                                                                <td className="py-2.5 pr-4 text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3 text-green-500" /> Reputação</td>
                                                                {vsBusinesses.map(b => (
                                                                    <td key={b.id} className={cn('text-center py-2.5 px-3 font-semibold', reputationColor(b.rating))}>{reputationLabel(b.rating)}</td>
                                                                ))}
                                                            </tr>
                                                            <tr className="border-b border-border/50 bg-purple-500/5">
                                                                <td className="py-2.5 pr-4 text-xs text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1"><Flame className="h-3 w-3" /> Sentimento IA</td>
                                                                {vsBusinesses.map(b => (
                                                                    <td key={b.id} className="text-center py-2.5 px-3">
                                                                        {b.aiAnalysis?.sentimentScore ? (
                                                                            <div className="flex flex-col items-center gap-1">
                                                                                <span className="text-xs font-bold text-green-600">{b.aiAnalysis.sentimentScore.positive}% Positivo</span>
                                                                                <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden flex">
                                                                                    <div className="bg-green-500 h-full" style={{ width: `${b.aiAnalysis.sentimentScore.positive}%` }}></div>
                                                                                    <div className="bg-red-500 h-full" style={{ width: `${b.aiAnalysis.sentimentScore.negative}%` }}></div>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-[10px] text-muted-foreground">Sem análise</span>
                                                                        )}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                            <tr className="border-b border-border/50">
                                                                <td className="py-2.5 pr-4 text-xs text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" /> Categoria</td>
                                                                {vsBusinesses.map(b => (
                                                                    <td key={b.id} className="text-center py-2.5 px-3 text-xs">{b.category ?? '—'}</td>
                                                                ))}
                                                            </tr>
                                                            <tr className="border-b border-border/50">
                                                                <td className="py-2.5 pr-4 text-xs text-muted-foreground flex items-center gap-1"><Link2 className="h-3 w-3" /> Website</td>
                                                                {vsBusinesses.map(b => (
                                                                    <td key={b.id} className="text-center py-2.5 px-3 text-xs">
                                                                        {b.website ? <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Tem ✓</a> : <span className="text-muted-foreground">Não</span>}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                            <tr>
                                                                <td className="py-2.5 pr-4 text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Horário</td>
                                                                {vsBusinesses.map(b => (
                                                                    <td key={b.id} className="text-center py-2.5 px-3 text-xs">{b.hours ?? '—'}</td>
                                                                ))}
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
