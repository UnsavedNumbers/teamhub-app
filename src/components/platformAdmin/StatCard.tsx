import type { ReactNode, MouseEvent, CSSProperties } from 'react'
import { cn } from '../../utils/cn'

interface StatCardProps {
  /** Card label (uppercase overline style) */
  label: string
  /** Main value (large Oswald number) */
  value: string | number
  /** Optional icon name (Material Symbols) */
  icon?: string
  /** Optional delta indicator (+5%, -2%, etc.) */
  delta?: {
    value: string
    direction: 'up' | 'down' | 'neutral'
  }
  /** Optional additional info below value */
  meta?: ReactNode
  /** Click handler - makes card interactive */
  onClick?: () => void
  /** Loading state */
  loading?: boolean
  /** Optional inline styles */
  style?: CSSProperties
}

/**
 * KPI Stat Card - Nike + Google design system
 * 
 * Features:
 * - Oswald display font for the main value
 * - Uppercase overline label
 * - Optional semantic delta chip
 * - Hover elevation on interactive cards
 */
export function StatCard({
  label,
  value,
  icon,
  delta,
  meta,
  onClick,
  loading = false,
  style,
}: StatCardProps) {
  const handleClick = (e: MouseEvent) => {
    if (onClick && !loading) {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <div
      className={cn(
        'pa-kpi-card',
      onClick ? 'pa-cursor-pointer' : 'pa-cursor-default',
      loading && 'pa-opacity-60'
    )}
      style={style}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className={cn('pa-flex', 'pa-justify-between', 'pa-items-center')}>
        <p className="pa-kpi-label">{label}</p>
        {icon && (
          <span
            className={cn('material-symbols-outlined', 'pa-icon-lg', 'pa-text-n300')}
          >
            {icon}
          </span>
        )}
      </div>
      
      <p className="pa-kpi-value">
        {loading ? '—' : value}
      </p>
      
      {(delta || meta) && (
        <div className={cn('pa-flex', 'pa-items-center', 'pa-gap-2', 'pa-mt-2')}>
          {delta && (
            <span
              className={`pa-kpi-delta pa-kpi-delta--${delta.direction === 'up' ? 'up' : delta.direction === 'down' ? 'down' : 'neutral'}`}
            >
              {delta.direction === 'up' && (
                <span className={cn('material-symbols-outlined', 'pa-icon-sm')}>trending_up</span>
              )}
              {delta.direction === 'down' && (
                <span className={cn('material-symbols-outlined', 'pa-icon-sm')}>trending_down</span>
              )}
              {delta.value}
            </span>
          )}
          {meta && <span className="pa-kpi-meta">{meta}</span>}
        </div>
      )}
    </div>
  )
}

export default StatCard
