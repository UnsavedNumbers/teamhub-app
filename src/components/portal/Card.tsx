import { ReactNode, MouseEvent, HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
  noPadding?: boolean
  onClick?: (e: MouseEvent<HTMLDivElement>) => void
}

export default function Card({ children, className = '', noPadding = false, onClick, ...rest }: CardProps) {
  return (
    <div 
      className={cn(
        "bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl", 
        !noPadding && "p-6",
        className
      )} 
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  )
}
