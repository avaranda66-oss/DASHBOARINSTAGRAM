'use client';

import { useState } from 'react';
import { toast } from 'sonner';
// [ZERO_LUCIDE_PURGE]
import { useCollectionStore } from '@/stores';
import { Input } from '@/design-system/atoms/Input';
import { Button } from '@/design-system/atoms/Button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import type { Collection } from '@/types/collection';
import { cn } from '@/design-system/utils/cn';

const PRESET_COLORS = [
    '#E1306C', // Instagram Pink
    '#833AB4', // Instagram Purple
    '#F77737', // Instagram Orange
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#8B5CF6', // Violet
    '#EF4444', // Red
];

const GLYPHS = {
    SAVE: '◆',
    CLOSE: '✕',
    DELETE: '✕',
    COLOR: '◎',
    ICON: '◆',
    PLUS: '+'
};

const wrap = (g: string) => <span className="font-mono text-[10px]">{g}</span>;

interface CollectionFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    collection?: Collection | null;
}

export function CollectionFormDialog({ open, onOpenChange, collection }: CollectionFormDialogProps) {
    const isEditing = !!collection;
    const { addCollection, updateCollection, deleteCollection } = useCollectionStore();

    const [name, setName] = useState(collection?.name || '');
    const [description, setDescription] = useState(collection?.description || '');
    const [color, setColor] = useState(collection?.color || PRESET_COLORS[0]);
    const [icon, setIcon] = useState(collection?.icon || 'Sparkles');
    const [startDate, setStartDate] = useState(collection?.startDate ? collection.startDate.substring(0, 10) : '');
    const [endDate, setEndDate] = useState(collection?.endDate ? collection.endDate.substring(0, 10) : '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return toast.error('Nome é obrigatório');

        const data = {
            name,
            description: description || null,
            color,
            icon,
            startDate: startDate ? new Date(startDate).toISOString() : null,
            endDate: endDate ? new Date(endDate).toISOString() : null,
        };

        if (isEditing) {
            updateCollection(collection.id, data);
            toast.success('Coleção atualizada!');
        } else {
            addCollection(data);
            toast.success('Coleção criada!');
        }

        onOpenChange(false);
    };

    const handleDelete = () => {
        if (!collection) return;
        if (confirm('Tem certeza que deseja excluir esta coleção? Os conteúdos continuarão existindo.')) {
            deleteCollection(collection.id);
            toast.success('Coleção excluída');
            onOpenChange(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0 border-l border-white/10 bg-[#050505]" showCloseButton={false}>
                <div className="p-8 font-mono">
                    <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                        <SheetTitle className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">
                            {isEditing ? 'CONFIG_KERNEL_UPDATE' : 'INIT_NEW_COLLECTION'}
                        </SheetTitle>
                        <button onClick={() => onOpenChange(false)} className="h-8 w-8 flex items-center justify-center text-[#4A4A4A] hover:text-[#F5F5F5] transition-colors">
                            <span className="text-sm">{wrap(GLYPHS.CLOSE)}</span>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Name */}
                        <Input
                            label="COL_LABEL_NAME"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="NAME_REQUIRED..."
                            required
                            isMono={true}
                        />

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-[#4A4A4A]">DESCRIPTION_META</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="PROTOCOL_DETAILS..."
                                rows={4}
                                className="w-full bg-[#0A0A0A] border border-white/10 rounded-md p-4 text-[11px] text-[#F5F5F5] font-mono focus:border-white/20 outline-none uppercase placeholder:text-[#2A2A2A] transition-all"
                            />
                        </div>

                        {/* Colors */}
                        <div className="space-y-4">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-[#4A4A4A] flex items-center gap-2">
                                <span>{wrap(GLYPHS.COLOR)}</span> THEME_HEX_NODE
                            </label>
                            <div className="flex flex-wrap gap-3">
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={cn(
                                            "h-7 w-7 rounded border-2 transition-all hover:scale-110",
                                            color === c ? 'border-[#A3E635] scale-110' : 'border-transparent'
                                        )}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                                <div className="relative h-7 w-7 rounded overflow-hidden border border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                                    <span className="text-[10px] text-[#4A4A4A]">{wrap(GLYPHS.PLUS)}</span>
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="opacity-0 absolute inset-0 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dates row */}
                        <div className="grid grid-cols-2 gap-6">
                            <Input
                                type="date"
                                label="START_EPOCH"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                isMono={true}
                            />
                            <Input
                                type="date"
                                label="END_EPOCH"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                isMono={true}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3 pt-8 border-t border-white/5">
                            <Button type="submit" className="w-full h-11 text-[10px] font-black uppercase tracking-widest bg-[#A3E635] text-black hover:bg-[#A3E635]/90">
                                <span className="mr-2">{wrap(GLYPHS.SAVE)}</span>
                                COMMIT_CHANGES
                            </Button>

                            {isEditing && (
                                <Button type="button" variant="ghost" onClick={handleDelete} className="w-full h-11 text-[9px] uppercase tracking-widest text-[#EF4444] hover:bg-[#EF4444]/5 hover:text-[#EF4444]">
                                    <span className="mr-2">{wrap(GLYPHS.DELETE)}</span>
                                    PURGE_COLLECTION
                                </Button>
                            )}
                        </div>
                    </form>
                </div>
            </SheetContent>
        </Sheet>
    );
}
