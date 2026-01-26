/**
 * Empty State Component
 * 
 * Displays empty state messages with optional actions
 */

import { Button } from './Button'
import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

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
      className={cn('pa-card', 'pa-flex', 'pa-flex-col', 'pa-items-center', 'pa-justify-center')}
      style={{
        padding: 'var(--pa-space-8) var(--pa-space-5)',
        textAlign: 'center',
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
      <h3 className={cn('pa-h3', 'pa-mb-2')}>
        {title}
      </h3>
      {description && (
        <p className={cn('pa-body-m', 'pa-text-muted', action ? 'pa-mb-4' : 'pa-mb-0')}>
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
