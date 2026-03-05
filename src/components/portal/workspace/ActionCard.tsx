import { Link } from 'react-router-dom'
import { type LucideIcon } from 'lucide-react'
import { cn } from '../../../utils/cn'

interface ActionCardProps {
  to: string
  icon: LucideIcon
  label: string
  subtext?: string
  className?: string
}

/**
 * Large rounded action card for workspace dashboard (Vimeo-style).
 */
export function ActionCard({ to, icon: Icon, label, subtext, className }: ActionCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        'group flex flex-col items-center rounded-xl border-2 border-gray-200 bg-white p-8 text-center transition-all hover:border-[var(--org-link-color)] hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600 dark:hover:bg-gray-800',
        className
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--org-btn-primary-bg)]/10 transition-all group-hover:bg-[var(--org-btn-primary-bg)]/20">
        <Icon className="h-8 w-8 text-[var(--org-link-color)]" />
      </div>
      <span className="text-base font-black uppercase tracking-wide text-gray-900 dark:text-gray-100">{label}</span>
      {subtext && (
        <span className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">{subtext}</span>
      )}
    </Link>
  )
}

