import { cn } from '../../utils/cn'
import { useT } from '../../i18n/useI18n'
import { OrgAdminButton } from './OrgAdminButton'
import type { TravelTimeContext, TravelViewMode } from '../../types/travelManagement'

interface TravelHeaderProps {
    timeContext: TravelTimeContext
    viewMode: TravelViewMode
    onTimeContextChange: (context: TravelTimeContext) => void
    onViewModeChange: (mode: TravelViewMode) => void
    onCreateClick?: () => void
    upcomingCount?: number
}

export default function TravelHeader({
    timeContext,
    viewMode,
    onTimeContextChange,
    onViewModeChange,
    onCreateClick,
    upcomingCount,
}: TravelHeaderProps) {
    const t = useT()
    const timeContextOptions: { value: TravelTimeContext; label: string }[] = [
        { value: 'upcoming', label: t('admin.travel.tabs.current') },
        { value: 'past', label: t('admin.travel.tabs.past') },
        { value: 'all', label: t('admin.travel.tabs.all') },
    ]

    const viewModeOptions: { value: TravelViewMode; label: string; icon: string }[] = [
        { value: 'list', label: 'List', icon: 'view_list' },
        { value: 'calendar', label: 'Calendar', icon: 'calendar_month' },
        { value: 'agenda', label: 'Agenda', icon: 'view_agenda' },
    ]

    return (
        <div className={cn('flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6')}>
            <div 
                className={cn('flex gap-1 p-1 rounded-lg')} 
                style={{ 
                    background: 'var(--pa-surface-panel)',
                    border: '1px solid var(--pa-border-subtle)'
                }}
            >
                {timeContextOptions.map((option) => {
                    const isActive = timeContext === option.value
                    return (
                        <button
                            key={option.value}
                            onClick={() => onTimeContextChange(option.value)}
                            className={cn(
                                'px-4 py-2 rounded-md text-sm font-bold transition-all',
                                isActive ? '' : 'bg-transparent'
                            )}
                            style={
                                isActive
                                    ? { 
                                        background: 'var(--pa-surface)', 
                                        color: 'var(--pa-text-primary)',
                                        border: '1px solid var(--pa-border-subtle)',
                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)'
                                    }
                                    : { 
                                        color: 'var(--pa-text-secondary)',
                                        border: '1px solid transparent'
                                    }
                            }
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.color = 'var(--pa-text-primary)'
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.color = 'var(--pa-text-secondary)'
                                }
                            }}
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
                    )
                })}
            </div>

            <div className={cn('flex items-center gap-3 w-full sm:w-auto flex-shrink-0')}>
                <div 
                    className={cn('flex gap-1 p-1 rounded-lg')} 
                    style={{ 
                        background: 'var(--pa-surface-panel)',
                        border: '1px solid var(--pa-border-subtle)'
                    }}
                >
                    {viewModeOptions.map((option) => {
                        const isActive = viewMode === option.value
                        return (
                            <button
                                key={option.value}
                                onClick={() => onViewModeChange(option.value)}
                                className={cn(
                                    'px-3 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-1',
                                    isActive ? '' : 'bg-transparent'
                                )}
                                style={
                                    isActive
                                        ? { 
                                            background: 'var(--pa-surface)', 
                                            color: 'var(--pa-text-primary)',
                                            border: '1px solid var(--pa-border-subtle)',
                                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)'
                                        }
                                        : { 
                                            color: 'var(--pa-text-secondary)',
                                            border: '1px solid transparent'
                                        }
                                }
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.color = 'var(--pa-text-primary)'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.color = 'var(--pa-text-secondary)'
                                    }
                                }}
                                title={option.label}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{option.icon}</span>
                                <span className="hidden sm:inline">{option.label}</span>
                            </button>
                        )
                    })}
                </div>

                {onCreateClick && (
                    <OrgAdminButton onClick={onCreateClick} variant="primary" icon="add" className="whitespace-nowrap">
                        Create Plan
                    </OrgAdminButton>
                )}
            </div>
        </div>
    )
}
