'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Trash2, Copy, Save, X, ImagePlus, Send } from 'lucide-react';
import { useContentStore, useCollectionStore, useAccountStore, useAutomationStore } from '@/stores';
import { publishInstagramPostAction } from '@/app/actions/instagram.actions';
import { contentSchema, type ContentFormData } from '../schemas/content.schema';
import { TagInput } from './tag-input';
import { CONTENT_TYPES, CONTENT_STATUSES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import * as Icons from 'lucide-react';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import type { Content } from '@/types/content';

interface ContentEditorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    content?: Content | null;
    defaultStatus?: string;
}

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
    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

    // Helper to format ISO string to YYYY-MM-DDTHH:MM for datetime-local input
    const formatISOForInput = (isoString: string | null | undefined) => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return '';

            // Usar partes locais para evitar o shift de timezone do toISOString()
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

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors, isDirty },
    } = useForm<ContentFormData>({
        resolver: zodResolver(contentSchema),
        defaultValues: content
            ? {
                title: content.title,
                description: content.description,
                type: content.type,
                status: content.status,
                scheduledAt: content.scheduledAt,
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
            },
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

    const toggleCollection = (id: string) => {
        const newIds = collectionIds.includes(id)
            ? collectionIds.filter((cid) => cid !== id)
            : [...collectionIds, id];
        setValue('collectionIds', newIds, { shouldDirty: true });
    };

    const onSubmit = async (data: ContentFormData) => {
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
                toast.success('Conteúdo salvo!');
            } else {
                addContent(normalized);
                toast.success('Conteúdo criado!');
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
        toast.success('Conteúdo excluído');
        onOpenChange(false);
    };

    const handleDuplicate = () => {
        if (!content) return;
        duplicateContent(content.id);
        toast.success('Conteúdo duplicado!');
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

            if (!res.ok) throw new Error('Falha no upload');

            const data = await res.json();
            if (data.url) {
                setValue('mediaUrls', [...(mediaUrls || []), data.url], { shouldDirty: true });
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro ao enviar a imagem. Tente novamente.');
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
    };

    const handleClose = () => {
        if (isDirty) {
            if (!confirm('Descartar alterações?')) return;
        }
        onOpenChange(false);
        reset();
    };

    const handlePublishNow = () => {
        if (!content) return;
        addToQueue(content.id, content.title, content.type as 'post' | 'story');
    };

    const isInQueue = queue.some(i => i.contentId === content?.id);
    const queueItem = queue.find(i => i.contentId === content?.id);

    // Derived state for preview
    const titleText = watch('title') ? `${watch('title')}\n\n` : '';
    const descText = watch('description') ? `${watch('description')}\n\n` : '';
    const tags = watch('hashtags') || [];
    const tagsText = tags.length > 0 ? tags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ') : '';

    // NÃO usar .trim() único no final pq ele come quebras reais em alguns casos
    const compiledCaption = `${titleText}${descText}${tagsText}`;
    const charCount = compiledCaption.length;

    return (
        <Sheet open={open} onOpenChange={handleClose}>
            <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0" showCloseButton={false}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <SheetTitle className="text-lg font-semibold">
                            {isEditing ? 'Editar Conteúdo' : 'Novo Conteúdo'}
                        </SheetTitle>
                        <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex bg-muted p-1 rounded-lg mb-6">
                        <button
                            type="button"
                            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${activeTab === 'edit' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setActiveTab('edit')}
                        >
                            Editar
                        </button>
                        <button
                            type="button"
                            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${activeTab === 'preview' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setActiveTab('preview')}
                        >
                            <span className="flex items-center justify-center gap-1.5">
                                <Icons.Eye className="h-4 w-4" /> Preview
                            </span>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {activeTab === 'edit' ? (
                            <div className="space-y-5">
                                {/* Title */}
                                <div>
                                    <label className="text-sm font-medium" htmlFor="title">
                                        Título *
                                    </label>
                                    <Input
                                        id="title"
                                        {...register('title')}
                                        placeholder="Nome do conteúdo"
                                        className="mt-1.5"
                                    />
                                    {errors.title && (
                                        <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>
                                    )}
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-sm font-medium" htmlFor="description">
                                        Descrição / Legenda
                                    </label>
                                    <textarea
                                        id="description"
                                        {...register('description')}
                                        placeholder="Legenda do post..."
                                        rows={4}
                                        className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                    />
                                    {errors.description && (
                                        <p className="mt-1 text-xs text-destructive">
                                            {errors.description.message}
                                        </p>
                                    )}
                                </div>

                                {/* Type + Status row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-sm font-medium">Tipo *</label>
                                        <select
                                            {...register('type')}
                                            className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        >
                                            {CONTENT_TYPES.map((t) => (
                                                <option key={t.value} value={t.value}>
                                                    {t.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Status *</label>
                                        <select
                                            {...register('status')}
                                            className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        >
                                            {CONTENT_STATUSES.map((s) => (
                                                <option key={s.value} value={s.value}>
                                                    {s.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Account + Scheduled date row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-sm font-medium">Conta Instagram</label>
                                        <select
                                            {...register('accountId')}
                                            className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        >
                                            <option value="">Nenhuma Conta</option>
                                            {accounts.map((a) => (
                                                <option key={a.id} value={a.id}>
                                                    {a.name} ({a.handle})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium" htmlFor="scheduledAt">
                                            Data/Hora
                                        </label>
                                        <Input
                                            id="scheduledAt"
                                            type="datetime-local"
                                            {...register('scheduledAt')}
                                            className="mt-1.5"
                                        />
                                    </div>
                                </div>

                                {/* Hashtags */}
                                <div>
                                    <label className="text-sm font-medium">Hashtags</label>
                                    <div className="mt-1.5">
                                        <TagInput
                                            tags={hashtags || []}
                                            onChange={(newTags) =>
                                                setValue('hashtags', newTags, { shouldDirty: true })
                                            }
                                        />
                                    </div>
                                </div>

                                {/* Collections */}
                                {collections.length > 0 && (
                                    <div>
                                        <label className="text-sm font-medium">Coleções</label>
                                        <div className="mt-1.5 flex flex-wrap gap-2">
                                            {collections.map((c) => {
                                                const isSelected = collectionIds.includes(c.id);
                                                const Icon = (Icons as any)[c.icon || 'Folder'] || Icons.Folder;
                                                return (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => toggleCollection(c.id)}
                                                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${isSelected
                                                            ? 'bg-primary/10 border-primary text-primary'
                                                            : 'bg-background border-border hover:bg-muted text-muted-foreground'
                                                            }`}
                                                    >
                                                        <Icon className="h-3 w-3" style={isSelected ? { color: c.color } : undefined} />
                                                        <span>{c.name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Media upload */}
                                <div>
                                    <label className="text-sm font-medium">Mídia</label>
                                    <div className="mt-1.5 space-y-2">
                                        {(mediaUrls || []).map((url, index) => (
                                            <div
                                                key={index}
                                                className="relative rounded-lg overflow-hidden border border-border"
                                            >
                                                {url.match(/\.(mp4|webm|ogg)$/i) ? (
                                                    <video
                                                        src={url}
                                                        className="w-full h-32 object-cover"
                                                    />
                                                ) : (
                                                    <img
                                                        src={url}
                                                        alt={`Mídia ${index + 1}`}
                                                        className="w-full h-32 object-cover"
                                                    />
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-2 right-2 h-6 w-6"
                                                    onClick={() => removeImage(index)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4 hover:bg-accent/30 transition-colors">
                                            <ImagePlus className="h-5 w-5 text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">
                                                {isUploading ? 'Enviando...' : 'Adicionar imagem'}
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
                                                onChange={handleImageUpload}
                                                disabled={isUploading}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pl-1">
                                    <h3 className="text-sm font-medium text-muted-foreground">Preview do Feed</h3>
                                    <span className={`text-xs font-semibold ${charCount > 2200 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                        {charCount} / 2200
                                    </span>
                                </div>

                                <div className="w-full max-w-[350px] mx-auto bg-background border border-border rounded-xl flex flex-col overflow-hidden shadow-sm">
                                    {/* App Header */}
                                    <div className="flex items-center justify-between p-3 border-b border-border">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[2px]">
                                                <div className="w-full h-full rounded-full bg-background border border-border flex items-center justify-center overflow-hidden">
                                                    <Icons.User className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                            </div>
                                            <span className="text-[13px] font-semibold tracking-tight text-foreground">suaconta</span>
                                        </div>
                                        <Icons.MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                                    </div>

                                    {/* Image */}
                                    <div className="w-full aspect-[4/5] bg-muted/30 relative flex items-center justify-center">
                                        {(mediaUrls && mediaUrls.length > 0) ? (
                                            mediaUrls[0].match(/\.(mp4|webm|ogg)$/i) ? (
                                                <video
                                                    src={mediaUrls[0]}
                                                    className="w-full h-full object-cover"
                                                    autoPlay
                                                    muted
                                                    loop
                                                    playsInline
                                                />
                                            ) : (
                                                <img src={mediaUrls[0]} className="w-full h-full object-cover" alt="Preview" />
                                            )
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <Icons.Image className="w-8 h-8 opacity-20" />
                                                <span className="text-xs font-medium">Sem imagem</span>
                                            </div>
                                        )}
                                        {(mediaUrls && mediaUrls.length > 1) && (
                                            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur text-white text-[10px] font-medium px-2 py-1 rounded-full">
                                                1/{mediaUrls.length}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="p-3 pb-2 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <Icons.Heart className="w-6 h-6 text-foreground" />
                                            <Icons.MessageCircle className="w-6 h-6 text-foreground" />
                                            <Icons.Send className="w-6 h-6 text-foreground" />
                                        </div>
                                        <Icons.Bookmark className="w-6 h-6 text-foreground" />
                                    </div>

                                    {/* Likes */}
                                    <div className="px-3 pb-1 text-[13px] font-semibold text-foreground">
                                        1.042 curtidas
                                    </div>

                                    {/* Caption */}
                                    <div className="px-3 pb-4 text-[13px] leading-[18px] text-foreground">
                                        <span className="font-semibold mr-1.5">suaconta</span>
                                        <div className="inline break-words text-foreground">
                                            {compiledCaption ? compiledCaption.split('\n').map((line, i) => (
                                                <span key={i}>
                                                    {line}
                                                    {i !== compiledCaption.split('\n').length - 1 && <br />}
                                                </span>
                                            )) : <span className="text-muted-foreground italic">Sua legenda aparecerá aqui...</span>}
                                        </div>
                                    </div>
                                </div>

                                {charCount > 2200 && (
                                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-start gap-2">
                                        <X className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                        <span>Sua legenda excedeu o limite do Instagram de 2200 caracteres e será cortada ou rejeitada.</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-col gap-2 pt-4 border-t border-border">
                            <Button
                                type="submit"
                                disabled={isSaving || isUploading}
                                className="w-full instagram-gradient text-white border-0 hover:opacity-90"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {isSaving ? 'Salvando...' : 'Salvar'}
                            </Button>

                            {isEditing && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="flex-1"
                                            onClick={handleDuplicate}
                                        >
                                            <Copy className="mr-2 h-4 w-4" />
                                            Duplicar
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            className="flex-1"
                                            onClick={handleDelete}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Excluir
                                        </Button>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full border-pink-500/50 hover:bg-pink-500/10 text-pink-600 dark:text-pink-400"
                                        disabled={isInQueue}
                                        onClick={handlePublishNow}
                                    >
                                        <Send className="mr-2 h-4 w-4" />
                                        {queueItem?.status === 'processing'
                                            ? 'Postando agora...'
                                            : isInQueue
                                                ? 'Na fila de espera...'
                                                : 'Publicar via Robô'}
                                    </Button>
                                    {isInQueue && (
                                        <p className="text-[10px] text-center text-muted-foreground animate-pulse">
                                            O robô processará este post automaticamente seguindo a fila.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </form>
                </div>
            </SheetContent>
        </Sheet>
    );
}
