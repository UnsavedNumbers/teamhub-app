import { ReactNode } from 'react'

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

  return (
    <>
      <div className="oa-backdrop" onClick={onCancel} />
      <div className="oa-dialog">
        <h2 className="oa-h3 oa-mb-3">{title}</h2>
        <p className="oa-body-m oa-text-muted oa-mb-4">{description}</p>
        {children}
        <div className="oa-flex oa-gap-2 oa-justify-end oa-mt-6">
          <button
            className="oa-btn oa-btn--secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={`oa-btn ${variant === 'danger' ? 'oa-btn--danger' : 'oa-btn--primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  )
}

export default ConfirmDialog
