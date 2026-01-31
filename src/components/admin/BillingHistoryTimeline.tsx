import { useState } from 'react'
import type { BillingEvent } from '../../api/billing'
import { groupEventsByDate } from '../../utils/billingHelpers'
import { getEventLabel } from '../../utils/billingEventLabels'
import { t } from '../../i18n'
import { OrgAdminButton } from './OrgAdminButton'

interface BillingHistoryTimelineProps {
  events: BillingEvent[]
  loading?: boolean
  error?: string | null
  hasSubscription?: boolean
  onSelectPlan?: () => void
}

/**
 * Formats time from timestamp (e.g., "2:30 PM").
 */
function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Formats date header (e.g., "Today", "Yesterday", "Jan 15, 2024").
 */
function formatDateHeader(dateKey: string): string {
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  
  if (dateKey === todayKey) {
    return 'Today'
  }

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
  
  if (dateKey === yesterdayKey) {
    return 'Yesterday'
  }

  // Format as "Jan 15, 2024"
  const date = new Date(dateKey + 'T00:00:00')
  if (Number.isNaN(date.getTime())) return dateKey
  
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function BillingHistoryTimeline({
  events,
  loading = false,
  error = null,
  hasSubscription = false,
  onSelectPlan,
}: BillingHistoryTimelineProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

  const toggleEvent = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }

  // Loading state
  if (loading) {
    return (
      <div className="pa-flex pa-flex-col pa-gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="pa-flex pa-gap-3">
            <div className="pa-skeleton" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
            <div className="pa-flex-1">
              <div className="pa-skeleton" style={{ width: '60%', height: '16px', marginBottom: '4px' }} />
              <div className="pa-skeleton" style={{ width: '40%', height: '14px' }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="pa-card pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none', padding: 'var(--pa-space-4)' }}>
        {error}
      </div>
    )
  }

  // Empty state
  if (events.length === 0) {
    if (!hasSubscription) {
      return (
        <div className="pa-flex pa-flex-col pa-items-center pa-justify-center" style={{ padding: 'var(--pa-space-8)', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--pa-n400)', marginBottom: 'var(--pa-space-4)' }}>
            credit_card
          </span>
          <h3 className="pa-h4 pa-mb-2">{t('billing.emptyState.noSubscription')}</h3>
          {onSelectPlan && (
            <OrgAdminButton
              variant="primary"
              onClick={onSelectPlan}
              className="mt-4"
            >
              {t('billing.selectPlan')}
            </OrgAdminButton>
          )}
        </div>
      )
    }

    return (
      <div className="pa-body-m pa-text-muted" style={{ padding: 'var(--pa-space-4)' }}>
        {t('billing.emptyState.noEvents')}
      </div>
    )
  }

  // Group events by date
  const groupedEvents = groupEventsByDate(events)
  
  // Sort date groups newest first
  const sortedDateKeys = Array.from(groupedEvents.keys()).sort((a, b) => {
    return b.localeCompare(a) // Reverse alphabetical order (newest first for YYYY-MM-DD)
  })

  return (
    <div className="pa-flex pa-flex-col pa-gap-6">
      {sortedDateKeys.map(dateKey => {
        const dateEvents = groupedEvents.get(dateKey) || []
        
        return (
          <div key={dateKey} className="pa-flex pa-flex-col pa-gap-3">
            {/* Date header */}
            <div className="pa-text-overline pa-text-muted" style={{ fontWeight: 600 }}>
              {formatDateHeader(dateKey)}
            </div>

            {/* Events for this date */}
            <div className="pa-flex pa-flex-col pa-gap-2" style={{ paddingLeft: 'var(--pa-space-4)' }}>
              {dateEvents.map(event => {
                const isExpanded = expandedEvents.has(event.id)
                const eventLabel = getEventLabel(event.event_type)
                const eventTime = event.created_at ? formatTime(event.created_at) : ''

                return (
                  <div
                    key={event.id}
                    className="pa-flex pa-gap-3 pa-items-start"
                    style={{
                      padding: 'var(--pa-space-3)',
                      borderRadius: 'var(--pa-radius-sm)',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'var(--pa-n50)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                    onClick={() => toggleEvent(event.id)}
                  >
                    {/* Timeline dot */}
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--pa-n300)',
                        marginTop: '6px',
                        flexShrink: 0,
                      }}
                    />

                    {/* Event content */}
                    <div className="pa-flex-1 pa-min-w-0">
                      <div className="pa-flex pa-items-center pa-gap-2 pa-mb-1">
                        <div className="pa-body-m" style={{ fontWeight: 600 }}>
                          {eventLabel}
                        </div>
                        {event.payment_status && (
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              backgroundColor:
                                event.payment_status === 'paid' || event.payment_status === 'succeeded'
                                  ? '#dcfce7'
                                  : event.payment_status === 'open' || event.payment_status === 'processing'
                                  ? '#dbeafe'
                                  : event.payment_status === 'draft'
                                  ? '#f3f4f6'
                                  : '#fef3c7',
                              color:
                                event.payment_status === 'paid' || event.payment_status === 'succeeded'
                                  ? '#166534'
                                  : event.payment_status === 'open' || event.payment_status === 'processing'
                                  ? '#1e40af'
                                  : event.payment_status === 'draft'
                                  ? '#6b7280'
                                  : '#92400e',
                            }}
                          >
                            {event.payment_status}
                          </span>
                        )}
                      </div>
                      
                      {event.description && (
                        <div className="pa-body-s pa-text-muted pa-mb-1">
                          {event.description}
                        </div>
                      )}
                      
                      <div className="pa-flex pa-items-center pa-gap-3">
                        <div className="pa-body-s pa-text-muted">
                          {eventTime}
                        </div>
                        {event.amount !== undefined && event.currency && (
                          <div className="pa-body-s" style={{ fontWeight: 600 }}>
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: event.currency,
                            }).format(event.amount)}
                          </div>
                        )}
                        {event.invoice_url && (
                          <a
                            href={event.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pa-body-s pa-flex pa-items-center pa-gap-1"
                            style={{
                              color: 'var(--pa-primary)',
                              textDecoration: 'none',
                              fontWeight: 600,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                              download
                            </span>
                            Invoice
                          </a>
                        )}
                      </div>

                      {/* Expandable technical details */}
                      {isExpanded && (
                        <div
                          className="pa-mt-2"
                          style={{
                            padding: 'var(--pa-space-3)',
                            backgroundColor: 'var(--pa-n50)',
                            borderRadius: 'var(--pa-radius-sm)',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                          }}
                        >
                          {event.stripe_event_id && (
                            <div style={{ marginBottom: '4px' }}>
                              <span style={{ color: 'var(--pa-n500)' }}>Event: </span>
                              {event.stripe_event_id}
                            </div>
                          )}
                          {event.stripe_object_id && (
                            <div>
                              <span style={{ color: 'var(--pa-n500)' }}>Object: </span>
                              {event.stripe_object_id}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Expand/collapse icon */}
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '18px',
                        color: 'var(--pa-n400)',
                        flexShrink: 0,
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    >
                      expand_more
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
