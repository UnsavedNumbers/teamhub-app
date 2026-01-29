import React from 'react'
import '../../styles/ios-events.css'
import { formatDateRange } from '../../data/services/travelService'
import type { FakeTravelPlan } from '../../data/services/travelService'
import type { TravelPlanStatus } from '../../types/travelManagement'

export type TravelPlanWithTeam = FakeTravelPlan & { team?: { id: string; name: string } }

interface TravelListProps {
    plans: TravelPlanWithTeam[]
    loading: boolean
    page: number
    rowsPerPage: number
    totalCount: number
    onPageChange: (page: number) => void
    onRowsPerPageChange: (rowsPerPage: number) => void
    onRowClick: (plan: TravelPlanWithTeam) => void
    onEdit: (plan: TravelPlanWithTeam) => void
    onPublish: (plan: TravelPlanWithTeam) => void
    onCancel: (plan: TravelPlanWithTeam) => void
    publishLoading?: string | null
    cancelLoading?: string | null
    selectable?: boolean
    selectedIds?: Set<string>
    onSelectionChange?: (updater: ((prev: Set<string>) => Set<string>) | Set<string>) => void
}

const STATUS_STYLE: Record<TravelPlanStatus, string> = {
    draft: 'default',
    published: 'game',
    cancelled: 'ios-event-cancelled',
}

export default function TravelList({
    plans,
    loading,
    page,
    rowsPerPage,
    totalCount,
    onPageChange,
    onRowsPerPageChange,
    onRowClick,
    onEdit,
    onPublish,
    onCancel,
    publishLoading,
    cancelLoading,
}: TravelListProps) {
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

    if (plans.length === 0) {
        return (
            <div style={{ padding: '64px 20px', textAlign: 'center', background: 'var(--ios-bg-grouped)', borderRadius: 'var(--ios-radius-lg)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '64px', color: 'var(--ios-text-quaternary)', display: 'block', marginBottom: '16px' }}>
                    flight_takeoff
                </span>
                <p style={{ fontSize: 'var(--ios-text-lg)', color: 'var(--ios-text-secondary)', fontWeight: 'var(--ios-weight-medium)' }}>No travel plans found</p>
                <p style={{ fontSize: 'var(--ios-text-sm)', color: 'var(--ios-text-tertiary)', marginTop: '8px' }}>Try adjusting your filters</p>
            </div>
        )
    }

    const totalPages = Math.ceil(totalCount / rowsPerPage)

    return (
        <div>
            <div>
                {plans.map((plan) => {
                    const typeClass = STATUS_STYLE[plan.status] || 'default'
                    const loadingThis = publishLoading === plan.id || cancelLoading === plan.id
                    return (
                        <div
                            key={plan.id}
                            className={`ios-event-row ${plan.status === 'cancelled' ? 'ios-event-cancelled' : ''}`}
                            onClick={() => onRowClick(plan)}
                        >
                            <div className="ios-event-date">
                                {new Date(plan.start_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>
                            <div className="ios-event-title">
                                {plan.title}
                                {plan.status === 'cancelled' && (
                                    <span className="ios-cancelled-badge" style={{ marginLeft: '8px' }}>Cancelled</span>
                                )}
                            </div>
                            <div className="ios-event-time">
                                {formatDateRange(plan.start_date, plan.end_date)}
                            </div>
                            <div className="ios-event-meta">
                                {plan.team && (
                                    <div className="ios-event-meta-item">
                                        <span className="material-symbols-outlined">group</span>
                                        <span>{plan.team.name}</span>
                                    </div>
                                )}
                                {plan.location && (
                                    <div className="ios-event-meta-item">
                                        <span className="material-symbols-outlined">location_on</span>
                                        <span>{plan.location}</span>
                                    </div>
                                )}
                                <div className={`ios-event-type-pill ${typeClass}`}>
                                    {plan.status.toUpperCase()}
                                </div>
                            </div>
                            <div className="ios-event-actions" style={{ position: 'absolute', top: '12px', right: '12px' }}>
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
                    )
                })}
            </div>
            {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: 'var(--ios-bg-primary)', borderRadius: 'var(--ios-radius-lg)', marginTop: '16px', boxShadow: 'var(--ios-shadow-sm)' }}>
                    <button onClick={() => onPageChange(page - 1)} disabled={page === 0} className="ios-calendar-nav-button" style={{ opacity: page === 0 ? 0.3 : 1, cursor: page === 0 ? 'not-allowed' : 'pointer' }}>
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <div style={{ fontSize: 'var(--ios-text-base)', color: 'var(--ios-text-secondary)', fontWeight: 'var(--ios-weight-medium)' }}>
                        Page {page + 1} of {totalPages}
                    </div>
                    <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1} className="ios-calendar-nav-button" style={{ opacity: page >= totalPages - 1 ? 0.3 : 1, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer' }}>
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>
            )}
        </div>
    )
}
