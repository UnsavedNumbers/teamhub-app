import React from 'react'
import '../../styles/ios-events.css'
import { formatDateRange } from '../../data/services/travelService'
import type { TravelPlanWithTeam } from './TravelList'
import type { TravelPlanStatus } from '../../types/travelManagement'

interface TravelAgendaProps {
    plans: TravelPlanWithTeam[]
    loading: boolean
    onPlanClick: (plan: TravelPlanWithTeam) => void
    onEdit: (plan: TravelPlanWithTeam) => void
    onPublish: (plan: TravelPlanWithTeam) => void
    onCancel: (plan: TravelPlanWithTeam) => void
    publishLoading?: string | null
    cancelLoading?: string | null
}

const STATUS_CLASS: Record<TravelPlanStatus, string> = {
    draft: 'default',
    published: 'game',
    cancelled: 'ios-event-cancelled',
}

export default function TravelAgenda({
    plans,
    loading,
    onPlanClick,
    onEdit,
    onPublish,
    onCancel,
    publishLoading,
    cancelLoading,
}: TravelAgendaProps) {
    const groupedPlans: { date: string; fullDate: Date; plans: TravelPlanWithTeam[] }[] = []
    const sortedPlans = [...plans].sort(
        (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    )
    sortedPlans.forEach((plan) => {
        const planDate = new Date(plan.start_date)
        const dateStr = planDate.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        })
        const existing = groupedPlans.find((g) => g.date === dateStr)
        if (existing) existing.plans.push(plan)
        else groupedPlans.push({ date: dateStr, fullDate: planDate, plans: [plan] })
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

    if (plans.length === 0) {
        return (
            <div style={{ padding: '64px 20px', textAlign: 'center', background: 'var(--ios-bg-primary)', borderRadius: 'var(--ios-radius-lg)', boxShadow: 'var(--ios-shadow-sm)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '64px', color: 'var(--ios-text-quaternary)', display: 'block', marginBottom: '16px' }}>flight_takeoff</span>
                <p style={{ fontSize: 'var(--ios-text-lg)', color: 'var(--ios-text-secondary)', fontWeight: 'var(--ios-weight-medium)' }}>No travel plans found</p>
                <p style={{ fontSize: 'var(--ios-text-sm)', color: 'var(--ios-text-tertiary)', marginTop: '8px' }}>Try adjusting your filters</p>
            </div>
        )
    }

    return (
        <div>
            {groupedPlans.map((group) => (
                <div key={group.date} className="ios-agenda-day-group">
                    <div className="ios-agenda-day-header" style={{ background: 'var(--org-btn-primary-bg)', color: 'var(--org-btn-primary-text)' }}>
                        <div className="ios-agenda-day-title">{group.date}</div>
                        <div className="ios-agenda-day-subtitle">
                            {group.plans.length} {group.plans.length === 1 ? 'plan' : 'plans'}
                        </div>
                    </div>
                    {group.plans.map((plan) => {
                        const loadingThis = publishLoading === plan.id || cancelLoading === plan.id
                        return (
                            <div
                                key={plan.id}
                                className={`ios-agenda-event-card ${STATUS_CLASS[plan.status]} ${plan.status === 'cancelled' ? 'ios-event-cancelled' : ''}`}
                                onClick={() => onPlanClick(plan)}
                            >
                                <div style={{ display: 'flex', gap: '16px', paddingLeft: '12px' }}>
                                    <div style={{ flexShrink: 0, width: '80px' }}>
                                        <div className="ios-agenda-event-time">
                                            {new Date(plan.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </div>
                                        <div className="ios-agenda-event-duration">{formatDateRange(plan.start_date, plan.end_date)}</div>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontSize: 'var(--ios-text-lg)',
                                                fontWeight: 'var(--ios-weight-semibold)',
                                                color: plan.status === 'cancelled' ? 'var(--ios-text-tertiary)' : 'var(--ios-text-primary)',
                                                marginBottom: '4px',
                                                textDecoration: plan.status === 'cancelled' ? 'line-through' : 'none',
                                            }}
                                        >
                                            {plan.title}
                                            {plan.status === 'cancelled' && <span className="ios-cancelled-badge" style={{ marginLeft: '8px' }}>Cancelled</span>}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {plan.team && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--ios-text-sm)', color: 'var(--ios-text-tertiary)' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--ios-text-quaternary)' }}>group</span>
                                                    <span>{plan.team.name}</span>
                                                </div>
                                            )}
                                            {plan.location && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--ios-text-sm)', color: 'var(--ios-text-tertiary)' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--ios-text-quaternary)' }}>location_on</span>
                                                    <span>{plan.location}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="ios-event-actions" style={{ flexShrink: 0, display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                                        <button className="ios-action-button" onClick={(e) => { e.stopPropagation(); onEdit(plan) }} title="Edit plan">
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                                        </button>
                                        {plan.status !== 'published' && plan.status !== 'cancelled' && (
                                            <button className="ios-action-button" onClick={(e) => { e.stopPropagation(); onPublish(plan) }} title="Publish" disabled={loadingThis}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>publish</span>
                                            </button>
                                        )}
                                        {plan.status !== 'cancelled' && (
                                            <button className="ios-action-button destructive" onClick={(e) => { e.stopPropagation(); onCancel(plan) }} title="Cancel plan" disabled={loadingThis}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>cancel</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ))}
        </div>
    )
}
