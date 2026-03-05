import { ReactNode, ElementType, ComponentPropsWithoutRef } from 'react'

type ButtonProps<E extends ElementType = 'button'> = {
  variant?: 'primary' | 'secondary'
  children: ReactNode
  as?: E
} & ComponentPropsWithoutRef<E>

export default function Button<E extends ElementType = 'button'>({ variant = 'primary', children, className = '', as, ...props }: ButtonProps<E>) {
  const baseClasses = 'px-8 py-3 rounded font-bold text-sm tracking-wide transition-all'
  
  const variantClasses = {
    primary: 'org-btn-primary',
    secondary: 'border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-900 dark:text-gray-100',
  }

  const Tag = as ?? 'button'

  return (
    <Tag
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}
