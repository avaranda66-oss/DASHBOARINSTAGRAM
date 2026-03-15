'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
// [ZERO_LUCIDE_PURGE]
import { useContentStore, useCollectionStore, useAccountStore, useAutomationStore } from '@/stores';
import { getSettingAction } from '@/app/actions/settings.actions';
import { publishInstagramPostAction } from '@/app/actions/instagram.actions';
import { contentSchema, type ContentFormData } from '../schemas/content.schema';
import { TagInput } from './tag-input';
import { CONTENT_TYPES, CONTENT_STATUSES } from '@/lib/constants';
import { Button } from '@/design-system/atoms/Button';
import { Input } from '@/design-system/atoms/Input';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import type { Content } from '@/types/content';
import { cn } from '@/design-system/utils/cn';

interface ContentEditorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    content?: Content | null;
    defaultStatus?: string;
}

const GLYPHS = {
    SAVE: '◆',
    TRASH: '✕',
    COPY: '◫',
    CLOSE: '✕',
    MEDIA: '◎',
    PLUS: '+',
    SEND: '↗',
    EYE: '◎',
    HUB: '◆',
    BACK: '←',
    NEXT: '→',
    CLOCK: '◷',
    USER: '○',
    DOTS: '⋯',
    HEART: '♡',
    MSG: '🗨',
    BOOKMARK: '🔖',
    WARN: '▲'
};

const wrap = (g: string) => <span className="font-mono text-[10px]">{g}</span>;

export function ContentEditorDialog({
    open,
    onOpenChange,
    content,
    defaultStatus,
}: ContentEditorDialogProps) {
    const isEditing = !!content;
    const { addContent, updateContent, deleteContent, duplicateContent } = useContentStore();
    const { collections, isLoaded: collectionsLoaded, loadCollections } = useCollectionStore();
    const { accounts, isLoaded: accountsLoaded, loadAccounts } = useAccountStore();
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const { addToQueue, queue, isProcessing } = useAutomationStore();
    const [hasTunnelUrl, setHasTunnelUrl] = useState(true);
    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

    const formatISOForInput = (isoString: string | null | undefined) => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return '';
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch (e) {
            return '';
        }
    };

    useEffect(() => {
        if (!collectionsLoaded) loadCollections();
        if (!accountsLoaded) loadAccounts();
    }, [collectionsLoaded, loadCollections, accountsLoaded, loadAccounts]);

    useEffect(() => {
        if (!open) return;
        getSettingAction('tunnel_url').then((val) => {
            setHasTunnelUrl(!!val && val !== 'null');
        }).catch(() => setHasTunnelUrl(false));
    }, [open]);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors, isDirty },
    } = useForm<ContentFormData>({
        resolver: zodResolver(contentSchema),
        defaultValues: {
            title: '',
            description: '',
            type: 'post',
            status: (defaultStatus as ContentFormData['status']) || 'idea',
            scheduledAt: null,
            accountId: null,
            hashtags: [],
            mediaUrls: [],
            collectionIds: [],
        }
    });

    useEffect(() => {
        if (open) {
            reset(content
                ? {
                    title: content.title,
                    description: content.description,
                    type: content.type,
                    status: content.status,
                    scheduledAt: formatISOForInput(content.scheduledAt),
                    accountId: content.accountId,
                    hashtags: content.hashtags,
                    mediaUrls: content.mediaUrls,
                    collectionIds: content.collectionIds,
                }
                : {
                    title: '',
                    description: '',
                    type: 'post',
                    status: (defaultStatus as ContentFormData['status']) || 'idea',
                    scheduledAt: null,
                    accountId: null,
                    hashtags: [],
                    mediaUrls: [],
                    collectionIds: [],
                });
        }
    }, [open, content, defaultStatus, reset]);

    const hashtags = watch('hashtags');
    const mediaUrls = watch('mediaUrls');
    const collectionIds = watch('collectionIds') || [];
    const currentStatus = watch('status');

    const toggleCollection = (id: string) => {
        const newIds = collectionIds.includes(id)
            ? collectionIds.filter((cid) => cid !== id)
            : [...collectionIds, id];
        setValue('collectionIds', newIds, { shouldDirty: true });
    };

    const onSubmit = async (data: ContentFormData) => {
        if (data.status === 'scheduled' && (data.mediaUrls?.length ?? 0) > 0 && !hasTunnelUrl) {
            toast.warning('⚠ Tunnel URL não configurada', {
                description: 'Post agendado, mas sem Tunnel URL a publicação pode falhar. Configure em Configurações → Tunnel URL.',
                duration: 8000,
            });
        }
        setIsSaving(true);
        try {
            const normalized = {
                ...data,
                description: data.description ?? null,
                scheduledAt: data.scheduledAt ?? null,
                accountId: data.accountId ?? null,
            };
            if (isEditing) {
                updateContent(content.id, normalized);
                toast.success('Kernel atualizado!');
            } else {
                addContent(normalized);
                toast.success('Novo kernel inicializado!');
            }
            onOpenChange(false);
            reset();
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        if (!content) return;
        deleteContent(content.id);
        toast.success('Kernel purgado');
        onOpenChange(false);
    };

    const handleDuplicate = () => {
        if (!content) return;
        duplicateContent(content.id);
        toast.success('Kernel clonado!');
        onOpenChange(false);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Upload_Link_Failure');

            const data = await res.json();
            if (data.url) {
                setValue('mediaUrls', [...(mediaUrls || []), data.url], { shouldDirty: true });
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro no fluxo de uplink.');
        } finally {
            setIsUploading(false);
        }
    };

    const removeImage = (index: number) => {
        setValue(
            'mediaUrls',
            (mediaUrls || []).filter((_, i) => i !== index),
            { shouldDirty: true },
        );
        if (currentMediaIndex >= (mediaUrls?.length || 0) - 1) {
            setCurrentMediaIndex(Math.max(0, (mediaUrls?.length || 0) - 2));
        }
    };

    const handleClose = () => {
        if (isDirty) {
            if (!confirm('Descartar alterações sistêmicas?')) return;
        }
        onOpenChange(false);
        reset();
    };

    const handlePublishNow = () => {
        if (!content) return;
        addToQueue(content.id, content.title, content.type as 'post' | 'story');
    };

    const handlePublishMeta = async () => {
        if (!content) return;
        setIsSaving(true);
        const toastId = toast.loading('Injecting via Meta API...');
        try {
            const res = await publishInstagramPostAction(content.id, content.accountId || undefined, { useMetaApi: true });
            if (res.success) {
                toast.success('Injection_Successful!', { id: toastId });
                onOpenChange(false);
            } else {
                toast.error(`Injection_Failure: ${res.message}`, { id: toastId });
            }
        } catch (error: any) {
            toast.error(`Critical_Link_Error: ${error.message || 'Error'}`, { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const isInQueue = queue.some(i => i.contentId === content?.id);
    const queueItem = queue.find(i => i.contentId === content?.id);

    const titleText = watch('title') ? `${watch('title')}\n\n` : '';
    const descText = watch('description') ? `${watch('description')}\n\n` : '';
    const tags = watch('hashtags') || [];
    const tagsText = tags.length > 0 ? tags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ') : '';
    const compiledCaption = `${titleText}${descText}${tagsText}`;
    const charCount = compiledCaption.length;

    return (
        <Sheet open={open} onOpenChange={handleClose}>
            <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0 border-l border-white/10 bg-[#050505]" showCloseButton={false}>
                <div className="p-8 font-mono">
                    <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                        <SheetTitle className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5F5F5]">
                            {isEditing ? 'EDITAR CONTEÚDO' : 'NOVO CONTEÚDO'}
                        </SheetTitle>
                        <button onClick={handleClose} className="h-8 w-8 flex items-center justify-center text-[#4A4A4A] hover:text-[#F5F5F5] transition-colors">
                            <span className="text-sm">{wrap(GLYPHS.CLOSE)}</span>
                        </button>
                    </div>

                    <div className="flex bg-[#0A0A0A] p-1 rounded border border-white/5 mb-8">
                        {(['edit', 'preview'] as const).map(tab => (
                            <button
                                key={tab}
                                type="button"
                                className={cn(
                                    "flex-1 text-[9px] font-black py-2 rounded uppercase tracking-widest transition-all",
                                    activeTab === tab ? "bg-[#A3E635] text-black shadow-lg" : "text-[#4A4A4A] hover:text-[#F5F5F5]"
                                )}
                                onClick={() => setActiveTab(tab)}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    {tab === 'preview' ? wrap(GLYPHS.EYE) : wrap(GLYPHS.HUB)} {tab === 'edit' ? 'EDITAR' : 'PREVIEW'}
                                </span>
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                        {activeTab === 'edit' ? (
                            <div className="space-y-8">
                                <Input
                                    label="TÍTULO"
                                    {...register('title')}
                                    placeholder="Nome do conteúdo..."
                                    error={errors.title?.message}
                                    isMono={true}
                                />

                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-[#4A4A4A]">LEGENDA</label>
                                    <textarea
                                        {...register('description')}
                                        placeholder="Legenda / descrição..."
                                        rows={6}
                                        className="w-full bg-[#0A0A0A] border border-white/10 rounded-md p-4 text-[11px] text-[#F5F5F5] font-mono focus:border-white/20 outline-none uppercase placeholder:text-[#2A2A2A] transition-all resize-none"
                                    />
                                    {errors.description && <p className="text-[9px] text-[#EF4444] uppercase font-bold">{errors.description.message}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-[#4A4A4A]">TIPO</label>
                                        <select
                                            {...register('type')}
                                            className="w-full h-10 bg-[#0A0A0A] border border-white/10 rounded font-mono text-[11px] text-[#F5F5F5] px-4 focus:border-white/20 outline-none uppercase cursor-pointer"
                                        >
                                            {CONTENT_TYPES.map((t) => (
                                                <option key={t.value} value={t.value}>{t.label.toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-[#4A4A4A]">STATUS</label>
                                        <select
                                            {...register('status')}
                                            className="w-full h-10 bg-[#0A0A0A] border border-white/10 rounded font-mono text-[11px] text-[#F5F5F5] px-4 focus:border-white/20 outline-none uppercase cursor-pointer"
                                        >
                                            {CONTENT_STATUSES.map((s) => (
                                                <option key={s.value} value={s.value}>{s.label.toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-[#4A4A4A]">CONTA</label>
                                        <select
                                            {...register('accountId')}
                                            className="w-full h-10 bg-[#0A0A0A] border border-white/10 rounded font-mono text-[11px] text-[#F5F5F5] px-4 focus:border-white/20 outline-none uppercase cursor-pointer"
                                        >
                                            <option value="">NENHUMA CONTA</option>
                                            {accounts.map((a) => (
                                                <option key={a.id} value={a.id}>{a.name.toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <Input
                                            type="datetime-local"
                                            label="AGENDAMENTO"
                                            {...register('scheduledAt')}
                                            isMono={true}
                                        />
                                        {currentStatus === 'scheduled' && (mediaUrls?.length ?? 0) > 0 && !hasTunnelUrl && (
                                            <p className="font-mono text-[10px] text-[#EF4444]/60 mt-1">
                                                ⚠ Tunnel URL não configurada — vá em Configurações para evitar falha na publicação
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <TagInput
                                    tags={hashtags || []}
                                    onChange={(newTags) => setValue('hashtags', newTags, { shouldDirty: true })}
                                />

                                {collections.length > 0 && (
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-[#4A4A4A]">COLEÇÕES</label>
                                        <div className="flex flex-wrap gap-2">
                                            {collections.map((c) => {
                                                const isSelected = collectionIds.includes(c.id);
                                                return (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => toggleCollection(c.id)}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-full text-[9px] font-black border uppercase tracking-widest transition-all",
                                                            isSelected ? "bg-[#A3E635]/10 border-[#A3E635]/40 text-[#A3E635]" : "bg-white/5 border-white/10 text-[#4A4A4A] hover:text-[#F5F5F5]"
                                                        )}
                                                    >
                                                        <span className="mr-2">{isSelected ? wrap(GLYPHS.HUB) : wrap(GLYPHS.MEDIA)}</span>
                                                        {c.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-[#4A4A4A]">MÍDIAS</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {(mediaUrls || []).map((url, index) => (
                                            <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group grayscale hover:grayscale-0 transition-all">
                                                {url.match(/\.(mp4|webm|ogg)$/i) ? (
                                                    <video src={url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                                ) : (
                                                    <img src={url} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(index)}
                                                    className="absolute top-2 right-2 h-6 w-6 rounded bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[#EF4444] transition-all"
                                                >
                                                    <span className="text-xs">{wrap(GLYPHS.CLOSE)}</span>
                                                </button>
                                            </div>
                                        ))}
                                        <label className="aspect-square flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#A3E635]/40 transition-all cursor-pointer group">
                                            <span className="text-2xl text-[#4A4A4A] group-hover:text-[#A3E635] transition-colors">{wrap(GLYPHS.PLUS)}</span>
                                            <span className="text-[9px] font-bold text-[#4A4A4A] uppercase tracking-widest">{isUploading ? 'UPLOADING...' : 'ADD_MEDIA'}</span>
                                            <input type="file" multiple accept="image/*,video/*" onChange={handleImageUpload} className="hidden" />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex items-center justify-between px-2">
                                    <span className="text-[10px] font-black text-[#A3E635] uppercase tracking-[0.2em]">PRÉ-VISUALIZAÇÃO</span>
                                    <span className={cn("text-[9px] font-bold", charCount > 2200 ? 'text-[#EF4444]' : 'text-[#4A4A4A]')}>
                                        {charCount} / 2200 BITS
                                    </span>
                                </div>

                                <div className="max-w-[360px] mx-auto bg-black border border-white/10 rounded-xl overflow-hidden shadow-2xl font-sans">
                                    <div className="p-3 flex items-center justify-between border-b border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#A3E635] to-[#3b82f6] p-[1px]">
                                                <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden border border-black text-[10px] text-[#4A4A4A]">{wrap(GLYPHS.USER)}</div>
                                            </div>
                                            <span className="text-[11px] font-bold text-[#F5F5F5]">local_instance</span>
                                        </div>
                                        <span className="text-[#4A4A4A]">{wrap(GLYPHS.DOTS)}</span>
                                    </div>

                                    <div className="aspect-[4/5] bg-[#0A0A0A] relative flex items-center justify-center group overflow-hidden">
                                        {(mediaUrls && mediaUrls.length > 0) ? (
                                            <div className="w-full h-full">
                                                {mediaUrls[currentMediaIndex].match(/\.(mp4|webm|ogg)$/i) ? (
                                                    <video key={mediaUrls[currentMediaIndex]} src={mediaUrls[currentMediaIndex]} className="w-full h-full object-cover" autoPlay muted loop />
                                                ) : (
                                                    <img key={mediaUrls[currentMediaIndex]} src={mediaUrls[currentMediaIndex]} className="w-full h-full object-cover" alt="" />
                                                )}
                                                {mediaUrls.length > 1 && (
                                                    <>
                                                        <button onClick={(e) => { e.preventDefault(); setCurrentMediaIndex(p => p > 0 ? p - 1 : mediaUrls.length - 1); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 p-2 rounded-full text-white">{wrap(GLYPHS.BACK)}</button>
                                                        <button onClick={(e) => { e.preventDefault(); setCurrentMediaIndex(p => p < mediaUrls.length - 1 ? p + 1 : 0); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 p-2 rounded-full text-white">{wrap(GLYPHS.NEXT)}</button>
                                                        <div className="absolute top-3 right-3 bg-black/60 px-2 py-1 rounded-full text-[9px] font-bold text-white">{currentMediaIndex + 1}/{mediaUrls.length}</div>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-[#2A2A2A] text-4xl">{wrap(GLYPHS.MEDIA)}</span>
                                        )}
                                    </div>

                                    <div className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex gap-4">
                                                <span className="text-[#F5F5F5] text-xl">{wrap(GLYPHS.HEART)}</span>
                                                <span className="text-[#F5F5F5] text-xl">{wrap(GLYPHS.MSG)}</span>
                                                <span className="text-[#F5F5F5] text-xl">{wrap(GLYPHS.SEND)}</span>
                                            </div>
                                            <span className="text-[#F5F5F5] text-xl">{wrap(GLYPHS.BOOKMARK)}</span>
                                        </div>
                                        <div className="text-[11px] leading-relaxed text-[#F5F5F5]">
                                            <span className="font-bold mr-2">local_instance</span>
                                            {compiledCaption ? compiledCaption : <span className="opacity-20 italic">sem conteúdo...</span>}
                                        </div>
                                    </div>
                                </div>

                                {charCount > 2200 && (
                                    <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/40 rounded-lg flex gap-3">
                                        <span className="text-[#EF4444]">{wrap(GLYPHS.WARN)}</span>
                                        <p className="text-[10px] text-[#EF4444] font-bold uppercase tracking-widest leading-tight">Limiar de caracteres excedido. A integridade do post no Instagram pode ser comprometida.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col gap-3 pt-8 border-t border-white/5">
                            <Button type="submit" disabled={isSaving || isUploading} className="w-full h-12 bg-[#A3E635] text-black font-black uppercase tracking-[0.2em] text-[10px]">
                                <span className="mr-2">{GLYPHS.SAVE}</span>
                                COMMIT_CHANGES
                            </Button>

                            {isEditing && (
                                <div className="grid grid-cols-2 gap-3">
                                    <Button type="button" variant="outline" onClick={handleDuplicate} className="h-10 text-[9px] uppercase tracking-widest border-white/10 font-bold">
                                        <span className="mr-2">{GLYPHS.COPY}</span> CLONE_VAL
                                    </Button>
                                    <Button type="button" variant="outline" onClick={handleDelete} className="h-10 text-[9px] uppercase tracking-widest border-white/10 font-bold text-[#EF4444] hover:bg-[#EF4444]/5">
                                        <span className="mr-2">{GLYPHS.TRASH}</span> PURGE_OBJ
                                    </Button>
                                </div>
                            )}

                            {isEditing && (
                                <div className="space-y-3 pt-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full h-11 border-[#A3E635]/30 text-[#A3E635] hover:bg-[#A3E635]/5 text-[10px] font-black uppercase tracking-widest"
                                        disabled={isSaving || isUploading || isProcessing}
                                        onClick={handlePublishMeta}
                                    >
                                        <span className="mr-2">{wrap(GLYPHS.SEND)}</span> PUBLICAR VIA META API
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full h-11 border-[#A3E635]/30 text-[#A3E635] hover:bg-[#A3E635]/5 text-[10px] font-black uppercase tracking-widest"
                                        disabled={isInQueue}
                                        onClick={handlePublishNow}
                                    >
                                        <span className="mr-2">{wrap(GLYPHS.SEND)}</span> {queueItem?.status === 'processing' ? 'EXECUTANDO...' : isInQueue ? 'NA FILA' : 'PUBLICAR VIA BOT'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </form>
                </div>
            </SheetContent>
        </Sheet>
    );
}
