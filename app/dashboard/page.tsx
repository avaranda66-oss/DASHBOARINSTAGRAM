'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { KpiCard } from '@/design-system/molecules/KpiCard'
import { Button } from '@/design-system/atoms/Button'
import { useContentStore } from '@/stores'
import { CONTENT_STATUSES } from '@/lib/constants'
import { format, isAfter, parseISO, subDays, isWithinInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ContentEditorDialog } from '@/features/content/components/content-editor-dialog'
import { useAccountStore } from '@/stores'

// ASCII glyphs — zero Lucide dependency
const STATUS_GLYPHS: Record<string, string> = {
  idea: '◎',
  draft: '◐',
  approved: '◆',
  scheduled: '◷',
  published: '▲',
  failed: '✕',
}

const TYPE_LABELS: Record<string, string> = {
  post: 'Post',
  story: 'Story',
  reel: 'Reel',
  carousel: 'Carrossel',
  campaign: 'Campanha',
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
}

// Minimal section card — v2 tokens, no v1 CSS vars
function SectionCard({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={className}
      style={{
        background: '#0A0A0A',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
      }}
    >
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const { contents: allContents, isLoaded, loadContents } = useContentStore()
  const { selectedAccountId } = useAccountStore()
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  useEffect(() => {
    if (!isLoaded) loadContents()
  }, [isLoaded, loadContents])

  const contents =
    selectedAccountId === 'all'
      ? allContents
      : allContents.filter((c) => c.accountId === selectedAccountId)

  const now = new Date()

  const stats = useMemo(() => {
    const total = contents.length
    const scheduled = contents.filter((c) => c.status === 'scheduled').length
    const published = contents.filter((c) => c.status === 'published').length
    const failed = contents.filter((c) => c.status === 'failed').length

    const thisWeekStart = subDays(now, 7)
    const lastWeekStart = subDays(now, 14)
    const thisWeek = contents.filter(
      (c) => c.scheduledAt && isAfter(parseISO(c.scheduledAt), thisWeekStart)
    ).length
    const lastWeek = contents.filter(
      (c) =>
        c.scheduledAt &&
        isWithinInterval(parseISO(c.scheduledAt), {
          start: lastWeekStart,
          end: thisWeekStart,
        })
    ).length

    // Sparkline: conteúdos criados por dia nos últimos 14 dias
    const sparkData: number[] = []
    for (let i = 13; i >= 0; i--) {
      const day = subDays(now, i)
      const dayStr = format(day, 'yyyy-MM-dd')
      sparkData.push(contents.filter((c) => c.createdAt?.startsWith(dayStr)).length)
    }

    // Type distribution
    const typeDist = Object.entries(TYPE_LABELS)
      .map(([key, label]) => ({
        type: key,
        label,
        count: contents.filter((c) => c.type === key).length,
      }))
      .sort((a, b) => b.count - a.count)

    // Delta semana-a-semana
    const weekDelta =
      lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0

    return { total, scheduled, published, failed, thisWeek, lastWeek, sparkData, typeDist, weekDelta }
  }, [contents])

  const statusCounts = CONTENT_STATUSES.map((s) => ({
    ...s,
    count: contents.filter((c) => c.status === s.value).length,
    glyph: STATUS_GLYPHS[s.value] ?? '○',
  }))

  const upcomingContents = contents
    .filter((c) => c.scheduledAt && isAfter(parseISO(c.scheduledAt), now))
    .sort((a, b) => parseISO(a.scheduledAt!).getTime() - parseISO(b.scheduledAt!).getTime())
    .slice(0, 6)

  return (
    <div className="min-h-full" style={{ background: '#050505' }}>
      <motion.div
        className="p-6 space-y-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* ── Page Header ── */}
        <motion.div variants={fadeUp} className="flex items-end justify-between">
          <div>
            <h1
              className="text-xl font-bold tracking-tight"
              style={{ color: '#F5F5F5', fontFamily: 'var(--font-inter)' }}
            >
              Overview
            </h1>
            <p
              className="mt-0.5 text-[13px]"
              style={{ color: '#8A8A8A' }}
            >
              Visão geral da operação de conteúdo.
            </p>
          </div>
          <Button
            variant="solid"
            intent="default"
            size="sm"
            onClick={() => setIsEditorOpen(true)}
          >
            + Novo Conteúdo
          </Button>
        </motion.div>

        {/* ── Hero KPI Band ── */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total de Conteúdos"
            value={stats.total.toLocaleString('pt-BR')}
            sparkline={stats.sparkData}
            deltaLabel="14 dias"
          />
          <KpiCard
            label="Agendados"
            value={stats.scheduled.toLocaleString('pt-BR')}
            deltaLabel="aguardando"
          />
          <KpiCard
            label="Esta Semana"
            value={stats.thisWeek.toLocaleString('pt-BR')}
            delta={stats.weekDelta}
            deltaLabel="vs. semana ant."
            sparkline={stats.sparkData.slice(-7)}
          />
          <KpiCard
            label="Publicados"
            value={stats.published.toLocaleString('pt-BR')}
            deltaLabel="acumulado"
          />
        </motion.div>

        {/* ── Status + Distribuição ── */}
        <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-3">
          {/* Status breakdown */}
          <SectionCard className="p-5 lg:col-span-2">
            <h3
              className="text-[10px] uppercase tracking-[0.12em] mb-5 select-none"
              style={{ color: '#4A4A4A' }}
            >
              Por Status
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {statusCounts.map((status) => {
                const total = stats.total || 1
                const pct = ((status.count / total) * 100).toFixed(0)
                return (
                  <div
                    key={status.value}
                    className="flex flex-col items-center gap-2 p-3 rounded-[6px]"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <span
                      className="font-mono text-[14px] leading-none"
                      style={{ color: status.color ?? '#4A4A4A' }}
                    >
                      {status.glyph}
                    </span>
                    <span
                      className="font-mono font-bold text-[1.25rem] leading-none"
                      style={{ color: '#F5F5F5' }}
                    >
                      {status.count}
                    </span>
                    <span
                      className="text-[9px] uppercase tracking-[0.08em] text-center leading-tight"
                      style={{ color: '#4A4A4A' }}
                    >
                      {status.label}
                    </span>
                    {/* Progress bar */}
                    <div
                      className="w-full h-px rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: status.color ?? '#4A4A4A',
                          transition: 'width 600ms ease',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>

          {/* Type distribution */}
          <SectionCard className="p-5">
            <h3
              className="text-[10px] uppercase tracking-[0.12em] mb-5 select-none"
              style={{ color: '#4A4A4A' }}
            >
              Distribuição por Tipo
            </h3>
            <div className="space-y-3">
              {stats.typeDist.map((t) => {
                const total = stats.total || 1
                const pct = (t.count / total) * 100
                return (
                  <div key={t.type} className="flex items-center gap-3">
                    <span
                      className="font-mono text-[10px] w-16 shrink-0"
                      style={{ color: '#8A8A8A' }}
                    >
                      {t.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div
                        className="h-1 rounded-full overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: '#A3E635',
                            transition: 'width 600ms ease',
                          }}
                        />
                      </div>
                    </div>
                    <span
                      className="font-mono text-[11px] shrink-0 w-10 text-right"
                      style={{ color: '#4A4A4A' }}
                    >
                      {t.count}
                    </span>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        </motion.div>

        {/* ── Próximos Conteúdos + Ações Rápidas ── */}
        <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-3">
          {/* Upcoming */}
          <SectionCard className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-[10px] uppercase tracking-[0.12em] select-none"
                style={{ color: '#4A4A4A' }}
              >
                Próximos Conteúdos
              </h3>
              {upcomingContents.length > 0 && (
                <span
                  className="font-mono text-[10px] px-2 py-0.5 rounded-[4px]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    color: '#8A8A8A',
                  }}
                >
                  {upcomingContents.length} agendados
                </span>
              )}
            </div>

            {upcomingContents.length === 0 ? (
              <div className="py-8 text-center">
                <span className="font-mono text-[18px] block mb-2" style={{ color: '#3A3A3A' }}>
                  ◷
                </span>
                <p className="text-[13px]" style={{ color: '#4A4A4A' }}>
                  Nenhum conteúdo agendado
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {upcomingContents.map((content) => (
                  <div
                    key={content.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-[6px]"
                    style={{ transition: 'background-color 100ms' }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = 'transparent')
                    }
                  >
                    {/* Type glyph */}
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-[4px] shrink-0"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      <span className="font-mono text-[9px]" style={{ color: '#A3E635' }}>
                        {content.type?.slice(0, 2).toUpperCase() ?? '??'}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-[13px] font-medium"
                        style={{ color: '#F5F5F5' }}
                      >
                        {content.title}
                      </p>
                      <p className="font-mono text-[11px]" style={{ color: '#D97706' }}>
                        {content.scheduledAt
                          ? format(parseISO(content.scheduledAt), "EEE, dd MMM · HH:mm", {
                              locale: ptBR,
                            })
                          : 'Sem data'}
                      </p>
                    </div>

                    <span
                      className="font-mono text-[9px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-[3px] shrink-0"
                      style={{
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#8A8A8A',
                      }}
                    >
                      {TYPE_LABELS[content.type] ?? content.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Quick Actions */}
          <SectionCard className="p-5">
            <h3
              className="text-[10px] uppercase tracking-[0.12em] mb-4 select-none"
              style={{ color: '#4A4A4A' }}
            >
              Ações Rápidas
            </h3>
            <div className="space-y-2">
              <button
                className="w-full flex items-center gap-3 h-10 px-4 rounded-[6px] text-[13px] font-medium"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(163,230,53,0.4)',
                  color: '#A3E635',
                  transition: 'background-color 150ms',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(163,230,53,0.08)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                onClick={() => setIsEditorOpen(true)}
              >
                <span className="font-mono text-[14px] leading-none">+</span>
                Novo Conteúdo
              </button>

              {[
                { href: '/dashboard/storyboard', glyph: '⊞', label: 'Storyboard' },
                { href: '/dashboard/calendar', glyph: '◫', label: 'Calendário' },
                { href: '/dashboard/analytics', glyph: '↗', label: 'Métricas' },
              ].map((action) => (
                <Link key={action.href} href={action.href} className="block">
                  <button
                    className="w-full flex items-center gap-3 h-10 px-4 rounded-[6px] text-[13px] font-medium"
                    style={{
                      background: 'transparent',
                      color: '#8A8A8A',
                      border: '1px solid rgba(255,255,255,0.08)',
                      transition: 'background-color 100ms, color 100ms, border-color 100ms',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = 'rgba(255,255,255,0.04)'
                      el.style.color = '#F5F5F5'
                      el.style.borderColor = 'rgba(255,255,255,0.12)'
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = 'transparent'
                      el.style.color = '#8A8A8A'
                      el.style.borderColor = 'rgba(255,255,255,0.08)'
                    }}
                  >
                    <span className="font-mono text-[12px]" style={{ color: '#4A4A4A' }}>
                      {action.glyph}
                    </span>
                    {action.label}
                  </button>
                </Link>
              ))}
            </div>

            {/* Alert: failed posts */}
            {stats.failed > 0 && (
              <div
                className="mt-4 p-3 rounded-[6px]"
                style={{
                  background: 'rgba(239,68,68,0.05)',
                  border: '1px solid rgba(239,68,68,0.12)',
                }}
              >
                <div className="flex items-start gap-2">
                  <span className="font-mono text-[12px] mt-0.5 shrink-0" style={{ color: '#EF4444' }}>
                    ✕
                  </span>
                  <p className="text-[11px] leading-snug" style={{ color: '#8A8A8A' }}>
                    <span className="font-mono font-bold" style={{ color: '#EF4444' }}>
                      {stats.failed}
                    </span>{' '}
                    {stats.failed === 1 ? 'post falhou' : 'posts falharam'} na publicação.
                    Verifique a conexão.
                  </p>
                </div>
              </div>
            )}
          </SectionCard>
        </motion.div>
      </motion.div>

      <ContentEditorDialog open={isEditorOpen} onOpenChange={setIsEditorOpen} />
    </div>
  )
}
