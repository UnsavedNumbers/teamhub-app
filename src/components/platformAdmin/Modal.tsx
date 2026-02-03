/**
 * Modal Component
 * 
 * Simple modal wrapper for platform admin components.
 */

import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export default function Modal({ open, onClose, title, children, size = 'medium' }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const sizeClasses = {
    small: 'pa-w-[400px]',
    medium: 'pa-w-[600px]',
    large: 'pa-w-[800px]',
  }

  return (
    <div 
      className="pa-fixed pa-inset-0 pa-bg-black/40 pa-z-50 pa-grid pa-place-items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div 
        className={`pa-card ${sizeClasses[size]} max-sm:pa-w-[95vw] pa-relative pa-max-h-[90vh] pa-overflow-y-auto ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pa-flex pa-justify-between pa-items-center pa-mb-4">
          <h3 className="pa-text-lg pa-font-semibold">{title}</h3>
          <button 
            className="pa-absolute pa-top-3 pa-right-3 pa-text-muted hover:pa-text-foreground"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
