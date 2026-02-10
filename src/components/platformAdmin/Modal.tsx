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

export default function Modal({ open, onClose, title, children, size = 'medium', className = '' }: ModalProps) {
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

  const sizeMap = {
    small: '400px',
    medium: '600px',
    large: '800px',
  }

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(11, 15, 20, 0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div 
        className={`pa-card ${className}`}
        style={{
          width: '100%',
          maxWidth: sizeMap[size],
          margin: 'var(--pa-space-4)',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'white',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--pa-space-4)' }}>
          <h3 className="pa-h3" style={{ margin: 0 }}>{title}</h3>
          <button 
            style={{
              position: 'absolute',
              top: 'var(--pa-space-3)',
              right: 'var(--pa-space-3)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
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


