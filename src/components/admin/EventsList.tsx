import '../../styles/ios-events.css'
import type { CalendarEvent, EventType } from '../../types/calendar'

interface EventsListProps {
    events: CalendarEvent[]
    loading: boolean
    page: number
    rowsPerPage: number
    totalCount: number
    onPageChange: (page: number) => void
    onRowsPerPageChange: (rowsPerPage: number) => void
    onRowClick: (event: CalendarEvent) => void
    onEdit: (event: CalendarEvent) => void
    onDuplicate: (event: CalendarEvent) => void
    onCancel: (event: CalendarEvent) => void
    onDelete: (event: CalendarEvent) => void
    orderBy?: string
    order?: 'asc' | 'desc'
    onSort?: (column: string) => void
    selectable?: boolean
    selectedIds?: Set<string>
    onSelectionChange?: (updater: ((prev: Set<string>) => Set<string>) | Set<string>) => void
}

export default function EventsList({
    events,
    loading,
    page,
    rowsPerPage,
    totalCount,
    onPageChange,
    onRowClick,
    onEdit,
    onDuplicate,
    onCancel,
    onDelete,
}: EventsListProps) {
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

    const getEventTypeLabel = (type: EventType): string => {
        const labels: Record<EventType, string> = {
            practice: 'Practice',
            game: 'Game',
            tournament: 'Tournament',
            meeting: 'Meeting',
            tryout: 'Tryout',
            travel: 'Travel',
            pickup_dropoff: 'Pickup',
            social: 'Social',
            blackout: 'Blackout',
        }
        return labels[type] || type
    }

    if (loading) {
        return (
            <div>
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="ios-event-row" style={{ opacity: 0.5 }}>
                        <div style={{ height: '80px', background: 'var(--ios-bg-secondary)', borderRadius: '8px' }} />
                    </div>
                ))}
            </div>
        )
    }

    if (events.length === 0) {
        return (
            <div style={{
                padding: '64px 20px',
                textAlign: 'center',
                background: 'var(--ios-bg-grouped)',
                borderRadius: 'var(--ios-radius-lg)',
            }}>
                <span className="material-symbols-outlined" style={{
                    fontSize: '64px',
                    color: 'var(--ios-text-quaternary)',
                    display: 'block',
                    marginBottom: '16px',
                }}>
                    event_busy
                </span>
                <p style={{
                    fontSize: 'var(--ios-text-lg)',
                    color: 'var(--ios-text-secondary)',
                    fontWeight: 'var(--ios-weight-medium)',
                }}>
                    No events found
                </p>
                <p style={{
                    fontSize: 'var(--ios-text-sm)',
                    color: 'var(--ios-text-tertiary)',
                    marginTop: '8px',
                }}>
                    Try adjusting your filters
                </p>
            </div>
        )
    }

    const totalPages = Math.ceil(totalCount / rowsPerPage)

    return (
        <div>
            <div>
                {events.map((event) => (
                    <div
                        key={event.id}
                        className={`ios-event-row ${event.is_cancelled ? 'ios-event-cancelled' : ''}`}
                        onClick={() => onRowClick(event)}
                    >
                        {/* Date */}
                        <div className="ios-event-date">
                            {new Date(event.start_time).toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                            })}
                        </div>

                        {/* Title */}
                        <div className="ios-event-title">
                            {event.title}
                            {event.is_cancelled && (
                                <span className="ios-cancelled-badge" style={{ marginLeft: '8px' }}>
                                    Cancelled
                                </span>
                            )}
                        </div>

                        {/* Time */}
                        <div className="ios-event-time">
                            {new Date(event.start_time).toLocaleTimeString(undefined, {
                                hour: 'numeric',
                                minute: '2-digit',
                            })}
                            {' – '}
                            {new Date(event.end_time).toLocaleTimeString(undefined, {
                                hour: 'numeric',
                                minute: '2-digit',
                            })}
                        </div>

                        {/* Meta (Team, Location, Type) */}
                        <div className="ios-event-meta">
                            {event.team && (
                                <div className="ios-event-meta-item">
                                    <span className="material-symbols-outlined">group</span>
                                    <span>{event.team.name}</span>
                                </div>
                            )}
                            {(event.event_location?.venue_name || event.location) && (
                                <div className="ios-event-meta-item">
                                    <span className="material-symbols-outlined">location_on</span>
                                    <span>
                                        {event.event_location?.venue_name ||
                                            event.location ||
                                            (event.event_location?.is_tbd ? 'TBD' : '')}
                                    </span>
                                </div>
                            )}
                            <div className={`ios-event-type-pill ${getEventTypeClass(event.type)}`}>
                                {getEventTypeLabel(event.type)}
                            </div>
                        </div>

                        {/* Actions - Hidden by default, shown on hover */}
                        <div
                            className="ios-event-actions"
                            style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
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
                ))}
            </div>

            {/* Pagination - iOS Style */}
            {totalPages > 1 && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '20px',
                        background: 'var(--ios-bg-primary)',
                        borderRadius: 'var(--ios-radius-lg)',
                        marginTop: '16px',
                        boxShadow: 'var(--ios-shadow-sm)',
                    }}
                >
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 0}
                        className="ios-calendar-nav-button"
                        style={{
                            opacity: page === 0 ? 0.3 : 1,
                            cursor: page === 0 ? 'not-allowed' : 'pointer',
                        }}
                    >
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>

                    <div
                        style={{
                            fontSize: 'var(--ios-text-base)',
                            color: 'var(--ios-text-secondary)',
                            fontWeight: 'var(--ios-weight-medium)',
                        }}
                    >
                        Page {page + 1} of {totalPages}
                    </div>

                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={page >= totalPages - 1}
                        className="ios-calendar-nav-button"
                        style={{
                            opacity: page >= totalPages - 1 ? 0.3 : 1,
                            cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                        }}
                    >
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>
            )}
        </div>
    )
}
