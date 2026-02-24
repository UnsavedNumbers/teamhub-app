import { Link } from 'react-router-dom'
import { type LucideIcon } from 'lucide-react'
import { cn } from '../../../utils/cn'
import EmptyState from '../EmptyState'

export interface RecentActivityItem {
  id: string
  title: string
  subtitle?: string
  href: string
  icon: LucideIcon
  timestamp: string
}

interface RecentActivityListProps {
  title: string
  viewAllHref?: string
  items: RecentActivityItem[]
  emptyMessage?: string
  className?: string
}

/**
 * List of recent activity items (workspace feel, like Vimeo "Recent videos").
 */
export function RecentActivityList({
  title,
  viewAllHref,
  items,
  emptyMessage = 'No recent activity.',
  className,
}: RecentActivityListProps) {
  return (
    <section className={cn('', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-black uppercase tracking-wide text-slate-900 dark:text-slate-100">{title}</h2>
        {viewAllHref && (
          <Link
            to={viewAllHref}
            className="text-sm font-bold uppercase tracking-wide text-[var(--org-link-color)] hover:underline"
          >
            View all
          </Link>
        )}
      </div>
      <ul className="space-y-2">
        {items.length === 0 ? (
          <li>
            <EmptyState
              icon="history"
              title={emptyMessage}
              className="py-8"
            />
          </li>
        ) : (
          items.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <Link
                  to={item.href}
                  className="flex items-center gap-4 rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-left transition-all hover:border-[var(--org-link-color)]/30 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--org-btn-primary-bg)]/10">
                    <Icon className="h-5 w-5 text-[var(--org-link-color)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="truncate text-xs font-medium text-slate-600 dark:text-slate-400">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {item.timestamp}
                  </span>
                </Link>
              </li>
            )
          })
        )}
      </ul>
    </section>
  )
}
