'use client';

import { useState } from 'react';
import { Rocket, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/stores';

export function MetaPublishForm() {
    const [imageUrl, setImageUrl] = useState('');
    const [caption, setCaption] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    const [result, setResult] = useState<{ success: boolean; id?: string; error?: string } | null>(null);

    const { settings } = useSettingsStore();

    const handlePublish = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!imageUrl.trim()) return;
        const metaToken = settings?.metaAccessToken;
        if (!metaToken) {
            setResult({ success: false, error: "Token Meta Ausente." });
            return;
        }

        setIsPublishing(true);
        setResult(null);

        try {
            const res = await fetch('/api/meta-publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: metaToken, imageUrl, caption })
            });
            const data = await res.json();
            setResult(data);
            if (data.success) {
                setImageUrl('');
                setCaption('');
            }
        } catch (err: any) {
            setResult({ success: false, error: err.message || "Erro de rede." });
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="rounded-xl border border-[var(--v2-border)] bg-zinc-900/50 p-6 space-y-4 shadow-xl shadow-black/20">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-zinc-100">
                        <Rocket className="h-4 w-4 text-purple-400" />
                        Publicação Rápida via Graph API
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">Poste imagens diretamente no seu perfil.</p>
                </div>
                <div className="bg-purple-500/10 text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-500/20 uppercase">
                    Phase 1 (Imagens)
                </div>
            </div>

            <form onSubmit={handlePublish} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <ImageIcon className="h-3 w-3" /> URL da Imagem Pública
                    </label>
                    <input
                        type="url"
                        placeholder="https://..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        required
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                    />
                    <p className="text-[10px] text-zinc-500">O Instagram precisa conseguir acessar esta URL.</p>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">
                        Legenda (opcional)
                    </label>
                    <textarea
                        placeholder="Escreva algo inspirador..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        rows={3}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none"
                    />
                </div>

                {/* Status Message */}
                {result && (
                    <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${result.success ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                        {result.success ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                        <div>
                            {result.success ? (
                                <p className="font-medium">Publicado com sucesso!</p>
                            ) : (
                                <p><strong>Erro:</strong> {result.error || 'Falha na publicação'}</p>
                            )}
                            {result.id && <p className="text-[10px] opacity-80 mt-1 font-mono">ID: {result.id}</p>}
                        </div>
                    </div>
                )}

                <div className="pt-2">
                    <Button
                        type="submit"
                        disabled={isPublishing || !imageUrl.trim()}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                    >
                        {isPublishing ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Publicando...
                            </>
                        ) : (
                            'Publicar Agora'
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
