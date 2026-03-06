import { ReactNode } from 'react'

interface TypographyProps {
  children: ReactNode
  className?: string
}

export function PageTitle({ children, className = '' }: TypographyProps) {
  return (
    <h1 className={`text-[34px] font-bold tracking-[-0.01em] text-gray-900 dark:text-white mb-2 leading-[1.1] ${className}`}>
      {children}
    </h1>
  )
}

export function SectionHeader({ children, className = '' }: TypographyProps) {
  return (
    <h2 className={`text-[13px] font-medium tracking-normal text-gray-700 dark:text-gray-300 leading-[1.2] ${className}`}>
      {children}
    </h2>
  )
}

export function CardTitle({ children, className = '' }: TypographyProps) {
  return (
    <h3 className={`text-[17px] font-semibold text-gray-900 dark:text-white leading-[1.2] ${className}`}>
      {children}
    </h3>
  )
}

