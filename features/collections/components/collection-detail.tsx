'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Icons from 'lucide-react';
import { useCollectionStore, useContentStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { ContentCard } from '@/features/storyboard/components/content-card';
import { ContentEditorDialog } from '@/features/content/components/content-editor-dialog';
import { CollectionFormDialog } from './collection-form-dialog';
import type { Content } from '@/types/content';

interface CollectionDetailProps {
    id: string;
}

export function CollectionDetail({ id }: CollectionDetailProps) {
    const router = useRouter();
    const { collections } = useCollectionStore();
    const { contents } = useContentStore();

    const [editorOpen, setEditorOpen] = useState(false);
    const [collectionEditorOpen, setCollectionEditorOpen] = useState(false);
    const [editingContent, setEditingContent] = useState<Content | null>(null);

    const collection = collections.find((c) => c.id === id);

    if (!collection) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <Icons.FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-bold">Coleção não encontrada</h2>
                <Button variant="link" onClick={() => router.push('/dashboard/collections')}>
                    Voltar para Coleções
                </Button>
            </div>
        );
    }

    const collectionContents = contents.filter((c) => c.collectionIds.includes(collection.id));
    const Icon = (Icons as any)[collection.icon || 'Folder'] || Icons.Folder;

    const handleEditContent = (content: Content) => {
        setEditingContent(content);
        setEditorOpen(true);
    };

    const handleAddContent = () => {
        setEditingContent(null);
        setEditorOpen(true);
    };

    return (
        <>
            {/* Header */}
            <div className="mb-8 rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
                <div className="h-4 w-full" style={{ backgroundColor: collection.color }} />
                <div className="p-6 md:p-8 flex items-start gap-6">
                    <div
                        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: `${collection.color}15`, color: collection.color }}
                    >
                        <Icon className="h-8 w-8" />
                    </div>

                    <div className="flex-1">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-2xl font-bold">{collection.name}</h1>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1.5 font-medium" style={{ color: collection.color }}>
                                        <Icons.LayoutGrid className="h-4 w-4" />
                                        {collectionContents.length} {collectionContents.length === 1 ? 'conteúdo' : 'conteúdos'}
                                    </span>

                                    {collection.startDate && (
                                        <span className="flex items-center gap-1.5">
                                            <Icons.Calendar className="h-4 w-4" />
                                            {format(parseISO(collection.startDate), "dd 'de' MMM, yyyy", { locale: ptBR })}
                                            {collection.endDate && ` a ${format(parseISO(collection.endDate), "dd 'de' MMM, yyyy", { locale: ptBR })}`}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setCollectionEditorOpen(true)}>
                                    <Icons.Settings className="mr-2 h-4 w-4" />
                                    Editar Coleção
                                </Button>
                                <Button size="sm" onClick={handleAddContent} style={{ backgroundColor: collection.color, color: 'white' }}>
                                    <Icons.Plus className="mr-2 h-4 w-4" />
                                    Adicionar
                                </Button>
                            </div>
                        </div>

                        {collection.description && (
                            <p className="mt-4 text-muted-foreground leading-relaxed max-w-3xl">
                                {collection.description}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    Conteúdos
                    <span className="bg-muted px-2 rounded-full text-xs font-medium text-muted-foreground py-0.5">
                        {collectionContents.length}
                    </span>
                </h3>

                {collectionContents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-20">
                        <Icons.Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium">Nenhum conteúdo associado</h3>
                        <p className="text-muted-foreground text-sm mt-1 mb-6">
                            Adicione conteúdos a esta coleção pelo editor ou criando um novo.
                        </p>
                        <Button onClick={handleAddContent} variant="outline">
                            <Icons.Plus className="mr-2 h-4 w-4" />
                            Adicionar Primeiro Conteúdo
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {collectionContents.map((content) => (
                            <ContentCard
                                key={content.id}
                                content={content}
                                onClick={() => handleEditContent(content)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <CollectionFormDialog
                open={collectionEditorOpen}
                onOpenChange={setCollectionEditorOpen}
                collection={collection}
            />

            <ContentEditorDialog
                open={editorOpen}
                onOpenChange={setEditorOpen}
                content={editingContent}
            />
        </>
    );
}
