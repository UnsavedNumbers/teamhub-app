import type { ReactNode } from 'react'

type MdBadgeProps = {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  className?: string
}

export function MdBadge({ variant = 'primary', size = 'md', children, className = '' }: MdBadgeProps) {
  const baseClasses = 'badge'
  const variantClasses = {
    primary: 'bg-gradient-primary',
    secondary: 'bg-gradient-secondary',
    success: 'bg-gradient-success',
    danger: 'bg-gradient-danger',
    warning: 'bg-gradient-warning',
    info: 'bg-gradient-info',
    light: 'bg-gradient-light',
    dark: 'bg-gradient-dark',
  }
  const sizeClasses = {
    sm: 'badge-sm',
    md: '',
    lg: 'badge-lg',
  }
  
  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className,
  ].filter(Boolean).join(' ')

  return <span className={classes}>{children}</span>
}
