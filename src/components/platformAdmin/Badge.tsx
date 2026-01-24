import type { HTMLAttributes, ReactNode } from 'react'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'error'

interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Visual variant based on semantic meaning */
  variant?: BadgeVariant
  /** Size variant */
  size?: 'small' | 'medium' | 'large'
  /** Badge content */
  children: ReactNode
  /** Optional icon (Material Symbols name) */
  icon?: string
}

/**
 * Badge - Nike + Google design system
 * 
 * Status badges with semantic color tints:
 * - success: Green tint
 * - warning: Amber tint
 * - danger: Red tint
 * - info: Blue tint
 * - neutral: Gray tint
 */
export function Badge({
  variant = 'neutral',
  size,
  children,
  icon,
  className = '',
  ...attrs
}: BadgeProps) {
  const sizeClass = size === 'small' ? 'pa-badge--small' : size === 'large' ? 'pa-badge--large' : ''
  return (
    <span className={`pa-badge pa-badge--${variant} ${sizeClass} ${className}`.trim()} {...attrs}>
      {icon && (
        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
          {icon}
        </span>
      )}
      {children}
    </span>
  )
}

export default Badge
