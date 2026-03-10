'use client';

import { useState, useRef } from 'react';
import { FileText, FolderPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useContentStore } from '@/stores';

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
                // Recarregar o storyboard
                loadContents();
            } else {
                toast.error(data.error || 'Erro na importação', { id: toastId });
            }
        } catch (err: any) {
            toast.error(`Erro: ${err.message}`, { id: toastId });
        } finally {
            setIsImporting(false);
            // Resetar os inputs pra poder importar de novo
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
            {/* Input de Pasta precisa de webkitdirectory (react aceita no formato camelCase string -> ts error, intão faz casting) */}
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
                className="gap-2 bg-white/90 backdrop-blur"
            >
                {isImporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <FileText className="h-4 w-4" />
                )}
                {isImporting ? 'Importando...' : 'Arquivos MD'}
            </Button>

            <Button
                variant="default"
                size="sm"
                onClick={() => folderInputRef.current?.click()}
                disabled={isImporting}
                className="gap-2 bg-gradient-to-tr from-yellow-400 to-fuchsia-600 text-white border-0 hover:opacity-90"
            >
                {isImporting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                    <FolderPlus className="h-4 w-4 text-white" />
                )}
                {isImporting ? 'Lendo...' : 'Importar Pasta'}
            </Button>
        </div>
    );
}
