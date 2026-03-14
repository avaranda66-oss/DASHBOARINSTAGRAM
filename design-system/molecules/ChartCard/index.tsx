'use client';

import * as React from 'react';
import { SectionCard } from '@/design-system/molecules/SectionCard';
import { cn } from '@/design-system/utils/cn';

export interface ChartCardProps {
    title: string;
    subtitle?: string;
    headerRight?: React.ReactNode;
    height?: number;
    isLoading?: boolean;
    children: React.ReactNode;
    className?: string;
}

export function ChartCard({
    title,
    subtitle,
    headerRight,
    height = 200,
    isLoading,
    children,
    className
}: ChartCardProps) {
    return (
        <SectionCard
            title={title}
            headerRight={headerRight}
            padding="none"
            className={cn("flex flex-col overflow-hidden", className)}
        >
            <div className="px-5 pt-1 pb-4">
                {subtitle && (
                    <p className="text-[12px] text-[#4A4A4A] tracking-tight mb-4 -mt-3">
                        {subtitle}
                    </p>
                )}

                <div 
                    className="relative w-full" 
                    style={{ height: `${height}px` }}
                >
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col gap-2">
                            {/* Shimmer Placeholder */}
                            <div className="w-full h-full bg-white/[0.03] rounded-md animate-pulse relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                                
                                {/* Simulated grid lines */}
                                <div className="absolute inset-0 flex flex-col justify-between p-4 py-8 opacity-20">
                                    <div className="h-[1px] w-full bg-white/10" />
                                    <div className="h-[1px] w-full bg-white/10" />
                                    <div className="h-[1px] w-full bg-white/10" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full">
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </SectionCard>
    );
}

// Add shimmer animation as global entry if not existing? 
// For now relying on standard tailwind pulse + manual gradient sweep if needed via custom class.
