import type { ReactNode, MouseEvent } from 'react'

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
}: StatCardProps) {
  const handleClick = (e: MouseEvent) => {
    if (onClick && !loading) {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <div
      className="pa-kpi-card"
      onClick={handleClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        opacity: loading ? 0.6 : 1,
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="pa-flex pa-justify-between pa-items-center">
        <p className="pa-kpi-label">{label}</p>
        {icon && (
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '24px', color: 'var(--pa-n300)' }}
          >
            {icon}
          </span>
        )}
      </div>
      
      <p className="pa-kpi-value">
        {loading ? '—' : value}
      </p>
      
      {(delta || meta) && (
        <div className="pa-flex pa-items-center pa-gap-2 pa-mt-2">
          {delta && (
            <span
              className={`pa-kpi-delta pa-kpi-delta--${delta.direction === 'up' ? 'up' : delta.direction === 'down' ? 'down' : 'neutral'}`}
            >
              {delta.direction === 'up' && (
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>trending_up</span>
              )}
              {delta.direction === 'down' && (
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>trending_down</span>
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
