import { ReactNode } from 'react'

type InlineNoticeTone = 'success' | 'error' | 'warning' | 'info'

interface InlineNoticeProps {
  tone: InlineNoticeTone
  title?: string
  message?: string
  actions?: ReactNode
  onClose?: () => void
  className?: string
}

/**
 * InlineNotice - Org Admin styled component
 * Uses oa-* classes for org admin theme
 */
export function InlineNotice({ tone, title, message, actions, onClose, className = '' }: InlineNoticeProps) {
  const icons = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info',
  }

  return (
    <div className={`oa-notice oa-notice--${tone} ${className}`}>
      <div className="oa-flex oa-items-start oa-gap-3">
        <span className="material-symbols-outlined">{icons[tone]}</span>
        <div className="oa-flex-1">
          {title && <div className="oa-font-bold oa-mb-1">{title}</div>}
          {message && <div className="oa-body-s">{message}</div>}
          {actions && <div className="oa-mt-2">{actions}</div>}
        </div>
        {onClose && (
          <button onClick={onClose} className="oa-btn oa-btn--ghost" style={{ padding: '4px' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default InlineNotice
