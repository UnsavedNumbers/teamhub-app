/**
 * Platform Admin Components
 * 
 * Nike + Google design system components for platform admin.
 */

// Layout
export { default as PageHeader } from './PageHeader'
export { AdminPageHeader } from '../admin/AdminPageHeader'
export { default as Card, CardHeader, CardTitle, CardContent } from './Card'
export { default as EmptyState } from './EmptyState'
export { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs'

// Data Display
export { default as StatCard } from './StatCard'
export { default as Badge } from './Badge'
export { default as Table, type TableColumn } from './Table'
export { default as PlatformDataTable, type ColumnConfig } from './PlatformDataTable'
export { default as StandardTable, type StandardTableProps } from './StandardTable'

// Controls
export { default as Button } from './Button'
export { default as Input } from './Input'
export { default as Select } from './Select'
export { default as Checkbox } from './Checkbox'
export { default as FilterBar } from './FilterBar'
export { default as ThemePicker } from './ThemePicker'

// Feedback
export { default as ConfirmDialog } from './ConfirmDialog'
export { default as JsonViewer } from './JsonViewer'
export { EventLogDetailModal } from './EventLogDetailModal'
export { ErrorState } from './ErrorState'
export { default as DiscoveryStatusBadge } from './DiscoveryStatusBadge'
export { default as FeatureDependencyGraph } from './FeatureDependencyGraph'
export { DiscoveryErrorBoundary } from './DiscoveryErrorBoundary'
export { ProgressBar, MultiStepProgressBar } from './ProgressBar'

