'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/design-system/utils/cn'
import { AccountFilter } from '@/features/accounts/components/account-filter'
import { useAccountStore } from '@/stores'

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
    title: 'MONITORAR',
    items: [
      { index: '01', label: 'Overview', href: '/dashboard' },
      { index: '02', label: 'Analytics', href: '/dashboard/analytics' },
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
    title: 'CONTEÚDO',
    items: [
      { index: '05', label: 'Collections', href: '/dashboard/collections' },
      { index: '06', label: 'Storyboard', href: '/dashboard/storyboard' },
      { index: '07', label: 'Calendar', href: '/dashboard/calendar' },
    ]
  },
  {
    title: 'CONFIGURAR',
    items: [
      { index: '08', label: 'Accounts', href: '/dashboard/accounts' },
      { index: '09', label: 'Settings', href: '/dashboard/settings' },
    ]
  }
]

export interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname()
  const { isLoaded, loadAccounts } = useAccountStore()

  // Pre-load accounts at shell level so AccountFilter and all pages have data ready
  React.useEffect(() => {
    if (!isLoaded) loadAccounts()
  }, [isLoaded, loadAccounts])

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
      
      {/* ─── SIDEBAR (256px) ─── */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#050505] flex flex-col z-50 border-r"
             style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        
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
        <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px]" style={{ color: '#3A3A3A' }}>
              OSS_v2.0 · build_stable
            </span>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 pl-64 flex flex-col">
        
        {/* Topbar */}
        <header className="h-12 border-b flex items-center justify-between px-8 bg-[#000000]/80 backdrop-blur-md sticky top-0 z-40"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#4A4A4A] select-none">
              ◆ / {derivedTitle}
            </span>
          </div>

          <div className="flex items-center gap-4">
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
