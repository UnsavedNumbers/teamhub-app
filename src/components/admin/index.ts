/**
 * Org Admin Components
 * All components use oa-* CSS classes and are styled for org admin views
 */

// Core Components
export { AdminPageHeader } from './AdminPageHeader'
export { OrgAdminButton } from './OrgAdminButton'
export { default as OrgDataTable } from './OrgDataTable'
export type { ColumnConfig, OrgDataTableProps } from './OrgDataTable'

// Layout & Navigation
export { Breadcrumbs } from './Breadcrumbs'
export type { BreadcrumbItem, BreadcrumbsProps } from './Breadcrumbs'
export { default as OfflineBanner } from './OfflineBanner'

// Org-specific imports (re-exported with proper naming)
export { AdminPageHeader as PageHeader } from './AdminPageHeader'
export { OrgAdminButton as Button } from './OrgAdminButton'

// Re-export these from orgAdmin-styled versions
export { Card } from './Card'
export { Select } from './Select'
export { Input } from './Input'
export { Checkbox } from './Checkbox'
export { DatePicker } from './DatePicker'
export { Badge } from './Badge'
export { EmptyState } from './EmptyState'
export { ConfirmDialog } from './ConfirmDialog'
export { InlineNotice } from './InlineNotice'
export { ErrorState } from './ErrorState'
export { Table } from './Table'
export type { TableColumn } from './Table'

// Other admin components
export { default as AdminLoadingSpinner } from './AdminLoadingSpinner'
export { default as AdminSkeletonTable } from './AdminSkeletonTable'
export { NoOrganizationEmptyState } from './NoOrganizationEmptyState'
export { LicenseWarningBanner } from './LicenseWarningBanner'
export { LicenseStatusBadge } from './LicenseStatusBadge'
