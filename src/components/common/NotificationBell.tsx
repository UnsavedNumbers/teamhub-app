import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../utils/cn'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { notificationService } from '../../data/services/notificationService'
import { getLink, RouteKeys } from '../../utils/routes'
import type { NotificationRecord, NotificationPresentation } from '../../types/notifications'
import { showError } from '../../utils/toast'

interface NotificationBellProps {
  viewAllPath?: string
}

export default function NotificationBell({ viewAllPath }: NotificationBellProps) {
  // All hooks must be called unconditionally at the top
  const userContextResult = useUserContext()
  const context = userContextResult.context
  /** Show bell when user is authenticated (userId present). Platform admin may have no org. */
  const hasUserForNotifications = Boolean(context?.userId)
  const t = useT()
  const navigate = useNavigate()
  const defaultPath = viewAllPath || getLink(RouteKeys.PORTAL_NOTIFICATIONS)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read_at).length, [notifications])

  const fetchNotifications = async () => {
    if (!hasUserForNotifications) return
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await notificationService.getNotifications(context, { limit: 10 })
    if (fetchError) {
      const message = fetchError.message || t('common.error.label')
      setError(message)
      showError(message)
      setLoading(false)
      return
    }
    setNotifications(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUserForNotifications])

  useEffect(() => {
    if (!hasUserForNotifications) return

    let channel: any = null
    import('../../lib/supabase').then(({ supabase }) => {
      channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${context.userId}`
          },
          (payload: any) => {
            setNotifications((prev) => [payload.new, ...prev])
          }
        )
        .subscribe()
    })

    return () => {
      if (channel) {
        import('../../lib/supabase').then(({ supabase }) => {
          supabase.channel('notifications').unsubscribe()
        })
      }
    }
  }, [context.userId, hasUserForNotifications])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!open) return
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleToggle = () => {
    if (!open && !loading && notifications.length === 0) {
      fetchNotifications()
    }
    setOpen((prev) => !prev)
  }

  const handleOpenNotification = async (notification: NotificationRecord) => {
    if (notification.link_url) {
      navigate(notification.link_url)
    }
    if (!notification.read_at && hasUserForNotifications) {
      const { error } = await notificationService.markAsRead(context, notification.id)
      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n))
        )
      }
    }
    setOpen(false)
  }

  // Early return after all hooks are called — show bell when user is logged in (platform admin may have no org)
  if (!hasUserForNotifications) {
    return null
  }

  const presentationTone = (presentation: NotificationPresentation) => {
    switch (presentation) {
      case 'urgent':
        return 'notif-chip--urgent'
      case 'warning':
        return 'notif-chip--warn'
      default:
        return 'notif-chip--info'
    }
  }

  return (
    <div className="gn-notif" ref={containerRef}>
      <button
        className={cn('gn-util-btn', unreadCount > 0 && 'gn-util-btn--active')}
        aria-label={t('portal.settings.notifications.title')}
        title={t('portal.settings.notifications.title')}
        onClick={handleToggle}
        type="button"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && <span className="gn-notif-badge">{unreadCount}</span>}
      </button>

      <div className={cn('gn-notif-panel', open && 'open')} role="menu" aria-label={t('portal.settings.notifications.title')}>
        <div className="gn-notif-header">
          <span className="gn-notif-title">{t('portal.settings.notifications.title')}</span>
          <button
            className="gn-notif-link"
            type="button"
            onClick={() => navigate(defaultPath)}
          >
            {t('portal.settings.notifications.viewAll')}
          </button>
        </div>

        {loading && <div className="gn-notif-empty">{t('portal.settings.notifications.loading')}</div>}
        {error && !loading && <div className="gn-notif-empty">{error}</div>}
        {!loading && !error && notifications.length === 0 && (
          <div className="gn-notif-empty">{t('portal.settings.notifications.empty')}</div>
        )}

        {!loading && !error && notifications.length > 0 && (
          <ul className="gn-notif-list">
            {notifications.map((notif) => (
              <li key={notif.id} className={cn('gn-notif-item', !notif.read_at && 'gn-notif-item--unread')}>
                <button className="gn-notif-row" type="button" onClick={() => handleOpenNotification(notif)}>
                  <div className={cn('notif-chip', presentationTone(notif.presentation_type))}>{notif.presentation_type}</div>
                  <div className="gn-notif-content">
                    <div className="gn-notif-title-row">
                      <span className="gn-notif-text gn-notif-text--title">{notif.title}</span>
                      {notif.entity_type && (
                        <span className="gn-notif-entity">{notif.entity_type}</span>
                      )}
                    </div>
                    <span className="gn-notif-text gn-notif-text--body">{notif.body}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
