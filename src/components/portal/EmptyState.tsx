import Icon from './Icon'
import Button from './Button'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: string
  }
  className?: string
  children?: ReactNode
}

/**
 * EmptyState component matching the travel page empty state design
 * 
 * Usage:
 * <EmptyState 
 *   icon="flight_takeoff" 
 *   title="No travel plans found"
 *   description="Try adjusting your filters or check back later."
 * />
 * 
 * With action:
 * <EmptyState 
 *   icon="bookmark_border" 
 *   title="No bookmarks"
 *   description="Bookmark events to see them here."
 *   action={{ label: "View Calendar", onClick: () => navigate('/calendar') }}
 * />
 */
export function EmptyState({ icon, title, description, action, className = '', children }: EmptyStateProps) {
  return (
    <div className={`text-center py-20 opacity-60 ${className}`}>
      <Icon name={icon} size="text-6xl" className="mb-4 mx-auto text-slate-300" />
      <h3 className="text-xl font-bold text-slate-500">{title}</h3>
      {description && <p className="text-slate-400">{description}</p>}
      {action && (
        <div className="mt-6">
          <Button variant="primary" onClick={action.onClick}>
            {action.icon && <Icon name={action.icon} className="mr-2" />}
            {action.label}
          </Button>
        </div>
      )}
      {children}
    </div>
  )
}

export default EmptyState
