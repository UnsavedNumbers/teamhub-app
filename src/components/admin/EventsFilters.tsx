import { useState } from 'react'
import { cn } from '../../utils/cn'
import { DatePicker } from './DatePicker'
import type { EventsFilters } from '../../types/eventsManagement'
import type { EventType } from '../../types/calendar'
import { EVENT_TYPE_LABELS } from '../../types/calendar'

interface EventsFiltersProps {
    filters: EventsFilters
    onFiltersChange: (filters: EventsFilters) => void
    teams: { id: string; name: string }[]
    sports: { id: string; name: string }[]
    seasons: { id: string; name: string }[]
    onClearAll: () => void
}

const filterChipBase =
    'px-2 py-1 rounded text-xs font-bold border transition-colors cursor-pointer'

export default function EventsFilters({
    filters,
    onFiltersChange,
    teams,
    sports,
    seasons,
    onClearAll,
}: EventsFiltersProps) {
    const [isOpen, setIsOpen] = useState(true)

    const handleSearchChange = (value: string) => {
        onFiltersChange({ ...filters, search: value })
    }

    const handleEventTypeToggle = (type: EventType) => {
        const current = filters.eventTypes
        const next = current.includes(type)
            ? current.filter((t) => t !== type)
            : [...current, type]
        onFiltersChange({ ...filters, eventTypes: next })
    }

    const handleTeamToggle = (teamId: string) => {
        const current = filters.teamIds
        const next = current.includes(teamId)
            ? current.filter((id) => id !== teamId)
            : [...current, teamId]
        onFiltersChange({ ...filters, teamIds: next })
    }

    const handleSportToggle = (sportId: string) => {
        const current = filters.sportIds
        const next = current.includes(sportId)
            ? current.filter((id) => id !== sportId)
            : [...current, sportId]
        onFiltersChange({ ...filters, sportIds: next })
    }

    const handleSeasonToggle = (seasonId: string) => {
        const current = filters.seasonIds
        const next = current.includes(seasonId)
            ? current.filter((id) => id !== seasonId)
            : [...current, seasonId]
        onFiltersChange({ ...filters, seasonIds: next })
    }

    const handleStatusToggle = (status: 'scheduled' | 'cancelled' | 'completed' | 'postponed') => {
        const current = filters.status
        const next = current.includes(status)
            ? current.filter((s) => s !== status)
            : [...current, status]
        onFiltersChange({ ...filters, status: next })
    }

    const activeFilterCount =
        filters.search.length +
        filters.eventTypes.length +
        filters.teamIds.length +
        filters.sportIds.length +
        filters.seasonIds.length +
        filters.status.length +
        (filters.dateFrom ? 1 : 0) +
        (filters.dateTo ? 1 : 0)

    const activeFilterChips: { key: string; label: string }[] = []

    if (filters.search) {
        activeFilterChips.push({ key: 'search', label: `Search: "${filters.search}"` })
    }
    if (filters.dateFrom) {
        activeFilterChips.push({ key: 'dateFrom', label: `From: ${filters.dateFrom}` })
    }
    if (filters.dateTo) {
        activeFilterChips.push({ key: 'dateTo', label: `To: ${filters.dateTo}` })
    }
    filters.eventTypes.forEach((type) => {
        activeFilterChips.push({ key: `type-${type}`, label: EVENT_TYPE_LABELS[type] })
    })
    filters.teamIds.forEach((id) => {
        const team = teams.find((t) => t.id === id)
        if (team) activeFilterChips.push({ key: `team-${id}`, label: team.name })
    })
    filters.sportIds.forEach((id) => {
        const sport = sports.find((s) => s.id === id)
        if (sport) activeFilterChips.push({ key: `sport-${id}`, label: sport.name })
    })
    filters.seasonIds.forEach((id) => {
        const season = seasons.find((s) => s.id === id)
        if (season) activeFilterChips.push({ key: `season-${id}`, label: season.name })
    })
    filters.status.forEach((status) => {
        activeFilterChips.push({ key: `status-${status}`, label: status.charAt(0).toUpperCase() + status.slice(1) })
    })

    const handleRemoveChip = (key: string) => {
        if (key === 'search') {
            onFiltersChange({ ...filters, search: '' })
        } else if (key === 'dateFrom') {
            onFiltersChange({ ...filters, dateFrom: '' })
        } else if (key === 'dateTo') {
            onFiltersChange({ ...filters, dateTo: '' })
        } else if (key.startsWith('type-')) {
            const type = key.replace('type-', '') as EventType
            handleEventTypeToggle(type)
        } else if (key.startsWith('team-')) {
            const teamId = key.replace('team-', '')
            handleTeamToggle(teamId)
        } else if (key.startsWith('sport-')) {
            const sportId = key.replace('sport-', '')
            handleSportToggle(sportId)
        } else if (key.startsWith('season-')) {
            const seasonId = key.replace('season-', '')
            handleSeasonToggle(seasonId)
        } else if (key.startsWith('status-')) {
            const status = key.replace('status-', '') as 'scheduled' | 'cancelled' | 'completed' | 'postponed'
            handleStatusToggle(status)
        }
    }

    const chipSelectedStyle = {
        background: 'var(--org-btn-primary-bg)',
        color: 'var(--org-btn-primary-text)',
        borderColor: 'var(--org-btn-primary-bg)',
    }
    const chipDefaultStyle = {
        background: 'var(--org-surface-primary)',
        color: 'var(--org-text-secondary)',
        borderColor: 'var(--org-border-default)',
    }

    return (
        <div className="rounded-xl border bg-white shadow-sm dark:bg-slate-800/50 dark:border-slate-700 mb-4">
            {/* Header */}
            <div
                className={cn('flex items-center justify-between cursor-pointer p-4')}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--org-text-tertiary)' }}>
                        filter_list
                    </span>
                    <span className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--org-text-primary)' }}>
                        Filters
                    </span>
                    {activeFilterCount > 0 && (
                        <span
                            className="text-xs font-black px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--org-btn-primary-bg)', color: 'var(--org-btn-primary-text)' }}
                        >
                            {activeFilterCount}
                        </span>
                    )}
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--org-text-tertiary)' }}>
                    {isOpen ? 'expand_less' : 'expand_more'}
                </span>
            </div>

            {/* Filter Controls */}
            {isOpen && (
                <div className="pt-0 p-4 border-t border-slate-200 dark:border-slate-600">
                    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4')}>
                        {/* Search */}
                        <div className="mb-0">
                            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--org-text-secondary)' }}>
                                Search
                            </label>
                            <div className="relative">
                                <span
                                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{ color: 'var(--org-text-tertiary)' }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                                        search
                                    </span>
                                </span>
                                <input
                                    type="text"
                                    className="w-full h-11 pl-10 pr-3 rounded-lg border bg-transparent text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                                    style={{
                                        borderColor: 'var(--org-border-default)',
                                        color: 'var(--org-text-primary)',
                                    }}
                                    value={filters.search}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    placeholder="Search events..."
                                />
                            </div>
                        </div>

                        {/* Date From */}
                        <div className="mb-0">
                            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--org-text-secondary)' }}>
                                From Date
                            </label>
                            <DatePicker
                                value={filters.dateFrom}
                                onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                            />
                        </div>

                        {/* Date To */}
                        <div className="mb-0">
                            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--org-text-secondary)' }}>
                                To Date
                            </label>
                            <DatePicker
                                value={filters.dateTo}
                                onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
                                min={filters.dateFrom}
                            />
                        </div>

                        {/* Status */}
                        <div className="mb-0">
                            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--org-text-secondary)' }}>
                                Status
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {(['scheduled', 'cancelled', 'completed'] as const).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusToggle(status)}
                                        className={filterChipBase}
                                        style={filters.status.includes(status) ? chipSelectedStyle : chipDefaultStyle}
                                    >
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Collapsible Sections */}
                    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4')}>
                        {/* Event Types */}
                        <div>
                            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--org-text-tertiary)' }}>
                                Event Types
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => handleEventTypeToggle(type)}
                                        className={filterChipBase}
                                        style={filters.eventTypes.includes(type) ? chipSelectedStyle : chipDefaultStyle}
                                    >
                                        {EVENT_TYPE_LABELS[type]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Teams */}
                        {teams.length > 0 && (
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--org-text-tertiary)' }}>
                                    Teams
                                </div>
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

                        {/* Seasons */}
                        {seasons.length > 0 && (
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--org-text-tertiary)' }}>
                                    Seasons
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                    {seasons.map((season) => (
                                        <button
                                            key={season.id}
                                            onClick={() => handleSeasonToggle(season.id)}
                                            className={filterChipBase}
                                            style={filters.seasonIds.includes(season.id) ? chipSelectedStyle : chipDefaultStyle}
                                        >
                                            {season.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Clear All Button */}
                    {activeFilterCount > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                            <button
                                onClick={onClearAll}
                                className="text-xs font-bold underline transition-colors hover:opacity-80"
                                style={{ color: 'var(--org-status-error-bg)' }}
                            >
                                Clear All Filters
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Active Filter Chips */}
            {activeFilterChips.length > 0 && (
                <div className={cn('flex flex-wrap gap-2 p-4 pt-0')}>
                    {activeFilterChips.map((chip) => (
                        <div
                            key={chip.key}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
                            style={{
                                background: 'var(--org-surface-tertiary)',
                                color: 'var(--org-text-primary)',
                            }}
                        >
                            {chip.label}
                            <button
                                onClick={() => handleRemoveChip(chip.key)}
                                className="p-0.5 rounded-full flex items-center justify-center transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                                style={{ color: 'inherit' }}
                                aria-label={`Remove ${chip.label} filter`}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                                    close
                                </span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
