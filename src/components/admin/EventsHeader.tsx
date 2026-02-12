import { cn } from '../../utils/cn'
import { OrgAdminButton } from './OrgAdminButton'
import type { EventTimeContext, EventViewMode } from '../../types/eventsManagement'

interface EventsHeaderProps {
    timeContext: EventTimeContext
    viewMode: EventViewMode
    onTimeContextChange: (context: EventTimeContext) => void
    onViewModeChange: (mode: EventViewMode) => void
    onCreateClick: () => void
    upcomingCount?: number
}

export default function EventsHeader({
    timeContext,
    viewMode,
    onTimeContextChange,
    onViewModeChange,
    onCreateClick,
    upcomingCount,
}: EventsHeaderProps) {
    const timeContextOptions: { value: EventTimeContext; label: string }[] = [
        { value: 'upcoming', label: 'Upcoming' },
        { value: 'past', label: 'Past' },
        { value: 'all', label: 'All' },
    ]

    const viewModeOptions: { value: EventViewMode; label: string; icon: string }[] = [
        { value: 'list', label: 'List', icon: 'view_list' },
        { value: 'calendar', label: 'Calendar', icon: 'calendar_month' },
        { value: 'agenda', label: 'Agenda', icon: 'view_agenda' },
    ]

    return (
        <div className={cn('flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6')}>
            {/* Left: Time Context Tabs */}
            <div className={cn('flex gap-1 p-1 rounded-md')} style={{ background: 'var(--org-surface-secondary)' }}>
                {timeContextOptions.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => onTimeContextChange(option.value)}
                        className={cn(
                            'px-4 py-2 rounded text-sm font-bold transition-colors',
                            timeContext === option.value
                                ? 'shadow-sm'
                                : 'bg-transparent'
                        )}
                        style={
                            timeContext === option.value
                                ? { background: 'var(--org-surface-primary)', color: 'var(--org-text-primary)' }
                                : { color: 'var(--org-text-secondary)' }
                        }
                    >
                        {option.label}
                        {option.value === 'upcoming' && upcomingCount !== undefined && (
                            <span
                                className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                                style={{ background: 'var(--org-btn-primary-bg)', color: 'var(--org-btn-primary-text)' }}
                            >
                                {upcomingCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Right: View Mode + Create Button */}
            <div className={cn('flex items-center gap-3 w-full sm:w-auto')}>
                {/* View Mode Tabs */}
                <div className={cn('flex gap-1 p-1 rounded-md')} style={{ background: 'var(--org-surface-secondary)' }}>
                    {viewModeOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => onViewModeChange(option.value)}
                            className={cn(
                                'px-3 py-2 rounded text-sm font-bold transition-colors flex items-center gap-1',
                                viewMode === option.value ? 'shadow-sm' : 'bg-transparent'
                            )}
                            style={
                                viewMode === option.value
                                    ? { background: 'var(--org-surface-primary)', color: 'var(--org-text-primary)' }
                                    : { color: 'var(--org-text-secondary)' }
                            }
                            title={option.label}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{option.icon}</span>
                            <span className="hidden sm:inline">{option.label}</span>
                        </button>
                    ))}
                </div>

                {/* Create Event Button - oa-btn--primary only */}
                <OrgAdminButton onClick={onCreateClick} variant="primary" icon="add" className="whitespace-nowrap">
                    Create Event
                </OrgAdminButton>
            </div>
        </div>
    )
}
