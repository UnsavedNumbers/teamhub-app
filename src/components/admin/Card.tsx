import { ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface CardProps {
  children: ReactNode
  title?: string
  className?: string
  style?: React.CSSProperties
}

/**
 * Card - Org Admin styled component
 * Uses oa-* classes for consistency with org admin theme
 */
export function Card({ children, title, className = '', style }: CardProps) {
  return (
    <div className={cn('oa-card', className)} style={style}>
      {title && (
        <div className="oa-card-header">
          <h2 className="oa-card-title">{title}</h2>
        </div>
      )}
      {children}
    </div>
  )
}

export default Card
