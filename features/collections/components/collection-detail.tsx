'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
// [ZERO_LUCIDE_PURGE]
import { useCollectionStore, useContentStore } from '@/stores';
import { Button } from '@/design-system/atoms/Button';
import { ContentCard } from '@/features/storyboard/components/content-card';
import { ContentEditorDialog } from '@/features/content/components/content-editor-dialog';
import { CollectionFormDialog } from './collection-form-dialog';
import type { Content } from '@/types/content';
import { cn } from '@/design-system/utils/cn';

interface CollectionDetailProps {
    id: string;
}

const GLYPHS = {
    FOLDER: '◆',
    GRID: '◫',
    CALENDAR: '◷',
    SETTINGS: '◎',
    PLUS: '+',
    INBOX: '∅',
    BACK: '←'
};

const wrap = (g: string) => <span className="font-mono text-[10px]">{g}</span>;

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
            <div className="flex flex-col items-center justify-center min-h-[60vh] font-mono text-center">
                <span className="text-4xl text-[#4A4A4A] mb-4">{wrap(GLYPHS.INBOX)}</span>
                <h2 className="text-lg font-bold uppercase tracking-widest text-[#F5F5F5]">Collection_Not_Found</h2>
                <Button variant="ghost" onClick={() => router.push('/dashboard/collections')} className="mt-4 text-[#A3E635] uppercase tracking-widest text-[10px]">
                    {wrap(GLYPHS.BACK)} RETURN_TO_BASE
                </Button>
            </div>
        );
    }

    const collectionContents = contents.filter((c) => c.collectionIds.includes(collection.id));

    const handleEditContent = (content: Content) => {
        setEditingContent(content);
        setEditorOpen(true);
    };

    const handleAddContent = () => {
        setEditingContent(null);
        setEditorOpen(true);
    };

    return (
        <div className="font-mono">
            {/* Header */}
            <div className="mb-12 bg-[#0A0A0A] border border-white/10 rounded-lg overflow-hidden group">
                <div className="h-1 w-full opacity-40 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: collection.color }} />
                <div className="p-8 flex flex-col md:flex-row items-start gap-8">
                    <div
                        className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/[0.02]"
                        style={{ color: collection.color }}
                    >
                        <span className="text-3xl">{wrap(GLYPHS.FOLDER)}</span>
                    </div>

                    <div className="flex-1 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h1 className="text-3xl font-black tracking-tighter text-[#F5F5F5] uppercase">{collection.name}</h1>
                                <div className="flex flex-wrap items-center gap-6 mt-3 text-[10px] uppercase tracking-widest font-bold">
                                    <span className="flex items-center gap-2" style={{ color: collection.color }}>
                                        <span>{wrap(GLYPHS.GRID)}</span>
                                        {collectionContents.length} NODES
                                    </span>

                                    {collection.startDate && (
                                        <span className="flex items-center gap-2 text-[#4A4A4A]">
                                            <span>{GLYPHS.CALENDAR}</span>
                                            {format(parseISO(collection.startDate), "dd.MM.yyyy")}
                                            {collection.endDate && ` > ${format(parseISO(collection.endDate), "dd.MM.yyyy")}`}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button variant="outline" size="sm" onClick={() => setCollectionEditorOpen(true)} className="h-9 px-4 border-white/10 text-[9px] uppercase tracking-widest">
                                    <span className="mr-2 opacity-60">{wrap(GLYPHS.SETTINGS)}</span>
                                    Edit_Config
                                </Button>
                                <Button size="sm" onClick={handleAddContent} className="h-9 px-4 bg-[#A3E635] text-black hover:bg-[#A3E635]/90 text-[9px] uppercase tracking-widest font-black">
                                    <span className="mr-2">{wrap(GLYPHS.PLUS)}</span>
                                    Add_Content
                                </Button>
                            </div>
                        </div>

                        {collection.description && (
                            <p className="text-[11px] text-[#8A8A8A] leading-relaxed max-w-3xl uppercase tracking-tight">
                                {collection.description}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#F5F5F5]">
                        Linked_Content_Kernels
                    </h3>
                    <span className="bg-white/5 px-2 rounded text-[9px] font-bold text-[#4A4A4A] py-0.5 border border-white/5">
                        {collectionContents.length}
                    </span>
                </div>

                {collectionContents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.01] py-24 text-center group grayscale opacity-40 hover:opacity-100 transition-opacity">
                        <span className="text-4xl text-[#4A4A4A] mb-4 group-hover:scale-110 transition-transform">{wrap(GLYPHS.INBOX)}</span>
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#F5F5F5]">Null_Result_Set</h3>
                        <p className="text-[9px] text-[#4A4A4A] uppercase tracking-tighter mt-2 mb-8">
                            No content objects mapped to this collection ID.
                        </p>
                        <Button onClick={handleAddContent} variant="outline" className="h-9 px-6 text-[9px] uppercase tracking-widest border-white/10">
                            <span className="mr-2">{wrap(GLYPHS.PLUS)}</span>
                            Initialize_Entry
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
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

            {/* Footer markers */}
            <div className="flex items-center justify-center gap-8 opacity-10 font-mono text-[8px] uppercase tracking-[0.6em] py-12">
                <span>COL_MODEL_v1 // ID_{id.slice(0, 8)}</span>
                <span>{wrap('◎')} INTEGRITY_CHECK_PASS</span>
            </div>
        </div>
    );
}
