import { useState } from 'react'
import { cn } from '../../utils/cn'

export interface AthletesFilters {
    search: string
    sportIds: string[]
    teamIds: string[]
    programIds: string[]
    levelIds: string[]
    seasonIds: string[]
    genders: string[]
}

interface AthletesFiltersProps {
    filters: AthletesFilters
    onFiltersChange: (filters: AthletesFilters) => void
    teams: { id: string; name: string }[]
    sports: { id: string; name: string }[]
    programs: { id: string; name: string }[]
    levels: { id: string; name: string }[]
    seasons: { id: string; name: string }[]
    onClearAll: () => void
}

const GENDER_OPTIONS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

const filterChipBase =
    'px-2 py-1 rounded text-xs font-bold border transition-colors'

export default function AthletesFilters({
    filters,
    onFiltersChange,
    teams,
    sports,
    programs,
    levels,
    seasons,
    onClearAll,
}: AthletesFiltersProps) {
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

    const handleSportToggle = (sportId: string) => {
        const current = filters.sportIds
        const next = current.includes(sportId)
            ? current.filter((id) => id !== sportId)
            : [...current, sportId]
        onFiltersChange({ ...filters, sportIds: next })
    }

    const handleProgramToggle = (programId: string) => {
        const current = filters.programIds
        const next = current.includes(programId)
            ? current.filter((id) => id !== programId)
            : [...current, programId]
        onFiltersChange({ ...filters, programIds: next })
    }

    const handleLevelToggle = (levelId: string) => {
        const current = filters.levelIds
        const next = current.includes(levelId)
            ? current.filter((id) => id !== levelId)
            : [...current, levelId]
        onFiltersChange({ ...filters, levelIds: next })
    }

    const handleSeasonToggle = (seasonId: string) => {
        const current = filters.seasonIds
        const next = current.includes(seasonId)
            ? current.filter((id) => id !== seasonId)
            : [...current, seasonId]
        onFiltersChange({ ...filters, seasonIds: next })
    }

    const handleGenderToggle = (gender: string) => {
        const current = filters.genders
        const next = current.includes(gender)
            ? current.filter((g) => g !== gender)
            : [...current, gender]
        onFiltersChange({ ...filters, genders: next })
    }

    const activeFilterCount =
        filters.search.length +
        filters.teamIds.length +
        filters.sportIds.length +
        filters.programIds.length +
        filters.levelIds.length +
        filters.seasonIds.length +
        filters.genders.length

    const activeFilterChips: { key: string; label: string }[] = []

    if (filters.search) {
        activeFilterChips.push({ key: 'search', label: `Search: "${filters.search}"` })
    }
    filters.teamIds.forEach((id) => {
        const team = teams.find((t) => t.id === id)
        if (team) activeFilterChips.push({ key: `team-${id}`, label: team.name })
    })
    filters.sportIds.forEach((id) => {
        const sport = sports.find((s) => s.id === id)
        if (sport) activeFilterChips.push({ key: `sport-${id}`, label: sport.name })
    })
    filters.programIds.forEach((id) => {
        const program = programs.find((p) => p.id === id)
        if (program) activeFilterChips.push({ key: `program-${id}`, label: program.name })
    })
    filters.levelIds.forEach((id) => {
        const level = levels.find((l) => l.id === id)
        if (level) activeFilterChips.push({ key: `level-${id}`, label: level.name })
    })
    filters.seasonIds.forEach((id) => {
        const season = seasons.find((s) => s.id === id)
        if (season) activeFilterChips.push({ key: `season-${id}`, label: season.name })
    })
    filters.genders.forEach((gender) => {
        const option = GENDER_OPTIONS.find((g) => g.value === gender)
        if (option) activeFilterChips.push({ key: `gender-${gender}`, label: option.label })
    })

    const handleRemoveChip = (key: string) => {
        if (key === 'search') {
            onFiltersChange({ ...filters, search: '' })
        } else if (key.startsWith('team-')) {
            const teamId = key.replace('team-', '')
            handleTeamToggle(teamId)
        } else if (key.startsWith('sport-')) {
            const sportId = key.replace('sport-', '')
            handleSportToggle(sportId)
        } else if (key.startsWith('program-')) {
            const programId = key.replace('program-', '')
            handleProgramToggle(programId)
        } else if (key.startsWith('level-')) {
            const levelId = key.replace('level-', '')
            handleLevelToggle(levelId)
        } else if (key.startsWith('season-')) {
            const seasonId = key.replace('season-', '')
            handleSeasonToggle(seasonId)
        } else if (key.startsWith('gender-')) {
            const gender = key.replace('gender-', '')
            handleGenderToggle(gender)
        }
    }

    const chipSelectedStyle = {
        background: 'var(--org-btn-primary-bg)',
        color: 'var(--org-btn-primary-text)',
        borderColor: 'var(--org-btn-primary-bg)',
    }
    const chipDefaultStyle = {
        background: 'var(--pa-surface-panel)',
        color: 'var(--pa-text-secondary)',
        borderColor: 'var(--pa-border-default)',
    }

    return (
        <div 
            className="rounded-xl border shadow-sm mb-4"
            style={{ 
                background: 'var(--pa-surface)',
                borderColor: 'var(--pa-border-default)'
            }}
        >
            {/* Header */}
            <div
                className={cn('flex items-center justify-between cursor-pointer p-4')}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--org-text-tertiary, #6b7280)' }}>
                        filter_list
                    </span>
                    <span className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--org-text-primary, #111)' }}>
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
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-text-muted)' }}>
                    {isOpen ? 'expand_less' : 'expand_more'}
                </span>
            </div>

            {/* Filter Controls */}
            {isOpen && (
                <div 
                    className="pt-0 p-4 border-t"
                    style={{ borderColor: 'var(--pa-border-default)' }}
                >
                    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4')}>
                        {/* Search */}
                        <div className="mb-0 md:col-span-2">
                            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--pa-text-secondary)' }}>
                                Search
                            </label>
                            <div className="relative max-w-sm">
                                <span
                                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{ color: 'var(--pa-text-muted)' }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                                        search
                                    </span>
                                </span>
                                <input
                                    type="text"
                                    className="w-full h-11 pl-10 pr-3 rounded-lg border bg-transparent text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                                    style={{
                                        borderColor: 'var(--pa-border-default)',
                                        color: 'var(--pa-text-primary)',
                                        background: 'var(--pa-surface-panel)'
                                    }}
                                    value={filters.search}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    placeholder="Search athletes..."
                                />
                            </div>
                        </div>

                        {/* Gender */}
                        <div className="mb-0 md:col-span-2">
                            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--pa-text-secondary)' }}>
                                Gender
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {GENDER_OPTIONS.map((gender) => (
                                    <button
                                        key={gender.value}
                                        onClick={() => handleGenderToggle(gender.value)}
                                        className={filterChipBase}
                                        style={filters.genders.includes(gender.value) ? chipSelectedStyle : chipDefaultStyle}
                                    >
                                        {gender.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Collapsible Sections */}
                    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4')}>
                        {/* Sports */}
                        {sports.length > 0 && (
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--pa-text-muted)' }}>
                                    Sports
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                    {sports.map((sport) => (
                                        <button
                                            key={sport.id}
                                            onClick={() => handleSportToggle(sport.id)}
                                            className={filterChipBase}
                                            style={filters.sportIds.includes(sport.id) ? chipSelectedStyle : chipDefaultStyle}
                                        >
                                            {sport.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Teams */}
                        {teams.length > 0 && (
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--org-text-tertiary, #6b7280)' }}>
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

                        {/* Programs */}
                        {programs.length > 0 && (
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--pa-text-muted)' }}>
                                    Programs
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                    {programs.map((program) => (
                                        <button
                                            key={program.id}
                                            onClick={() => handleProgramToggle(program.id)}
                                            className={filterChipBase}
                                            style={filters.programIds.includes(program.id) ? chipSelectedStyle : chipDefaultStyle}
                                        >
                                            {program.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Levels */}
                        {levels.length > 0 && (
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--org-text-tertiary, #6b7280)' }}>
                                    Levels
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                    {levels.map((level) => (
                                        <button
                                            key={level.id}
                                            onClick={() => handleLevelToggle(level.id)}
                                            className={filterChipBase}
                                            style={filters.levelIds.includes(level.id) ? chipSelectedStyle : chipDefaultStyle}
                                        >
                                            {level.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Seasons */}
                        {seasons.length > 0 && (
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--pa-text-muted)' }}>
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
                                style={{ color: 'var(--org-status-error-bg, #dc2626)' }}
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
                                background: 'var(--pa-surface-panel)',
                                color: 'var(--pa-text-primary)',
                            }}
                        >
                            {chip.label}
                            <button
                                onClick={() => handleRemoveChip(chip.key)}
                                className="p-0.5 rounded-full flex items-center justify-center transition-colors"
                                style={{ 
                                    color: 'inherit',
                                    background: 'transparent'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--pa-bg-hover)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent'
                                }}
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
