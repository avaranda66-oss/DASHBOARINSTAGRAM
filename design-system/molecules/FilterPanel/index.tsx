'use client';

import { useUIStore, useAccountStore, useCollectionStore } from '@/stores';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/design-system/atoms/Button';
import { Badge } from '@/design-system/atoms/Badge';
import { CONTENT_TYPES, CONTENT_STATUSES } from '@/lib/constants';
import type { ContentType, ContentStatus } from '@/types/content';
import { cn } from '@/design-system/utils/cn';

const LABEL_STYLE = "text-[10px] font-mono uppercase tracking-[0.15em] text-[#4A4A4A] mb-3 block";
const INPUT_STYLE = "w-full rounded border border-white/10 bg-[#050505] px-3 py-2 font-mono text-sm text-[#F5F5F5] transition-all focus:outline-none focus:border-[#A3E635]/50";

export function FilterPanel() {
    const { filterPanelOpen, setFilterPanelOpen, filters, setFilter, clearFilters } = useUIStore();
    const { accounts } = useAccountStore();
    const { collections } = useCollectionStore();

    const handleTypeChange = (value: ContentType, checked: boolean) => {
        const current = filters.types;
        if (checked) {
            setFilter('types', [...current, value]);
        } else {
            setFilter('types', current.filter((t) => t !== value));
        }
    };

    const handleStatusChange = (value: string, checked: boolean) => {
        const statusVal = value as ContentStatus;
        const current = filters.statuses;
        if (checked) {
            setFilter('statuses', [...current, statusVal]);
        } else {
            setFilter('statuses', current.filter((s) => s !== statusVal));
        }
    };

    const hasActiveFilters =
        filters.types.length > 0 ||
        filters.statuses.length > 0 ||
        filters.accountId !== null ||
        filters.collectionId !== null ||
        filters.hashtag !== '' ||
        filters.dateRange.start !== null ||
        filters.dateRange.end !== null;

    return (
        <Sheet open={filterPanelOpen} onOpenChange={setFilterPanelOpen}>
            <SheetContent side="right" className="w-full sm:max-w-md bg-[#0A0A0A] border-l border-white/10 p-0 text-[#F5F5F5]" showCloseButton={false}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-8 border-b border-white/10 bg-[#050505]">
                        <div className="flex justify-between items-start mb-2">
                             <div className="flex items-center gap-2">
                                <span className="font-mono text-[#A3E635] text-[10px] tracking-widest">[FLT_CNTRL_V2]</span>
                                <SheetTitle className="text-[18px] font-bold uppercase tracking-tight text-[#F5F5F5]">
                                    Advanced Filters
                                </SheetTitle>
                            </div>
                            <button onClick={() => setFilterPanelOpen(false)} className="text-[#4A4A4A] hover:text-[#F5F5F5] font-mono text-xs">CLOSE_X</button>
                        </div>
                        <SheetDescription className="text-[12px] text-[#4A4A4A] tracking-tight italic">Mapeamento de parâmetros para refino de dataset.</SheetDescription>
                    </div>

                    {/* Form Content */}
                    <div className="p-8 flex-1 space-y-10 overflow-y-auto scrollbar-none">

                        {/* Types */}
                        <div className="space-y-4">
                            <h4 className={LABEL_STYLE}>Content_Class</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {CONTENT_TYPES.map((t) => (
                                    <label key={t.value} className={cn(
                                        "flex items-center gap-3 px-3 py-2 border rounded-md cursor-pointer transition-all",
                                        filters.types.includes(t.value as ContentType) 
                                            ? "border-[#A3E635]/40 bg-[#A3E635]/5 text-[#A3E635]" 
                                            : "border-white/5 bg-white/5 text-[#4A4A4A] hover:border-white/10"
                                    )}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={filters.types.includes(t.value as ContentType)}
                                            onChange={(e) => handleTypeChange(t.value as ContentType, e.target.checked)}
                                        />
                                        <span className="font-mono text-[10px] tracking-widest uppercase">{t.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Statuses */}
                        <div className="space-y-4">
                            <h4 className={LABEL_STYLE}>Pipeline_Status</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {CONTENT_STATUSES.map((s) => (
                                    <label key={s.value} className={cn(
                                        "flex items-center gap-3 px-3 py-2 border rounded-md cursor-pointer transition-all",
                                        filters.statuses.includes(s.value as ContentStatus) 
                                            ? "border-[#A3E635]/40 bg-[#A3E635]/5 text-[#A3E635]" 
                                            : "border-white/5 bg-white/5 text-[#4A4A4A] hover:border-white/10"
                                    )}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={filters.statuses.includes(s.value as ContentStatus)}
                                            onChange={(e) => handleStatusChange(s.value, e.target.checked)}
                                        />
                                        <span className="font-mono text-[10px] tracking-widest uppercase">{s.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Account & Collection */}
                        <div className="space-y-8">
                            <div>
                                <h4 className={LABEL_STYLE}>Identity_Token</h4>
                                <select
                                    value={filters.accountId || ''}
                                    onChange={(e) => setFilter('accountId', e.target.value || null)}
                                    className={cn(INPUT_STYLE, "appearance-none")}
                                >
                                    <option value="">ALL_ACCOUNTS</option>
                                    {accounts.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.handle.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <h4 className={LABEL_STYLE}>Project_Link</h4>
                                <select
                                    value={filters.collectionId || ''}
                                    onChange={(e) => setFilter('collectionId', e.target.value || null)}
                                    className={cn(INPUT_STYLE, "appearance-none")}
                                >
                                    <option value="">ALL_COLLECTIONS</option>
                                    {collections.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="space-y-4">
                            <h4 className={LABEL_STYLE}>Temporal_Window</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-mono text-[#4A4A4A] mb-1 block">START_ISO</label>
                                    <input
                                        type="datetime-local"
                                        value={filters.dateRange.start || ''}
                                        onChange={(e) => setFilter('dateRange', { ...filters.dateRange, start: e.target.value || null })}
                                        className={cn(INPUT_STYLE, "text-[11px]")}
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-mono text-[#4A4A4A] mb-1 block">END_ISO</label>
                                    <input
                                        type="datetime-local"
                                        value={filters.dateRange.end || ''}
                                        onChange={(e) => setFilter('dateRange', { ...filters.dateRange, end: e.target.value || null })}
                                        className={cn(INPUT_STYLE, "text-[11px]")}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Hashtag */}
                        <div className="space-y-4">
                            <h4 className={LABEL_STYLE}>Metadata_Tag</h4>
                            <input
                                placeholder="TAG_ID_0x..."
                                value={filters.hashtag}
                                onChange={(e) => setFilter('hashtag', e.target.value)}
                                className={INPUT_STYLE}
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-8 border-t border-white/10 bg-[#050505]">
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                className="flex-1 font-mono text-[10px] tracking-widest uppercase"
                                onClick={clearFilters}
                                disabled={!hasActiveFilters}
                            >
                                SHRED_ALL
                            </Button>
                            <Button variant="solid" className="flex-1 font-mono text-[10px] tracking-widest uppercase" onClick={() => setFilterPanelOpen(false)}>
                                APPLY_KERNELS
                            </Button>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
