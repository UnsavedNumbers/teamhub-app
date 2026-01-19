import type { HTMLAttributes, ReactNode } from 'react'

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
  const mergedStyle = noPadding ? { padding: 0, ...style } : style

  return (
    <div
      className={`pa-card ${className}`.trim()}
      style={mergedStyle}
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
    <div className={`pa-card-header ${className}`.trim()} {...rest}>
      {children}
    </div>
  )
}

/**
 * CardTitle - Title for Card header
 */
export function CardTitle({ children, className = '', ...rest }: CardSubComponentProps) {
  return (
    <h3 className={`pa-card-title ${className}`.trim()} {...rest}>
      {children}
    </h3>
  )
}

/**
 * CardContent - Content section for Card
 */
export function CardContent({ children, className = '', ...rest }: CardSubComponentProps) {
  return (
    <div className={`pa-card-content ${className}`.trim()} {...rest}>
      {children}
    </div>
  )
}

export default Card
