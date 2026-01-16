import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'blue' | 'volt' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'default' | 'compact' | 'dense'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant */
  variant?: ButtonVariant
  /** Size variant */
  size?: ButtonSize
  /** Icon (Material Symbols name) to show before label */
  icon?: string
  /** Icon to show after label */
  iconRight?: string
  /** Loading state - shows spinner */
  loading?: boolean
  /** Children (button label) */
  children: ReactNode
}

/**
 * Button - Nike + Google design system
 * 
 * Variants:
 * - primary: Black pill (Nike punch)
 * - blue: Google action blue
 * - volt: Accent color for special actions
 * - secondary: Outline
 * - ghost: No border
 * - danger: Red for destructive actions
 */
export function Button({
  variant = 'primary',
  size = 'default',
  icon,
  iconRight,
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const sizeClass = size === 'compact' ? 'pa-btn--compact' : size === 'dense' ? 'pa-btn--dense' : ''
  const variantClass = `pa-btn--${variant}`

  return (
    <button
      className={`pa-btn ${variantClass} ${sizeClass} ${className}`.trim()}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          className="pa-spinner"
          style={{
            width: '16px',
            height: '16px',
            borderWidth: '2px',
          }}
        />
      ) : icon ? (
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
          {icon}
        </span>
      ) : null}
      {children}
      {iconRight && !loading && (
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
          {iconRight}
        </span>
      )}
    </button>
  )
}

export default Button
