'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Save, X, Trash2, Camera, Eye, EyeOff } from 'lucide-react';
import { useAccountStore } from '@/stores';
import { accountSchema, type AccountFormData } from '../schemas/account.schema';
import { saveAccountAction } from '@/app/actions/account.actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import type { Account } from '@/types/account';

interface AccountFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    account?: Account | null;
}

export function AccountFormDialog({ open, onOpenChange, account }: AccountFormDialogProps) {
    const isEditing = !!account;
    const { addAccount, updateAccount, deleteAccount, connectAutomation } = useAccountStore();
    const [avatarPreview, setAvatarPreview] = useState<string | null>(account?.avatarUrl || null);
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<AccountFormData>({
        resolver: zodResolver(accountSchema),
        defaultValues: {
            name: account?.name || '',
            handle: account?.handle || '',
            avatarUrl: account?.avatarUrl || null,
            notes: account?.notes || null,
        },
    });

    // Reset form when opened with an account or account changes
    useEffect(() => {
        if (open) {
            reset({
                name: account?.name || '',
                handle: account?.handle || '',
                avatarUrl: account?.avatarUrl || null,
                notes: account?.notes || null,
            });
            setAvatarPreview(account?.avatarUrl || null);
        }
    }, [open, account, reset]);

    const onSubmit = (data: AccountFormData) => {
        // Format handle to always start with @ and be lowercase without spaces
        const formattedHandle = data.handle.startsWith('@')
            ? data.handle.replace(/\s/g, '').toLowerCase()
            : `@${data.handle.replace(/\s/g, '').toLowerCase()}`;

        const formattedData = {
            ...data,
            handle: formattedHandle,
            avatarUrl: avatarPreview,
        };

        if (isEditing) {
            updateAccount(account.id, formattedData);
            toast.success('Conta atualizada!');
        } else {
            addAccount(formattedData);
            toast.success('Conta criada!');
        }

        // Sincronizar silenciosamente a conta e senha (se houver) no Prisma para uso da Automação (Backend)
        saveAccountAction(formattedData as any).catch(console.error);

        handleClose();
    };

    const handleDelete = () => {
        if (!account) return;
        if (confirm('Tem certeza que deseja excluir esta conta? Os conteúdos vinculados não serão excluídos, apenas perderão o vínculo com a conta.')) {
            deleteAccount(account.id);
            toast.success('Conta excluída');
            handleClose();
        }
    };

    const handleClose = () => {
        onOpenChange(false);
        reset();
        setAvatarPreview(null);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Imagem muito grande (máx 2MB)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setAvatarPreview(base64);
            setValue('avatarUrl', base64, { shouldDirty: true });
        };
        reader.readAsDataURL(file);
    };

    return (
        <Sheet open={open} onOpenChange={handleClose}>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0" showCloseButton={false}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <SheetTitle className="text-lg font-semibold">
                            {isEditing ? 'Editar Conta' : 'Nova Conta Instagram'}
                        </SheetTitle>
                        <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Avatar Upload */}
                        <div className="flex flex-col items-center justify-center pt-2 pb-4">
                            <div className="relative group">
                                <div className="h-24 w-24 rounded-full border-2 border-border overflow-hidden bg-muted flex items-center justify-center">
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                                    ) : (
                                        <Camera className="h-8 w-8 text-muted-foreground/50" />
                                    )}
                                </div>
                                <label className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full cursor-pointer transition-opacity backdrop-blur-[2px]">
                                    <Camera className="h-6 w-6" />
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">Clique para alterar (opcional)</p>
                        </div>

                        {/* Name */}
                        <div>
                            <label className="text-sm font-medium">Nome *</label>
                            <Input
                                {...register('name')}
                                placeholder="Ex: Minha Empresa"
                                className="mt-1.5"
                                autoComplete="off"
                            />
                            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
                        </div>

                        {/* Handle */}
                        <div>
                            <label className="text-sm font-medium">Handle / @ *</label>
                            <Input
                                {...register('handle')}
                                placeholder="Ex: @minhaempresa"
                                className="mt-1.5"
                                autoComplete="off"
                            />
                            {errors.handle && <p className="mt-1 text-xs text-destructive">{errors.handle.message}</p>}
                        </div>

                        {/* Password */}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                                <span>Senha (Opcional)</span>
                                <span className="text-[10px] font-normal border rounded px-1.5 py-0.5 bg-muted/50">Auto-login</span>
                            </label>
                            <div className="relative mt-1.5">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    {...register('password')}
                                    placeholder="Senha do Instagram"
                                    autoComplete="new-password"
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <p className="mt-1.5 text-[11px] text-muted-foreground leading-tight">
                                Informar a senha permite que o robô faça login sozinho se a sessão da conta expirar durante uma postagem.
                            </p>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="text-sm font-medium">Notas da Conta</label>
                            <textarea
                                {...register('notes')}
                                placeholder="Informações adicionais, hashtags padrão, links..."
                                rows={4}
                                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            />
                        </div>

                        {/* Automation Status */}
                        {isEditing && (
                            <div className="pt-4 border-t border-border">
                                <label className="text-sm font-medium block mb-2">Automação (Playwright)</label>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${account.isAutomationConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                                        <span className="text-xs font-medium">
                                            {account.isAutomationConnected ? 'Sessão Conectada' : 'Aguardando Login'}
                                        </span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                            toast.info('Abrindo janela de login... Siga as instruções no terminal que irá aparecer.');
                                            const ok = await connectAutomation(account.id);
                                            if (!ok) toast.error('Falha ao abrir janela de login.');
                                        }}
                                        className="h-7 text-[10px] px-2 h-7"
                                    >
                                        {account.isAutomationConnected ? 'Reconectar' : 'Conectar Agora'}
                                    </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-2 italic px-1">
                                    Necessário para responder comentários e postar automaticamente.
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col gap-2 pt-4 border-t border-border">
                            <Button type="submit" className="w-full">
                                <Save className="mr-2 h-4 w-4" />
                                Salvar Conta
                            </Button>

                            {isEditing && (
                                <Button type="button" variant="destructive" onClick={handleDelete} className="w-full">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                </Button>
                            )}
                        </div>
                    </form>
                </div>
            </SheetContent>
        </Sheet>
    );
}
