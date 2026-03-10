'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    Kanban,
    Calendar,
    FolderOpen,
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
    AlertCircle,
} from 'lucide-react';
import { useContentStore } from '@/stores';
import { CONTENT_STATUSES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ContentEditorDialog } from '@/features/content/components/content-editor-dialog';
import { AccountFilter } from '@/features/accounts/components/account-filter';
import { useAccountStore } from '@/stores';

const STATUS_ICONS: Record<string, React.ElementType> = {
    idea: Lightbulb,
    draft: FileEdit,
    approved: CheckCircle2,
    scheduled: Clock,
    published: Send,
    failed: AlertCircle,
};

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
    post: { icon: Image, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    story: { icon: Circle, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    reel: { icon: Film, color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
    carousel: { icon: Layers, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
};

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.06 },
    },
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

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
        <motion.div
            className="space-y-8"
            variants={container}
            initial="hidden"
            animate="show"
        >
            {/* Welcome section */}
            <motion.div variants={item}>
                <h2 className="text-2xl font-bold">
                    Bem-vindo ao{' '}
                    <span className="instagram-gradient-text">Dashboard Instagram</span>
                </h2>
                <p className="mt-1 text-muted-foreground">
                    Gerencie seus conteúdos, planeje postagens e acompanhe sua produtividade.
                </p>
            </motion.div>

            {/* Main stats */}
            <motion.div
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                variants={item}
            >
                {[
                    { label: 'Total de Conteúdos', value: contents.length, icon: Kanban, gradient: 'from-blue-500/10 to-blue-600/5' },
                    { label: 'Agendados', value: contents.filter((c) => c.status === 'scheduled').length, icon: Calendar, gradient: 'from-purple-500/10 to-purple-600/5' },
                    { label: 'Esta Semana', value: upcomingContents.length, icon: TrendingUp, gradient: 'from-green-500/10 to-green-600/5' },
                    { label: 'Publicados', value: contents.filter((c) => c.status === 'published').length, icon: Send, gradient: 'from-orange-500/10 to-orange-600/5' },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className={`rounded-xl border border-border bg-gradient-to-br ${stat.gradient} p-5 transition-all hover:scale-[1.02] hover:shadow-lg`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{stat.label}</span>
                            <stat.icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <motion.p
                            className="mt-2 text-3xl font-bold"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            {stat.value}
                        </motion.p>
                    </div>
                ))}
            </motion.div>

            {/* Status breakdown */}
            <motion.div variants={item}>
                <h3 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Por Status
                </h3>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {statusCounts.map((status) => (
                        <div
                            key={status.value}
                            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/30"
                        >
                            <div
                                className="flex h-8 w-8 items-center justify-center rounded-md"
                                style={{ backgroundColor: `${status.color}20` }}
                            >
                                <status.Icon className="h-4 w-4" style={{ color: status.color }} />
                            </div>
                            <div>
                                <p className="text-lg font-bold">{status.count}</p>
                                <p className="text-xs text-muted-foreground">{status.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Upcoming content */}
                <motion.div className="lg:col-span-2" variants={item}>
                    <h3 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Próximos Conteúdos
                    </h3>
                    <div className="space-y-2">
                        {upcomingContents.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border p-8 text-center">
                                <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Nenhum conteúdo agendado
                                </p>
                            </div>
                        ) : (
                            upcomingContents.map((content) => {
                                const typeConfig = TYPE_CONFIG[content.type];
                                const TypeIcon = typeConfig?.icon ?? Image;
                                return (
                                    <div
                                        key={content.id}
                                        className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/30"
                                    >
                                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${typeConfig?.color ?? ''}`}>
                                            <TypeIcon className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">{content.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {content.scheduledAt
                                                    ? format(parseISO(content.scheduledAt), "EEE, dd MMM · HH:mm", {
                                                        locale: ptBR,
                                                    })
                                                    : 'Sem data'}
                                            </p>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={`shrink-0 text-xs ${typeConfig?.color ?? ''}`}
                                        >
                                            {content.type === 'carousel' ? 'Carrossel' : content.type.charAt(0).toUpperCase() + content.type.slice(1)}
                                        </Badge>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </motion.div>

                {/* Quick actions */}
                <motion.div variants={item}>
                    <h3 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Ações Rápidas
                    </h3>
                    <div className="space-y-2">
                        <Button
                            className="w-full justify-start gap-3 h-12 instagram-gradient text-white border-0 hover:opacity-90"
                            size="lg"
                            onClick={() => setIsEditorOpen(true)}
                        >
                            <Plus className="h-5 w-5" />
                            Novo Conteúdo
                        </Button>
                        <Link href="/dashboard/storyboard">
                            <Button variant="outline" className="w-full justify-start gap-3 h-12" size="lg">
                                <Kanban className="h-5 w-5" />
                                Ir ao Storyboard
                            </Button>
                        </Link>
                        <Link href="/dashboard/calendar">
                            <Button variant="outline" className="w-full justify-start gap-3 h-12 mt-2" size="lg">
                                <Calendar className="h-5 w-5" />
                                Ir ao Calendário
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </div>

            <ContentEditorDialog
                open={isEditorOpen}
                onOpenChange={setIsEditorOpen}
            />
        </motion.div>
    );
}
