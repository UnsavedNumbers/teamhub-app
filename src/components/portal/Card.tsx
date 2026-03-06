import { ReactNode, MouseEvent, HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
  noPadding?: boolean
  highlight?: boolean
  onClick?: (e: MouseEvent<HTMLDivElement>) => void
}

export default function Card({ children, className = '', noPadding = false, highlight = false, onClick, ...rest }: CardProps) {
  return (
    <div 
      className={cn(
        "bg-white dark:bg-neutral-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl transition-transform duration-200 ease-out active:scale-[0.98]",
        !noPadding && "px-4 py-3",
        highlight && "org-card-accent",
        className
      )} 
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  )
}
