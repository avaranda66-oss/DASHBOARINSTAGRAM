'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useAccountStore } from '@/stores';
import {
    accountSchema,
    type AccountFormData,
    type BusinessInfo,
    serializeBusinessInfo,
    parseBusinessInfo,
} from '../schemas/account.schema';
import { saveAccountAction } from '@/app/actions/account.actions';
import { Input } from '@/design-system/atoms/Input';
import { Button } from '@/design-system/atoms/Button';
import { Badge } from '@/design-system/atoms/Badge';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import type { Account } from '@/types/account';
import { cn } from '@/design-system/utils/cn';

interface AccountFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    account?: Account | null;
}

const GLYPHS = {
    CAMERA: '◎',
    SAVE: '◆',
    TRASH: '✕',
    EYE: '◎',
    EYE_OFF: '─',
    MAP: '〒',
    PHONE: '↳',
    CLOCK: '◷',
    GLOBE: '⊕',
    INFO: '◎',
    BIZ: '◆',
    AUTO: '⚡'
};

const wrap = (g: string) => <span className="font-mono text-[10px]">{g}</span>;

export function AccountFormDialog({ open, onOpenChange, account }: AccountFormDialogProps) {
    const isEditing = !!account;
    const { addAccount, updateAccount, deleteAccount, connectAutomation } = useAccountStore();
    const [avatarPreview, setAvatarPreview] = useState<string | null>(account?.avatarUrl || null);
    const [showPassword, setShowPassword] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [showAdsToken, setShowAdsToken] = useState(false);
    const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({});

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
            oauthToken: account?.oauthToken || null,
            adsToken: account?.adsToken || null,
            adsAccountId: account?.adsAccountId || null,
        },
    });

    useEffect(() => {
        if (open) {
            reset({
                name: account?.name || '',
                handle: account?.handle || '',
                avatarUrl: account?.avatarUrl || null,
                notes: account?.notes || null,
                oauthToken: account?.oauthToken || null,
                adsToken: account?.adsToken || null,
                adsAccountId: account?.adsAccountId || null,
            });
            setAvatarPreview(account?.avatarUrl || null);
            setBusinessInfo(parseBusinessInfo(account?.notes ?? null));
        }
    }, [open, account, reset]);

    const updateField = (field: keyof BusinessInfo, value: string) => {
        setBusinessInfo((prev) => ({ ...prev, [field]: value }));
    };

    const onSubmit = (data: AccountFormData) => {
        const formattedHandle = data.handle.startsWith('@')
            ? data.handle.replace(/\s/g, '').toLowerCase()
            : `@${data.handle.replace(/\s/g, '').toLowerCase()}`;

        const serializedNotes = serializeBusinessInfo(businessInfo);

        const formattedData = {
            ...data,
            handle: formattedHandle,
            avatarUrl: avatarPreview,
            notes: serializedNotes,
        };

        if (isEditing) {
            updateAccount(account.id, formattedData);
            toast.success('Conta atualizada!');
        } else {
            addAccount(formattedData);
            toast.success('Conta criada!');
        }

        saveAccountAction(formattedData as any).catch(console.error);
        handleClose();
    };

    const handleDelete = () => {
        if (!account) return;
        if (confirm('Tem certeza que deseja excluir esta conta?')) {
            deleteAccount(account.id);
            toast.success('Conta excluída');
            handleClose();
        }
    };

    const handleClose = () => {
        onOpenChange(false);
        reset();
        setAvatarPreview(null);
        setBusinessInfo({});
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
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0 bg-[#0A0A0A] border-l border-white/10" showCloseButton={false}>
                <div className="flex flex-col h-full text-[#F5F5F5]">
                    {/* Header */}
                    <div className="p-8 border-b border-white/10 bg-[#050505]">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-[#A3E635] text-[10px] tracking-widest">[ACC_SHELL_V2]</span>
                                <SheetTitle className="text-[18px] font-bold uppercase tracking-tight text-[#F5F5F5]">
                                    {isEditing ? 'Update Identity' : 'New Identity'}
                                </SheetTitle>
                            </div>
                            <button onClick={handleClose} className="text-[#4A4A4A] hover:text-[#F5F5F5] font-mono text-xs">CLOSE_X</button>
                        </div>
                        <p className="text-[11px] text-[#4A4A4A] uppercase tracking-wider italic">Configuração de parâmetros de perfil industrial.</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8 flex-1 overflow-y-auto scrollbar-none">
                        {/* Avatar Upload */}
                        <div className="flex flex-col items-center justify-center py-4">
                            <div className="relative group">
                                <div className="h-24 w-24 rounded border border-white/10 overflow-hidden bg-white/5 flex items-center justify-center transition-all group-hover:border-[#A3E635]/40">
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                                    ) : (
                                        <span className="text-2xl text-[#4A4A4A] font-mono mb-1">{wrap(GLYPHS.CAMERA)}</span>
                                    )}
                                </div>
                                <label className="absolute inset-0 bg-black/60 text-[#A3E635] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity backdrop-blur-[2px]">
                                    <span className="font-mono text-[10px] tracking-widest uppercase">UPLOAD_IMG</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                            </div>
                            <p className="text-[9px] font-mono text-[#4A4A4A] mt-3 uppercase tracking-widest leading-tight text-center">Identity_Media_Slot<br/>(Max 2MB)</p>
                        </div>

                        {/* Name */}
                        <Input
                            label="Display_Name"
                            {...register('name')}
                            placeholder="BRAND_IDENTIFIER"
                            error={errors.name?.message}
                            autoComplete="off"
                        />

                        {/* Handle */}
                        <Input
                            label="Handle_Tag"
                            {...register('handle')}
                            placeholder="@IDENTIFIER"
                            error={errors.handle?.message}
                            isMono
                            autoComplete="off"
                        />

                        {/* Password */}
                        <Input
                            label="Security_Handshake"
                            type={showPassword ? 'text' : 'password'}
                            {...register('password')}
                            placeholder="••••••••"
                            hint="Permite que o kernel restaure a sessão automaticamente."
                            isMono
                            autoComplete="new-password"
                            suffix={
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-[#4A4A4A] hover:text-[#A3E635] font-mono text-[10px]"
                                >
                                    {showPassword ? wrap(GLYPHS.EYE_OFF) : wrap(GLYPHS.EYE)}
                                </button>
                            }
                        />

                        {/* Meta API Token */}
                        <Input
                            label="Bridge_Token (META)"
                            type={showToken ? 'text' : 'password'}
                            {...register('oauthToken')}
                            placeholder="IGAAY..."
                            hint="Long-lived token para publicação oficial via API."
                            isMono
                            autoComplete="off"
                            suffix={
                                <button
                                    type="button"
                                    onClick={() => setShowToken(!showToken)}
                                    className="text-[#4A4A4A] hover:text-[#A3E635] font-mono text-[10px]"
                                >
                                    {showToken ? wrap(GLYPHS.EYE_OFF) : wrap(GLYPHS.EYE)}
                                </button>
                            }
                        />

                        {/* Facebook Ads */}
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <h4 className="text-[10px] font-mono text-[#A3E635] uppercase tracking-widest mb-2 flex items-center gap-2">
                                <span>{wrap(GLYPHS.AUTO)}</span> ADS_OPTIMIZATION_KERNEL
                            </h4>
                            <Input
                                label="Ads_Bridge_Token"
                                type={showAdsToken ? 'text' : 'password'}
                                {...register('adsToken')}
                                placeholder="EAAQQ..."
                                isMono
                                autoComplete="off"
                                suffix={
                                    <button
                                        type="button"
                                        onClick={() => setShowAdsToken(!showAdsToken)}
                                        className="text-[#4A4A4A] hover:text-[#A3E635] font-mono text-[10px]"
                                    >
                                        {showAdsToken ? GLYPHS.EYE_OFF : GLYPHS.EYE}
                                    </button>
                                }
                            />
                            <Input
                                label="Ad_Account_ID"
                                {...register('adsAccountId')}
                                placeholder="act_XXXXXXXX"
                                isMono
                                autoComplete="off"
                            />
                        </div>

                        {/* Business Info Section */}
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <h4 className="text-[10px] font-mono text-[#8A8A8A] uppercase tracking-widest mb-1 flex items-center gap-2">
                                <span>{wrap(GLYPHS.INFO)}</span> BIZ_CONTEXT_MAPPING
                            </h4>
                            <p className="text-[10px] text-[#4A4A4A] leading-tight mb-4 uppercase italic">
                                Parâmetros injetados na IA para otimização de respostas.
                            </p>

                            <div className="space-y-4">
                                <Input
                                    label="Project_Category"
                                    value={businessInfo.businessType ?? ''}
                                    onChange={(e) => updateField('businessType', e.target.value)}
                                    placeholder="Ex: RESTAURANTE_GRASTRONOMIA"
                                    size="sm"
                                />
                                <Input
                                    label="Geographic_Link"
                                    value={businessInfo.address ?? ''}
                                    onChange={(e) => updateField('address', e.target.value)}
                                    placeholder="PHYSICAL_LOCATION_DATA"
                                    size="sm"
                                />
                                <Input
                                    label="Telecom_Channel"
                                    value={businessInfo.phone ?? ''}
                                    onChange={(e) => updateField('phone', e.target.value)}
                                    placeholder="+55_00_00000_0000"
                                    size="sm"
                                    isMono
                                />
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-mono text-[#8A8A8A] uppercase tracking-widest">TEMPORAL_WINDOW</label>
                                    <textarea
                                        value={businessInfo.hours ?? ''}
                                        onChange={(e) => updateField('hours', e.target.value)}
                                        placeholder="SEG-SEX_09:00-18:00"
                                        rows={2}
                                        className="w-full rounded border border-white/10 bg-[#050505] px-3 py-2 font-mono text-[11px] text-[#F5F5F5] focus:outline-none focus:border-[#A3E635]/50 resize-none"
                                    />
                                </div>
                                <Input
                                    label="Digital_Bridge"
                                    value={businessInfo.website ?? ''}
                                    onChange={(e) => updateField('website', e.target.value)}
                                    placeholder="https://FACTORY_LINK.IO"
                                    size="sm"
                                />
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-mono text-[#8A8A8A] uppercase tracking-widest">METADATA_EXTRAS</label>
                                    <textarea
                                        value={businessInfo.extras ?? ''}
                                        onChange={(e) => updateField('extras', e.target.value)}
                                        placeholder="SESSÃO_HANDSHAKE_EXTRA_INFO..."
                                        rows={3}
                                        className="w-full rounded border border-white/10 bg-[#050505] px-3 py-2 font-mono text-[11px] text-[#F5F5F5] focus:outline-none focus:border-[#A3E635]/50 resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Automation Status */}
                        {isEditing && (
                            <div className="pt-4 border-t border-white/5">
                                <label className="text-[10px] font-mono uppercase tracking-widest text-[#4A4A4A] mb-3 block text-center">Automation_Relay_Sync</label>
                                <div className="flex items-center justify-between p-4 rounded bg-[#050505] border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "h-1.5 w-1.5 rounded-full shadow-[0_0_8px]",
                                            account.isAutomationConnected ? "bg-[#A3E635] shadow-[#A3E635]/40 animate-pulse" : "bg-[#FBBF24] shadow-[#FBBF24]/40"
                                        )} />
                                        <span className="text-[11px] font-mono uppercase tracking-widest text-[#F5F5F5]">
                                            {account.isAutomationConnected ? 'SYNC_ACTIVE' : 'READY_FOR_HOOK'}
                                        </span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                            toast.info('Abrindo janela de login... Siga as instruções no terminal.');
                                            const ok = await connectAutomation(account.id);
                                            if (!ok) toast.error('Falha ao abrir janela de login.');
                                        }}
                                        className="h-7 text-[9px] px-3 border-white/10 font-mono"
                                    >
                                        RE_CONNECT_0x
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col gap-3 pt-4 pb-8">
                            <Button type="submit" variant="solid" className="w-full font-mono text-[10px] tracking-widest uppercase py-6">
                                INITIALIZE_SAVE_SEQUENCE
                            </Button>

                            {isEditing && (
                                <button 
                                    type="button" 
                                    onClick={handleDelete}
                                    className="text-[10px] text-[#EF4444]/60 hover:text-[#EF4444] transition-colors font-mono uppercase tracking-widest py-2"
                                >
                                    [ WIPE_IDENTITY_NODE ]
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </SheetContent>
        </Sheet>
    );
}
