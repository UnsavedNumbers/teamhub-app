import React from 'react'
import { createPortal } from 'react-dom'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string | null
  variant?: 'info' | 'warning' | 'danger'
  requireReason?: boolean
  loading?: boolean
  error?: string | null
  onConfirm: (reason: string) => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
  requireReason = false,
  loading = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [reason, setReason] = React.useState('')

  React.useEffect(() => {
    if (!open) {
      setReason('')
    }
  }, [open])

  // Handle Escape key to close dialog
  React.useEffect(() => {
    if (!open) return
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onCancel()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, loading, onCancel])

  // Cleanup on unmount - ensure body overflow is reset
  React.useEffect(() => {
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  if (!open) return null

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) return
    onConfirm(reason)
  }



  const dialogContent = (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(11, 15, 20, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Dialog */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="pa-card"
          style={{
            width: '100%',
            maxWidth: '500px',
            margin: 'var(--pa-space-4)',
            padding: 0,
            backgroundColor: 'white',
          }}
        >
          {/* Header */}
          <div style={{ padding: 'var(--pa-space-5)', borderBottom: '1px solid var(--pa-n100)' }} className="dark:border-slate-700">
            <h2 className="pa-h2" style={{ margin: 0 }}>
              {title}
            </h2>
          </div>

          {/* Content */}
          <div style={{ padding: 'var(--pa-space-5)' }}>
            <p className="pa-body-m" style={{ margin: '0 0 var(--pa-space-4) 0' }}>
              {description}
            </p>

            {requireReason && (
              <div className="pa-form-group">
                <label className="pa-label">Reason (required)</label>
                <textarea
                  className="pa-input pa-textarea"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter a reason for this action..."
                  disabled={loading}
                  style={{ minHeight: '80px' }}
                />
              </div>
            )}

            {error && (
              <div
                className="pa-card"
                style={{
                  padding: 'var(--pa-space-3)',
                  background: 'var(--pa-danger-bg)',
                  border: '1px solid var(--pa-n800)',
                  marginTop: 'var(--pa-space-3)',
                }}
              >
                <span className="pa-body-s" style={{ color: 'var(--pa-n900)' }}>
                  {error}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div
            style={{
              padding: 'var(--pa-space-4) var(--pa-space-5)',
              borderTop: '1px solid var(--pa-n100)',
              display: 'flex',
              gap: 'var(--pa-space-3)',
              justifyContent: 'flex-end',
            }}
          >
            {cancelLabel !== null && (
              <button
                className="pa-btn pa-btn--secondary"
                onClick={onCancel}
                disabled={loading}
              >
                {cancelLabel}
              </button>
            )}
            <button
              className={`pa-btn ${variant === 'danger' ? 'pa-btn--danger' : 'pa-btn--primary'}`}
              onClick={handleConfirm}
              disabled={loading || (requireReason && !reason.trim())}
            >
              {loading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )

  // Use portal to render dialog at document body level to avoid CSS conflicts
  return createPortal(dialogContent, document.body)
}

export default ConfirmDialog

// Need React import for useState

