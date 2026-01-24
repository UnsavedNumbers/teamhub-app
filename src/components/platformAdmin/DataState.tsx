/**
 * DataState Component
 * 
 * Unified component for handling loading, error, and empty states.
 * Provides consistent UX across all tabs and data displays.
 * 
 * Issue #8 Solution: Empty/Loading/Error State Handling - Inconsistent UX
 */

import { ErrorState } from './ErrorState'
import EmptyState from './EmptyState'
import type { ReactNode } from 'react'

interface DataStateProps<T> {
  /** Data array (null while loading) */
  data: T[] | null
  /** Loading state */
  loading: boolean
  /** Error message (null if no error) */
  error: string | null
  /** Retry function for error state */
  onRetry?: () => void
  /** Custom empty state message */
  emptyMessage?: string
  /** Custom empty state icon */
  emptyIcon?: string
  /** Custom empty state title */
  emptyTitle?: string
  /** Custom empty state description */
  emptyDescription?: string
  /** Custom empty state action */
  emptyAction?: {
    label: string
    onClick: () => void
  }
  /** Custom loading skeleton (optional) */
  loadingSkeleton?: ReactNode
  /** Render function for data (only called when data is available) */
  children: (data: T[]) => ReactNode
}

/**
 * Component that handles loading, error, and empty states consistently
 * 
 * @example
 * ```tsx
 * <DataState
 *   data={users}
 *   loading={loading}
 *   error={error}
 *   onRetry={fetchUsers}
 *   emptyMessage="No users found"
 * >
 *   {(data) => (
 *     <PlatformDataTable rows={data} columns={columns} />
 *   )}
 * </DataState>
 * ```
 */
export function DataState<T>({
  data,
  loading,
  error,
  onRetry,
  emptyMessage = 'No data available',
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  loadingSkeleton,
  children,
}: DataStateProps<T>) {
  // Loading state
  if (loading) {
    if (loadingSkeleton) {
      return <>{loadingSkeleton}</>
    }
    
    // Default loading skeleton
    return (
      <div>
        <div className="pa-skeleton" style={{ width: '100%', height: '200px', marginBottom: 'var(--pa-space-4)' }} />
        <div className="pa-skeleton" style={{ width: '100%', height: '400px' }} />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={onRetry}
        retryLabel="Retry"
      />
    )
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle || emptyMessage}
        description={emptyDescription}
        action={emptyAction}
      />
    )
  }

  // Data available - render children
  return <>{children(data)}</>
}
