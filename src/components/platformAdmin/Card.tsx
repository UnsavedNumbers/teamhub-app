import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Card title (H3 style) */
  title?: string
  /** Action buttons/links for card header */
  actions?: ReactNode
  /** Card content */
  children?: ReactNode
  /** Remove default padding */
  noPadding?: boolean
}

interface CardSubComponentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

/**
 * Card - Nike + Google design system
 * 
 * Clean white card with:
 * - N100 border
 * - 14px radius
 * - Subtle hover elevation
 */
export function Card({
  title,
  actions,
  children,
  className = '',
  noPadding = false,
  style,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn('pa-card', noPadding && 'pa-card--no-padding', className)}
      style={style}
      {...rest}
    >
      {(title || actions) && (
        <div className="pa-card-header">
          {title && <h3 className="pa-card-title">{title}</h3>}
          {actions && <div className="pa-card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

/**
 * CardHeader - Header section for Card
 */
export function CardHeader({ children, className = '', ...rest }: CardSubComponentProps) {
  return (
    <div className={cn('pa-card-header', className)} {...rest}>
      {children}
    </div>
  )
}

/**
 * CardTitle - Title for Card header
 */
export function CardTitle({ children, className = '', ...rest }: CardSubComponentProps) {
  return (
    <h3 className={cn('pa-card-title', className)} {...rest}>
      {children}
    </h3>
  )
}

/**
 * CardContent - Content section for Card
 */
export function CardContent({ children, className = '', ...rest }: CardSubComponentProps) {
  return (
    <div className={cn('pa-card-content', className)} {...rest}>
      {children}
    </div>
  )
}

export default Card
