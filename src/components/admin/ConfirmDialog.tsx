import { ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'primary' | 'danger'
  onConfirm: () => void
  onCancel: () => void
  children?: ReactNode
}

/**
 * ConfirmDialog - Org Admin styled component
 * Uses oa-* classes for org admin theme
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  if (!open) return null

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="oa-confirm-dialog-title"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(11, 15, 20, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--pa-space-4)',
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="oa-card"
        style={{
          width: '100%',
          maxWidth: 520,
        }}
      >
        <h2 id="oa-confirm-dialog-title" className="oa-h3 oa-mb-3">{title}</h2>
        <p className="oa-body-m oa-text-muted oa-mb-4">{description}</p>
        {children}
        <div className="oa-flex oa-gap-2 oa-justify-end oa-mt-6">
          <button
            type="button"
            className="oa-btn oa-btn--secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`oa-btn ${variant === 'danger' ? 'oa-btn--danger' : 'oa-btn--primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ConfirmDialog
