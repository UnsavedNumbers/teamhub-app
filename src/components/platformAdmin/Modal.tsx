/**
 * Modal Component
 * 
 * Simple modal wrapper for platform admin components.
 */

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export default function Modal({ open, onClose, title, children, size = 'medium', className = '' }: ModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

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

  // Handle Escape key to close modal
  useEffect(() => {
    if (!open) return
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, onClose])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Ensure overflow is reset on unmount
      document.body.style.overflow = ''
    }
  }, [])

  if (!open) return null

  const sizeMap = {
    small: '400px',
    medium: '600px',
    large: '800px',
  }

  const modalContent = (
    <div 
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(11, 15, 20, 0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--pa-space-4)',
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
          margin: 0,
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'white',
          position: 'relative',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: 'var(--pa-space-5)',
          borderBottom: '1px solid var(--pa-n100)',
        }}>
          <h3 className="pa-h3" style={{ margin: 0 }}>{title}</h3>
          <button 
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--pa-n700)',
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

  // Use portal to render modal at document body level to avoid CSS conflicts
  return createPortal(modalContent, document.body)
}


