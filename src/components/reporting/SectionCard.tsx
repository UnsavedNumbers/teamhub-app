/**
 * Section Card Component
 *
 * Container for grouping related metrics and charts.
 * Provides consistent styling and spacing.
 */

import { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  icon?: string
  children: ReactNode
  actions?: ReactNode
  className?: string
}

export function SectionCard({ title, icon, children, actions, className = '' }: SectionCardProps) {
  return (
    <div className={`reporting-section-card ${className}`}>
      <div className="reporting-section-header">
        {icon && <span className="reporting-section-icon material-symbols-outlined">{icon}</span>}
        <h3 className="reporting-section-title">{title}</h3>
        {actions && <div style={{ marginLeft: 'auto' }}>{actions}</div>}
      </div>
      {children}
    </div>
  )
}
