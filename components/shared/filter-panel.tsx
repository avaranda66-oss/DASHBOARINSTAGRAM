'use client';

import { useUIStore, useAccountStore, useCollectionStore } from '@/stores';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CONTENT_TYPES, CONTENT_STATUSES } from '@/lib/constants';
import { X, FilterX } from 'lucide-react';
import type { ContentType, ContentStatus } from '@/types/content';

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
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0" showCloseButton={false}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6 border-b border-border flex items-start justify-between">
                        <div>
                            <SheetTitle className="text-xl font-semibold flex items-center gap-2">
                                Filtros Avançados
                            </SheetTitle>
                            <SheetDescription className="mt-1">
                                Refine a visualização dos seus conteúdos. Os filtros se aplicam em tempo real.
                            </SheetDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setFilterPanelOpen(false)} className="-mr-2 -mt-2">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Form Content */}
                    <div className="p-6 flex-1 space-y-8">

                        {/* Types */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-foreground">Tipos de Conteúdo</h4>
                            <div className="flex flex-wrap gap-2">
                                {CONTENT_TYPES.map((t) => (
                                    <label key={t.value} className="flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer hover:bg-muted transition-colors">
                                        <input
                                            type="checkbox"
                                            className="rounded border-input text-primary focus:ring-primary accent-primary"
                                            checked={filters.types.includes(t.value as ContentType)}
                                            onChange={(e) => handleTypeChange(t.value as ContentType, e.target.checked)}
                                        />
                                        <span>{t.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Statuses */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-foreground">Status do Funil</h4>
                            <div className="flex flex-wrap gap-2">
                                {CONTENT_STATUSES.map((s) => (
                                    <label key={s.value} className="flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer hover:bg-muted transition-colors">
                                        <input
                                            type="checkbox"
                                            className="rounded border-input text-primary focus:ring-primary accent-primary"
                                            checked={filters.statuses.includes(s.value as ContentStatus)}
                                            onChange={(e) => handleStatusChange(s.value, e.target.checked)}
                                        />
                                        <span>{s.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Account & Collection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-sm font-semibold text-foreground mb-3">Conta Instagram</h4>
                                <select
                                    value={filters.accountId || ''}
                                    onChange={(e) => setFilter('accountId', e.target.value || null)}
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">Todas as contas</option>
                                    {accounts.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.name} ({a.handle})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-foreground mb-3">Coleção / Campanha</h4>
                                <select
                                    value={filters.collectionId || ''}
                                    onChange={(e) => setFilter('collectionId', e.target.value || null)}
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">Qualquer coleção</option>
                                    {collections.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-foreground">Período de Agendamento</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-muted-foreground">Início</label>
                                    <Input
                                        type="datetime-local"
                                        value={filters.dateRange.start || ''}
                                        onChange={(e) => setFilter('dateRange', { ...filters.dateRange, start: e.target.value || null })}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground">Fim</label>
                                    <Input
                                        type="datetime-local"
                                        value={filters.dateRange.end || ''}
                                        onChange={(e) => setFilter('dateRange', { ...filters.dateRange, end: e.target.value || null })}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Hashtag */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-foreground">Hashtag Específica</h4>
                            <Input
                                placeholder="Ex: #promo ou lancamento"
                                value={filters.hashtag}
                                onChange={(e) => setFilter('hashtag', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-border bg-muted/30">
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={clearFilters}
                                disabled={!hasActiveFilters}
                            >
                                <FilterX className="mr-2 h-4 w-4" />
                                Limpar Todos
                            </Button>
                            <Button className="flex-1" onClick={() => setFilterPanelOpen(false)}>
                                Visualizar Resultados
                            </Button>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
