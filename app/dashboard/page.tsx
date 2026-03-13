'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    Kanban,
    Calendar,
    TrendingUp,
    Plus,
    Lightbulb,
    FileEdit,
    CheckCircle2,
    Clock,
    Send,
    Image,
    Circle,
    Film,
    Layers,
    Megaphone,
    AlertCircle,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Sparkles,
} from 'lucide-react';
import { useContentStore } from '@/stores';
import { CONTENT_STATUSES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { format, isAfter, parseISO, subDays, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ContentEditorDialog } from '@/features/content/components/content-editor-dialog';
import { useAccountStore } from '@/stores';

const STATUS_ICONS: Record<string, React.ElementType> = {
    idea: Lightbulb,
    draft: FileEdit,
    approved: CheckCircle2,
    scheduled: Clock,
    published: Send,
    failed: AlertCircle,
};

const TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
    post: { icon: Image, label: 'Post' },
    story: { icon: Circle, label: 'Story' },
    reel: { icon: Film, label: 'Reel' },
    carousel: { icon: Layers, label: 'Carrossel' },
    campaign: { icon: Megaphone, label: 'Campanha' },
};

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const item = {
    hidden: { opacity: 0, y: 16, filter: 'blur(4px)' },
    show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: [0.25, 0.4, 0.25, 1] as const } },
};

/** Mini sparkline SVG */
function Sparkline({ data, color = 'var(--v2-accent)', height = 32 }: { data: number[]; color?: string; height?: number }) {
    if (data.length < 2) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const path = data
        .map((v, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - ((v - min) / range) * 100;
            return `${i === 0 ? 'M' : 'L'}${x},${y}`;
        })
        .join(' ');

    return (
        <svg viewBox="0 -5 100 110" preserveAspectRatio="none" style={{ width: '100%', height }} className="opacity-40 group-hover:opacity-80 transition-opacity duration-500">
            <path d={path} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
}

/** Glass Card wrapper */
function GlassCard({ children, className = '', span = '', onClick }: {
    children: React.ReactNode;
    className?: string;
    span?: string;
    onClick?: () => void;
}) {
    return (
        <motion.div
            variants={item}
            onClick={onClick}
            className={`
                group relative overflow-hidden rounded-xl
                bg-[var(--v2-bg-surface)] backdrop-blur-xl
                border border-[var(--v2-border)]
                transition-all duration-300 ease-out
                hover:border-[var(--v2-border-accent)] hover:shadow-[0_4px_30px_var(--v2-border-accent)]
                ${span} ${className} ${onClick ? 'cursor-pointer' : ''}
            `}
        >
            {/* Grain texture */}
            <div className="v2-grain pointer-events-none absolute inset-0 z-[1]" />
            {/* Content */}
            <div className="relative z-[2] h-full">{children}</div>
        </motion.div>
    );
}

/** KPI stat card */
function KpiCard({ label, value, prevValue, icon: Icon, sparkData }: {
    label: string;
    value: number;
    prevValue?: number;
    icon: React.ElementType;
    sparkData?: number[];
}) {
    const delta = prevValue != null && prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : 0;
    const isPositive = delta > 0;
    const isNeutral = delta === 0;

    return (
        <GlassCard className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
                <span className="v2-label">{label}</span>
                <Icon className="h-4 w-4" style={{ color: 'var(--v2-text-tertiary)' }} />
            </div>
            <div className="mt-3 flex items-end gap-3">
                <span className="text-3xl font-mono v2-number tracking-tight" style={{ color: 'var(--v2-text-primary)' }}>
                    {value.toLocaleString('pt-BR')}
                </span>
                {!isNeutral && (
                    <span className={`flex items-center text-xs font-mono mb-0.5 ${isPositive ? 'text-[var(--v2-success)]' : 'text-[var(--v2-danger)]'}`}>
                        {isPositive ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                        {isPositive ? '+' : ''}{delta.toFixed(1)}%
                    </span>
                )}
                {isNeutral && prevValue != null && (
                    <span className="flex items-center text-xs font-mono mb-0.5" style={{ color: 'var(--v2-text-tertiary)' }}>
                        <Minus className="h-3 w-3 mr-0.5" />0%
                    </span>
                )}
            </div>
            {sparkData && sparkData.length > 1 && (
                <div className="mt-3">
                    <Sparkline data={sparkData} />
                </div>
            )}
        </GlassCard>
    );
}

export default function DashboardPage() {
    const { contents: allContents, isLoaded, loadContents } = useContentStore();
    const { selectedAccountId } = useAccountStore();
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    useEffect(() => {
        if (!isLoaded) loadContents();
    }, [isLoaded, loadContents]);

    const contents = selectedAccountId === 'all'
        ? allContents
        : allContents.filter(c => c.accountId === selectedAccountId);

    const now = new Date();

    // Compute stats
    const stats = useMemo(() => {
        const total = contents.length;
        const scheduled = contents.filter(c => c.status === 'scheduled').length;
        const published = contents.filter(c => c.status === 'published').length;
        const failed = contents.filter(c => c.status === 'failed').length;

        // This week vs last week
        const thisWeekStart = subDays(now, 7);
        const lastWeekStart = subDays(now, 14);
        const thisWeek = contents.filter(c => c.scheduledAt && isAfter(parseISO(c.scheduledAt), thisWeekStart)).length;
        const lastWeek = contents.filter(c => c.scheduledAt && isWithinInterval(parseISO(c.scheduledAt), { start: lastWeekStart, end: thisWeekStart })).length;

        // Sparkline: conteúdos criados por dia nos últimos 14 dias
        const sparkData: number[] = [];
        for (let i = 13; i >= 0; i--) {
            const day = subDays(now, i);
            const dayStr = format(day, 'yyyy-MM-dd');
            sparkData.push(contents.filter(c => c.createdAt?.startsWith(dayStr)).length);
        }

        // Type distribution
        const typeDist = Object.entries(TYPE_CONFIG).map(([key, cfg]) => ({
            type: key,
            label: cfg.label,
            count: contents.filter(c => c.type === key).length,
        })).sort((a, b) => b.count - a.count);

        return { total, scheduled, published, failed, thisWeek, lastWeek, sparkData, typeDist };
    }, [contents]);

    const statusCounts = CONTENT_STATUSES.map((s) => ({
        ...s,
        count: contents.filter((c) => c.status === s.value).length,
        Icon: STATUS_ICONS[s.value],
    }));

    const upcomingContents = contents
        .filter((c) => c.scheduledAt && isAfter(parseISO(c.scheduledAt), now))
        .sort((a, b) => parseISO(a.scheduledAt!).getTime() - parseISO(b.scheduledAt!).getTime())
        .slice(0, 5);

    return (
        <div className="v2-ambient min-h-full">
            <motion.div
                className="relative z-10 space-y-6"
                variants={container}
                initial="hidden"
                animate="show"
            >
                {/* Header */}
                <motion.div variants={item} className="flex items-end justify-between">
                    <div>
                        <h2 className="text-2xl font-bold" style={{ color: 'var(--v2-text-primary)' }}>
                            Central de <span className="v2-gradient-text">Comando</span>
                        </h2>
                        <p className="mt-1 text-sm" style={{ color: 'var(--v2-text-secondary)' }}>
                            Visão geral da sua operação de conteúdo.
                        </p>
                    </div>
                    <Button
                        className="gap-2 h-9 px-4 text-xs font-medium rounded-lg"
                        style={{ background: 'var(--v2-gradient-primary)', color: 'white', border: 'none' }}
                        onClick={() => setIsEditorOpen(true)}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Novo Conteúdo
                    </Button>
                </motion.div>

                {/* KPI Bento Grid */}
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                        label="Total de Conteúdos"
                        value={stats.total}
                        icon={Kanban}
                        sparkData={stats.sparkData}
                    />
                    <KpiCard
                        label="Agendados"
                        value={stats.scheduled}
                        icon={Calendar}
                    />
                    <KpiCard
                        label="Esta Semana"
                        value={stats.thisWeek}
                        prevValue={stats.lastWeek}
                        icon={TrendingUp}
                    />
                    <KpiCard
                        label="Publicados"
                        value={stats.published}
                        icon={Send}
                    />
                </div>

                {/* Status + Type Distribution Row */}
                <div className="grid gap-3 lg:grid-cols-3">
                    {/* Status breakdown — 2 cols */}
                    <GlassCard className="p-5 lg:col-span-2">
                        <h3 className="v2-label mb-4">Por Status</h3>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {statusCounts.map((status) => {
                                const total = stats.total || 1;
                                const pct = ((status.count / total) * 100).toFixed(0);
                                return (
                                    <div key={status.value} className="flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors hover:bg-[var(--v2-border)]">
                                        <div
                                            className="flex h-8 w-8 items-center justify-center rounded-lg"
                                            style={{ backgroundColor: `${status.color}15` }}
                                        >
                                            <status.Icon className="h-4 w-4" style={{ color: status.color }} />
                                        </div>
                                        <span className="text-lg font-mono v2-number font-bold" style={{ color: 'var(--v2-text-primary)' }}>
                                            {status.count}
                                        </span>
                                        <span className="text-[10px] text-center leading-tight" style={{ color: 'var(--v2-text-tertiary)' }}>
                                            {status.label}
                                        </span>
                                        {/* Mini progress bar */}
                                        <div className="w-full h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--v2-border)' }}>
                                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: status.color }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </GlassCard>

                    {/* Type distribution — 1 col */}
                    <GlassCard className="p-5">
                        <h3 className="v2-label mb-4">Distribuição por Tipo</h3>
                        <div className="space-y-3">
                            {stats.typeDist.map((t) => {
                                const total = stats.total || 1;
                                const pct = (t.count / total) * 100;
                                const TypeIcon = TYPE_CONFIG[t.type]?.icon ?? Image;
                                return (
                                    <div key={t.type} className="flex items-center gap-3">
                                        <TypeIcon className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--v2-text-tertiary)' }} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-medium" style={{ color: 'var(--v2-text-secondary)' }}>{t.label}</span>
                                                <span className="text-xs font-mono v2-number" style={{ color: 'var(--v2-text-tertiary)' }}>
                                                    {t.count} ({pct.toFixed(0)}%)
                                                </span>
                                            </div>
                                            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--v2-border)' }}>
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{ width: `${pct}%`, background: 'var(--v2-accent)' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </GlassCard>
                </div>

                {/* Bottom: Upcoming + Quick Actions */}
                <div className="grid gap-3 lg:grid-cols-3">
                    {/* Upcoming content — 2 cols */}
                    <GlassCard className="p-5 lg:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="v2-label">Próximos Conteúdos</h3>
                            {upcomingContents.length > 0 && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: 'var(--v2-border)', color: 'var(--v2-text-tertiary)' }}>
                                    {upcomingContents.length} agendados
                                </span>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            {upcomingContents.length === 0 ? (
                                <div className="py-8 text-center">
                                    <Clock className="mx-auto h-6 w-6 mb-2" style={{ color: 'var(--v2-text-tertiary)' }} />
                                    <p className="text-sm" style={{ color: 'var(--v2-text-tertiary)' }}>
                                        Nenhum conteúdo agendado
                                    </p>
                                </div>
                            ) : (
                                upcomingContents.map((content) => {
                                    const TypeIcon = TYPE_CONFIG[content.type]?.icon ?? Image;
                                    return (
                                        <div
                                            key={content.id}
                                            className="flex items-center gap-3 p-2.5 rounded-lg transition-colors hover:bg-[var(--v2-border)]"
                                        >
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--v2-border)' }}>
                                                <TypeIcon className="h-3.5 w-3.5" style={{ color: 'var(--v2-accent)' }} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium" style={{ color: 'var(--v2-text-primary)' }}>
                                                    {content.title}
                                                </p>
                                                <p className="text-xs font-mono" style={{ color: 'var(--v2-text-tertiary)' }}>
                                                    {content.scheduledAt
                                                        ? format(parseISO(content.scheduledAt), "EEE, dd MMM · HH:mm", { locale: ptBR })
                                                        : 'Sem data'}
                                                </p>
                                            </div>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border" style={{ borderColor: 'var(--v2-border)', color: 'var(--v2-text-tertiary)' }}>
                                                {TYPE_CONFIG[content.type]?.label ?? content.type}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </GlassCard>

                    {/* Quick Actions */}
                    <GlassCard className="p-5">
                        <h3 className="v2-label mb-4">Ações Rápidas</h3>
                        <div className="space-y-2">
                            <Button
                                className="w-full justify-start gap-3 h-11 rounded-lg text-white border-0 hover:opacity-90 text-sm"
                                style={{ background: 'var(--v2-gradient-primary)' }}
                                onClick={() => setIsEditorOpen(true)}
                            >
                                <Plus className="h-4 w-4" />
                                Novo Conteúdo
                            </Button>
                            <Link href="/dashboard/storyboard" className="block">
                                <Button variant="outline" className="w-full justify-start gap-3 h-11 rounded-lg text-sm border-[var(--v2-border)] hover:border-[var(--v2-border-accent)] hover:bg-[var(--v2-border)]">
                                    <Kanban className="h-4 w-4" />
                                    Storyboard
                                </Button>
                            </Link>
                            <Link href="/dashboard/calendar" className="block">
                                <Button variant="outline" className="w-full justify-start gap-3 h-11 rounded-lg text-sm border-[var(--v2-border)] hover:border-[var(--v2-border-accent)] hover:bg-[var(--v2-border)]">
                                    <Calendar className="h-4 w-4" />
                                    Calendário
                                </Button>
                            </Link>
                            <Link href="/dashboard/analytics" className="block">
                                <Button variant="outline" className="w-full justify-start gap-3 h-11 rounded-lg text-sm border-[var(--v2-border)] hover:border-[var(--v2-border-accent)] hover:bg-[var(--v2-border)]">
                                    <BarChart3 className="h-4 w-4" />
                                    Métricas
                                </Button>
                            </Link>
                        </div>

                        {/* Mini insight */}
                        {stats.failed > 0 && (
                            <div className="mt-4 p-3 rounded-lg" style={{ background: 'oklch(0.6 0.15 25 / 8%)', border: '1px solid oklch(0.6 0.15 25 / 15%)' }}>
                                <div className="flex items-start gap-2">
                                    <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: 'var(--v2-warning)' }} />
                                    <p className="text-[11px] leading-tight" style={{ color: 'var(--v2-text-secondary)' }}>
                                        <strong>{stats.failed}</strong> {stats.failed === 1 ? 'post falhou' : 'posts falharam'} na publicação. Verifique a conexão do robô.
                                    </p>
                                </div>
                            </div>
                        )}
                    </GlassCard>
                </div>
            </motion.div>

            <ContentEditorDialog
                open={isEditorOpen}
                onOpenChange={setIsEditorOpen}
            />
        </div>
    );
}
