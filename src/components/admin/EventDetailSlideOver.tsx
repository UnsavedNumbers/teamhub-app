import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../../styles/orgAdmin.css'
import { getEventDetails } from '../../data/services/eventsService'
import { useUserContext } from '../../hooks/useUserContext'
import { getLink } from '../../utils/routes'
import type { CalendarEvent } from '../../types/calendar'
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

    return (
        <div 
            style={{ 
                position: 'fixed', 
                inset: 0, 
                zIndex: 50, 
                display: 'flex', 
                justifyContent: 'flex-end',
                pointerEvents: eventId ? 'auto' : 'none'
            }}
        >
            {/* Backdrop */}
            <div 
                style={{ 
                    position: 'absolute', 
                    inset: 0, 
                    background: 'rgba(0, 0, 0, 0.4)', 
                    transition: 'opacity 0.3s',
                    opacity: eventId ? 1 : 0
                }} 
                onClick={onClose}
            />

            {/* Slideout Container */}
            <div 
                className="oa-slideout-container"
                style={{
                    transform: eventId ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    background: 'var(--org-surface-default, #fff)' 
                }}
            >
                {/* Close Button (Floating) */}
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '24px',
                        right: '24px',
                        zIndex: 20,
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.5)',
                        border: '1px solid var(--org-border-default, #e2e8f0)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--org-text-secondary, #475569)',
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                </button>

                {/* Body */}
                <div 
                    className="oa-slideout-body" 
                    style={{ 
                        flex: 1, 
                        overflowY: 'auto', 
                        minHeight: 0,
                        padding: '24px',
                        paddingBottom: '120px' /* Space for footer */
                    }}
                >
                    {loading && (
                        <div style={{ padding: '64px', textAlign: 'center', color: 'var(--org-text-secondary, #64748b)' }}>
                            <span className="material-symbols-outlined oa-spin" style={{ fontSize: '32px' }}>refresh</span>
                            <div className="oa-detail-text" style={{ marginTop: '16px' }}>Loading event details...</div>
                        </div>
                    )}

                    {!loading && error && (
                        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--pa-danger)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>error</span>
                            <div className="oa-detail-text" style={{ marginTop: '16px' }}>{error}</div>
                        </div>
                    )}

                    {!loading && !error && event && (
                        <>
                            {/* Hero Section (No Card) */}
                            <div style={{ marginBottom: '24px', paddingTop: '40px' }}>
                                <span className="oa-event-tag">{event.type}</span>
                                <h1 className="oa-hero-title" style={{ position: 'relative', zIndex: 1, color: 'var(--org-text-primary, #0f172a)' }}>
                                    {event.title}
                                </h1>
                            </div>

                            {/* Arrival / Mandatory Card */}
                            {(event.arrival_time || event.is_mandatory) && (
                                <div className="oa-arrival-card" style={{ marginBottom: '24px' }}>
                                    {event.is_mandatory && (
                                        <span className="oa-arrival-label">MANDATORY</span>
                                    )}
                                    {event.arrival_time && (
                                        <div className="oa-arrival-time">
                                            ARRIVE BY {new Date(event.arrival_time).toLocaleTimeString(undefined, {
                                                hour: 'numeric',
                                                minute: '2-digit',
                                                timeZone: event.timezone
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Info Grid */}
                            <div className="oa-info-grid">
                                {/* Date */}
                                <div className="oa-info-card">
                                    <div className="oa-info-icon-box">
                                        <span className="material-symbols-outlined">calendar_today</span>
                                    </div>
                                    <div className="oa-info-content">
                                        <div className="oa-info-title">
                                            {formatEventDate(event.start_time, event.timezone)}
                                        </div>
                                        <div className="oa-info-subtitle">
                                            {formatEventTimeRange(event.start_time, event.end_time, event.timezone)}
                                        </div>
                                    </div>
                                </div>

                                {/* Location */}
                                {event.event_location && (
                                    <div className="oa-info-card">
                                        <div className="oa-info-icon-box">
                                            <span className="material-symbols-outlined">location_on</span>
                                        </div>
                                        <div className="oa-info-content">
                                            <div className="oa-info-title">
                                                {event.event_location.is_tbd 
                                                    ? 'Location TBD' 
                                                    : event.event_location.is_virtual 
                                                        ? 'Virtual Event' 
                                                        : event.event_location.venue_name || event.event_location.name || 'Unknown Location'}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Team / Group */}
                                {(event.team || event.season) && (
                                    <div className="oa-info-card">
                                        <div className="oa-info-icon-box">
                                            <span className="material-symbols-outlined">groups</span>
                                        </div>
                                        <div className="oa-info-content">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div className="oa-info-title">
                                                    {event.team?.name || 'All Teams'}
                                                </div>
                                                {event.season && (
                                                    <span className="oa-event-tag" style={{ margin: 0, fontSize: '10px' }}>
                                                        {event.season.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Details Stack */}
                            <div className="oa-details-stack">
                                {event.uniform_notes && (
                                    <div className="oa-detail-group">
                                        <label className="oa-detail-label">Uniform</label>
                                        <div className="oa-detail-box" style={{ display: 'flex', alignItems: 'center' }}>
                                            <div className="oa-uniform-dot" />
                                            <span className="oa-detail-text" style={{ fontWeight: 600 }}>
                                                {event.uniform_notes}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {event.equipment_notes && (
                                    <div className="oa-detail-group">
                                        <label className="oa-detail-label">Equipment</label>
                                        <div className="oa-detail-box">
                                            <ul className="oa-equip-list">
                                                {event.equipment_notes.split('\n').map((item, i) => (
                                                    <li key={i} className="oa-equip-item">
                                                        <span className="material-symbols-outlined">check_circle</span>
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {event.notes && (
                                    <div className="oa-detail-group">
                                        <label className="oa-detail-label">Notes</label>
                                        <div className="oa-detail-box oa-detail-box--dashed">
                                            <p className="oa-detail-text">{event.notes}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Controls */}
                {!loading && !error && event && (
                    <div className="oa-slideout-footer">
                        <button 
                            className="oa-action-primary-lg"
                            onClick={() => {
                                if (onEdit) onEdit(event.id)
                                else navigate(getLink('admin.events.edit', { id: event.id }))
                            }}
                        >
                            Edit Event
                        </button>
                        <div className="oa-action-group">
                            <button 
                                className="oa-icon-btn-lg"
                                onClick={() => onDuplicate && onDuplicate(event.id)}
                                title="Duplicate"
                            >
                                <span className="material-symbols-outlined">content_copy</span>
                            </button>
                            <button 
                                className="oa-icon-btn-lg"
                                onClick={() => onCancel && onCancel(event.id)}
                                title="Cancel"
                            >
                                <span className="material-symbols-outlined">cancel</span>
                            </button>
                            <button 
                                className="oa-icon-btn-lg destructive"
                                onClick={() => onDelete && onDelete(event.id)}
                                title="Delete"
                            >
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
