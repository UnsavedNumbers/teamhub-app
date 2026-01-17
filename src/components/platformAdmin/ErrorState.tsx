/**
 * Error State Component
 * 
 * Displays error messages with retry functionality
 */

import { Button } from './Button'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  retryLabel?: string
  variant?: 'error' | 'warning' | 'info'
}

export function ErrorState({
  title = 'Error',
  message,
  onRetry,
  retryLabel = 'Retry',
  variant = 'error',
}: ErrorStateProps) {
  const color = variant === 'error' ? 'var(--pa-danger)' : variant === 'warning' ? 'var(--pa-warning)' : 'var(--pa-info)'
  const bgColor = variant === 'error' ? 'var(--pa-danger-bg)' : variant === 'warning' ? 'var(--pa-warning-bg)' : 'var(--pa-info-bg)'

  return (
    <div className="pa-card" style={{ borderLeft: `3px solid ${color}`, background: bgColor }}>
      <div className="pa-flex pa-items-start pa-gap-3">
        <span
          className="material-symbols-outlined"
          style={{ color, fontSize: '24px', marginTop: '2px' }}
        >
          {variant === 'error' ? 'error' : variant === 'warning' ? 'warning' : 'info'}
        </span>
        <div style={{ flex: 1 }}>
          <div className="pa-body-m" style={{ fontWeight: 600, marginBottom: '4px' }}>
            {title}
          </div>
          <div className="pa-body-s" style={{ color: 'var(--pa-n700)', marginBottom: onRetry ? 'var(--pa-space-3)' : 0 }}>
            {message}
          </div>
          {onRetry && (
            <Button variant="secondary" size="dense" onClick={onRetry} style={{ marginTop: 'var(--pa-space-2)' }}>
              {retryLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
