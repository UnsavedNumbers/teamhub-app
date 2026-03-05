import { Link } from 'react-router-dom'
import { type LucideIcon } from 'lucide-react'
import { cn } from '../../../utils/cn'
import EmptyState from '../EmptyState'

export interface RecentActivityItem {
  id: string
  title: string
  subtitle?: string
  contextLabel?: string
  actionState?: string
  actionStateTone?: 'default' | 'warning' | 'urgent' | 'success'
  href: string
  icon?: LucideIcon
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
  const actionStateToneClasses: Record<NonNullable<RecentActivityItem['actionStateTone']>, string> = {
    default: 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    urgent: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  }

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
      <ul className="space-y-2.5">
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
                  className="group relative flex items-start gap-3 rounded-xl bg-slate-50/80 px-3 py-3 text-left transition-colors hover:bg-slate-100 dark:bg-slate-900/70 dark:hover:bg-slate-900"
                >
                  <div className="absolute bottom-0 left-[1.05rem] top-0 w-px bg-slate-200/70 dark:bg-slate-700/70" />
                  <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {Icon ? <Icon className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-slate-500 dark:bg-slate-400" />}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="line-clamp-2 text-sm font-bold text-slate-900 sm:line-clamp-1 dark:text-slate-100">
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="mt-0.5 line-clamp-2 text-xs font-medium text-slate-600 sm:line-clamp-1 dark:text-slate-400">
                        {item.subtitle}
                      </p>
                    )}
                    {item.contextLabel && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] font-medium text-slate-500 sm:line-clamp-1 dark:text-slate-500">
                        {item.contextLabel}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end justify-start self-stretch">
                    <span className="hidden shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:inline">
                      {item.timestamp}
                    </span>
                    {item.actionState && (
                      <span
                        className={cn(
                          'mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                          actionStateToneClasses[item.actionStateTone ?? 'default'],
                        )}
                      >
                        {item.actionState}
                      </span>
                    )}
                  </div>
                </Link>
                <div className="pl-11 pr-2 sm:hidden">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {item.timestamp}
                  </span>
                </div>
              </li>
            )
          })
        )}
      </ul>
    </section>
  )
}
