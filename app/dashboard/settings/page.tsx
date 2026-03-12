'use client';

import { useRef, useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { z } from 'zod';
import { useContentStore, useCollectionStore, useAccountStore, useCalendarStore, useSettingsStore } from '@/stores';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Download, Upload, Trash2, Calendar, Monitor, Smartphone, Github, Instagram, ExternalLink, ShieldCheck, ShieldAlert, Key, Zap, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { checkInstagramLoginAction, loginInstagramAction } from '@/app/actions/instagram.actions';

const exportSchema = z.object({
    contents: z.array(z.any()).optional().default([]),
    collections: z.array(z.any()).optional().default([]),
    accounts: z.array(z.any()).optional().default([]),
    version: z.string(),
});

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

    useEffect(() => {
        settingsStore.loadSettings();

        // Feedback de OAuth redirect
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

    // Helpers Meta API
    const metaConnected = !!settingsStore.settings?.metaAccessToken;
    const metaUsername = settingsStore.settings?.metaUsername;
    const metaExpiresAt = settingsStore.settings?.metaTokenExpiresAt;
    const metaExpiresDate = metaExpiresAt ? new Date(metaExpiresAt * 1000) : null;
    const metaExpiringSoon = metaExpiresAt
        ? metaExpiresAt - Math.floor(Date.now() / 1000) < 7 * 24 * 60 * 60
        : false;

    const handleSaveMetaToken = async () => {
        if (!metaToken.trim()) {
            toast.error('Cole o token de acesso antes de salvar.');
            return;
        }
        setIsSavingMeta(true);
        try {
            // Verificar token via API antes de salvar
            const res = await fetch(`/api/meta-insights?token=${encodeURIComponent(metaToken.trim())}`);
            const json = await res.json();
            if (!json.success) {
                toast.error('Token inválido ou expirado. Verifique e tente novamente.');
                return;
            }
            // Salvar com expiração estimada de 60 dias a partir de agora
            const expiresAt = Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60;
            await settingsStore.updateMetaToken(metaToken.trim(), expiresAt, json.username);
            toast.success(`Meta API conectada! Conta @${json.username || 'desconhecida'}`);
        } catch {
            toast.error('Erro ao verificar o token Meta.');
        } finally {
            setIsSavingMeta(false);
        }
    };

    const handleDisconnectMeta = async () => {
        const ok = window.confirm('Desconectar conta Meta API? Você precisará reconectar para usar métricas privadas.');
        if (!ok) return;
        await settingsStore.clearMetaToken();
        setMetaToken('');
        toast.success('Conta Meta API desconectada.');
    };

    const handleVerifyMeta = async () => {
        const token = settingsStore.settings?.metaAccessToken;
        if (!token) return;
        setIsVerifyingMeta(true);
        try {
            const res = await fetch(`/api/meta-insights?token=${encodeURIComponent(token)}`);
            const json = await res.json();
            if (json.success) {
                toast.success(`Token válido! Conta @${json.username}`);
            } else {
                toast.error('Token expirado ou inválido. Reconecte sua conta.');
            }
        } catch {
            toast.error('Erro ao verificar token.');
        } finally {
            setIsVerifyingMeta(false);
        }
    };

    const handleSaveApiKeys = async () => {
        setIsCheckingIg(true);
        try {
            await settingsStore.updateApiKeys(apifyKey, geminiKey, firecrawlKey);
            await settingsStore.updateAISettings(aiProvider, aiModel, antigravityKey, antigravityBaseUrl);
            toast.success('Configurações de IA e chaves salvas com sucesso!');
        } catch (e) {
            toast.error('Erro ao salvar as configurações.');
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
                version: '1.0.0',
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ig-dashboard-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success('Backup exportado com sucesso!');
        } catch (e) {
            console.error(e);
            toast.error('Ocorreu um erro ao exportar os dados.');
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
                toast.error('Arquivo inválido. Verifique o formato do JSON.');
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }

            const confirmed = window.confirm(
                'Importar dados irá substituir TODOS os seus dados atuais. Deseja continuar?'
            );

            if (confirmed) {
                const { contents, collections, accounts } = result.data;

                // Save to localeStorage via stores bypassing state for direct persistence
                localStorage.setItem('ig-contents', JSON.stringify(contents));
                localStorage.setItem('ig-collections', JSON.stringify(collections));
                localStorage.setItem('ig-accounts', JSON.stringify(accounts));

                toast.success(`Importados: ${contents.length} conteúdos, ${collections.length} coleções, ${accounts.length} contas.`);

                // Reload to apply initial states
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (error) {
            console.error(error);
            toast.error('Falha ao ler o arquivo JSON.');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleReset = () => {
        const confirmed = window.confirm(
            'AVISO: Isso apagará TODOS os seus dados permanentemente. Você tem certeza?'
        );

        if (confirmed) {
            localStorage.clear();
            toast.success('Todos os dados foram resetados.');
            setTimeout(() => window.location.reload(), 1000);
        }
    };

    const handleCheckInstagram = async () => {
        setIsCheckingIg(true);
        try {
            const status = await checkInstagramLoginAction();
            setIsInstagramLogged(status);
            if (status) {
                toast.success('Instagram está conectado com sucesso no Robô Local!');
            } else {
                toast.warning('Instagram desconectado. Por favor, faça login.');
            }
        } catch (e) {
            toast.error('Erro ao verificar o status do Instagram.');
        } finally {
            setIsCheckingIg(false);
        }
    };

    const handleLoginInstagram = async () => {
        setIsCheckingIg(true);
        try {
            toast.info('Abrindo navegador do Robô... Por favor, aguarde.');
            await loginInstagramAction();
            toast.success('Navegador fechado. Verificando status atual...');
            await handleCheckInstagram();
        } catch (e) {
            toast.error('Erro ao abrir o navegador de login.');
        } finally {
            setIsCheckingIg(false);
        }
    };

    return (
        <div className="max-w-4xl space-y-8 pb-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                    Gerencie suas preferências de visualização e os dados do sistema.
                </p>
            </div>

            <div className="grid gap-6">
                {/* Appearance */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Monitor className="h-5 w-5 text-primary" />
                            Aparência
                        </CardTitle>
                        <CardDescription>
                            Personalize o tema da aplicação.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <Button
                                variant={theme === 'light' ? 'default' : 'outline'}
                                onClick={() => setTheme('light')}
                                className="w-32"
                            >
                                <Sun className="mr-2 h-4 w-4" />
                                Claro
                            </Button>
                            <Button
                                variant={theme === 'dark' ? 'default' : 'outline'}
                                onClick={() => setTheme('dark')}
                                className="w-32"
                            >
                                <Moon className="mr-2 h-4 w-4" />
                                Escuro
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Preferences */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            Preferências
                        </CardTitle>
                        <CardDescription>
                            Configurações padrão de visualização do calendário.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Visualização Padrão do Calendário</label>
                                <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-1 w-fit">
                                    {(['month', 'week', 'day'] as const).map((view) => (
                                        <Button
                                            key={view}
                                            variant={calendarStore.calendarView === view ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => calendarStore.setView(view)}
                                            className="text-xs capitalize"
                                        >
                                            {view === 'month' ? 'Mensal' : view === 'week' ? 'Semanal' : 'Diário'}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Instagram Automation */}
                <Card className="border-border">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Instagram className="h-5 w-5 text-pink-600" />
                            Automação do Instagram (Bot Local)
                        </CardTitle>
                        <CardDescription>
                            Gerencie as sessões ativas do Playwright para cada conta cadastrada.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {accountStore.accounts.length === 0 ? (
                            <div className="p-4 text-center border border-dashed rounded-lg text-muted-foreground text-sm">
                                Nenhuma conta cadastrada para monitorar.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {accountStore.accounts.map((acc) => (
                                    <div key={acc.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-border rounded-lg bg-card/50 hover:bg-card transition-colors gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full border border-border overflow-hidden bg-muted flex items-center justify-center shrink-0">
                                                {acc.avatarUrl ? (
                                                    <img src={`/api/image-proxy?url=${encodeURIComponent(acc.avatarUrl)}`} alt={acc.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <Instagram className="h-5 w-5 text-muted-foreground/50" />
                                                )}
                                            </div>
                                            <div className="space-y-0.5">
                                                <h4 className="font-semibold text-sm">{acc.name}</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-pink-500 font-medium">{acc.handle}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={`h-1.5 w-1.5 rounded-full ${acc.isAutomationConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${acc.isAutomationConnected ? 'text-green-600' : 'text-yellow-600'}`}>
                                                            {acc.isAutomationConnected ? 'Conectado' : 'Desconectado'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-[10px] flex-1 sm:flex-none"
                                                onClick={async () => {
                                                    setIsCheckingIg(true);
                                                    try {
                                                        await accountStore.checkAutomationStatus(acc.id);
                                                        const updatedAcc = accountStore.accounts.find(a => a.id === acc.id);
                                                        if (updatedAcc?.isAutomationConnected) {
                                                            toast.success(`${acc.name}: Conectado ao Bot Local! ✅`);
                                                        } else {
                                                            toast.warning(`${acc.name}: Desconectado. Sessão não encontrada.`);
                                                        }
                                                    } catch (e) {
                                                        toast.error('Erro ao verificar status de automação.');
                                                    } finally {
                                                        setIsCheckingIg(false);
                                                    }
                                                }}
                                                disabled={isCheckingIg}
                                            >
                                                {isCheckingIg ? 'Verificando...' : 'Verificar'}
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="h-8 text-[10px] instagram-gradient border-0 text-white flex-1 sm:flex-none"
                                                onClick={async () => {
                                                    toast.info('Abrindo janela de login... Siga as instruções no terminal que irá aparecer.');
                                                    await accountStore.connectAutomation(acc.id);
                                                }}
                                                disabled={isCheckingIg}
                                            >
                                                {acc.isAutomationConnected ? 'Reconectar' : 'Conectar Agora'}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-[10px] text-muted-foreground italic px-1 pt-2">
                            A automação local utiliza Chromium na sua máquina para simular ações humanas reais com segurança.
                        </p>
                    </CardContent>
                </Card>

                {/* Meta API */}
                <Card className="border-border">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Zap className="h-5 w-5 text-blue-500" />
                            Meta API Oficial
                            {metaConnected && (
                                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-500 border border-green-500/20">
                                    <CheckCircle2 className="h-3 w-3" /> CONECTADO
                                </span>
                            )}
                        </CardTitle>
                        <CardDescription>
                            Acesse métricas privadas da sua conta: alcance real, saves, compartilhamentos e muito mais — dados que o Apify não consegue obter.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {metaConnected && (
                            <div className={`flex items-start gap-3 rounded-lg p-3 border ${metaExpiringSoon ? 'bg-amber-500/5 border-amber-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
                                <div className="mt-0.5">
                                    {metaExpiringSoon
                                        ? <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        : <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    }
                                </div>
                                <div className="flex-1 space-y-0.5">
                                    <p className="text-sm font-medium">
                                        {metaUsername ? `@${metaUsername}` : 'Conta conectada'}
                                    </p>
                                    {metaExpiresDate && (
                                        <p className={`text-xs ${metaExpiringSoon ? 'text-amber-500' : 'text-muted-foreground'}`}>
                                            {metaExpiringSoon ? '⚠️ Token expira em breve — ' : 'Token válido até '}
                                            {metaExpiresDate.toLocaleDateString('pt-BR')}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[10px]"
                                        onClick={handleVerifyMeta}
                                        disabled={isVerifyingMeta}
                                    >
                                        {isVerifyingMeta ? 'Verificando...' : 'Verificar'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-[10px] text-destructive hover:text-destructive"
                                        onClick={handleDisconnectMeta}
                                    >
                                        <XCircle className="h-3 w-3 mr-1" /> Desconectar
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3 max-w-lg">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Token de Acesso (Long-lived Token)
                                </label>
                                <input
                                    type="password"
                                    placeholder="IGAAY..."
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={metaToken}
                                    onChange={(e) => setMetaToken(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Cole aqui seu Long-lived Token do Instagram (válido por 60 dias).
                                    Obtenha em{' '}
                                    <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                                        Graph API Explorer
                                    </a>.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={handleSaveMetaToken}
                                    disabled={isSavingMeta || !metaToken.trim()}
                                    size="sm"
                                >
                                    {isSavingMeta ? 'Verificando...' : metaConnected ? 'Atualizar Token' : 'Salvar e Conectar'}
                                </Button>
                                {process.env.NEXT_PUBLIC_APP_URL && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.location.href = '/api/auth/instagram'}
                                    >
                                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                        Conectar via OAuth
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-3 space-y-1.5">
                            <p className="text-xs font-medium text-blue-400">O que a Meta API oferece vs Apify:</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                {[
                                    { label: 'Alcance real (reach)', meta: true, apify: false },
                                    { label: 'Saves', meta: true, apify: false },
                                    { label: 'Compartilhamentos', meta: true, apify: false },
                                    { label: 'Total interações', meta: true, apify: false },
                                    { label: 'Métricas de concorrentes', meta: false, apify: true },
                                    { label: 'Sem limite de posts', meta: false, apify: true },
                                ].map((row) => (
                                    <div key={row.label} className="flex items-center gap-1.5">
                                        <span className={`text-[10px] font-bold ${row.meta ? 'text-green-500' : 'text-muted-foreground/40'}`}>
                                            {row.meta ? '✓' : '✗'}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">{row.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* API Keys */}
                <Card className="border-border">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Key className="h-5 w-5 text-indigo-500" />
                            Integrações Locais (API Keys)
                        </CardTitle>
                        <CardDescription>
                            Configure as chaves de API necessárias para rodar os robôs de inteligência artificial e scraping no seu computador de forma autônoma.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-4 max-w-lg">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Google Gemini API Key</label>
                                <input
                                    type="password"
                                    placeholder="AIzaSy..."
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    value={geminiKey}
                                    onChange={(e) => setGeminiKey(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">Chave necessária para gerar imagens, stories montados e legendas com IA.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Apify API Key</label>
                                <input
                                    type="password"
                                    placeholder="apify_api_..."
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    value={apifyKey}
                                    onChange={(e) => setApifyKey(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">Opcional. Usado por automações em background que raspam dados não estruturados.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Firecrawl API Key <span className="text-[10px] text-emerald-500 font-normal">(Novo — Alternativa gratuita)</span></label>
                                <input
                                    type="password"
                                    placeholder="fc-..."
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    value={firecrawlKey}
                                    onChange={(e) => setFirecrawlKey(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">Opcional. Alternativa gratuita ao Apify (500 páginas/mês). Obtenha em <a href="https://firecrawl.dev" target="_blank" rel="noopener noreferrer" className="text-primary underline">firecrawl.dev</a>.</p>
                            </div>

                            {/* AI Provider & Model Selection */}
                            <div className="border-t border-border pt-4 mt-4">
                                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    🧠 Provedor de IA para Análises
                                </h4>
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Provedor</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => { setAiProvider('gemini'); setAiModel('gemini-2.5-flash'); }}
                                                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-all ${aiProvider === 'gemini' ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'border-border text-muted-foreground hover:border-muted-foreground/50'}`}
                                            >
                                                Google Gemini
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setAiProvider('antigravity'); setAiModel('claude-sonnet-4-20250514'); }}
                                                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-all ${aiProvider === 'antigravity' ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'border-border text-muted-foreground hover:border-muted-foreground/50'}`}
                                            >
                                                OpenRouter / Custom
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Modelo</label>
                                        <select
                                            value={aiModel}
                                            onChange={(e) => setAiModel(e.target.value)}
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        >
                                            {aiProvider === 'gemini' ? (
                                                <>
                                                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Rápido)</option>
                                                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Balanceado)</option>
                                                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Avançado)</option>
                                                    <option value="gemini-3-flash-preview">Gemini 3 Flash Preview (Novo)</option>
                                                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview (Máximo)</option>
                                                </>
                                            ) : (
                                                <>
                                                    <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (Balanceado)</option>
                                                    <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Rápido)</option>
                                                    <option value="gpt-4o">GPT-4o (OpenAI)</option>
                                                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Google)</option>
                                                    <option value="o3">o3 (Raciocínio Avançado)</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    {aiProvider === 'antigravity' && (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-muted-foreground">API Key do Provedor</label>
                                                <input
                                                    type="password"
                                                    placeholder="sk-ant-..."
                                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                    value={antigravityKey}
                                                    onChange={(e) => setAntigravityKey(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-muted-foreground">Base URL (opcional)</label>
                                                <input
                                                    type="text"
                                                    placeholder="https://api.antigravity.ai/v1"
                                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                    value={antigravityBaseUrl}
                                                    onChange={(e) => setAntigravityBaseUrl(e.target.value)}
                                                />
                                                <p className="text-xs text-muted-foreground">Endpoint OpenAI-compatible. Deixe vazio para usar o padrão.</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <Button
                                onClick={handleSaveApiKeys}
                                className="w-full sm:w-auto mt-2"
                                disabled={isCheckingIg}
                            >
                                Salvar Configurações
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Data Management */}
                <Card className="border-border">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Upload className="h-5 w-5 text-primary" />
                            Gerenciamento de Dados
                        </CardTitle>
                        <CardDescription>
                            Faça backup dos seus conteúdos ou importe um JSON preexistente.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 space-y-2">
                                <h4 className="text-sm font-semibold">Exportar Backup</h4>
                                <p className="text-xs text-muted-foreground">
                                    Faz o download de um arquivo JSON contendo todos os seus posts, coleções e contas.
                                </p>
                                <Button onClick={handleExport} variant="outline" className="w-full sm:w-auto">
                                    <Download className="mr-2 h-4 w-4" />
                                    Exportar Dados (JSON)
                                </Button>
                            </div>

                            <div className="h-[1px] sm:h-auto sm:w-[1px] bg-border my-2 sm:my-0" />

                            <div className="flex-1 space-y-2">
                                <h4 className="text-sm font-semibold">Importar Backup</h4>
                                <p className="text-xs text-muted-foreground">
                                    Restaura os dados a partir de um arquivo JSON. Isso substituirá os dados atuais.
                                </p>
                                <div>
                                    <input
                                        type="file"
                                        accept=".json,application/json"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleImport}
                                    />
                                    <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full sm:w-auto">
                                        <Upload className="mr-2 h-4 w-4" />
                                        Importar Dados
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-destructive/20">
                            <div className="flex items-center justify-between p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                                <div>
                                    <h4 className="font-semibold text-destructive inline-flex items-center">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Zona de Perigo
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                                        Isso irá apagar todos os dados armazenados localmente no seu navegador. Essa ação não pode ser desfeita.
                                    </p>
                                </div>
                                <Button onClick={handleReset} variant="destructive">
                                    Resetar Tudo
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* About */}
                <Card>
                    <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between text-sm text-muted-foreground">
                        <div className="space-y-1 mb-4 md:mb-0">
                            <span className="font-semibold text-foreground mr-2">Dashboard Instagram</span>
                            <span>v1.0.0</span>
                            <p className="text-xs">Feito com Next.js 15, Zustand e Tailwind CSS.</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => window.open('https://github.com/avaranda66-oss', '_blank')}>
                            <Github className="mr-2 h-4 w-4" />
                            Visitar Repositório
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
