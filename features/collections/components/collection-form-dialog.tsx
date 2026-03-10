'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Save, X, Trash2, Palette } from 'lucide-react';
import { useCollectionStore } from '@/stores';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import * as Icons from 'lucide-react';
import type { Collection } from '@/types/collection';

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

const AVAILABLE_ICONS = [
    'Sparkles', 'Star', 'Heart', 'Tag', 'Megaphone',
    'Gift', 'Camera', 'Palette', 'Rocket', 'Globe',
    'Music', 'ShoppingBag', 'Coffee', 'Sun', 'Leaf'
];

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

    // Reset form when opened with new collection
    useState(() => {
        if (open) {
            setName(collection?.name || '');
            setDescription(collection?.description || '');
            setColor(collection?.color || PRESET_COLORS[0]);
            setIcon(collection?.icon || 'Sparkles');
            setStartDate(collection?.startDate ? collection.startDate.substring(0, 10) : '');
            setEndDate(collection?.endDate ? collection.endDate.substring(0, 10) : '');
        }
    });

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
        if (confirm('Tem certeza que deseja excluir esta coleção? Os conteúdos continuarão existindo, apenas perderão a tag desta coleção.')) {
            deleteCollection(collection.id);
            toast.success('Coleção excluída');
            onOpenChange(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0" showCloseButton={false}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <SheetTitle className="text-lg font-semibold">
                            {isEditing ? 'Editar Coleção' : 'Nova Coleção'}
                        </SheetTitle>
                        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name */}
                        <div>
                            <label className="text-sm font-medium">Nome *</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Campanha Dia das Mães"
                                className="mt-1.5"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-sm font-medium">Descrição</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Detalhes da campanha..."
                                rows={3}
                                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            />
                        </div>

                        {/* Colors */}
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Cor Tema</label>
                            <div className="flex flex-wrap gap-2">
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-primary scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                                <div className="relative h-8 w-8 rounded-full overflow-hidden border-2 border-border flex items-center justify-center bg-muted">
                                    <Palette className="h-4 w-4 text-muted-foreground absolute pointer-events-none" />
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="opacity-0 w-[200%] h-[200%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Icons */}
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Ícone</label>
                            <div className="grid grid-cols-5 gap-2">
                                {AVAILABLE_ICONS.map(i => {
                                    const LucideIcon = (Icons as any)[i];
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setIcon(i)}
                                            className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${icon === i ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}
                                        >
                                            {LucideIcon && <LucideIcon className="h-5 w-5" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Dates row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-medium">Data Início</label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Data Fim</label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="mt-1.5"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 pt-4 border-t border-border">
                            <Button type="submit" className="w-full" style={{ backgroundColor: color, color: '#fff' }}>
                                <Save className="mr-2 h-4 w-4" />
                                Salvar Coleção
                            </Button>

                            {isEditing && (
                                <Button type="button" variant="destructive" onClick={handleDelete} className="w-full">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                </Button>
                            )}
                        </div>
                    </form>
                </div>
            </SheetContent>
        </Sheet>
    );
}
