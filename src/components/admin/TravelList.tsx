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
        <div className="w-full">
            {/* Mobile: Card layout - left-aligned with max-width */}
            <div className="lg:hidden">
                {plans.map((plan) => {
                    const typeClass = STATUS_STYLE[plan.status] || 'default'
                    const loadingThis = publishLoading === plan.id || cancelLoading === plan.id
                    return (
                        <div
                            key={plan.id}
                            className={`ios-event-row max-w-md ${plan.status === 'cancelled' ? 'ios-event-cancelled' : ''}`}
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

            {/* Desktop: Table layout - left-aligned, can stretch wider */}
            <div className="hidden lg:block overflow-x-auto">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden max-w-full">
                    <table className="w-full">
                        <colgroup>
                            <col style={{ width: '120px', maxWidth: '120px' }} />
                            <col style={{ width: 'auto', maxWidth: '300px' }} />
                            <col style={{ width: '150px', maxWidth: '150px' }} />
                            <col style={{ width: '180px', maxWidth: '180px' }} />
                            <col style={{ width: '200px', maxWidth: '200px' }} />
                            <col style={{ width: '100px', maxWidth: '100px' }} />
                            <col style={{ width: '120px', maxWidth: '120px' }} />
                        </colgroup>
                        <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--org-text-secondary)' }}>Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--org-text-secondary)' }}>Title</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--org-text-secondary)' }}>Duration</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--org-text-secondary)' }}>Team</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--org-text-secondary)' }}>Location</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--org-text-secondary)' }}>Status</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--org-text-secondary)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {plans.map((plan) => {
                                const typeClass = STATUS_STYLE[plan.status] || 'default'
                                const loadingThis = publishLoading === plan.id || cancelLoading === plan.id
                                return (
                                    <tr
                                        key={plan.id}
                                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${plan.status === 'cancelled' ? 'opacity-60' : ''}`}
                                        onClick={() => onRowClick(plan)}
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="text-sm font-medium" style={{ color: 'var(--org-text-primary)' }}>
                                                {new Date(plan.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                            <div className="text-xs" style={{ color: 'var(--org-text-tertiary)' }}>
                                                {new Date(plan.start_date).toLocaleDateString(undefined, { weekday: 'short' })}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-semibold truncate" style={{ color: plan.status === 'cancelled' ? 'var(--org-text-tertiary)' : 'var(--org-text-primary)', textDecoration: plan.status === 'cancelled' ? 'line-through' : 'none', maxWidth: '300px' }}>
                                                {plan.title}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="text-sm" style={{ color: 'var(--org-text-secondary)' }}>
                                                {formatDateRange(plan.start_date, plan.end_date)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {plan.team ? (
                                                <div className="flex items-center gap-1.5 text-sm truncate" style={{ color: 'var(--org-text-secondary)', maxWidth: '180px' }}>
                                                    <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '16px', color: 'var(--org-text-tertiary)' }}>group</span>
                                                    <span className="truncate">{plan.team.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-sm" style={{ color: 'var(--org-text-tertiary)' }}>—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {plan.location ? (
                                                <div className="flex items-center gap-1.5 text-sm truncate" style={{ color: 'var(--org-text-secondary)', maxWidth: '200px' }}>
                                                    <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '16px', color: 'var(--org-text-tertiary)' }}>location_on</span>
                                                    <span className="truncate">{plan.location}</span>
                                                </div>
                                            ) : (
                                                <span className="text-sm" style={{ color: 'var(--org-text-tertiary)' }}>—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ios-event-type-pill ${typeClass}`}>
                                                {plan.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" onClick={() => onEdit(plan)} title="Edit plan">
                                                    <span className="material-symbols-outlined text-sm" style={{ color: 'var(--org-text-secondary)' }}>edit</span>
                                                </button>
                                                {plan.status !== 'published' && plan.status !== 'cancelled' && (
                                                    <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" onClick={() => onPublish(plan)} title="Publish" disabled={loadingThis}>
                                                        <span className="material-symbols-outlined text-sm" style={{ color: 'var(--org-text-secondary)' }}>publish</span>
                                                    </button>
                                                )}
                                                {plan.status !== 'cancelled' && (
                                                    <button className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" onClick={() => onCancel(plan)} title="Cancel plan" disabled={loadingThis}>
                                                        <span className="material-symbols-outlined text-sm" style={{ color: 'var(--org-status-error-bg, #dc2626)' }}>cancel</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg mt-4">
                    <button 
                        onClick={() => onPageChange(page - 1)} 
                        disabled={page === 0} 
                        className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{ 
                            color: page === 0 ? 'var(--org-text-tertiary)' : 'var(--org-text-primary)',
                            background: page === 0 ? 'transparent' : 'var(--org-surface-secondary, rgba(0,0,0,0.06))'
                        }}
                    >
                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                        <span className="hidden sm:inline">Previous</span>
                    </button>
                    <div className="text-sm font-medium" style={{ color: 'var(--org-text-secondary)' }}>
                        Page {page + 1} of {totalPages}
                    </div>
                    <button 
                        onClick={() => onPageChange(page + 1)} 
                        disabled={page >= totalPages - 1} 
                        className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{ 
                            color: page >= totalPages - 1 ? 'var(--org-text-tertiary)' : 'var(--org-text-primary)',
                            background: page >= totalPages - 1 ? 'transparent' : 'var(--org-surface-secondary, rgba(0,0,0,0.06))'
                        }}
                    >
                        <span className="hidden sm:inline">Next</span>
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                    </button>
                </div>
            )}
        </div>
    )
}
