import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  children?: ReactNode
  noCard?: boolean
  className?: string
}

/**
 * EmptyState - Org Admin styled component
 * Uses oa-* classes for org admin theme
 */
export function EmptyState({ icon, title, description, children, noCard = false, className = '' }: EmptyStateProps) {
  const content = (
    <div className={`oa-empty ${className}`}>
      {icon && (
        <span className="material-symbols-outlined oa-text-muted" style={{ fontSize: '48px' }}>
          {icon}
        </span>
      )}
      <h3 className="oa-h3 oa-mb-2">{title}</h3>
      {description && <p className="oa-body-m oa-text-muted oa-mb-4">{description}</p>}
      {children}
    </div>
  )

  if (noCard) {
    return content
  }

  return <div className="oa-card">{content}</div>
}

export default EmptyState
