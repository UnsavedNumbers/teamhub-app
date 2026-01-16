import { Badge } from './Badge'
import { JsonViewer } from './JsonViewer'
import type { AdminEventLog, EventCategory } from '../../types/eventLog.types'

interface EventLogDetailModalProps {
  event: AdminEventLog
  onClose: () => void
}

export function EventLogDetailModal({ event, onClose }: EventLogDetailModalProps) {
  const getCategoryVariant = (category: EventCategory): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (category) {
      case 'AUTH':
        return 'info'
      case 'PAYMENT':
        return 'success'
      case 'ADMIN':
        return 'warning'
      case 'SYSTEM':
        return 'neutral'
      case 'ORGANIZATION':
        return 'info'
      default:
        return 'neutral'
    }
  }

  const formatEventType = (eventType: string) => {
    return eventType
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="pa-card"
        style={{
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          background: 'var(--pa-n0)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--pa-space-5)',
            borderBottom: '1px solid var(--pa-n200)',
          }}
        >
          <div>
            <h2 className="pa-heading-m" style={{ margin: 0, marginBottom: '8px' }}>
              Event Details
            </h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Badge variant={getCategoryVariant(event.category)}>
                {event.category}
              </Badge>
              <span className="pa-body-m" style={{ color: 'var(--pa-n700)' }}>
                {formatEventType(event.event_type)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--pa-n100)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--pa-n700)' }}>
              close
            </span>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 'var(--pa-space-5)' }}>
          {/* Timestamp */}
          <div style={{ marginBottom: 'var(--pa-space-5)' }}>
            <div className="pa-caption" style={{ color: 'var(--pa-n600)', marginBottom: '4px' }}>
              Timestamp
            </div>
            <div className="pa-body-m">
              {new Date(event.created_at).toLocaleString()}
            </div>
          </div>

          {/* Actor */}
          <div style={{ marginBottom: 'var(--pa-space-5)' }}>
            <div className="pa-caption" style={{ color: 'var(--pa-n600)', marginBottom: '4px' }}>
              Actor
            </div>
            <div className="pa-body-m">
              {event.actor_email || event.actor_name || 'System'}
              {event.actor_user_id && (
                <span className="pa-caption" style={{ color: 'var(--pa-n600)', marginLeft: '8px' }}>
                  ({event.actor_user_id.substring(0, 8)}...)
                </span>
              )}
            </div>
            <div className="pa-caption" style={{ color: 'var(--pa-n600)', marginTop: '4px' }}>
              Role: {event.actor_role}
            </div>
          </div>

          {/* Organization */}
          {event.org_id && (
            <div style={{ marginBottom: 'var(--pa-space-5)' }}>
              <div className="pa-caption" style={{ color: 'var(--pa-n600)', marginBottom: '4px' }}>
                Organization
              </div>
              <div className="pa-body-m">
                {event.organization_name || event.org_id}
              </div>
            </div>
          )}

          {/* Target Entity */}
          {event.target_entity_type && (
            <div style={{ marginBottom: 'var(--pa-space-5)' }}>
              <div className="pa-caption" style={{ color: 'var(--pa-n600)', marginBottom: '4px' }}>
                Target Entity
              </div>
              <div className="pa-body-m">
                <code style={{ fontSize: '14px', color: 'var(--pa-n900)' }}>
                  {event.target_entity_type}: {event.target_entity_id?.substring(0, 8)}...
                </code>
              </div>
            </div>
          )}

          {/* IP Address */}
          {event.ip_address && (
            <div style={{ marginBottom: 'var(--pa-space-5)' }}>
              <div className="pa-caption" style={{ color: 'var(--pa-n600)', marginBottom: '4px' }}>
                IP Address
              </div>
              <div className="pa-body-m" style={{ fontFamily: 'var(--pa-font-mono)' }}>
                {event.ip_address}
              </div>
            </div>
          )}

          {/* User Agent */}
          {event.user_agent && (
            <div style={{ marginBottom: 'var(--pa-space-5)' }}>
              <div className="pa-caption" style={{ color: 'var(--pa-n600)', marginBottom: '4px' }}>
                User Agent
              </div>
              <div className="pa-body-s" style={{ fontFamily: 'var(--pa-font-mono)', color: 'var(--pa-n700)' }}>
                {event.user_agent}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div style={{ marginBottom: 'var(--pa-space-5)' }}>
            <JsonViewer data={event.metadata} title="Metadata" />
          </div>

          {/* Event ID */}
          <div>
            <div className="pa-caption" style={{ color: 'var(--pa-n600)', marginBottom: '4px' }}>
              Event ID
            </div>
            <div className="pa-body-s" style={{ fontFamily: 'var(--pa-font-mono)', color: 'var(--pa-n700)' }}>
              {event.id}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
