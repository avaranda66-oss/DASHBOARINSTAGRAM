'use client';

import { useRef, useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { z } from 'zod';
import { useContentStore, useCollectionStore, useAccountStore, useCalendarStore, useSettingsStore } from '@/stores';
import { Button } from '@/design-system/atoms/Button';
import { Badge } from '@/design-system/atoms/Badge';
import { Input } from '@/design-system/atoms/Input';
import { SectionCard } from '@/design-system/molecules/SectionCard';
import { checkInstagramLoginAction, loginInstagramAction } from '@/app/actions/instagram.actions';
import { getSettingAction, saveSettingAction } from '@/app/actions/settings.actions';
import { motion } from 'framer-motion';
import { cn } from '@/design-system/utils/cn';

const exportSchema = z.object({
    contents: z.array(z.any()).optional().default([]),
    collections: z.array(z.any()).optional().default([]),
    accounts: z.array(z.any()).optional().default([]),
    version: z.string(),
});

const SECTION_HEADER_STYLE = "font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4A4A] select-none flex items-center gap-2 mb-6";

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isInstagramLogged, setIsInstagramLogged] = useState<boolean | null>(null);
    const [isCheckingIg, setIsCheckingIg] = useState(false);

    // Stores
    const contentStore = useContentStore();
    const collectionStore = useCollectionStore();
    const accountStore = useAccountStore();
    const calendarStore = useCalendarStore();
    const settingsStore = useSettingsStore();

    const [apifyKey, setApifyKey] = useState('');
    const [geminiKey, setGeminiKey] = useState('');
    const [firecrawlKey, setFirecrawlKey] = useState('');
    const [aiProvider, setAiProvider] = useState<'gemini' | 'antigravity'>('gemini');
    const [aiModel, setAiModel] = useState('gemini-2.5-flash');
    const [antigravityKey, setAntigravityKey] = useState('');
    const [antigravityBaseUrl, setAntigravityBaseUrl] = useState('');

    // Meta API state
    const [metaToken, setMetaToken] = useState('');
    const [isSavingMeta, setIsSavingMeta] = useState(false);
    const [isVerifyingMeta, setIsVerifyingMeta] = useState(false);
    const [tunnelUrl, setTunnelUrl] = useState('');
    const [isSavingTunnel, setIsSavingTunnel] = useState(false);

    useEffect(() => {
        settingsStore.loadSettings();

        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const success = params.get('success');
            const oauthError = params.get('error');
            const oauthUsername = params.get('username');

            if (success === 'meta_connected') {
                toast.success(`Meta API conectada${oauthUsername ? ` como @${oauthUsername}` : ''}!`);
                window.history.replaceState({}, '', '/dashboard/settings');
            } else if (oauthError) {
                const messages: Record<string, string> = {
                    oauth_denied: 'Permissão negada. Tente novamente.',
                    no_code: 'Código de autorização não recebido.',
                    auth_failed: 'Falha na autenticação. Verifique as credenciais do App.',
                };
                toast.error(messages[oauthError] ?? 'Erro no fluxo OAuth.');
                window.history.replaceState({}, '', '/dashboard/settings');
            }
        }
    }, []);

    useEffect(() => {
        if (settingsStore.settings) {
            setApifyKey(settingsStore.settings.apifyApiKey || '');
            setGeminiKey(settingsStore.settings.geminiApiKey || '');
            setFirecrawlKey(settingsStore.settings.firecrawlApiKey || '');
            setAiProvider(settingsStore.settings.aiProvider || 'gemini');
            setAiModel(settingsStore.settings.aiModel || 'gemini-2.5-flash');
            setAntigravityKey(settingsStore.settings.antigravityApiKey || '');
            setAntigravityBaseUrl(settingsStore.settings.antigravityBaseUrl || '');
            setMetaToken(settingsStore.settings.metaAccessToken || '');
        }
    }, [settingsStore.settings]);

    useEffect(() => {
        getSettingAction('tunnel_url').then((val) => {
            if (val) {
                try { setTunnelUrl(JSON.parse(val)); } catch { setTunnelUrl(val); }
            }
        }).catch(() => {});
    }, []);

    const { data: session } = useSession();

    // Considera conectado via OAuth (NextAuth) OU token manual (settings)
    const metaConnected = !!(session?.accessToken || settingsStore.settings?.metaAccessToken);
    const metaUsername = settingsStore.settings?.metaUsername;
    const metaExpiresAt = settingsStore.settings?.metaTokenExpiresAt;
    const metaExpiresDate = metaExpiresAt ? new Date(metaExpiresAt * 1000) : null;
    const metaExpiringSoon = metaExpiresAt
        ? metaExpiresAt - Math.floor(Date.now() / 1000) < 7 * 24 * 60 * 60
        : false;

    const handleSaveTunnelUrl = async () => {
        setIsSavingTunnel(true);
        try {
            await saveSettingAction('tunnel_url', JSON.stringify(tunnelUrl.trim()));
            toast.success('Tunnel URL salva!');
        } catch {
            toast.error('Erro ao salvar Tunnel URL.');
        } finally {
            setIsSavingTunnel(false);
        }
    };

    const handleSaveMetaToken = async () => {
        if (!metaToken.trim()) {
            toast.error('Cole o token de acesso antes de salvar.');
            return;
        }
        setIsSavingMeta(true);
        try {
            const res = await fetch('/api/meta-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: metaToken.trim(), verifyOnly: true }),
            });
            const json = await res.json();
            if (!json.success) {
                toast.error('Token inválido ou expirado.');
                return;
            }
            const expiresAt = Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60;
            await settingsStore.updateMetaToken(metaToken.trim(), expiresAt, json.username);
            toast.success(`Meta API conectada! Conta @${json.username}`);
        } catch {
            toast.error('Erro ao verificar o token Meta.');
        } finally {
            setIsSavingMeta(false);
        }
    };

    const handleDisconnectMeta = async () => {
        const ok = window.confirm('Desconectar conta Meta API?');
        if (!ok) return;
        await settingsStore.clearMetaToken();
        setMetaToken('');
        toast.success('Conta Meta API desconectada.');
    };

    const handleSaveApiKeys = async () => {
        setIsCheckingIg(true);
        try {
            await settingsStore.updateApiKeys(apifyKey, geminiKey, firecrawlKey);
            await settingsStore.updateAISettings(aiProvider, aiModel, antigravityKey, antigravityBaseUrl);
            toast.success('Configurações de IA salvas!');
        } catch (e) {
            toast.error('Erro ao salvar.');
        } finally {
            setIsCheckingIg(false);
        }
    };

    const handleExport = () => {
        try {
            const data = {
                contents: contentStore.contents,
                collections: collectionStore.collections,
                accounts: accountStore.accounts,
                exportedAt: new Date().toISOString(),
                version: '2.0.0',
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `factory-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('Exportação concluída!');
        } catch (e) {
            toast.error('Falha na exportação.');
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const raw = await file.text();
            const parsed = JSON.parse(raw);
            const result = exportSchema.safeParse(parsed);
            if (!result.success) {
                toast.error('Arquivo incompatível.');
                return;
            }
            if (window.confirm('Substituir todos os dados atuais?')) {
                const { contents, collections, accounts } = result.data;
                localStorage.setItem('ig-contents', JSON.stringify(contents));
                localStorage.setItem('ig-collections', JSON.stringify(collections));
                localStorage.setItem('ig-accounts', JSON.stringify(accounts));
                toast.success('Restauração completa.');
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch {
            toast.error('Erro ao ler arquivo.');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl space-y-8 pb-12"
        >
            <div className="pb-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-[#A3E635] text-[10px] tracking-widest">[SYS_CORE_V2]</span>
                    <h1 className="text-[2rem] font-bold tracking-tight text-[#F5F5F5]">System Parameters</h1>
                </div>
                <p className="text-[14px] text-[#4A4A4A] tracking-tight">Otimização de rotas de automação, kernels de IA e chaves de segurança.</p>
            </div>

            <div className="grid gap-6">
                {/* Visual Kernel */}
                <SectionCard className="p-8">
                    <h4 className={SECTION_HEADER_STYLE}><span className="text-[#A3E635]">◎</span> Interface Kernel [01]</h4>
                    <div className="flex gap-4">
                        {(['dark', 'light'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setTheme(t)}
                                className={cn(
                                    "px-6 py-3 border rounded font-mono text-[10px] tracking-widest transition-all uppercase flex-1",
                                    theme === t ? "bg-[#A3E635] text-black border-[#A3E635]" : "text-[#4A4A4A] border-white/5 hover:border-white/10"
                                )}
                            >
                                {t === 'dark' ? 'DEEP_SPACE_MODE' : 'SOLAR_GLOSS_MODE'}
                            </button>
                        ))}
                    </div>
                </SectionCard>

                {/* Automation Hub */}
                <SectionCard className="p-8">
                    <h4 className={SECTION_HEADER_STYLE}><span className="text-[#A3E635]">◎</span> Meta API Bridge [02]</h4>
                    <div className="space-y-6">
                        {/* Status da sessão OAuth NextAuth */}
                        {session?.accessToken && (
                            <div className="p-4 border border-[#A3E635]/20 bg-[#A3E635]/5 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <Badge intent="success" variant="subtle" size="sm">OAUTH_ACTIVE</Badge>
                                        <span className="font-mono text-xs text-[#F5F5F5]">Conta Meta conectada via OAuth</span>
                                    </div>
                                    <p className="font-mono text-[10px] text-[#4A4A4A]">Token válido por 60 dias · Renovar em /connect</p>
                                </div>
                                <Button variant="outline" size="sm" className="font-mono text-[9px]" onClick={() => window.location.href = '/connect'}>RENOVAR</Button>
                            </div>
                        )}

                        {!session?.accessToken && !settingsStore.settings?.metaAccessToken && (
                            <div className="p-4 border border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
                                <div>
                                    <p className="font-mono text-xs text-white/60">Nenhuma conta Meta conectada.</p>
                                    <p className="font-mono text-[10px] text-[#4A4A4A] mt-0.5">Conecte via OAuth para acessar Ads e publicar no Instagram.</p>
                                </div>
                                <Button variant="solid" size="sm" className="font-mono text-[9px] shrink-0" onClick={() => window.location.href = '/connect'}>⚡ CONECTAR META</Button>
                            </div>
                        )}

                        {metaConnected && (
                            <div className={cn(
                                "p-4 border rounded flex items-center justify-between",
                                metaExpiringSoon ? "border-[#EF4444]/20 bg-[#EF4444]/5" : "border-[#A3E635]/20 bg-[#A3E635]/5"
                            )}>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge intent={metaExpiringSoon ? 'error' : 'success'} variant="subtle" size="sm">
                                            {metaExpiringSoon ? 'TOKEN_EXPIRING' : 'BRIDGE_ACTIVE'}
                                        </Badge>
                                        <span className="font-mono text-sm text-[#F5F5F5]">@{metaUsername}</span>
                                    </div>
                                    <p className="font-mono text-[10px] text-[#4A4A4A]">VAL_UNTIL: {metaExpiresDate?.toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleDisconnectMeta} variant="outline" size="sm" className="font-mono text-[9px]">DISCONNECT</Button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <Input
                                type="password"
                                label="Kernel_Link_Token"
                                value={metaToken}
                                onChange={e => setMetaToken(e.target.value)}
                                placeholder="IGAAY..."
                                isMono
                            />
                            <div className="flex gap-3">
                                <Button onClick={handleSaveMetaToken} isLoading={isSavingMeta} variant="solid" className="font-mono text-[10px] tracking-widest uppercase flex-1">UPDATE_LINK</Button>
                                <Button variant="outline" className="font-mono text-[10px] tracking-widest uppercase flex-1" onClick={() => window.location.href = '/connect'}>OAUTH_META ↗</Button>
                            </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-white/5">
                            <label className={cn(
                                "text-[10px] font-mono uppercase tracking-widest block",
                                !tunnelUrl.trim() ? "text-[#F59E0B]/70" : "text-[#4A4A4A]"
                            )}>
                                Tunnel_URL_Proxy
                            </label>
                            <Input
                                type="text"
                                value={tunnelUrl}
                                onChange={e => setTunnelUrl(e.target.value)}
                                placeholder="https://seu-tunnel.ngrok.io"
                                isMono
                            />
                            <p className="font-mono text-[10px] text-white/30 mt-1 leading-relaxed">
                                Necessária para publicar mídia local via Meta API. O Meta precisa de uma URL
                                pública para acessar suas imagens. Use ngrok, cloudflared ou similar.
                                Exemplo: https://seu-tunnel.ngrok.io
                            </p>
                            <Button onClick={handleSaveTunnelUrl} isLoading={isSavingTunnel} variant="solid" className="w-full font-mono text-[10px] tracking-widest uppercase">SAVE_TUNNEL_URL</Button>
                        </div>
                    </div>
                </SectionCard>

                {/* AI & Scraper Core */}
                <SectionCard className="p-8">
                    <h4 className={SECTION_HEADER_STYLE}><span className="text-[#A3E635]">◎</span> Intelligence Kernels [03]</h4>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input 
                                type="password" 
                                label="Gemini_Prot_Key"
                                value={geminiKey} 
                                onChange={e => setGeminiKey(e.target.value)} 
                                placeholder="AIza..." 
                                isMono
                            />
                            <Input 
                                type="password" 
                                label="Firecrawl_Link"
                                value={firecrawlKey} 
                                onChange={e => setFirecrawlKey(e.target.value)} 
                                placeholder="fc-..." 
                                isMono
                            />
                        </div>

                        <div className="pt-6 border-t border-white/5">
                            <label className="text-[10px] font-mono uppercase tracking-widest text-[#4A4A4A] mb-2 block">AI_Logic_Provider</label>
                            <div className="flex gap-2 mb-4">
                                {(['gemini', 'antigravity'] as const).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setAiProvider(p)}
                                        className={cn(
                                            "flex-1 py-2 border rounded font-mono text-[10px] tracking-widest transition-all uppercase",
                                            aiProvider === p ? "bg-white/10 text-[#A3E635] border-[#A3E635]/60" : "text-[#4A4A4A] border-white/5"
                                        )}
                                    >
                                        {p.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                            
                            <label className="text-[10px] font-mono uppercase tracking-widest text-[#4A4A4A] mb-2 block">Target_Neural_Model</label>
                            <select 
                                value={aiModel} 
                                onChange={e => setAiModel(e.target.value)}
                                className={cn(
                                    "flex h-10 w-full rounded border border-white/10 bg-[#050505] px-3 py-1 font-mono text-sm text-[#F5F5F5] transition-all placeholder:text-[#4A4A4A] focus:outline-none focus:border-[#A3E635]/50 focus:ring-1 focus:ring-[#A3E635]/20",
                                    "appearance-none cursor-pointer"
                                )}
                            >
                                {aiProvider === 'gemini' ? (
                                    <>
                                        <option value="gemini-2.0-flash">GEMINI_2.0_FLASH</option>
                                        <option value="gemini-2.5-flash">GEMINI_2.5_FLASH</option>
                                        <option value="gemini-2.5-pro">GEMINI_2.5_PRO</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="claude-sonnet-4">CLAUDE_SONNET_V4</option>
                                        <option value="gpt-4o">GPT_4O_KERNEL</option>
                                        <option value="o3">O3_REASONING</option>
                                    </>
                                )}
                            </select>
                        </div>

                        <Button onClick={handleSaveApiKeys} isLoading={isCheckingIg} variant="solid" className="w-full font-mono text-[10px] tracking-widest">INITIALIZE_AI_STACK</Button>
                    </div>
                </SectionCard>

                {/* Data Security */}
                <SectionCard className="p-8">
                    <h4 className={SECTION_HEADER_STYLE}><span className="text-[#A3E635]">◎</span> Factory Data Hub [04]</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div>
                            <h5 className="font-mono text-[10px] text-[#8A8A8A] mb-2 uppercase tracking-tighter">Export_Backup</h5>
                            <p className="text-[11px] text-[#4A4A4A] mb-4">Gerar snapshot local de todas as instâncias e conteúdos.</p>
                            <Button onClick={handleExport} variant="outline" size="sm" className="w-full font-mono text-[10px]">DOWNLOAD_SNAP.JSON</Button>
                        </div>
                        <div>
                            <h5 className="font-mono text-[10px] text-[#8A8A8A] mb-2 uppercase tracking-tighter">Restore_Kernel</h5>
                            <p className="text-[11px] text-[#4A4A4A] mb-4">Injetar snapshot de banco de dados via pipeline externo.</p>
                            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" />
                            <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm" className="w-full font-mono text-[10px]">INJECT_RESTORE_HEX</Button>
                        </div>
                    </div>
                    
                    <div className="pt-8 border-t border-[#EF4444]/20">
                        <div className="flex items-center justify-between p-6 rounded bg-[#EF4444]/5 border border-[#EF4444]/20">
                            <div className="space-y-1">
                                <h5 className="font-bold text-[#EF4444] text-[12px] uppercase tracking-widest flex items-center gap-2">
                                    <span className="text-sm">☢</span> CRITICAL_ZONE
                                </h5>
                                <p className="text-[10px] text-[#EF4444]/60 uppercase font-mono">Format_All_Local_Storage_Nodes</p>
                            </div>
                            <Button variant="outline" className="border-[#EF4444]/40 text-[#EF4444] hover:bg-[#EF4444] hover:text-white font-mono text-[10px]" onClick={() => {
                                if(window.confirm('RESET_SYSTEM_ALL?')) {
                                    localStorage.clear();
                                    window.location.reload();
                                }
                            }}>WIPE_FACTORY_STATE</Button>
                        </div>
                    </div>
                </SectionCard>
            </div>

            <div className="p-6 flex items-center justify-between opacity-30 font-mono text-[9px] tracking-[0.4em] uppercase">
                <span>INTEL_DASHBOARD_V2 // BUILD_2026.03.14</span>
                <span>ROOT_USER_AUTH_OK</span>
            </div>
        </motion.div>
    );
}
