import type { ReactNode } from 'react'

interface PageHeaderProps {
  /** Page title (Oswald H1) */
  title: string
  /** Optional subtitle (Inter, muted) */
  subtitle?: string
  /** Action buttons to show on the right */
  actions?: ReactNode
  /** Additional content below title/subtitle */
  children?: ReactNode
}

/**
 * PageHeader - Nike + Google design system
 * 
 * Standard page header pattern:
 * - Title in Oswald condensed uppercase
 * - Optional subtitle in Inter muted
 * - Right-aligned actions (filters, CTAs)
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: PageHeaderProps) {
  return (
    <div className="pa-page-header">
      <div className="pa-page-header-content">
        <h1 className="pa-page-title">{title}</h1>
        {subtitle && <p className="pa-page-subtitle">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="pa-page-actions">{actions}</div>}
    </div>
  )
}

export default PageHeader
