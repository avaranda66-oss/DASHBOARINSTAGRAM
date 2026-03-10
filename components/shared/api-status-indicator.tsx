'use client';

import { useEffect, useState } from 'react';
import Link from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Bot, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { checkApiStatusAction, type ApiStatusResult } from '@/app/actions/api-status.actions';
import { cn } from '@/lib/utils';

export function ApiStatusIndicator() {
    const router = useRouter();
    const [status, setStatus] = useState<ApiStatusResult | null>(null);

    useEffect(() => {
        const checkStatus = async () => {
            const result = await checkApiStatusAction();
            setStatus(result);
        };
        checkStatus();

        // Polling every 30s just to be safe if env changes or user updates settings
        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    if (!status) return null; // Loading state (hide briefly)

    return (
        <div className="flex items-center gap-1">
            <TooltipProvider delay={200}>
                {/* GEMINI INDICATOR */}
                <Tooltip>
                    <TooltipTrigger
                        onClick={() => router.push('/dashboard/settings')}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors border outline-none",
                            status.geminiOnline
                                ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20"
                                : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                        )}
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span className="hidden lg:inline">{status.geminiOnline ? 'Gemini OK' : 'Gemini Offline'}</span>
                        {status.geminiOnline ? <CheckCircle2 className="h-3 w-3 lg:hidden" /> : <AlertCircle className="h-3 w-3 lg:hidden" />}
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        {status.geminiOnline
                            ? "Google Gemini configurado no .env ou nas Configurações"
                            : "Gemini não configurado! Clique para configurar na interface."}
                    </TooltipContent>
                </Tooltip>

                {/* APIFY INDICATOR */}
                <Tooltip>
                    <TooltipTrigger
                        onClick={() => router.push('/dashboard/settings')}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors border outline-none",
                            status.apifyOnline
                                ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20"
                        )}
                    >
                        <Bot className="h-3.5 w-3.5" />
                        <span className="hidden lg:inline">{status.apifyOnline ? 'Apify OK' : 'Apify Offline'}</span>
                        {status.apifyOnline ? <CheckCircle2 className="h-3 w-3 lg:hidden" /> : <AlertCircle className="h-3 w-3 lg:hidden" />}
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        {status.apifyOnline
                            ? "Apify Scraper configurado no .env ou nas Configurações"
                            : "Apify não configurado. Scrapers em background não funcionarão."}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}
