import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

type NoticeTone = 'success' | 'info' | 'warning' | 'error'

export interface InlineNoticeProps {
  tone: NoticeTone
  title: string
  message?: ReactNode
  actions?: ReactNode
  onClose?: () => void
  className?: string
  role?: 'alert' | 'status'
  children?: ReactNode
  icon?: string
}

const toneIcon: Record<NoticeTone, string> = {
  success: 'check_circle',
  info: 'info',
  warning: 'warning',
  error: 'error',
}

export default function InlineNotice({
  tone,
  title,
  message,
  actions,
  onClose,
  className,
  role,
  children,
  icon,
}: InlineNoticeProps) {
  const resolvedRole = role ?? (tone === 'error' || tone === 'warning' ? 'alert' : 'status')
  const live = resolvedRole === 'alert' ? 'assertive' : 'polite'

  return (
    <div
      className={cn('pa-notice', `pa-notice--${tone}`, className)}
      role={resolvedRole}
      aria-live={live}
    >
      <div className="pa-notice__icon" aria-hidden="true">
        <span className="material-symbols-outlined">{icon ?? toneIcon[tone]}</span>
      </div>

      <div className="pa-notice__body">
        <div className="pa-notice__title">{title}</div>
        {(message || children) && (
          <div className="pa-notice__message">
            {message || children}
          </div>
        )}
      </div>

      {(actions || onClose) && (
        <div className="pa-notice__actions">
          {actions}
          {onClose && (
            <button
              type="button"
              className="pa-notice__close"
              onClick={onClose}
              aria-label="Dismiss notification"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
