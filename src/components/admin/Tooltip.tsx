import { useState, ReactNode } from 'react'
import './Tooltip.css'

interface TooltipProps {
  content: string
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  delay?: number
}

export function Tooltip({ content, children, side = 'right', delay = 0 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  const handleMouseEnter = () => {
    if (delay > 0) {
      setTimeout(() => setIsVisible(true), delay)
    } else {
      setIsVisible(true)
    }
  }

  const handleMouseLeave = () => {
    setIsVisible(false)
  }

  return (
    <div className="tooltip-wrapper" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {isVisible && <div className={`tooltip tooltip--${side}`}>{content}</div>}
    </div>
  )
}
