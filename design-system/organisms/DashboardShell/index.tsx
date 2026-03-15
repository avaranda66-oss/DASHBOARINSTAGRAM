'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { cn } from '@/design-system/utils/cn'
import { AccountFilter } from '@/features/accounts/components/account-filter'
import { useAccountStore, useSettingsStore } from '@/stores'
import { useContentStore } from '@/stores/content-slice'
import type { Content } from '@/types/content'
import { toast } from 'sonner'

interface NavItem {
  index: string
  label: string
  href: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const NAVIGATION: NavGroup[] = [
  {
    title: 'CONFIGURAR',
    items: [
      { index: '08', label: 'Accounts', href: '/dashboard/accounts' },
      { index: '09', label: 'Settings', href: '/dashboard/settings' },
    ]
  },
  {
    title: 'CONTEÚDO',
    items: [
      { index: '05', label: 'Collections', href: '/dashboard/collections' },
      { index: '06', label: 'Storyboard', href: '/dashboard/storyboard' },
      { index: '07', label: 'Calendar', href: '/dashboard/calendar' },
    ]
  },
  {
    title: 'ANÚNCIOS',
    items: [
      { index: '03', label: 'Ads', href: '/dashboard/ads' },
      { index: '04', label: 'Intelligence', href: '/dashboard/intelligence' },
    ]
  },
  {
    title: 'MONITORAR',
    items: [
      { index: '01', label: 'Overview', href: '/dashboard' },
      { index: '02', label: 'Analytics', href: '/dashboard/analytics' },
    ]
  },
]

export interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { isLoaded, loadAccounts } = useAccountStore()
  const settingsStore = useSettingsStore()
  const { recentPublished, recentFailed, clearRecentEvents } = useContentStore()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  // Meta connection source distinction
  const hasOAuthToken = !!session?.accessToken
  const hasManualToken = !!settingsStore.settings?.metaAccessToken

  // Pre-load accounts at shell level so AccountFilter and all pages have data ready
  React.useEffect(() => {
    if (!isLoaded) loadAccounts()
  }, [isLoaded, loadAccounts])

  React.useEffect(() => {
    if (recentPublished.length === 0 && recentFailed.length === 0) return;

    recentPublished.forEach(post => {
      toast.success(`◆ Publicado: ${post.title}`);
    });
    recentFailed.forEach(post => {
      const reason = (post as Content & { errorMessage?: string }).errorMessage;
      toast.error(`✕ Falha: ${post.title}${reason ? ` — ${reason}` : ''}`);
    });

    clearRecentEvents();
  }, [recentPublished, recentFailed, clearRecentEvents])

  // Derive title from NAVIGATION
  const activeItem = React.useMemo(() => {
    const allItems = NAVIGATION.flatMap(group => group.items)
    // Exact match
    const exact = allItems.find(item => item.href === pathname)
    if (exact) return exact

    // Prefix match for sub-routes (longest prefix wins)
    return allItems
      .filter(item => pathname.startsWith(item.href))
      .sort((a, b) => b.href.length - a.href.length)[0]
  }, [pathname])

  const derivedTitle = activeItem?.label || 'Overview'

  return (
    <div className="flex min-h-screen bg-[#000000] text-[#F5F5F5] font-body selection:bg-[#A3E635]/30">

      {/* ─── MOBILE OVERLAY ─── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ─── SIDEBAR (256px) ─── */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 w-64 bg-[#050505] flex-col z-50 border-r",
          mobileOpen ? "flex" : "hidden md:flex"
        )}
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        
        {/* Logo Area */}
        <div className="p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[#A3E635] text-base font-black leading-none select-none">◆</span>
            <span className="font-bold text-sm uppercase tracking-tight">Dashboard OSS</span>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto pt-6 px-1 flex flex-col gap-6">
          {NAVIGATION.map((group, groupIdx) => (
            <div key={group.title} className="flex flex-col gap-1">
              <div className="px-5 mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#3A3A3A] uppercase tracking-[0.15em] select-none">
                  {group.title}
                </span>
                {groupIdx === 2 && (
                  <div className="h-px flex-1 bg-white/5 ml-3" />
                )}
              </div>

              {group.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'group relative flex items-center gap-3 px-5 py-2.5 transition-colors'
                    )}
                    style={{ 
                      transition: 'background-color 100ms, color 100ms',
                      backgroundColor: isActive ? 'rgba(163,230,53,0.05)' : 'transparent',
                      borderLeft: isActive ? '2px solid #A3E635' : '2px solid transparent',
                    }}
                  >
                    <span className={cn(
                      "font-mono text-[10px] tracking-widest transition-colors select-none",
                      isActive ? "text-[#A3E635]" : "text-[#4A4A4A] group-hover:text-[#8A8A8A]"
                    )}>
                      [{item.index}]
                    </span>
                    <span className={cn(
                      "text-[13px] tracking-tight transition-colors",
                      isActive ? "font-medium text-[#F5F5F5]" : "text-[#8A8A8A] group-hover:text-[#D4D4D4]"
                    )}>
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t space-y-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {session?.user && (
            <div className="flex items-center gap-2 px-1">
              <div className="w-6 h-6 rounded-full bg-[#A3E635]/20 flex items-center justify-center shrink-0">
                <span className="font-mono text-[9px] text-[#A3E635] font-bold">
                  {session.user.name?.[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
              <span className="font-mono text-[11px] text-white/50 truncate">
                {session.user.name ?? session.user.email}
              </span>
            </div>
          )}
          <button
            onClick={() => signOut({ redirectTo: '/login' })}
            className="w-full flex items-center gap-2 px-2 py-1.5 font-mono text-[10px] text-white/30 hover:text-[#EF4444] hover:bg-[#EF4444]/5 transition-colors tracking-widest uppercase"
          >
            <span>⏻</span>
            <span>Sair</span>
          </button>
          <span className="font-mono text-[10px] px-1" style={{ color: '#3A3A3A' }}>
            OSS_v2.0 · build_stable
          </span>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 pl-0 md:pl-64 flex flex-col">

        {/* Topbar */}
        <header className="h-12 border-b flex items-center justify-between px-8 bg-[#000000]/80 backdrop-blur-md sticky top-0 z-40"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            {/* Hamburger — mobile only */}
            <button
              className="md:hidden mr-2 font-mono text-[#A3E635] text-lg leading-none select-none"
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Menu"
            >
              ≡
            </button>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#4A4A4A] select-none">
              ◆ / {derivedTitle}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {hasOAuthToken ? (
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#A3E635]/70">
                ● META OAUTH
              </span>
            ) : hasManualToken ? (
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#F59E0B]/70">
                ● META TOKEN
              </span>
            ) : (
              <Link
                href="/connect"
                className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 border border-[#A3E635]/30 text-[#A3E635]/70 hover:border-[#A3E635] hover:text-[#A3E635] transition-colors"
              >
                ⚡ Conectar Meta
              </Link>
            )}
            <AccountFilter />
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
