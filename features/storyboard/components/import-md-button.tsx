'use client';

import { useState, useRef } from 'react';
import { Button } from '@/design-system/atoms/Button';
import { toast } from 'sonner';
import { useContentStore } from '@/stores';
import { cn } from '@/design-system/utils/cn';

export function ImportMdButton() {
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const { loadContents } = useContentStore();

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsImporting(true);
        const toastId = toast.loading(`Importando ${files.length} arquivo(s)...`);

        try {
            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }

            const res = await fetch('/api/import-md', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (data.success) {
                toast.success(data.message, { id: toastId });
                loadContents();
            } else {
                toast.error(data.error || 'Erro na importação', { id: toastId });
            }
        } catch (err: any) {
            toast.error(`Erro: ${err.message}`, { id: toastId });
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (folderInputRef.current) folderInputRef.current.value = '';
        }
    };

    return (
        <div className="flex gap-2">
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".md,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={handleImport}
            />
            <input
                ref={folderInputRef}
                type="file"
                multiple
                accept=".md,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={handleImport}
                {...{ webkitdirectory: "", directory: "" } as any}
            />

            <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="gap-2 font-mono text-[9px] tracking-widest uppercase"
            >
                {isImporting ? '[ LOADING... ]' : '[ ATTACH_MD ]'}
            </Button>

            <Button
                variant="outline"
                size="sm"
                onClick={() => folderInputRef.current?.click()}
                disabled={isImporting}
                className="gap-2 font-mono text-[9px] tracking-widest uppercase border-[#A3E635]/20 text-[#A3E635] hover:bg-[#A3E635]/5"
            >
                {isImporting ? '[ SCANNING... ]' : '[ INJECT_DIR ]'}
            </Button>
        </div>
    );
}
