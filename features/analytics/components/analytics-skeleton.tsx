'use client';

export function AnalyticsSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* KPI skeleton */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-white/[0.08] bg-[#141414] p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="h-4 w-24 rounded bg-[#1A1A1A]" />
                            <div className="h-5 w-5 rounded bg-[#1A1A1A]" />
                        </div>
                        <div className="h-8 w-20 rounded bg-[#1A1A1A]" />
                        <div className="h-3 w-32 rounded bg-[#1A1A1A]" />
                    </div>
                ))}
            </div>

            {/* Loading message */}
            <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-[#1A1A1A]" />
                    <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-t-purple-500 animate-spin" />
                </div>
                <p className="mt-4 text-sm font-medium text-[#8A8A8A]">
                    Analisando posts do Instagram...
                </p>
                <p className="mt-1 text-xs text-[#8A8A8A]/70">
                    Isso pode levar de 30 segundos a alguns minutos
                </p>
            </div>

            {/* Table skeleton */}
            <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                <div className="bg-white/[0.06] px-4 py-3">
                    <div className="h-4 w-full rounded bg-[#1A1A1A]" />
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 border-t border-white/[0.08] px-4 py-3">
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-[#1A1A1A]" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-3/4 rounded bg-[#1A1A1A]" />
                        </div>
                        <div className="h-4 w-12 rounded bg-[#1A1A1A]" />
                        <div className="h-4 w-12 rounded bg-[#1A1A1A]" />
                        <div className="h-4 w-12 rounded bg-[#1A1A1A]" />
                    </div>
                ))}
            </div>
        </div>
    );
}
