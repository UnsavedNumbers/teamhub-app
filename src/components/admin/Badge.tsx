import { ReactNode } from 'react'
import { cn } from '../../utils/cn'

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

/**
 * Badge - Org Admin styled component
 * Uses oa-badge class with org theme styling
 */
export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span className={cn('oa-badge', `oa-badge--${variant}`, className)}>
      {children}
    </span>
  )
}

export default Badge
