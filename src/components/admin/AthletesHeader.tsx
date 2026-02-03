import { cn } from '../../utils/cn'
import { OrgAdminButton } from './OrgAdminButton'

export type AthleteStatusContext = 'active' | 'inactive' | 'graduated' | 'all'
export type AthleteViewMode = 'grid' | 'list'

interface AthletesHeaderProps {
    statusContext: AthleteStatusContext
    viewMode: AthleteViewMode
    onStatusContextChange: (context: AthleteStatusContext) => void
    onViewModeChange: (mode: AthleteViewMode) => void
    onCreateClick: () => void
    activeCount?: number
}

export default function AthletesHeader({
    statusContext,
    viewMode,
    onStatusContextChange,
    onViewModeChange,
    onCreateClick,
    activeCount,
}: AthletesHeaderProps) {
    const statusOptions: { value: AthleteStatusContext; label: string }[] = [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'graduated', label: 'Graduated' },
        { value: 'all', label: 'All Athletes' },
    ]

    const viewModeOptions: { value: AthleteViewMode; label: string; icon: string }[] = [
        { value: 'grid', label: 'Grid', icon: 'grid_view' },
        { value: 'list', label: 'List', icon: 'view_list' },
    ]

    return (
        <div className={cn('flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6')}>
            {/* Left: Status Context Tabs */}
            <div className={cn('flex gap-1 p-1 rounded-md')} style={{ background: 'var(--org-surface-secondary, rgba(0,0,0,0.06))' }}>
                {statusOptions.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => onStatusContextChange(option.value)}
                        className={cn(
                            'px-4 py-2 rounded text-sm font-bold transition-colors',
                            statusContext === option.value
                                ? 'shadow-sm'
                                : 'bg-transparent'
                        )}
                        style={
                            statusContext === option.value
                                ? { background: 'var(--org-surface-primary, #fff)', color: 'var(--org-text-primary, #111)' }
                                : { color: 'var(--org-text-secondary, #555)' }
                        }
                    >
                        {option.label}
                        {option.value === 'active' && activeCount !== undefined && (
                            <span
                                className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                                style={{ background: 'var(--org-btn-primary-bg)', color: 'var(--org-btn-primary-text)' }}
                            >
                                {activeCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Right: View Mode + Create Button */}
            <div className={cn('flex items-center gap-3 w-full sm:w-auto')}>
                {/* View Mode Tabs */}
                <div className={cn('flex gap-1 p-1 rounded-md')} style={{ background: 'var(--org-surface-secondary, rgba(0,0,0,0.06))' }}>
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
                                    ? { background: 'var(--org-surface-primary, #fff)', color: 'var(--org-text-primary, #111)' }
                                    : { color: 'var(--org-text-secondary, #555)' }
                            }
                            title={option.label}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{option.icon}</span>
                            <span className="hidden sm:inline">{option.label}</span>
                        </button>
                    ))}
                </div>

                {/* Create Athlete Button */}
                <OrgAdminButton onClick={onCreateClick} variant="primary" icon="add" className="whitespace-nowrap">
                    Add Athlete
                </OrgAdminButton>
            </div>
        </div>
    )
}
