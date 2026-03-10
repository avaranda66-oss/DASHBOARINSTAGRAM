'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, Infinity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnalyticsSearchProps {
    onSearch: (url: string, limit: number, period?: number) => void;
    onMerge?: (url: string, limit: number, period?: number) => void;
    isLoading: boolean;
    hasCachedData?: boolean;
    initialUrl?: string;
}

export function AnalyticsSearch({ onSearch, onMerge, isLoading, hasCachedData, initialUrl }: AnalyticsSearchProps) {
    const [url, setUrl] = useState(initialUrl || '');
    const [limit, setLimit] = useState(20);
    const [analyzeAll, setAnalyzeAll] = useState(false);
    const [searchPeriod, setSearchPeriod] = useState<number | undefined>(undefined);

    // Sync URL when initialUrl changes (e.g. from bubbles)
    useEffect(() => {
        if (initialUrl) setUrl(initialUrl);
    }, [initialUrl]);

    const normalizeUrl = () => {
        let profileUrl = url.trim();
        if (!profileUrl.startsWith('http')) {
            profileUrl = profileUrl.replace(/^@/, '');
            profileUrl = `https://www.instagram.com/${profileUrl}/`;
        }
        return profileUrl;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;
        // Se houver período, usamos um limite alto para que a data seja o filtro real
        const finalLimit = searchPeriod ? 500 : (analyzeAll ? 9999 : limit);
        onSearch(normalizeUrl(), finalLimit, searchPeriod);
    };

    const handleMerge = () => {
        if (!url.trim() || !onMerge) return;
        const finalLimit = searchPeriod ? 500 : limit;
        onMerge(normalizeUrl(), finalLimit, searchPeriod);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-1.5 min-w-[300px]">
                <label htmlFor="profile-url" className="text-sm font-medium text-muted-foreground">
                    Perfil do Instagram
                </label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        id="profile-url"
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://instagram.com/usuario ou @usuario"
                        disabled={isLoading}
                        className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    />
                </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 lg:flex-nowrap">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">
                        Nº de Posts
                    </label>
                    <div className="flex items-center gap-1.5">
                        <input
                            id="results-limit"
                            type="number"
                            min={1}
                            max={9999}
                            value={searchPeriod ? '500' : (analyzeAll ? '' : limit)}
                            onChange={(e) => { setLimit(Number(e.target.value)); setAnalyzeAll(false); }}
                            disabled={isLoading || analyzeAll || !!searchPeriod}
                            placeholder={analyzeAll || searchPeriod ? '∞' : '20'}
                            className="h-11 w-20 rounded-lg border border-border bg-background px-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                        />
                        <button
                            type="button"
                            onClick={() => setAnalyzeAll(!analyzeAll)}
                            disabled={isLoading || !!searchPeriod}
                            title={searchPeriod ? "Desativado quando período está ativo" : "Analisar todos os posts"}
                            className={`flex h-11 w-11 items-center justify-center rounded-lg border transition-all ${analyzeAll || searchPeriod
                                ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                                : 'border-border text-muted-foreground hover:text-foreground hover:border-purple-500/50'
                                } disabled:opacity-50`}
                        >
                            <Infinity className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="space-y-1.5 min-w-[140px]">
                    <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                        Histórico (Dias)
                    </label>
                    <div className="relative">
                        <select
                            value={searchPeriod ?? ''}
                            onChange={(e) => {
                                const p = e.target.value ? Number(e.target.value) : undefined;
                                setSearchPeriod(p);
                                if (p) {
                                    setLimit(100); // Default alto para abranger o período
                                    setAnalyzeAll(false);
                                }
                            }}
                            disabled={isLoading}
                            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 appearance-none pr-10"
                        >
                            <option value="">Filtrar por data...</option>
                            <option value="7">Últimos 7 dias</option>
                            <option value="30">Últimos 30 dias</option>
                            <option value="40">Últimos 40 dias</option>
                            <option value="90">Últimos 90 dias</option>
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            <Search className="h-3.5 w-3.5 opacity-50" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 min-w-fit">
                    <Button
                        type="submit"
                        disabled={isLoading || !url.trim()}
                        className="h-11 min-w-[130px] instagram-gradient text-white border-0 hover:opacity-90"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Analisando...
                            </>
                        ) : (
                            <>
                                <Search className="mr-2 h-4 w-4" />
                                {analyzeAll ? 'Analisar Tudo' : 'Analisar'}
                            </>
                        )}
                    </Button>

                    {onMerge && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleMerge}
                            disabled={isLoading || !url.trim() || analyzeAll}
                            title="Busca os últimos N posts e faz merge com dados já salvos"
                            className="h-11 text-xs"
                        >
                            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                            Atualizar
                        </Button>
                    )}
                </div>
            </div>
        </form>
    );
}
