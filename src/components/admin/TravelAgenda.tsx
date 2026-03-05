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
        <div className="w-full">
            <div className="max-w-2xl">
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
                                <div className="flex gap-4 md:gap-6 px-3 md:px-4">
                                    <div className="flex-shrink-0 w-20 md:w-24">
                                        <div className="ios-agenda-event-time">
                                            {new Date(plan.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </div>
                                        <div className="ios-agenda-event-duration">{formatDateRange(plan.start_date, plan.end_date)}</div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div
                                            className="text-base md:text-lg font-semibold mb-1"
                                            style={{
                                                color: plan.status === 'cancelled' ? 'var(--ios-text-tertiary)' : 'var(--ios-text-primary)',
                                                textDecoration: plan.status === 'cancelled' ? 'line-through' : 'none',
                                            }}
                                        >
                                            {plan.title}
                                            {plan.status === 'cancelled' && <span className="ios-cancelled-badge ml-2">Cancelled</span>}
                                        </div>
                                        <div className="flex flex-col md:flex-row md:items-center md:gap-4 gap-1">
                                            {plan.team && (
                                                <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--ios-text-tertiary)' }}>
                                                    <span className="material-symbols-outlined text-base" style={{ color: 'var(--ios-text-quaternary)' }}>group</span>
                                                    <span>{plan.team.name}</span>
                                                </div>
                                            )}
                                            {plan.location && (
                                                <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--ios-text-tertiary)' }}>
                                                    <span className="material-symbols-outlined text-base" style={{ color: 'var(--ios-text-quaternary)' }}>location_on</span>
                                                    <span>{plan.location}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="ios-event-actions flex-shrink-0 flex gap-1 items-start" onClick={(e) => e.stopPropagation()}>
                                        <button className="ios-action-button" onClick={() => onEdit(plan)} title="Edit plan">
                                            <span className="material-symbols-outlined text-lg">edit</span>
                                        </button>
                                        {plan.status !== 'published' && plan.status !== 'cancelled' && (
                                            <button className="ios-action-button" onClick={() => onPublish(plan)} title="Publish" disabled={loadingThis}>
                                                <span className="material-symbols-outlined text-lg">publish</span>
                                            </button>
                                        )}
                                        {plan.status !== 'cancelled' && (
                                            <button className="ios-action-button destructive" onClick={() => onCancel(plan)} title="Cancel plan" disabled={loadingThis}>
                                                <span className="material-symbols-outlined text-lg">cancel</span>
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
        </div>
    )
}
