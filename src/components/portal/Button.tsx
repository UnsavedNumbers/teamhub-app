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
    secondary: 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white',
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
