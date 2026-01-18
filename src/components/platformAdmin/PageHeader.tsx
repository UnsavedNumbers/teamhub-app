import type { ReactNode } from 'react'

interface PageHeaderProps {
  /** Page title (Oswald H1) */
  title: string
  /** Optional subtitle (Inter, muted) */
  subtitle?: string
  /** Optional description */
  description?: string
  /** Breadcrumbs */
  breadcrumbs?: Array<{ label: string; path?: string; onClick?: () => void }>
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
  description,
  breadcrumbs,
  actions,
  children,
}: PageHeaderProps) {
  return (
    <div className="pa-page-header">
      {breadcrumbs && (
        <nav className="pa-breadcrumbs">
          {breadcrumbs.map((crumb, index) => (
            <span key={index}>
              {crumb.path ? (
                <a href={crumb.path} onClick={crumb.onClick}>{crumb.label}</a>
              ) : (
                <span onClick={crumb.onClick}>{crumb.label}</span>
              )}
              {index < breadcrumbs.length - 1 && ' / '}
            </span>
          ))}
        </nav>
      )}
      <div className="pa-page-header-content">
        <h1 className="pa-page-title">{title}</h1>
        {subtitle && <p className="pa-page-subtitle">{subtitle}</p>}
        {description && <p className="pa-page-description">{description}</p>}
        {children}
      </div>
      {actions && <div className="pa-page-actions">{actions}</div>}
    </div>
  )
}

export default PageHeader
