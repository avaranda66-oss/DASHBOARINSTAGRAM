'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
    saveMapsBusinessAction,
    getMapsBusinessesAction,
    deleteMapsBusinessAction,
    updateMapsReviewCountAction,
} from '@/app/actions/maps.actions';
import { Button } from '@/design-system/atoms/Button';
import { KpiCard } from '@/design-system/molecules/KpiCard';
import { Badge } from '@/design-system/atoms/Badge';
import { cn } from '@/design-system/utils/cn';

// V2 Common Styles
const CARD_STYLE = {
    backgroundColor: '#0A0A0A',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: '8px',
};

const SECTION_HEADER_STYLE = "font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A] select-none flex items-center gap-2 mb-6";

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as any } },
};

// Types
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

interface ScrapeResult {
    success: boolean;
    data?: { markdown?: string; metadata?: Record<string, unknown> };
    error?: string;
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

    const handleScrape = async () => {
        if (!scraperUrl.trim()) return;
        setScraperLoading(true); setScraperResult(null);
        try {
            const res = await fetch('/api/firecrawl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: scraperUrl, type: 'scrape' }),
            });
            const result = await res.json();
            setScraperResult(result);
            result.success ? toast.success('Conteúdo extraído!') : toast.error(result.error);
        } catch (e: any) { toast.error(e.message); }
        finally { setScraperLoading(false); }
    };

    const handleMaps = async () => {
        if (!mapsQuery.trim()) return;
        setMapsLoading(true); setMapsResult(null); setMapsData(null);
        try {
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
                toast.error(result.error);
            }
        } catch (e: any) { toast.error(e.message); }
        finally { setMapsLoading(false); }
    };

    const handleAnalyzeAI = async (business: MapsData) => {
        if (!business.reviews || business.reviews.length === 0) return;
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
                if (mapsData?.name === business.name) {
                    setMapsData(prev => prev ? { ...prev, aiAnalysis: result.data } : prev);
                }
                setSavedBusinesses(prev => prev.map(b => b.id === business.id ? { ...b, aiAnalysis: result.data } : b));
                if (business.id) {
                    import('@/app/actions/maps.actions').then(m => m.saveMapsAnalysisAction(business.id!, result.data));
                }
            }
        } catch (e: any) { toast.error(e.message); }
        finally { setIsAnalyzingAI(false); }
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
                toast.success('Negócio indexado!');
                await loadSavedBusinesses();
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
        if (isNaN(val) || val < 0) return;
        const res = await updateMapsReviewCountAction(id, val);
        if (res.success) {
            toast.success('Dados atualizados!');
            setEditingReviews(null);
            await loadSavedBusinesses();
        }
    };

    const toggleVsSelection = (id: string) => {
        setVsSelection(prev =>
            prev.includes(id) ? prev.filter(v => v !== id) : prev.length < 4 ? [...prev, id] : prev
        );
    };

    const reputationLabel = (r?: number | null) =>
        !r ? '—' : r >= 4.5 ? 'EXCELENTE' : r >= 4.0 ? 'BOM' : r >= 3.0 ? 'REGULAR' : 'BAIXO';

    const vsBusinesses = savedBusinesses.filter(b => vsSelection.includes(b.id!));

    return (
        <motion.div className="space-y-8" variants={container} initial="hidden" animate="show">
            
            {/* ─── Header ─── */}
            <motion.div variants={item} className="pb-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-[#A3E635] text-[10px] tracking-widest">[INTEL_OS_V2]</span>
                    <h1 className="text-[2rem] font-bold tracking-tight text-[#F5F5F5]">Intelligence Engine</h1>
                </div>
                <p className="text-[14px] text-[#4A4A4A] tracking-tight">Extração de dados competitivos, análise de sentimento e reputação via HUD.</p>
            </motion.div>

            {/* ─── Tab Switcher ─── */}
            <motion.div variants={item} className="flex bg-[#0A0A0A] border rounded-lg p-0.5 w-fit" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                {([
                    { id: 'maps', label: 'MAPS METRICS' },
                    { id: 'scraper', label: 'UNIVERSAL SCRAPER' }
                ] as const).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "relative px-6 py-2 transition-colors duration-150",
                            activeTab === tab.id ? "text-[#F5F5F5]" : "text-[#4A4A4A] hover:text-[#8A8A8A]"
                        )}
                    >
                        {activeTab === tab.id && (
                            <motion.div layoutId="intel-tab-bg" className="absolute inset-0 bg-[#141414] rounded-[6px]" />
                        )}
                        <span className="relative z-10 font-bold text-[10px] tracking-[0.15em] uppercase">{tab.label}</span>
                    </button>
                ))}
            </motion.div>

            {activeTab === 'scraper' && (
                <motion.div variants={item} className="space-y-6">
                    <div className="p-8" style={CARD_STYLE}>
                        <h4 className={SECTION_HEADER_STYLE}>
                            <span className="text-[#A3E635]">◎</span> Web Scraper [01]
                        </h4>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                value={scraperUrl}
                                onChange={e => setScraperUrl(e.target.value)}
                                placeholder="https://exemplo.com/blueprint"
                                className="bg-transparent border-b border-white/10 text-[#F5F5F5] font-mono text-sm px-2 py-4 outline-none focus:border-[#A3E635] transition-colors flex-1"
                            />
                            <Button onClick={handleScrape} isLoading={scraperLoading} variant="solid">EXTRACT</Button>
                        </div>
                    </div>
                    {scraperResult && (
                        <div className="p-8" style={CARD_STYLE}>
                             <h4 className={SECTION_HEADER_STYLE}>
                                <span className="text-[#A3E635]">◆</span> Raw Content
                            </h4>
                            <div className="max-h-[500px] overflow-y-auto rounded bg-[#141414] p-6 text-xs font-mono whitespace-pre-wrap text-[#8A8A8A] leading-relaxed border border-white/5">
                                {scraperResult.success ? scraperResult.data?.markdown : scraperResult.error}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {activeTab === 'maps' && (
                <motion.div variants={item} className="space-y-8">
                    
                    {/* Sub Navigation */}
                    <div className="flex gap-2">
                        {([
                            { id: 'search', label: 'PESQUISAR', tag: '01' },
                            { id: 'saved', label: `SALVOS [${savedBusinesses.length}]`, tag: '02' },
                            { id: 'vs', label: 'COMPARAÇÃO', tag: '03' }
                        ] as const).map(tab => (
                            <button key={tab.id} onClick={() => setMapsSubTab(tab.id)}
                                className={cn(
                                    "px-4 py-2 border rounded font-mono text-[10px] tracking-widest transition-all uppercase",
                                    mapsSubTab === tab.id ? "bg-[#A3E635] text-black border-[#A3E635]" : "text-[#4A4A4A] border-white/5 hover:border-white/10"
                                )}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {mapsSubTab === 'search' && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                             <div className="p-8" style={CARD_STYLE}>
                                <h4 className={SECTION_HEADER_STYLE}>
                                    <span className="text-[#A3E635]">◎</span> Google Maps Data
                                </h4>
                                <div className="flex gap-4">
                                    <input
                                        type="text"
                                        value={mapsQuery}
                                        onChange={e => setMapsQuery(e.target.value)}
                                        placeholder="Nome do negócio ou Local"
                                        className="bg-transparent border-b border-white/10 text-[#F5F5F5] font-mono text-sm px-2 py-4 outline-none focus:border-[#A3E635] transition-colors flex-1"
                                    />
                                    <Button onClick={handleMaps} isLoading={mapsLoading} variant="solid">SCAN_MAPS</Button>
                                </div>
                            </div>

                            {mapsData && (
                                <div className="space-y-8">
                                    <div className="p-8" style={CARD_STYLE}>
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                                            <div className="flex gap-6">
                                                {mapsData.photoUrl && (
                                                    <img src={mapsData.photoUrl} className="h-24 w-24 rounded object-cover border border-white/10" />
                                                )}
                                                <div>
                                                    <h2 className="text-[1.5rem] font-bold text-[#F5F5F5] mb-2">{mapsData.name}</h2>
                                                    <Badge intent="info" variant="subtle">{mapsData.category || 'N/A'}</Badge>
                                                    <div className="mt-4 space-y-1 font-mono text-[11px] text-[#4A4A4A]">
                                                        <p>LOC: {mapsData.address}</p>
                                                        <p>PHN: {mapsData.phone}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button onClick={handleSaveBusiness} isLoading={savingMaps} variant="outline" className="font-mono text-[10px] tracking-widest uppercase">INDEX_BUSINESS ↗</Button>
                                        </div>
                                    </div>

                                    {/* KPI Cards Rebuild */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <KpiCard label="Avaliação Média" value={mapsData.rating?.toString() || '—'} deltaLabel="Estrelas" />
                                        <KpiCard label="Total de Reviews" value={mapsData.totalReviews?.toLocaleString() || '0'} deltaLabel="Google" />
                                        <KpiCard label="Reputação HUD" value={reputationLabel(mapsData.rating)} />
                                    </div>

                                    {/* AI Analysis */}
                                    {mapsData.reviews && mapsData.reviews.length > 0 && (
                                        <div className="p-8" style={CARD_STYLE}>
                                            <div className="flex items-center justify-between mb-8">
                                                <h4 className={SECTION_HEADER_STYLE}><span className="text-[#A3E635]">◐</span> AI Intel Engine</h4>
                                                <Button onClick={() => handleAnalyzeAI(mapsData)} isLoading={isAnalyzingAI} variant="solid" className="font-mono text-[9px] tracking-[0.2em]">RUN_AI_SYNCHRONIZER</Button>
                                            </div>

                                            {mapsData.aiAnalysis && (
                                                <div className="space-y-8 animate-in zoom-in-95 duration-500">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                        <div className="p-6 bg-[#141414] rounded border border-white/5">
                                                            <h5 className="font-mono text-[9px] uppercase tracking-widest text-[#10B981] mb-4">Positive Vectors</h5>
                                                            <ul className="space-y-2 text-[12px] text-[#8A8A8A]">
                                                                {mapsData.aiAnalysis.positiveHighlights?.map((h: string, i: number) => <li key={i} className="flex gap-2"><span className="text-[#10B981]">◆</span> {h}</li>)}
                                                            </ul>
                                                        </div>
                                                        <div className="p-6 bg-[#141414] rounded border border-white/5">
                                                            <h5 className="font-mono text-[9px] uppercase tracking-widest text-[#EF4444] mb-4">Negative Vectors</h5>
                                                            <ul className="space-y-2 text-[12px] text-[#8A8A8A]">
                                                                {mapsData.aiAnalysis.negativeHighlights?.map((h: string, i: number) => <li key={i} className="flex gap-2"><span className="text-[#EF4444]">✕</span> {h}</li>)}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                    <div className="p-6 bg-[#141414] rounded border border-white/5">
                                                        <h5 className="font-mono text-[9px] uppercase tracking-widest text-[#A3E635] mb-4">Strategic Recommendations</h5>
                                                        <div className="space-y-3 text-[12px] text-[#F5F5F5] leading-relaxed">
                                                            {mapsData.aiAnalysis.recommendations?.map((r: string, i: number) => <p key={i}>→ {r}</p>)}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-8">
                                                {mapsData.reviews.map((r, i) => (
                                                    <div key={i} className="p-4 bg-[#141414] border border-white/5 rounded text-[11px] font-mono leading-snug">
                                                        <div className="flex justify-between mb-2">
                                                            <span className="text-[#A3E635]">@{r.author.replace(/\s+/g, '').toLowerCase()}</span>
                                                            <span className="text-[#4A4A4A]">{r.rating}★</span>
                                                        </div>
                                                        <p className="text-[#8A8A8A] line-clamp-3">{r.text}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {mapsSubTab === 'saved' && (
                        <div className="space-y-4 animate-in fade-in duration-500">
                            {savedBusinesses.map(b => (
                                <div key={b.id} className="p-6" style={CARD_STYLE}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="font-mono text-[10px] text-[#A3E635] bg-[#A3E635]/5 px-2 py-1 rounded">INDEX_{b.id?.slice(0,4)}</div>
                                            <h3 className="font-bold text-[14px] text-[#F5F5F5] uppercase tracking-tight">{b.name}</h3>
                                            <Badge intent="default" variant="subtle" size="sm">{b.category}</Badge>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="flex flex-col items-end font-mono">
                                                <span className="text-[12px] font-bold text-[#F5F5F5]">{b.rating}★</span>
                                                <span className="text-[9px] text-[#4A4A4A]">{b.totalReviews} REVIEWS</span>
                                            </div>
                                            <button onClick={() => handleDeleteBusiness(b.id!)} className="text-[#EF4444] opacity-40 hover:opacity-100 transition-opacity font-mono text-[10px]">DELETE_INTEL</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {mapsSubTab === 'vs' && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                             <div className="p-8" style={CARD_STYLE}>
                                <h4 className={SECTION_HEADER_STYLE}><span className="text-[#A3E635]">⚔️</span> Selection Matrix</h4>
                                <div className="flex flex-wrap gap-2">
                                    {savedBusinesses.map(b => (
                                        <button key={b.id} onClick={() => toggleVsSelection(b.id!)}
                                            className={cn(
                                                "px-4 py-2 border rounded font-mono text-[10px] tracking-widest transition-all uppercase",
                                                vsSelection.includes(b.id!) ? "bg-[#A3E635] text-black border-[#A3E635]" : "text-[#4A4A4A] border-white/5 hover:border-white/10"
                                            )}>
                                            {b.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {vsBusinesses.length >= 2 && (
                                <div className="p-8" style={CARD_STYLE}>
                                    <h4 className={SECTION_HEADER_STYLE}><span className="text-[#A3E635]">◆</span> Technical Benchmarking</h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left font-mono">
                                            <thead>
                                                <tr className="border-b border-white/5">
                                                    <th className="py-4 text-[10px] text-[#4A4A4A] tracking-widest uppercase">Indicator</th>
                                                    {vsBusinesses.map(b => (
                                                        <th key={b.id} className="py-4 text-[10px] text-[#A3E635] tracking-widest uppercase text-center">{(b.name ?? '').slice(0, 15)}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="text-[11px] text-[#8A8A8A]">
                                                <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                                    <td className="py-4 uppercase opacity-50">Rating_Sync</td>
                                                    {vsBusinesses.map(b => <td key={b.id} className="py-4 text-center text-[#F5F5F5]">{b.rating}★</td>)}
                                                </tr>
                                                <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                                    <td className="py-4 uppercase opacity-50">Review_Density</td>
                                                    {vsBusinesses.map(b => <td key={b.id} className="py-4 text-center text-[#F5F5F5]">{b.totalReviews}</td>)}
                                                </tr>
                                                <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                                    <td className="py-4 uppercase opacity-50">Sentiment_Score</td>
                                                    {vsBusinesses.map(b => (
                                                        <td key={b.id} className="py-4 text-center">
                                                            {b.aiAnalysis?.sentimentScore ? `${b.aiAnalysis.sentimentScore.positive}% POS` : 'N/A'}
                                                        </td>
                                                    ))}
                                                </tr>
                                                <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                                    <td className="py-4 uppercase opacity-50">Loc_Status</td>
                                                    {vsBusinesses.map(b => <td key={b.id} className="py-4 text-center text-[9px] px-2">{b.address?.split(',')[0]}</td>)}
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
}
