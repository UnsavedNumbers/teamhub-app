import '../../styles/ios-events.css'
import { cn } from '../../utils/cn'
import type { AthleteViewMode } from './AthletesHeader'

export interface AthleteCardData {
    id: string
    first_name: string
    last_name: string
    jersey_number?: number | null
    birthdate?: string | null
    gender?: string | null
    photo_url?: string | null
    has_profile_photo?: boolean | null
    primary_sport?: { name: string } | null
    primary_team?: { name: string } | null
}

interface AthletesGridProps {
    athletes: AthleteCardData[]
    loading: boolean
    page: number
    rowsPerPage: number
    totalCount: number
    onPageChange: (page: number) => void
    onRowsPerPageChange: (rowsPerPage: number) => void
    onAthleteClick: (athlete: AthleteCardData) => void
    onEdit: (athlete: AthleteCardData) => void
    onDelete: (athlete: AthleteCardData) => void
    viewMode: AthleteViewMode
    selectable?: boolean
    selectedIds?: Set<string>
    onSelectionChange?: (updater: ((prev: Set<string>) => Set<string>) | Set<string>) => void
}

export default function AthletesGrid({
    athletes,
    loading,
    page,
    rowsPerPage,
    totalCount,
    onPageChange,
    onAthleteClick,
    onEdit,
    onDelete,
    viewMode,
    selectable,
    selectedIds,
    onSelectionChange,
}: AthletesGridProps) {
    const calculateAge = (birthdate?: string | null) => {
        if (!birthdate) return null
        const today = new Date()
        const birthDate = new Date(birthdate)
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }
        return age
    }

    const getGenderLabel = (gender?: string | null) => {
        if (!gender) return 'Not specified'
        const labels: Record<string, string> = {
            male: 'Male',
            female: 'Female',
            other: 'Other',
            prefer_not_to_say: 'Prefer not to say',
        }
        return labels[gender] || gender
    }

    const toggleSelection = (id: string) => {
        if (!onSelectionChange) return
        onSelectionChange((prev) => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    if (loading) {
        return (
            <div>
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        ))}
                    </div>
                )}
            </div>
        )
    }

    if (athletes.length === 0) {
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
                    person_off
                </span>
                <p style={{
                    fontSize: 'var(--ios-text-lg)',
                    color: 'var(--ios-text-secondary)',
                    fontWeight: 'var(--ios-weight-medium)',
                }}>
                    No athletes found
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
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {athletes.map((athlete) => {
                        const age = calculateAge(athlete.birthdate)
                        const genderLabel = getGenderLabel(athlete.gender)
                        const displayName = `${athlete.first_name} ${athlete.last_name}`
                        const isSelected = selectedIds?.has(athlete.id)

                        return (
                            <div
                                key={athlete.id}
                                className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-[var(--org-btn-primary-bg,rgba(19,127,236,0.2))]"
                                onClick={() => onAthleteClick(athlete)}
                                style={{
                                    background: 'var(--org-surface-primary, #fff)',
                                    border: '1px solid var(--org-border-default, #e5e7eb)',
                                }}
                            >
                                {/* Selection Checkbox */}
                                {selectable && (
                                    <div
                                        className="absolute top-2 left-2 z-20"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            toggleSelection(athlete.id)
                                        }}
                                    >
                                        <div className={cn(
                                            'w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all',
                                            isSelected
                                                ? 'bg-blue-500 border-blue-500'
                                                : 'bg-white border-slate-300 group-hover:border-blue-400'
                                        )}>
                                            {isSelected && (
                                                <span className="material-symbols-outlined text-white" style={{ fontSize: '16px' }}>
                                                    check
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Image/Avatar Section */}
                                <div className="aspect-square relative bg-slate-100 dark:bg-slate-800">
                                    {athlete.photo_url || athlete.has_profile_photo ? (
                                        <img
                                            src={athlete.photo_url || `/api/athletes/${athlete.id}/photo`}
                                            alt={displayName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '64px' }}>
                                                account_circle
                                            </span>
                                        </div>
                                    )}
                                    {/* Gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                </div>

                                {/* Content */}
                                <div className="p-3">
                                    <h3 className="font-bold text-sm truncate" style={{ color: 'var(--org-text-primary, #111)' }}>
                                        {displayName}
                                    </h3>

                                    <div className="flex flex-wrap gap-1 text-xs mt-1" style={{ color: 'var(--org-text-secondary, #6b7280)' }}>
                                        {age !== null && (
                                            <span>Age {age}</span>
                                        )}
                                        {genderLabel !== 'Not specified' && (
                                            <>
                                                {age !== null && <span>•</span>}
                                                <span>{genderLabel}</span>
                                            </>
                                        )}
                                        {athlete.jersey_number && (
                                            <>
                                                {(age !== null || genderLabel !== 'Not specified') && <span>•</span>}
                                                <span>#{athlete.jersey_number}</span>
                                            </>
                                        )}
                                    </div>

                                    {/* Sport/Team */}
                                    <div className="mt-2 space-y-0.5">
                                        {athlete.primary_sport && (
                                            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--org-text-secondary, #6b7280)' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>sports_basketball</span>
                                                <span className="truncate">{athlete.primary_sport.name}</span>
                                            </div>
                                        )}
                                        {athlete.primary_team && (
                                            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--org-text-secondary, #6b7280)' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>group</span>
                                                <span className="truncate">{athlete.primary_team.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions - Hidden by default, shown on hover */}
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-slate-50 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onEdit(athlete)
                                        }}
                                        title="Edit athlete"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--org-text-primary, #111)' }}>
                                            edit
                                        </span>
                                    </button>
                                    <button
                                        className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-red-50 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onDelete(athlete)
                                        }}
                                        title="Delete athlete"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#dc2626' }}>
                                            delete
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="space-y-3">
                    {athletes.map((athlete) => {
                        const age = calculateAge(athlete.birthdate)
                        const displayName = `${athlete.first_name} ${athlete.last_name}`
                        const isSelected = selectedIds?.has(athlete.id)

                        return (
                            <div
                                key={athlete.id}
                                className="group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
                                onClick={() => onAthleteClick(athlete)}
                                style={{
                                    background: 'var(--org-surface-primary, #fff)',
                                    border: '1px solid var(--org-border-default, #e5e7eb)',
                                }}
                            >
                                {/* Selection Checkbox */}
                                {selectable && (
                                    <div
                                        className="shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            toggleSelection(athlete.id)
                                        }}
                                    >
                                        <div className={cn(
                                            'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                                            isSelected
                                                ? 'bg-blue-500 border-blue-500'
                                                : 'bg-white border-slate-300 group-hover:border-blue-400'
                                        )}>
                                            {isSelected && (
                                                <span className="material-symbols-outlined text-white" style={{ fontSize: '14px' }}>
                                                    check
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Avatar */}
                                <div className="shrink-0 w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    {athlete.photo_url || athlete.has_profile_photo ? (
                                        <img
                                            src={athlete.photo_url || `/api/athletes/${athlete.id}/photo`}
                                            alt={displayName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '28px' }}>
                                                account_circle
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold truncate" style={{ color: 'var(--org-text-primary, #111)' }}>
                                        {displayName}
                                    </h3>
                                    <div className="flex flex-wrap gap-2 text-xs mt-0.5" style={{ color: 'var(--org-text-secondary, #6b7280)' }}>
                                        {age !== null && <span>Age {age}</span>}
                                        {athlete.jersey_number && <span>#{athlete.jersey_number}</span>}
                                        {athlete.primary_sport && <span>{athlete.primary_sport.name}</span>}
                                        {athlete.primary_team && <span>{athlete.primary_team.name}</span>}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onEdit(athlete)
                                        }}
                                        title="Edit"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                            edit
                                        </span>
                                    </button>
                                    <button
                                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onDelete(athlete)
                                        }}
                                        title="Delete"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#dc2626' }}>
                                            delete
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Pagination */}
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
