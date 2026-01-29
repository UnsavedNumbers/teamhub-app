import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../../styles/ios-events.css'
import { getEventDetails } from '../../data/services/eventsService'
import { useUserContext } from '../../hooks/useUserContext'
import { getLink } from '../../utils/routes'
import type { CalendarEvent, EventType } from '../../types/calendar'
import { formatEventLocation, formatEventTimeRange, formatEventDate } from '../../types/calendar'

interface EventDetailSlideOverProps {
    eventId: string | null
    onClose: () => void
    onEdit?: (eventId: string) => void
    onDuplicate?: (eventId: string) => void
    onCancel?: (eventId: string) => void
    onDelete?: (eventId: string) => void
}

export default function EventDetailSlideOver({
    eventId,
    onClose,
    onEdit,
    onDuplicate,
    onCancel,
    onDelete,
}: EventDetailSlideOverProps) {
    const [event, setEvent] = useState<CalendarEvent | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { context, isReady } = useUserContext()
    const navigate = useNavigate()

    useEffect(() => {
        if (!eventId || !isReady) {
            setEvent(null)
            return
        }

        const fetchEvent = async () => {
            setLoading(true)
            setError(null)
            try {
                const { data, error: fetchError } = await getEventDetails(context, eventId)
                if (fetchError) throw fetchError
                setEvent(data)
            } catch (err) {
                console.error('Error fetching event details:', err)
                setError(err instanceof Error ? err.message : 'Failed to load event')
            } finally {
                setLoading(false)
            }
        }

        fetchEvent()
    }, [eventId, context, isReady])

    if (!eventId) return null

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

    return (
        <>
            {/* Backdrop */}
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.4)',
                    zIndex: 40,
                    transition: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    opacity: eventId ? 1 : 0,
                    pointerEvents: eventId ? 'auto' : 'none',
                }}
                onClick={onClose}
            />

            {/* Slide-over Panel */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    height: '100%',
                    width: '100%',
                    maxWidth: '600px',
                    background: 'var(--ios-bg-secondary)',
                    boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.12)',
                    zIndex: 50,
                    transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: eventId ? 'translateX(0)' : 'translateX(100%)',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {loading && (
                    <div style={{ padding: '64px 20px', textAlign: 'center' }}>
                        <div
                            style={{
                                width: '100%',
                                height: '400px',
                                background: 'var(--ios-bg-primary)',
                                borderRadius: 'var(--ios-radius-lg)',
                                opacity: 0.5,
                            }}
                        />
                    </div>
                )}

                {error && (
                    <div style={{ padding: '64px 20px', textAlign: 'center' }}>
                        <span
                            className="material-symbols-outlined"
                            style={{
                                fontSize: '64px',
                                color: 'var(--ios-red)',
                                display: 'block',
                                marginBottom: '16px',
                            }}
                        >
                            error
                        </span>
                        <p style={{ fontSize: 'var(--ios-text-lg)', color: 'var(--ios-text-secondary)' }}>{error}</p>
                    </div>
                )}

                {!loading && !error && event && (
                    <>
                        {/* Header - iOS style with drag handle */}
                        <div
                            style={{
                                position: 'sticky',
                                top: 0,
                                background: 'var(--ios-bg-primary)',
                                borderBottom: '1px solid var(--ios-separator)',
                                zIndex: 10,
                                borderTopLeftRadius: '12px',
                                borderTopRightRadius: '12px',
                            }}
                        >
                            {/* Drag handle indicator */}
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    paddingTop: '12px',
                                    paddingBottom: '8px',
                                }}
                            >
                                <div
                                    style={{
                                        width: '36px',
                                        height: '5px',
                                        background: 'var(--ios-separator-opaque)',
                                        borderRadius: '3px',
                                    }}
                                />
                            </div>

                            {/* Close button */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px 12px' }}>
                                <button
                                    onClick={onClose}
                                    className="ios-action-button"
                                    style={{ width: '32px', height: '32px' }}
                                    aria-label="Close"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                                        close
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, padding: '0 16px 16px' }}>
                            {/* Title Card */}
                            <div
                                style={{
                                    background: 'var(--ios-bg-primary)',
                                    borderRadius: 'var(--ios-radius-lg)',
                                    padding: 'var(--ios-space-lg)',
                                    marginBottom: 'var(--ios-space-md)',
                                    boxShadow: 'var(--ios-shadow-sm)',
                                }}
                            >
                                <div style={{ marginBottom: 'var(--ios-space-sm)' }}>
                                    <div className={`ios-event-type-pill ${getEventTypeClass(event.type)}`}>
                                        {getEventTypeLabel(event.type)}
                                    </div>
                                </div>
                                <h3
                                    style={{
                                        fontSize: 'var(--ios-text-3xl)',
                                        fontWeight: 'var(--ios-weight-semibold)',
                                        color: event.is_cancelled
                                            ? 'var(--ios-text-tertiary)'
                                            : 'var(--ios-text-primary)',
                                        textDecoration: event.is_cancelled ? 'line-through' : 'none',
                                        lineHeight: 'var(--ios-leading-tight)',
                                        marginBottom: event.is_cancelled ? 'var(--ios-space-sm)' : 0,
                                    }}
                                >
                                    {event.title}
                                </h3>
                                {event.is_cancelled && (
                                    <div>
                                        <span className="ios-cancelled-badge">Cancelled</span>
                                        {event.cancellation_reason && (
                                            <p
                                                style={{
                                                    fontSize: 'var(--ios-text-sm)',
                                                    color: 'var(--ios-text-tertiary)',
                                                    marginTop: 'var(--ios-space-xs)',
                                                }}
                                            >
                                                {event.cancellation_reason}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Date & Time Card */}
                            <div
                                style={{
                                    background: 'var(--ios-bg-primary)',
                                    borderRadius: 'var(--ios-radius-lg)',
                                    padding: 'var(--ios-space-lg)',
                                    marginBottom: 'var(--ios-space-md)',
                                    boxShadow: 'var(--ios-shadow-sm)',
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ios-space-md)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ios-space-sm)' }}>
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontSize: '20px', color: 'var(--ios-text-quaternary)' }}
                                        >
                                            calendar_today
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 'var(--ios-text-base)',
                                                fontWeight: 'var(--ios-weight-medium)',
                                                color: 'var(--ios-text-secondary)',
                                            }}
                                        >
                                            {formatEventDate(event.start_time, event.timezone)}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ios-space-sm)' }}>
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontSize: '20px', color: 'var(--ios-text-quaternary)' }}
                                        >
                                            schedule
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 'var(--ios-text-base)',
                                                fontWeight: 'var(--ios-weight-medium)',
                                                color: 'var(--ios-text-secondary)',
                                            }}
                                        >
                                            {formatEventTimeRange(event.start_time, event.end_time, event.timezone)}
                                        </span>
                                    </div>
                                    {event.arrival_time && (
                                        <div
                                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--ios-space-sm)' }}
                                        >
                                            <span
                                                className="material-symbols-outlined"
                                                style={{ fontSize: '20px', color: 'var(--ios-text-quaternary)' }}
                                            >
                                                login
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: 'var(--ios-text-sm)',
                                                    color: 'var(--ios-text-tertiary)',
                                                }}
                                            >
                                                Arrival:{' '}
                                                {new Date(event.arrival_time).toLocaleTimeString(undefined, {
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                    timeZone: event.timezone,
                                                })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Location Card */}
                            {event.event_location && (
                                <div
                                    style={{
                                        background: 'var(--ios-bg-primary)',
                                        borderRadius: 'var(--ios-radius-lg)',
                                        padding: 'var(--ios-space-lg)',
                                        marginBottom: 'var(--ios-space-md)',
                                        boxShadow: 'var(--ios-shadow-sm)',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--ios-space-sm)' }}>
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontSize: '20px', color: 'var(--ios-text-quaternary)' }}
                                        >
                                            location_on
                                        </span>
                                        <div style={{ flex: 1 }}>
                                            <div
                                                style={{
                                                    fontSize: 'var(--ios-text-base)',
                                                    fontWeight: 'var(--ios-weight-medium)',
                                                    color: 'var(--ios-text-secondary)',
                                                    marginBottom: 'var(--ios-space-xs)',
                                                }}
                                            >
                                                {formatEventLocation(event.event_location)}
                                            </div>
                                            {event.event_location.is_virtual && event.event_location.virtual_link && (
                                                <a
                                                    href={event.event_location.virtual_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        fontSize: 'var(--ios-text-sm)',
                                                        color: 'var(--ios-blue)',
                                                        textDecoration: 'none',
                                                    }}
                                                >
                                                    Join virtual event →
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Team & Season Card */}
                            {(event.team || event.season) && (
                                <div
                                    style={{
                                        background: 'var(--ios-bg-primary)',
                                        borderRadius: 'var(--ios-radius-lg)',
                                        padding: 'var(--ios-space-lg)',
                                        marginBottom: 'var(--ios-space-md)',
                                        boxShadow: 'var(--ios-shadow-sm)',
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ios-space-md)' }}>
                                        {event.team && (
                                            <div
                                                style={{ display: 'flex', alignItems: 'center', gap: 'var(--ios-space-sm)' }}
                                            >
                                                <span
                                                    className="material-symbols-outlined"
                                                    style={{ fontSize: '20px', color: 'var(--ios-text-quaternary)' }}
                                                >
                                                    group
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: 'var(--ios-text-base)',
                                                        fontWeight: 'var(--ios-weight-medium)',
                                                        color: 'var(--ios-text-secondary)',
                                                    }}
                                                >
                                                    {event.team.name}
                                                </span>
                                            </div>
                                        )}
                                        {event.season && (
                                            <div
                                                style={{ display: 'flex', alignItems: 'center', gap: 'var(--ios-space-sm)' }}
                                            >
                                                <span
                                                    className="material-symbols-outlined"
                                                    style={{ fontSize: '20px', color: 'var(--ios-text-quaternary)' }}
                                                >
                                                    event
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: 'var(--ios-text-base)',
                                                        fontWeight: 'var(--ios-weight-medium)',
                                                        color: 'var(--ios-text-secondary)',
                                                    }}
                                                >
                                                    {event.season.name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Notes Card */}
                            {event.notes && (
                                <div
                                    style={{
                                        background: 'var(--ios-bg-primary)',
                                        borderRadius: 'var(--ios-radius-lg)',
                                        padding: 'var(--ios-space-lg)',
                                        marginBottom: 'var(--ios-space-md)',
                                        boxShadow: 'var(--ios-shadow-sm)',
                                    }}
                                >
                                    <h4
                                        style={{
                                            fontSize: 'var(--ios-text-xs)',
                                            fontWeight: 'var(--ios-weight-semibold)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            color: 'var(--ios-text-tertiary)',
                                            marginBottom: 'var(--ios-space-sm)',
                                        }}
                                    >
                                        Notes
                                    </h4>
                                    <p
                                        style={{
                                            fontSize: 'var(--ios-text-base)',
                                            color: 'var(--ios-text-secondary)',
                                            whiteSpace: 'pre-wrap',
                                            lineHeight: 'var(--ios-leading-relaxed)',
                                        }}
                                    >
                                        {event.notes}
                                    </p>
                                </div>
                            )}

                            {/* Uniform Notes Card */}
                            {event.uniform_notes && (
                                <div
                                    style={{
                                        background: 'var(--ios-bg-primary)',
                                        borderRadius: 'var(--ios-radius-lg)',
                                        padding: 'var(--ios-space-lg)',
                                        marginBottom: 'var(--ios-space-md)',
                                        boxShadow: 'var(--ios-shadow-sm)',
                                    }}
                                >
                                    <h4
                                        style={{
                                            fontSize: 'var(--ios-text-xs)',
                                            fontWeight: 'var(--ios-weight-semibold)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            color: 'var(--ios-text-tertiary)',
                                            marginBottom: 'var(--ios-space-sm)',
                                        }}
                                    >
                                        Uniform
                                    </h4>
                                    <p
                                        style={{
                                            fontSize: 'var(--ios-text-base)',
                                            color: 'var(--ios-text-secondary)',
                                            whiteSpace: 'pre-wrap',
                                            lineHeight: 'var(--ios-leading-relaxed)',
                                        }}
                                    >
                                        {event.uniform_notes}
                                    </p>
                                </div>
                            )}

                            {/* Equipment Notes Card */}
                            {event.equipment_notes && (
                                <div
                                    style={{
                                        background: 'var(--ios-bg-primary)',
                                        borderRadius: 'var(--ios-radius-lg)',
                                        padding: 'var(--ios-space-lg)',
                                        marginBottom: 'var(--ios-space-md)',
                                        boxShadow: 'var(--ios-shadow-sm)',
                                    }}
                                >
                                    <h4
                                        style={{
                                            fontSize: 'var(--ios-text-xs)',
                                            fontWeight: 'var(--ios-weight-semibold)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            color: 'var(--ios-text-tertiary)',
                                            marginBottom: 'var(--ios-space-sm)',
                                        }}
                                    >
                                        Equipment
                                    </h4>
                                    <p
                                        style={{
                                            fontSize: 'var(--ios-text-base)',
                                            color: 'var(--ios-text-secondary)',
                                            whiteSpace: 'pre-wrap',
                                            lineHeight: 'var(--ios-leading-relaxed)',
                                        }}
                                    >
                                        {event.equipment_notes}
                                    </p>
                                </div>
                            )}

                            {/* External Link Card */}
                            {event.external_link && (
                                <div
                                    style={{
                                        background: 'var(--ios-bg-primary)',
                                        borderRadius: 'var(--ios-radius-lg)',
                                        padding: 'var(--ios-space-lg)',
                                        marginBottom: 'var(--ios-space-md)',
                                        boxShadow: 'var(--ios-shadow-sm)',
                                    }}
                                >
                                    <h4
                                        style={{
                                            fontSize: 'var(--ios-text-xs)',
                                            fontWeight: 'var(--ios-weight-semibold)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            color: 'var(--ios-text-tertiary)',
                                            marginBottom: 'var(--ios-space-sm)',
                                        }}
                                    >
                                        External Link
                                    </h4>
                                    <a
                                        href={event.external_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            fontSize: 'var(--ios-text-base)',
                                            color: 'var(--ios-blue)',
                                            textDecoration: 'none',
                                            wordBreak: 'break-all',
                                        }}
                                    >
                                        {event.external_link} →
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions - iOS style */}
                        <div
                            style={{
                                position: 'sticky',
                                bottom: 0,
                                background: 'var(--ios-bg-primary)',
                                borderTop: '1px solid var(--ios-separator)',
                                padding: 'var(--ios-space-lg)',
                                display: 'flex',
                                gap: 'var(--ios-space-sm)',
                                flexWrap: 'wrap',
                            }}
                        >
                            <button
                                onClick={() => {
                                    if (onEdit) {
                                        onEdit(event.id)
                                    } else {
                                        navigate(getLink('admin.events.edit', { id: event.id }))
                                    }
                                }}
                                style={{
                                    flex: 1,
                                    minWidth: '120px',
                                    padding: '12px 20px',
                                    borderRadius: '12px',
                                    background: 'var(--ios-blue)',
                                    color: 'white',
                                    border: 'none',
                                    fontSize: 'var(--ios-text-base)',
                                    fontWeight: 'var(--ios-weight-semibold)',
                                    cursor: 'pointer',
                                    transition: 'opacity var(--ios-transition-fast)',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => onDuplicate && onDuplicate(event.id)}
                                className="ios-action-button"
                                style={{ width: '44px', height: '44px' }}
                                title="Duplicate"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                                    content_copy
                                </span>
                            </button>
                            {!event.is_cancelled && (
                                <button
                                    onClick={() => onCancel && onCancel(event.id)}
                                    className="ios-action-button"
                                    style={{ width: '44px', height: '44px' }}
                                    title="Cancel"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                                        cancel
                                    </span>
                                </button>
                            )}
                            <button
                                onClick={() => onDelete && onDelete(event.id)}
                                className="ios-action-button destructive"
                                style={{ width: '44px', height: '44px' }}
                                title="Delete"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                                    delete
                                </span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </>
    )
}
