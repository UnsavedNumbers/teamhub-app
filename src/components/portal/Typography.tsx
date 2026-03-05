import { ReactNode } from 'react'

interface TypographyProps {
  children: ReactNode
  className?: string
}

export function PageTitle({ children, className = '' }: TypographyProps) {
  return (
    <h1 className={`text-5xl font-black tracking-tighter text-gray-900 dark:text-white mb-2 leading-none font-impact ${className}`}>
      {children}
    </h1>
  )
}

export function SectionHeader({ children, className = '' }: TypographyProps) {
  return (
    <h2 className={`text-xs font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white ${className}`}>
      {children}
    </h2>
  )
}

export function CardTitle({ children, className = '' }: TypographyProps) {
  return (
    <h3 className={`text-2xl font-black text-gray-900 dark:text-white leading-tight uppercase font-impact ${className}`}>
      {children}
    </h3>
  )
}

