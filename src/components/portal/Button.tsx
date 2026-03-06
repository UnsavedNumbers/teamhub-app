import { ReactNode, ElementType, ComponentPropsWithoutRef } from 'react'

type ButtonProps<E extends ElementType = 'button'> = {
  variant?: 'primary' | 'secondary'
  children: ReactNode
  as?: E
} & ComponentPropsWithoutRef<E>

export default function Button<E extends ElementType = 'button'>({ variant = 'primary', children, className = '', as, ...props }: ButtonProps<E>) {
  const baseClasses = 'min-h-11 min-w-11 px-4 py-2.5 rounded-xl font-semibold text-sm transition-transform transition-colors duration-100 ease-out active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none'
  
  const variantClasses = {
    primary: 'org-btn-primary active:brightness-[0.85]',
    secondary: 'border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 active:bg-gray-100 dark:active:bg-gray-800 text-gray-900 dark:text-gray-100',
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
