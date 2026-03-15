import Link from 'next/link'

export interface EmptyStateProps {
  icon: string
  title: string
  description: string
  action?: { label: string; href: string }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20 px-6 text-center">
      <span
        className="font-mono text-[2.5rem] leading-none select-none"
        style={{ color: '#A3E635' }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="space-y-1.5 max-w-xs">
        <h3
          className="font-mono text-[13px] font-bold uppercase tracking-widest"
          style={{ color: '#F5F5F5' }}
        >
          {title}
        </h3>
        <p
          className="font-mono text-[11px] leading-relaxed"
          style={{ color: '#4A4A4A' }}
        >
          {description}
        </p>
      </div>
      {action && (
        <Link
          href={action.href}
          className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 border transition-colors"
          style={{
            borderColor: 'rgba(163,230,53,0.3)',
            color: 'rgba(163,230,53,0.7)',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLAnchorElement
            el.style.borderColor = '#A3E635'
            el.style.color = '#A3E635'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLAnchorElement
            el.style.borderColor = 'rgba(163,230,53,0.3)'
            el.style.color = 'rgba(163,230,53,0.7)'
          }}
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
