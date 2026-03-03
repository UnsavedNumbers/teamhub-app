import '../../styles/ios-events.css'
import { cn } from '../../utils/cn'
import type { AthleteViewMode } from './AthletesHeader'
import AthleteAvatar from '../portal/AthleteAvatar'
import { useUserContext } from '../../hooks/useUserContext'
import type { Athlete } from '../../types/family'

export interface AthleteCardData {
    id: string
    first_name: string
    last_name: string
    jersey_number?: number | null
    birthdate?: string | null
    gender?: string | null
    photo_url?: string | null
    has_profile_photo?: boolean | null
    org_id?: string | null
    primary_sport?: { id?: string; name: string } | null
    primary_team?: { id?: string; name: string } | null
    sports?: Array<{ id?: string; name: string }>
    teams?: Array<{
        id: string
        name: string
        org_id?: string | null
        sport_id?: string | null
        sport_name?: string | null
        season_id?: string | null
        role?: string | null
        position?: string | null
        jersey_number?: string | null
    }>
    roles?: string[]
    positions?: string[]
    jersey_numbers?: string[]
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
    const { context } = useUserContext()

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

    const getAthleteInitials = (athlete: AthleteCardData) => {
        return `${athlete.first_name?.[0] || ''}${athlete.last_name?.[0] || ''}`.toUpperCase() || 'A'
    }

    const uniqueValues = (values: Array<string | null | undefined>) => {
        return Array.from(
            new Set(
                values
                    .map((value) => value?.trim())
                    .filter((value): value is string => Boolean(value))
            )
        )
    }

    const formatEnumLabel = (value?: string | null) => {
        if (!value) return null
        return value
            .split('_')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
    }

    const getSportNames = (athlete: AthleteCardData) => {
        return uniqueValues([
            ...(athlete.sports?.map((sport) => sport.name) ?? []),
            athlete.primary_sport?.name ?? null,
            ...(athlete.teams?.map((team) => team.sport_name ?? null) ?? []),
        ])
    }

    const getTeamNames = (athlete: AthleteCardData) => {
        return uniqueValues([
            ...(athlete.teams?.map((team) => team.name) ?? []),
            athlete.primary_team?.name ?? null,
        ])
    }

    const getRoleLabels = (athlete: AthleteCardData) => {
        return uniqueValues([
            ...(athlete.roles?.map((role) => formatEnumLabel(role)) ?? []),
            ...(athlete.teams?.map((team) => formatEnumLabel(team.role)) ?? []),
        ])
    }

    const getPositionLabels = (athlete: AthleteCardData) => {
        return uniqueValues([
            ...(athlete.positions ?? []),
            ...(athlete.teams?.map((team) => team.position ?? null) ?? []),
        ])
    }

    const getJerseyNumbers = (athlete: AthleteCardData) => {
        return uniqueValues([
            ...(athlete.jersey_numbers ?? []),
            ...(athlete.teams?.map((team) => team.jersey_number ?? null) ?? []),
            athlete.jersey_number != null ? String(athlete.jersey_number) : null,
        ])
    }

    const summarizeValues = (values: string[], limit: number) => {
        if (values.length <= limit) return values
        return [...values.slice(0, limit), `+${values.length - limit} more`]
    }

    const getMarkerValue = (athlete: AthleteCardData, age: number | null) => {
        const teamCount = getTeamNames(athlete).length
        const sportCount = getSportNames(athlete).length

        if (teamCount > 0) return String(teamCount)
        if (sportCount > 0) return String(sportCount)
        if (age != null) return String(age)
        return '--'
    }

    const getMarkerLabel = (athlete: AthleteCardData, age: number | null) => {
        const teamCount = getTeamNames(athlete).length
        const sportCount = getSportNames(athlete).length

        if (teamCount > 0) return teamCount === 1 ? 'TEAM' : 'TEAMS'
        if (sportCount > 0) return sportCount === 1 ? 'SPORT' : 'SPORTS'
        if (age != null) return 'AGE'
        return 'INFO'
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
                                    <AthleteAvatar
                                        athlete={{ ...athlete, org_id: athlete.org_id ?? context?.orgId ?? undefined, has_profile_photo: athlete.has_profile_photo ?? !!athlete.photo_url } as unknown as Athlete}
                                        photoSize="256"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/25" />
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
                <div className="oa-ticket-list oa-ticket-list--material oa-ticket-list--athletes">
                    {athletes.map((athlete) => {
                        const age = calculateAge(athlete.birthdate)
                        const genderLabel = getGenderLabel(athlete.gender)
                        const displayName = `${athlete.first_name} ${athlete.last_name}`
                        const isSelected = selectedIds?.has(athlete.id)
                        const sportNames = getSportNames(athlete)
                        const teamNames = getTeamNames(athlete)
                        const roleLabels = getRoleLabels(athlete)
                        const positionLabels = getPositionLabels(athlete)
                        const jerseyNumbers = getJerseyNumbers(athlete)
                        const markerValue = getMarkerValue(athlete, age)
                        const markerLabel = getMarkerLabel(athlete, age)
                        const summaryItems = [
                            age !== null ? `Age ${age}` : null,
                            genderLabel !== 'Not specified' ? genderLabel : null,
                            teamNames.length > 0 ? `${teamNames.length} ${teamNames.length === 1 ? 'team' : 'teams'}` : null,
                            sportNames.length > 0 ? `${sportNames.length} ${sportNames.length === 1 ? 'sport' : 'sports'}` : null,
                        ].filter((value): value is string => Boolean(value))
                        const relationshipRows = [
                            sportNames.length > 0 ? { label: 'Sports', values: summarizeValues(sportNames, 3) } : null,
                            teamNames.length > 0 ? { label: 'Teams', values: summarizeValues(teamNames, 3) } : null,
                            [...roleLabels, ...positionLabels, ...jerseyNumbers.map((jerseyNumber) => `#${jerseyNumber}`)].length > 0
                                ? {
                                    label: 'Assignments',
                                    values: summarizeValues(
                                        uniqueValues([
                                            ...roleLabels,
                                            ...positionLabels,
                                            ...jerseyNumbers.map((jerseyNumber) => `#${jerseyNumber}`),
                                        ]),
                                        4
                                    ),
                                }
                                : null,
                        ].filter((row): row is { label: string; values: string[] } => Boolean(row))

                        return (
                            <article
                                key={athlete.id}
                                className={cn(
                                    'group oa-ticket-list__row oa-ticket-list__row--ledger oa-ticket-list__row--athlete-ledger',
                                    selectable && 'oa-ticket-list__row--athlete-selectable'
                                )}
                                onClick={() => onAthleteClick(athlete)}
                            >
                                {/* Selection Checkbox */}
                                {selectable && (
                                    <div
                                        className="oa-athlete-ledger__select"
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
                                <div className="oa-athlete-ledger__avatar-wrap">
                                    <div className="oa-athlete-ledger__avatar">
                                        <AthleteAvatar
                                            athlete={{ ...athlete, org_id: athlete.org_id ?? context?.orgId ?? undefined, has_profile_photo: athlete.has_profile_photo ?? !!athlete.photo_url } as unknown as Athlete}
                                            photoSize="256"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    {!athlete.photo_url && !athlete.has_profile_photo && (
                                        <span className="oa-athlete-ledger__initials" aria-hidden="true">
                                            {getAthleteInitials(athlete)}
                                        </span>
                                    )}
                                </div>

                                <div className="oa-ticket-list__count oa-ticket-list__count--athlete" aria-label={`${markerLabel} ${markerValue}`}>
                                    <span className="oa-ticket-list__count-value">{markerValue}</span>
                                    <span className="oa-ticket-list__count-label">{markerLabel}</span>
                                </div>

                                {/* Info */}
                                <div className="oa-ticket-list__content oa-ticket-list__content--ledger oa-ticket-list__content--athlete">
                                    <button
                                        type="button"
                                        className="oa-ticket-list__title-link oa-ticket-list__title-link--button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onAthleteClick(athlete)
                                        }}
                                    >
                                        <span className="oa-ticket-list__event-name">{displayName}</span>
                                    </button>

                                    <div className="oa-ticket-list__order-meta oa-ticket-list__order-meta--athlete">
                                        {summaryItems.map((item, index) => (
                                            <span key={`${athlete.id}-summary-${item}`} className="oa-athlete-ledger__meta-summary">
                                                {index > 0 && (
                                                    <span className="oa-ticket-list__supporting-dot" aria-hidden="true">|</span>
                                                )}
                                                <span>{item}</span>
                                            </span>
                                        ))}
                                    </div>

                                    {relationshipRows.length > 0 && (
                                        <div className="oa-athlete-ledger__detail-list">
                                            {relationshipRows.map((row) => (
                                                <div key={`${athlete.id}-${row.label}`} className="oa-athlete-ledger__detail-row">
                                                    <span className="oa-athlete-ledger__detail-label">{row.label}</span>
                                                    <div className="oa-athlete-ledger__detail-values">
                                                        {row.values.map((value) => (
                                                            <span
                                                                key={`${athlete.id}-${row.label}-${value}`}
                                                                className={cn(
                                                                    'oa-athlete-ledger__detail-chip',
                                                                    value.startsWith('+') && 'oa-athlete-ledger__detail-chip--overflow'
                                                                )}
                                                            >
                                                                {value}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="oa-ticket-list__side oa-ticket-list__side--ledger oa-ticket-list__side--athlete">
                                    <div className="oa-ticket-list__actions oa-ticket-list__actions--ledger">
                                        <button
                                            className="oa-ticket-list__icon-btn oa-ticket-list__icon-btn--view"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onAthleteClick(athlete)
                                            }}
                                            title="View"
                                            aria-label={`View ${displayName}`}
                                            type="button"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                                visibility
                                            </span>
                                        </button>
                                        <button
                                            className="oa-ticket-list__icon-btn"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onEdit(athlete)
                                            }}
                                            title="Edit"
                                            aria-label={`Edit ${displayName}`}
                                            type="button"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                                edit
                                            </span>
                                        </button>
                                        <button
                                            className="oa-ticket-list__icon-btn oa-ticket-list__icon-btn--delete"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onDelete(athlete)
                                            }}
                                            title="Delete"
                                            aria-label={`Delete ${displayName}`}
                                            type="button"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                                delete
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </article>
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
