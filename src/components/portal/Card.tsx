import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div className={`bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}
