import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../../utils/cn'
import '../../styles/topLevelStats.css'

export type TopLevelStatTone = 'default' | 'success' | 'warning' | 'danger' | 'info'

export interface TopLevelStatItem {
  id?: string
  label: ReactNode
  value: ReactNode
  meta?: ReactNode
  icon?: string
  onClick?: () => void
  tone?: TopLevelStatTone
  empty?: boolean
}

interface TopLevelStatsProps {
  items: TopLevelStatItem[]
  className?: string
  gridClassName?: string
  ariaLabel?: string
  minColumnWidth?: number
}

export function TopLevelStats({
  items,
  className,
  gridClassName,
  ariaLabel = 'Summary metrics',
  minColumnWidth = 180,
}: TopLevelStatsProps) {
  const gridStyle = {
    '--tls-min-column-width': `${minColumnWidth}px`,
  } as CSSProperties

  return (
    <section className={cn('tls-section', className)} aria-label={ariaLabel}>
      <div className={cn('tls-grid', gridClassName)} style={gridStyle}>
        {items.map((item, index) => {
          const content = (
            <>
              <div className="tls-stat-header">
                <span className="tls-stat-label">{item.label}</span>
                {item.icon ? <span className="material-symbols-outlined tls-stat-icon" aria-hidden>{item.icon}</span> : null}
              </div>
              <span className="tls-stat-value">{item.value}</span>
              {item.meta ? <span className="tls-stat-meta">{item.meta}</span> : null}
            </>
          )

          const sharedClassName = cn(
            'tls-stat',
            item.onClick && 'is-clickable',
            item.empty && 'is-empty',
            item.tone && item.tone !== 'default' && `is-${item.tone}`
          )

          if (item.onClick) {
            return (
              <button
                key={item.id ?? `${index}-${String(item.label)}`}
                type="button"
                className={sharedClassName}
                onClick={item.onClick}
              >
                {content}
              </button>
            )
          }

          return (
            <div key={item.id ?? `${index}-${String(item.label)}`} className={sharedClassName}>
              {content}
            </div>
          )
        })}
      </div>
    </section>
  )
}
