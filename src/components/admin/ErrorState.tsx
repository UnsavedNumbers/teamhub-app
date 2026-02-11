import { ReactNode } from 'react'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  children?: ReactNode
}

/**
 * ErrorState - Org Admin styled component
 * Uses oa-* classes for org admin theme
 */
export function ErrorState({ title = 'Error', message, onRetry, children }: ErrorStateProps) {
  return (
    <div className="oa-card">
      <div className="oa-empty">
        <span className="material-symbols-outlined oa-text-danger" style={{ fontSize: '48px' }}>
          error
        </span>
        <h3 className="oa-h3 oa-mb-2">{title}</h3>
        <p className="oa-body-m oa-text-muted oa-mb-4">{message}</p>
        {onRetry && (
          <button className="oa-btn oa-btn--primary" onClick={onRetry}>
            Retry
          </button>
        )}
        {children}
      </div>
    </div>
  )
}

export default ErrorState
