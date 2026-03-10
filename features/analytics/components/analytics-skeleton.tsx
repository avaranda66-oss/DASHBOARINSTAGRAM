'use client';

export function AnalyticsSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* KPI skeleton */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="h-4 w-24 rounded bg-muted" />
                            <div className="h-5 w-5 rounded bg-muted" />
                        </div>
                        <div className="h-8 w-20 rounded bg-muted" />
                        <div className="h-3 w-32 rounded bg-muted" />
                    </div>
                ))}
            </div>

            {/* Loading message */}
            <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-muted" />
                    <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-t-purple-500 animate-spin" />
                </div>
                <p className="mt-4 text-sm font-medium text-muted-foreground">
                    Analisando posts do Instagram...
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                    Isso pode levar de 30 segundos a alguns minutos
                </p>
            </div>

            {/* Table skeleton */}
            <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/30 px-4 py-3">
                    <div className="h-4 w-full rounded bg-muted" />
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 border-t border-border px-4 py-3">
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-muted" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-3/4 rounded bg-muted" />
                        </div>
                        <div className="h-4 w-12 rounded bg-muted" />
                        <div className="h-4 w-12 rounded bg-muted" />
                        <div className="h-4 w-12 rounded bg-muted" />
                    </div>
                ))}
            </div>
        </div>
    );
}
