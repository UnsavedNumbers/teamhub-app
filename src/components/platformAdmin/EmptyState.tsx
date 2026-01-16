import type { ReactNode } from 'react'

interface EmptyStateProps {
  /** Icon name (Material Symbols) */
  icon?: string
  /** Headline (Oswald H2) */
  title: string
  /** Description text */
  description?: string
  /** Action button/CTA */
  action?: ReactNode
}

/**
 * EmptyState - Nike + Google design system
 * 
 * Centered empty state with:
 * - Large icon
 * - Oswald headline
 * - Body description
 * - Primary CTA
 */
export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="pa-empty">
      <div className="pa-empty-icon">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <h2 className="pa-empty-title">{title}</h2>
      {description && <p className="pa-empty-text">{description}</p>}
      {action}
    </div>
  )
}

export default EmptyState
