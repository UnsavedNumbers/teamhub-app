import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'blue' | 'volt' | 'secondary' | 'ghost' | 'danger' | 'text'
type ButtonSize = 'default' | 'compact' | 'dense' | 'small'

type ButtonProps<E extends ElementType = 'button'> = {
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
  /** Render as a different element */
  as?: E
  /** Disabled state */
  disabled?: boolean
} & Omit<ComponentPropsWithoutRef<E>, 'children' | 'className'>

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
export function Button<E extends ElementType = 'button'>({
  variant = 'primary',
  size = 'default',
  icon,
  iconRight,
  loading = false,
  disabled,
  children,
  className = '',
  as,
  ...rest
}: ButtonProps<E>) {
  const sizeClass = size === 'compact' ? 'pa-btn--compact' : size === 'dense' ? 'pa-btn--dense' : ''
  const variantClass = `pa-btn--${variant}`
  const Tag = as ?? 'button'

  const classNames = `pa-btn ${variantClass} ${sizeClass} ${className}`.trim()
  const componentProps = {
    ...rest,
    className: classNames,
  } as ComponentPropsWithoutRef<E>

  if (Tag === 'button') {
    const buttonProps = componentProps as ComponentPropsWithoutRef<'button'>
    buttonProps.disabled = disabled || loading
    if (!buttonProps.type) {
      buttonProps.type = 'button'
    }
  }

  return (
    <Tag {...componentProps}>
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
    </Tag>
  )
}

export default Button
