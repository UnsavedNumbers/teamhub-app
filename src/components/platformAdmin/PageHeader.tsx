import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface PageHeaderProps {
  /** Page title (Oswald H1) */
  title: ReactNode
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
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="pa-breadcrumbs">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1

            return (
              <span key={`${crumb.label}-${index}`} className="pa-breadcrumb-item">
                {index > 0 && (
                  <span className="material-symbols-outlined pa-breadcrumb-chevron">chevron_right</span>
                )}
                {crumb.path ? (
                  <Link
                    to={crumb.path}
                    onClick={crumb.onClick}
                    className={isLast ? 'pa-breadcrumb-current' : 'pa-breadcrumb-link'}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    onClick={crumb.onClick}
                    className={isLast ? 'pa-breadcrumb-current' : 'pa-breadcrumb-link'}
                  >
                    {crumb.label}
                  </span>
                )}
              </span>
            )
          })}
        </nav>
      )}
      <div className="pa-page-header-row">
        <div className="pa-page-header-content">
          <h1 className="pa-page-title">{title}</h1>
          {subtitle && <p className="pa-page-subtitle">{subtitle}</p>}
          {description && <p className="pa-page-description">{description}</p>}
          {children}
        </div>
        {actions && <div className="pa-page-actions">{actions}</div>}
      </div>
    </div>
  )
}

export default PageHeader
