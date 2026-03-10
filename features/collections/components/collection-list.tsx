'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Icons from 'lucide-react';
import { useCollectionStore, useContentStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CollectionFormDialog } from './collection-form-dialog';
import type { Collection } from '@/types/collection';

export function CollectionList() {
    const { collections } = useCollectionStore();
    const { contents } = useContentStore();
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingCollection, setEditingCollection] = useState<Collection | null>(null);

    const handleEdit = (c: Collection, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingCollection(c);
        setEditorOpen(true);
    };

    const handleAddNew = () => {
        setEditingCollection(null);
        setEditorOpen(true);
    };

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Coleções</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Agrupe seus conteúdos em categorias ou campanhas temáticas.
                    </p>
                </div>
                <Button onClick={handleAddNew} className="instagram-gradient text-white border-0 hover:opacity-90">
                    <Icons.Plus className="mr-2 h-4 w-4" />
                    Nova Coleção
                </Button>
            </div>

            {collections.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-20">
                    <Icons.FolderPlus className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium">Nenhuma coleção encontrada</h3>
                    <p className="text-muted-foreground text-sm mt-1 text-center max-w-sm mb-6">
                        Crie sua primeira coleção para começar a organizar melhor suas campanhas.
                    </p>
                    <Button onClick={handleAddNew}>Criar Coleção</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {collections.map((collection) => {
                        const Icon = (Icons as any)[collection.icon || 'Folder'] || Icons.Folder;
                        const contentCount = contents.filter(c => c.collectionIds.includes(collection.id)).length;

                        return (
                            <Link key={collection.id} href={`/dashboard/collections/${collection.id}`}>
                                <Card className="group relative overflow-hidden flex flex-col h-full border-border/50 hover:border-border transition-all hover:shadow-md cursor-pointer">
                                    {/* Color accent line */}
                                    <div
                                        className="absolute top-0 left-0 right-0 h-1.5"
                                        style={{ backgroundColor: collection.color }}
                                    />

                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="flex items-start justify-between mb-4">
                                            <div
                                                className="p-3 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                                                style={{ backgroundColor: `${collection.color}15`, color: collection.color }}
                                            >
                                                <Icon className="h-6 w-6" />
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => handleEdit(collection, e)}
                                            >
                                                <Icons.Edit3 className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </div>

                                        <h3 className="text-lg font-semibold line-clamp-1">{collection.name}</h3>

                                        {collection.description && (
                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                {collection.description}
                                            </p>
                                        )}

                                        <div className="mt-auto pt-5 grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                            <div>
                                                {collection.startDate ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Icons.Calendar className="h-3.5 w-3.5" />
                                                        <span>
                                                            {format(parseISO(collection.startDate), "dd/MM")}
                                                            {collection.endDate && ` - ${format(parseISO(collection.endDate), "dd/MM")}`}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs opacity-50">Sem período</span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-end gap-1.5 font-medium" style={{ color: collection.color }}>
                                                <Icons.LayoutGrid className="h-3.5 w-3.5" />
                                                <span>{contentCount} {contentCount === 1 ? 'post' : 'posts'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}

            <CollectionFormDialog
                open={editorOpen}
                onOpenChange={setEditorOpen}
                collection={editingCollection}
            />
        </>
    );
}
