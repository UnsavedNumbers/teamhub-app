import type { ReactNode } from 'react'
import { PageHeader } from '../platformAdmin'

interface OrganizationStructurePageHeaderProps {
  /** Page title (ReactNode to support JSX) */
  title: ReactNode
  /** Page description/subtitle */
  subtitle: string
  /** Page name for breadcrumb (required string, separate from title for type safety) */
  pageName: string
  /** Optional custom label for "Organizations" breadcrumb (defaults to "Organizations") */
  breadcrumbLabel?: string
  /** Optional action buttons to show on the right */
  actions?: ReactNode
  /** Additional content below title/subtitle */
  children?: ReactNode
}

/**
 * OrganizationStructurePageHeader - Standardized header for organization structure pages
 * 
 * Provides consistent breadcrumbs, title, and subtitle across all organization structure pages.
 * Always generates breadcrumbs as: [Organizations] → /admin/organization/structure → [pageName]
 */
export function OrganizationStructurePageHeader({
  title,
  subtitle,
  pageName,
  breadcrumbLabel = 'Organizations',
  actions,
  children,
}: OrganizationStructurePageHeaderProps) {
  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      breadcrumbs={[
        { label: breadcrumbLabel, path: '/admin/organization/structure' },
        { label: pageName },
      ]}
      actions={actions}
      children={children}
    />
  )
}

export default OrganizationStructurePageHeader
