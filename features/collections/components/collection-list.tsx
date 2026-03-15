'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { useCollectionStore, useContentStore } from '@/stores';
import { Button } from '@/design-system/atoms/Button';
import { cn } from '@/design-system/utils/cn';
import { CollectionFormDialog } from './collection-form-dialog';
import type { Collection } from '@/types/collection';

// V2 Common Styles
const CARD_STYLE = {
    backgroundColor: '#0A0A0A',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: '8px',
};

const SECTION_HEADER_STYLE = "font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A] select-none flex items-center gap-2 mb-6";

const wrap = (g: string) => <span className="font-mono text-[10px]">{g}</span>;

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
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-8 pb-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[#A3E635] text-[10px] tracking-widest">[COLL_SYS_V2]</span>
                        <h2 className="text-[1.75rem] font-bold tracking-tight text-[#F5F5F5]">Content Collections</h2>
                    </div>
                    <p className="text-[13px] text-[#4A4A4A]">Clusters de conteúdo e campanhas temáticas indexadas.</p>
                </div>
                <Button onClick={handleAddNew} variant="solid" className="font-mono text-[10px] tracking-widest uppercase">
                    NEW_COLLECTION {wrap('↗')}
                </Button>
            </div>

            {collections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-lg bg-[#0A0A0A]/50" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <span className="font-mono text-[#4A4A4A] text-4xl mb-4">{wrap('∅')}</span>
                    <h3 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#8A8A8A]">No Index Found</h3>
                    <p className="text-[12px] text-[#4A4A4A] mt-2 mb-6 max-w-sm text-center">Inicie uma nova coleção para organizar o fluxo de produção.</p>
                    <Button onClick={handleAddNew} variant="outline" size="sm">INITIALIZE_COLL</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {collections.map((collection) => {
                        const contentCount = contents.filter(c => c.collectionIds.includes(collection.id)).length;

                        return (
                            <Link key={collection.id} href={`/dashboard/collections/${collection.id}`} className="group relative">
                                <div 
                                    className="p-6 transition-all duration-150 border active:scale-[0.98] h-full flex flex-col"
                                    style={{ 
                                        ...CARD_STYLE,
                                        borderLeft: `2px solid ${collection.color || 'rgba(163,230,53,0.3)'}`
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0A0A0A'}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-[10px] opacity-40">{wrap('◆')}</span>
                                            <h3 className="text-[14px] font-bold text-[#F5F5F5] uppercase tracking-tight">{collection.name}</h3>
                                        </div>
                                        <button
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-[#A3E635]"
                                            onClick={(e) => handleEdit(collection, e)}
                                        >
                                            <span className="font-mono text-[10px]">{wrap('◎')} EDIT_0x</span>
                                        </button>
                                    </div>

                                    {collection.description && (
                                        <p className="text-[12px] text-[#8A8A8A] line-clamp-2 leading-relaxed mb-6 flex-1">
                                            {collection.description}
                                        </p>
                                    )}

                                    <div className="mt-auto pt-4 flex items-center justify-between border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                        <div className="font-mono text-[10px] text-[#4A4A4A]">
                                            {collection.startDate ? (
                                                <span className="flex items-center gap-1.5">
                                                    {wrap('◎')} {format(parseISO(collection.startDate), "dd/MM")}
                                                    {collection.endDate && ` - ${format(parseISO(collection.endDate), "dd/MM")}`}
                                                </span>
                                            ) : (
                                                'NO_PERIOD'
                                            )}
                                        </div>

                                        <div className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/5 text-[#A3E635] tracking-widest">
                                            {contentCount.toString().padStart(2, '0')} {wrap('⊞')} FILES
                                        </div>
                                    </div>
                                </div>
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
        </div>
    );
}
