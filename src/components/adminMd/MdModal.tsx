import type { ReactNode } from 'react'

type MdModalProps = {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function MdModal({ isOpen, onClose, title, children, size = 'md', className = '' }: MdModalProps) {
  if (!isOpen) return null

  const sizeClasses = {
    sm: 'modal-sm',
    md: '',
    lg: 'modal-lg',
    xl: 'modal-xl',
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="modal-backdrop fade show" 
        onClick={onClose}
        style={{ zIndex: 1040 }}
      />
      
      {/* Modal */}
      <div 
        className={`modal fade show ${className}`}
        style={{ display: 'block', zIndex: 1050 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div className={`modal-dialog ${sizeClasses[size]}`}>
          <div className="modal-content">
            {title && (
              <div className="modal-header">
                <h5 className="modal-title">{title}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={onClose}
                  aria-label="Close"
                />
              </div>
            )}
            <div className="modal-body">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
