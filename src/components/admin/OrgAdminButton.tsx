import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import { cn } from '../../utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'default' | 'compact' | 'dense'

type OrgAdminButtonProps<E extends ElementType = 'button'> = {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: string
  iconRight?: string
  loading?: boolean
  children?: ReactNode
  as?: E
  disabled?: boolean
  className?: string
} & Omit<ComponentPropsWithoutRef<E>, 'children' | 'className'>

/**
 * Org Admin Button - uses oa-* classes only (no pa-*).
 * For use in organization admin views. Resolves colors from org theme.
 */
export function OrgAdminButton<E extends ElementType = 'button'>({
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
}: OrgAdminButtonProps<E>) {
  const sizeClass =
    size === 'compact' ? 'oa-btn--compact' : size === 'dense' ? 'oa-btn--dense' : ''
  const variantClass = `oa-btn--${variant}`
  const Tag = as ?? 'button'

  const classNames = cn('oa-btn', variantClass, sizeClass, className)
  const componentProps = {
    ...rest,
    className: classNames,
  } as ComponentPropsWithoutRef<E>

  if (Tag === 'button') {
    const buttonProps = componentProps as ComponentPropsWithoutRef<'button'>
    buttonProps.disabled = disabled ?? loading
    if (!buttonProps.type) {
      buttonProps.type = 'button'
    }
  }

  return (
    <Tag {...componentProps}>
      {loading ? (
        <span className="oa-btn-spinner" aria-hidden />
      ) : icon ? (
        <span className="material-symbols-outlined">{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && (
        <span className="material-symbols-outlined">{iconRight}</span>
      )}
    </Tag>
  )
}

export default OrgAdminButton
