import type { ReactNode } from 'react'
import { PageHeader } from './PageHeader'

interface BreadcrumbItem {
  label: string
  path?: string
  onClick?: () => void
}

interface AdminPageHeaderProps {
  /** Page title (ReactNode to support JSX) */
  title: ReactNode
  /** Page description/subtitle */
  subtitle?: string
  /** Breadcrumbs array. If not provided, defaults to just the page title */
  breadcrumbs?: BreadcrumbItem[]
  /** Optional action buttons to show on the right */
  actions?: ReactNode
  /** Additional content below title/subtitle */
  children?: ReactNode
}

/**
 * AdminPageHeader - Standardized header for all admin pages
 * 
 * Provides consistent breadcrumbs, title, and subtitle across all admin pages.
 * If breadcrumbs are not provided, defaults to showing just the page title.
 */
export function AdminPageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  children,
}: AdminPageHeaderProps) {
  // If no breadcrumbs provided, use title as the only breadcrumb
  const finalBreadcrumbs = breadcrumbs || [{ label: typeof title === 'string' ? title : 'Admin' }]

  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      breadcrumbs={finalBreadcrumbs}
      actions={actions}
      children={children}
    />
  )
}

export default AdminPageHeader
