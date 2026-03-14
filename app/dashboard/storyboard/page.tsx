'use client';

import { useState } from 'react';
import { Board } from '@/features/storyboard/components/board';
import { ContentEditorDialog } from '@/features/content/components/content-editor-dialog';
import type { Content } from '@/types/content';
import { motion } from 'framer-motion';

export default function StoryboardPage() {
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingContent, setEditingContent] = useState<Content | null>(null);
    const [defaultStatus, setDefaultStatus] = useState<string | undefined>();

    const handleAddContent = (status?: string) => {
        setEditingContent(null);
        setDefaultStatus(status);
        setEditorOpen(true);
    };

    const handleEditContent = (content: Content) => {
        setEditingContent(content);
        setDefaultStatus(undefined);
        setEditorOpen(true);
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-[calc(100vh-8rem)] flex flex-col space-y-6"
        >
            {/* Header section explicitly following v2 rules */}
            <div className="pb-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-[#A3E635] text-[10px] tracking-widest">[PROD_BOARD_V2]</span>
                    <h1 className="text-[2rem] font-bold tracking-tight text-[#F5F5F5]">Content Storyboard</h1>
                </div>
                <p className="text-[14px] text-[#4A4A4A] tracking-tight">Otimização de fluxo kanban e gestão de status de produção industrial.</p>
            </div>

            <Board
                onAddContent={handleAddContent}
                onEditContent={handleEditContent}
            />
            
            <ContentEditorDialog
                open={editorOpen}
                onOpenChange={setEditorOpen}
                content={editingContent}
                defaultStatus={defaultStatus}
            />
        </motion.div>
    );
}
