'use client';

import { useState } from 'react';
import { Board } from '@/features/storyboard/components/board';
import { ContentEditorDialog } from '@/features/content/components/content-editor-dialog';
import type { Content } from '@/types/content';
import { AccountFilter } from '@/features/accounts/components/account-filter';

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
        <div className="h-[calc(100vh-7rem)] flex flex-col gap-4">
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
        </div>
    );
}
