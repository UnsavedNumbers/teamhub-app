/**
 * Empty State Component
 * 
 * Displays empty state messages with optional actions
 */

import { Button } from './Button'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  children?: ReactNode
}

function EmptyState({ icon = 'inbox', title, description, action, children }: EmptyStateProps) {
  return (
    <div
      className="pa-card"
      style={{
        textAlign: 'center',
        padding: 'var(--pa-space-8) var(--pa-space-5)',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: '64px',
          color: 'var(--pa-n400)',
          marginBottom: 'var(--pa-space-4)',
        }}
      >
        {icon}
      </span>
      <h3 className="pa-h3" style={{ marginBottom: 'var(--pa-space-2)' }}>
        {title}
      </h3>
      {description && (
        <p className="pa-body-m pa-text-muted" style={{ marginBottom: action ? 'var(--pa-space-4)' : 0 }}>
          {description}
        </p>
      )}
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      {children}
    </div>
  )
}

export default EmptyState
