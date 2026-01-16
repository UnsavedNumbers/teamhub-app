import type { ReactNode } from 'react'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface BadgeProps {
  /** Visual variant based on semantic meaning */
  variant?: BadgeVariant
  /** Badge content */
  children: ReactNode
  /** Optional icon (Material Symbols name) */
  icon?: string
  /** Additional CSS classes */
  className?: string
  /** Tooltip title */
  title?: string
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
  children,
  icon,
  className = '',
  title,
}: BadgeProps) {
  return (
    <span className={`pa-badge pa-badge--${variant} ${className}`.trim()} title={title}>
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
