import '../../styles/ios-events.css'
import type { CalendarEvent, EventType } from '../../types/calendar'
import { formatEventTimeRange } from '../../types/calendar'

interface EventsAgendaProps {
    events: CalendarEvent[]
    loading: boolean
    onEventClick: (event: CalendarEvent) => void
    onEdit: (event: CalendarEvent) => void
    onDuplicate: (event: CalendarEvent) => void
    onCancel: (event: CalendarEvent) => void
    onDelete: (event: CalendarEvent) => void
}

export default function EventsAgenda({
    events,
    loading,
    onEventClick,
    onEdit,
    onDuplicate,
    onCancel,
    onDelete,
}: EventsAgendaProps) {
    const getEventTypeClass = (type: EventType): string => {
        switch (type) {
            case 'practice':
                return 'practice'
            case 'game':
                return 'game'
            case 'tournament':
                return 'tournament'
            case 'meeting':
                return 'meeting'
            default:
                return 'default'
        }
    }

    // Group events by day
    const groupedEvents: { date: string; fullDate: Date; events: CalendarEvent[] }[] = []
    const sortedEvents = [...events].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )

    sortedEvents.forEach((event) => {
        const eventDate = new Date(event.start_time)
        const dateStr = eventDate.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        })
        const existingGroup = groupedEvents.find((g) => g.date === dateStr)
        if (existingGroup) {
            existingGroup.events.push(event)
        } else {
            groupedEvents.push({ date: dateStr, fullDate: eventDate, events: [event] })
        }
    })

    if (loading) {
        return (
            <div>
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="ios-agenda-day-group" style={{ opacity: 0.5 }}>
                        <div style={{ height: '120px', background: 'var(--ios-bg-secondary)' }} />
                    </div>
                ))}
            </div>
        )
    }

    if (events.length === 0) {
        return (
            <div
                style={{
                    padding: '64px 20px',
                    textAlign: 'center',
                    background: 'var(--ios-bg-primary)',
                    borderRadius: 'var(--ios-radius-lg)',
                    boxShadow: 'var(--ios-shadow-sm)',
                }}
            >
                <span
                    className="material-symbols-outlined"
                    style={{
                        fontSize: '64px',
                        color: 'var(--ios-text-quaternary)',
                        display: 'block',
                        marginBottom: '16px',
                    }}
                >
                    event_busy
                </span>
                <p
                    style={{
                        fontSize: 'var(--ios-text-lg)',
                        color: 'var(--ios-text-secondary)',
                        fontWeight: 'var(--ios-weight-medium)',
                    }}
                >
                    No events found
                </p>
                <p
                    style={{
                        fontSize: 'var(--ios-text-sm)',
                        color: 'var(--ios-text-tertiary)',
                        marginTop: '8px',
                    }}
                >
                    Try adjusting your filters
                </p>
            </div>
        )
    }

    return (
        <div>
            {groupedEvents.map((group) => (
                <div key={group.date} className="ios-agenda-day-group">
                    {/* Day Header - Sticky */}
                    <div
                        className="ios-agenda-day-header"
                        style={{
                            background: 'var(--org-btn-primary-bg)',
                            color: 'var(--org-btn-primary-text)'
                        }}
                    >
                        <div className="ios-agenda-day-title">{group.date}</div>
                        <div className="ios-agenda-day-subtitle">
                            {group.events.length} {group.events.length === 1 ? 'event' : 'events'}
                        </div>
                    </div>

                    {/* Events for this day */}
                    {group.events.map((event) => (
                        <div
                            key={event.id}
                            className={`ios-agenda-event-card ${getEventTypeClass(event.type)} ${
                                event.is_cancelled ? 'ios-event-cancelled' : ''
                            }`}
                            onClick={() => onEventClick(event)}
                        >
                            <div style={{ display: 'flex', gap: '16px', paddingLeft: '12px' }}>
                                {/* Time Column */}
                                <div style={{ flexShrink: 0, width: '80px' }}>
                                    <div className="ios-agenda-event-time">
                                        {new Date(event.start_time).toLocaleTimeString(undefined, {
                                            hour: 'numeric',
                                            minute: '2-digit',
                                        })}
                                    </div>
                                    <div className="ios-agenda-event-duration">
                                        {formatEventTimeRange(event.start_time, event.end_time, event.timezone)}
                                    </div>
                                </div>

                                {/* Event Details Column */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {/* Title */}
                                    <div
                                        style={{
                                            fontSize: 'var(--ios-text-lg)',
                                            fontWeight: 'var(--ios-weight-semibold)',
                                            color: event.is_cancelled
                                                ? 'var(--ios-text-tertiary)'
                                                : 'var(--ios-text-primary)',
                                            marginBottom: '4px',
                                            textDecoration: event.is_cancelled ? 'line-through' : 'none',
                                        }}
                                    >
                                        {event.title}
                                        {event.is_cancelled && (
                                            <span className="ios-cancelled-badge" style={{ marginLeft: '8px' }}>
                                                Cancelled
                                            </span>
                                        )}
                                    </div>

                                    {/* Meta Information */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {event.team && (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontSize: 'var(--ios-text-sm)',
                                                    color: 'var(--ios-text-tertiary)',
                                                }}
                                            >
                                                <span
                                                    className="material-symbols-outlined"
                                                    style={{ fontSize: '16px', color: 'var(--ios-text-quaternary)' }}
                                                >
                                                    group
                                                </span>
                                                <span>{event.team.name}</span>
                                            </div>
                                        )}
                                        {(event.event_location?.venue_name || event.location) && (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontSize: 'var(--ios-text-sm)',
                                                    color: 'var(--ios-text-tertiary)',
                                                }}
                                            >
                                                <span
                                                    className="material-symbols-outlined"
                                                    style={{ fontSize: '16px', color: 'var(--ios-text-quaternary)' }}
                                                >
                                                    location_on
                                                </span>
                                                <span>
                                                    {event.event_location?.venue_name ||
                                                        event.location ||
                                                        (event.event_location?.is_tbd ? 'TBD' : '')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions - Hidden by default, shown on hover */}
                                <div
                                    className="ios-event-actions"
                                    style={{
                                        flexShrink: 0,
                                        display: 'flex',
                                        gap: '4px',
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    <button
                                        className="ios-action-button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onEdit(event)
                                        }}
                                        title="Edit event"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                            edit
                                        </span>
                                    </button>
                                    <button
                                        className="ios-action-button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onDuplicate(event)
                                        }}
                                        title="Duplicate event"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                            content_copy
                                        </span>
                                    </button>
                                    {!event.is_cancelled && (
                                        <button
                                            className="ios-action-button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onCancel(event)
                                            }}
                                            title="Cancel event"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                                cancel
                                            </span>
                                        </button>
                                    )}
                                    <button
                                        className="ios-action-button destructive"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onDelete(event)
                                        }}
                                        title="Delete event"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                            delete
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    )
}
