import { useState } from 'react'
import { cn } from '../../utils/cn'
import { DatePicker } from '../platformAdmin/DatePicker'
import type { TravelFilters as TravelFiltersType } from '../../types/travelManagement'
import type { TravelPlanStatus } from '../../types/travelManagement'

interface TravelFiltersProps {
    filters: TravelFiltersType
    onFiltersChange: (filters: TravelFiltersType) => void
    teams: { id: string; name: string }[]
    onClearAll: () => void
}

const STATUS_LABELS: Record<TravelPlanStatus, string> = {
    draft: 'Draft',
    published: 'Published',
    cancelled: 'Cancelled',
}

const filterChipBase = 'px-2 py-1 rounded text-xs font-bold border transition-colors'

export default function TravelFilters({
    filters,
    onFiltersChange,
    teams,
    onClearAll,
}: TravelFiltersProps) {
    const [isOpen, setIsOpen] = useState(true)

    const handleSearchChange = (value: string) => {
        onFiltersChange({ ...filters, search: value })
    }

    const handleTeamToggle = (teamId: string) => {
        const current = filters.teamIds
        const next = current.includes(teamId)
            ? current.filter((id) => id !== teamId)
            : [...current, teamId]
        onFiltersChange({ ...filters, teamIds: next })
    }

    const handleStatusToggle = (status: TravelPlanStatus) => {
        const current = filters.status
        const next = current.includes(status)
            ? current.filter((s) => s !== status)
            : [...current, status]
        onFiltersChange({ ...filters, status: next })
    }

    const activeFilterCount =
        filters.search.length +
        filters.teamIds.length +
        filters.status.length +
        (filters.dateFrom ? 1 : 0) +
        (filters.dateTo ? 1 : 0)

    const activeFilterChips: { key: string; label: string }[] = []
    if (filters.search) activeFilterChips.push({ key: 'search', label: `Search: "${filters.search}"` })
    if (filters.dateFrom) activeFilterChips.push({ key: 'dateFrom', label: `From: ${filters.dateFrom}` })
    if (filters.dateTo) activeFilterChips.push({ key: 'dateTo', label: `To: ${filters.dateTo}` })
    filters.status.forEach((s) => activeFilterChips.push({ key: `status-${s}`, label: STATUS_LABELS[s] }))
    filters.teamIds.forEach((id) => {
        const team = teams.find((t) => t.id === id)
        if (team) activeFilterChips.push({ key: `team-${id}`, label: team.name })
    })

    const handleRemoveChip = (key: string) => {
        if (key === 'search') onFiltersChange({ ...filters, search: '' })
        else if (key === 'dateFrom') onFiltersChange({ ...filters, dateFrom: '' })
        else if (key === 'dateTo') onFiltersChange({ ...filters, dateTo: '' })
        else if (key.startsWith('status-')) handleStatusToggle(key.replace('status-', '') as TravelPlanStatus)
        else if (key.startsWith('team-')) handleTeamToggle(key.replace('team-', ''))
    }

    const chipSelectedStyle = {
        background: 'var(--org-btn-primary-bg)',
        color: 'var(--org-btn-primary-text)',
        borderColor: 'var(--org-btn-primary-bg)',
    }
    const chipDefaultStyle = {
        background: 'var(--org-surface-primary, #fff)',
        color: 'var(--org-text-secondary, #374151)',
        borderColor: 'var(--org-border-default, #e5e7eb)',
    }

    return (
        <div className="rounded-xl border bg-white shadow-sm dark:bg-slate-800/50 dark:border-slate-700 mb-4">
            <div className={cn('flex items-center justify-between cursor-pointer p-4')} onClick={() => setIsOpen(!isOpen)}>
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--org-text-tertiary, #6b7280)' }}>
                        filter_list
                    </span>
                    <span className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--org-text-primary, #111)' }}>
                        Filters
                    </span>
                    {activeFilterCount > 0 && (
                        <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: 'var(--org-btn-primary-bg)', color: 'var(--org-btn-primary-text)' }}>
                            {activeFilterCount}
                        </span>
                    )}
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--org-text-tertiary, #6b7280)' }}>
                    {isOpen ? 'expand_less' : 'expand_more'}
                </span>
            </div>

            {isOpen && (
                <div className="pt-0 p-4 border-t border-slate-200 dark:border-slate-600">
                    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4')}>
                        <div className="mb-0">
                            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--org-text-secondary)' }}>Search</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--org-text-tertiary, #6b7280)' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
                                </span>
                                <input
                                    type="text"
                                    className="w-full h-11 pl-10 pr-3 rounded-lg border bg-transparent text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                                    style={{ borderColor: 'var(--org-border-default, #e5e7eb)', color: 'var(--org-text-primary)' }}
                                    value={filters.search}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    placeholder="Search plans..."
                                />
                            </div>
                        </div>
                        <div className="mb-0">
                            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--org-text-secondary)' }}>From Date</label>
                            <DatePicker value={filters.dateFrom} onChange={(value) => onFiltersChange({ ...filters, dateFrom: value })} />
                        </div>
                        <div className="mb-0">
                            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--org-text-secondary)' }}>To Date</label>
                            <DatePicker value={filters.dateTo} onChange={(value) => onFiltersChange({ ...filters, dateTo: value })} minValue={filters.dateFrom} />
                        </div>
                        <div className="mb-0">
                            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--org-text-secondary)' }}>Status</label>
                            <div className="flex flex-wrap gap-2">
                                {(['draft', 'published', 'cancelled'] as const).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusToggle(status)}
                                        className={filterChipBase}
                                        style={filters.status.includes(status) ? chipSelectedStyle : chipDefaultStyle}
                                    >
                                        {STATUS_LABELS[status]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {teams.length > 0 && (
                        <div className="mb-4">
                            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--org-text-tertiary, #6b7280)' }}>Teams</div>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                {teams.map((team) => (
                                    <button
                                        key={team.id}
                                        onClick={() => handleTeamToggle(team.id)}
                                        className={filterChipBase}
                                        style={filters.teamIds.includes(team.id) ? chipSelectedStyle : chipDefaultStyle}
                                    >
                                        {team.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeFilterCount > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                            <button
                                onClick={onClearAll}
                                className="text-xs font-bold underline transition-colors hover:opacity-80"
                                style={{ color: 'var(--org-status-error-bg, #dc2626)' }}
                            >
                                Clear All Filters
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activeFilterChips.length > 0 && (
                <div className={cn('flex flex-wrap gap-2 p-4 pt-0')}>
                    {activeFilterChips.map((chip) => (
                        <div
                            key={chip.key}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
                            style={{ background: 'var(--org-surface-tertiary, rgba(0,0,0,0.06))', color: 'var(--org-text-primary)' }}
                        >
                            {chip.label}
                            <button
                                onClick={() => handleRemoveChip(chip.key)}
                                className="p-0.5 rounded-full flex items-center justify-center transition-colors hover:bg-black/10"
                                style={{ color: 'inherit' }}
                                aria-label={`Remove ${chip.label} filter`}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
