import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../../styles/orgAdmin.css'
import { getTravelPlanContacts, getTravelPlanDetails, formatDateRange } from '../../data/services/travelService'
import { useUserContext } from '../../hooks/useUserContext'
import { getLink } from '../../utils/routes'
import type { TravelPlanWithTeam } from './TravelList'
import {
    TRAVEL_CONTACT_CATEGORIES,
    TRAVEL_CONTACT_CATEGORY_LABELS,
    type TravelPlanContactRow,
} from '../../types/travelContacts'

interface TravelDetailSlideOverProps {
    planId: string | null
    onClose: () => void
    onEdit?: (planId: string) => void
    onPublish?: (planId: string) => void
    onCancel?: (planId: string) => void
}

export default function TravelDetailSlideOver({
    planId,
    onClose,
    onEdit,
    onPublish,
    onCancel,
}: TravelDetailSlideOverProps) {
    const [plan, setPlan] = useState<TravelPlanWithTeam | null>(null)
    const [customContacts, setCustomContacts] = useState<TravelPlanContactRow[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { context, isReady } = useUserContext()
    const navigate = useNavigate()

    useEffect(() => {
        if (!planId || !isReady) {
            setPlan(null)
            setCustomContacts([])
            return
        }
        const fetchPlan = async () => {
            setLoading(true)
            setError(null)
            try {
                const { data, error: fetchError } = await getTravelPlanDetails(context, planId)
                if (fetchError) throw fetchError
                setPlan(data as TravelPlanWithTeam)
                if (data) {
                    const { data: contactsData, error: contactsError } = await getTravelPlanContacts(context, planId)
                    if (contactsError) {
                        console.error('Error fetching plan contacts:', contactsError)
                        setCustomContacts([])
                    } else {
                        const ordered = TRAVEL_CONTACT_CATEGORIES
                            .map((category) => contactsData?.[category] ?? null)
                            .filter((row): row is TravelPlanContactRow => !!row && row.is_custom)
                        setCustomContacts(ordered)
                    }
                } else {
                    setCustomContacts([])
                }
            } catch (err) {
                console.error('Error fetching travel plan details:', err)
                setError(err instanceof Error ? err.message : 'Failed to load travel plan')
                setCustomContacts([])
            } finally {
                setLoading(false)
            }
        }
        fetchPlan()
    }, [planId, context, isReady])

    if (!planId) return null

    const isPast = plan ? new Date(plan.end_date) < new Date() : false

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                display: 'flex',
                justifyContent: 'flex-end',
                pointerEvents: planId ? 'auto' : 'none',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.4)',
                    transition: 'opacity 0.3s',
                    opacity: planId ? 1 : 0,
                }}
                onClick={onClose}
            />
            <div
                className="oa-slideout-container"
                style={{
                    transform: planId ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    background: 'var(--org-surface-default, #fff)',
                }}
            >
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
                        backdropFilter: 'blur(4px)',
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                </button>

                <div
                    className="oa-slideout-body"
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        minHeight: 0,
                        padding: '24px',
                        paddingBottom: '120px',
                    }}
                >
                    {loading && (
                        <div style={{ padding: '64px', textAlign: 'center', color: 'var(--pa-n500)' }}>
                            <span className="material-symbols-outlined pa-spin" style={{ fontSize: '32px' }}>refresh</span>
                            <div className="oa-detail-text" style={{ marginTop: '16px' }}>Loading travel plan...</div>
                        </div>
                    )}

                    {!loading && error && (
                        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--org-status-error-bg, #dc2626)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>error</span>
                            <div className="oa-detail-text" style={{ marginTop: '16px' }}>{error}</div>
                        </div>
                    )}

                    {!loading && !error && plan && (
                        <>
                            <div style={{ marginBottom: '24px', paddingTop: '40px' }}>
                                <span className="oa-event-tag">{plan.status.toUpperCase()}</span>
                                <h1 className="oa-hero-title" style={{ position: 'relative', zIndex: 1, color: 'var(--org-text-primary, #0f172a)' }}>
                                    {plan.title}
                                </h1>
                            </div>

                            <div className="oa-info-grid">
                                <div className="oa-info-card">
                                    <div className="oa-info-icon-box">
                                        <span className="material-symbols-outlined">calendar_today</span>
                                    </div>
                                    <div className="oa-info-content">
                                        <div className="oa-info-title">{formatDateRange(plan.start_date, plan.end_date)}</div>
                                    </div>
                                </div>

                                {plan.location && (
                                    <div className="oa-info-card">
                                        <div className="oa-info-icon-box">
                                            <span className="material-symbols-outlined">location_on</span>
                                        </div>
                                        <div className="oa-info-content">
                                            <div className="oa-info-title">{plan.location}</div>
                                            {(plan.destination_city || plan.venue_name) && (
                                                <div className="oa-info-subtitle">
                                                    {[plan.destination_city, plan.destination_state].filter(Boolean).join(', ')}
                                                    {plan.venue_name && ` · ${plan.venue_name}`}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {(plan.team || plan.season) && (
                                    <div className="oa-info-card">
                                        <div className="oa-info-icon-box">
                                            <span className="material-symbols-outlined">groups</span>
                                        </div>
                                        <div className="oa-info-content">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div className="oa-info-title">{plan.team?.name || 'All Teams'}</div>
                                                {plan.season && (
                                                    <span className="oa-event-tag" style={{ margin: 0, fontSize: '10px' }}>{plan.season.name}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {plan.hotel_name && (
                                    <div className="oa-info-card">
                                        <div className="oa-info-icon-box">
                                            <span className="material-symbols-outlined">hotel</span>
                                        </div>
                                        <div className="oa-info-content">
                                            <div className="oa-info-title">{plan.hotel_name}</div>
                                            {plan.hotel_address && <div className="oa-info-subtitle">{plan.hotel_address}</div>}
                                            {plan.hotel_phone && <div className="oa-info-subtitle">{plan.hotel_phone}</div>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {(customContacts.length > 0 || plan.notes) && (
                                <div className="oa-details-stack">
                                    {customContacts.length > 0 && (
                                        <div className="oa-detail-group">
                                            <label className="oa-detail-label">Custom Contacts</label>
                                            <div className="oa-contact-list">
                                                {customContacts.map((contact) => {
                                                    const name = `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim()
                                                    const label = TRAVEL_CONTACT_CATEGORY_LABELS[contact.category] ?? contact.category
                                                    return (
                                                        <div key={contact.id} className="oa-contact-item">
                                                            <div className="oa-contact-category">{label}</div>
                                                            <div className="oa-contact-name">{name || 'Contact'}</div>
                                                            <div className="oa-contact-details">
                                                                {contact.email}
                                                                {contact.phone ? ` | ${contact.phone}` : ''}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    {plan.notes && (
                                        <div className="oa-detail-group">
                                            <label className="oa-detail-label">Notes</label>
                                            <div className="oa-detail-box oa-detail-box--dashed">
                                                <p className="oa-detail-text">{plan.notes}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {!loading && !error && plan && (
                    <div className="oa-slideout-footer">
                        <div className="oa-footer-stack">
                            <button
                                className="oa-btn oa-btn--primary"
                                onClick={() => {
                                    navigate(getLink('admin.travel.edit', { id: plan.id }))
                                }}
                            >
                                View Travel Page
                            </button>
                            {!isPast && (
                                <button
                                    className="oa-btn oa-btn--primary"
                                    onClick={() => {
                                        if (onEdit) onEdit(plan.id)
                                        else navigate(getLink('admin.travel.edit', { id: plan.id }))
                                    }}
                                >
                                    Edit Plan
                                </button>
                            )}
                        </div>
                        {!isPast && (
                            <div className="oa-footer-stack">
                                {plan.status !== 'published' && plan.status !== 'cancelled' && (
                                    <button className="oa-btn oa-btn--primary" onClick={() => onPublish && onPublish(plan.id)} title="Publish">
                                        <span className="material-symbols-outlined" style={{ marginRight: 6 }}>publish</span>
                                        Publish
                                    </button>
                                )}
                                <button className="oa-btn oa-btn--primary" onClick={() => onCancel && onCancel(plan.id)} title="Cancel plan">
                                    <span className="material-symbols-outlined" style={{ marginRight: 6 }}>cancel</span>
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
