import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface PageHeaderProps {
  /** Page title (ReactNode to support JSX) */
  title: ReactNode
  /** Optional subtitle */
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
 * Org Admin PageHeader - Uses organization theme colors
 *
 * Standard page header pattern for org admin pages:
 * - Title and subtitle styled with org theme colors
 * - Breadcrumbs with org theme styling
 * - Right-aligned actions
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
    <div className="oa-page-header">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="oa-breadcrumbs">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1

            return (
              <span key={`${crumb.label}-${index}`} className="oa-breadcrumb-item">
                {index > 0 && (
                  <span className="material-symbols-outlined oa-breadcrumb-chevron">chevron_right</span>
                )}
                {crumb.path ? (
                  <Link
                    to={crumb.path}
                    onClick={crumb.onClick}
                    className={isLast ? 'oa-breadcrumb-current' : 'oa-breadcrumb-link'}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    onClick={crumb.onClick}
                    className={isLast ? 'oa-breadcrumb-current' : 'oa-breadcrumb-link'}
                  >
                    {crumb.label}
                  </span>
                )}
              </span>
            )
          })}
        </nav>
      )}
      <div className="oa-page-header-row">
        <div className="oa-page-header-content">
          <h1 className="oa-page-title">{title}</h1>
          {subtitle && <p className="oa-page-subtitle">{subtitle}</p>}
          {description && <p className="oa-page-description">{description}</p>}
          {children}
        </div>
        {actions && <div className="oa-page-actions">{actions}</div>}
      </div>
    </div>
  )
}

export default PageHeader