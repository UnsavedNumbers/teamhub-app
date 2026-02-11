import { cn } from '../../utils/cn'
import { OrgAdminButton } from './OrgAdminButton'

interface BulkActionsBarProps {
    selectedCount: number
    onCancel?: () => void
    onReschedule?: () => void
    onDelete: () => void
    onClearSelection: () => void
}

export default function BulkActionsBar({
    selectedCount,
    onCancel,
    onReschedule,
    onDelete,
    onClearSelection,
}: BulkActionsBarProps) {
    if (selectedCount === 0) return null

    // Determine context by which handlers are provided
    const isEventContext = !!onCancel || !!onReschedule

    return (
        <div
            className={cn(
                'fixed bottom-0 left-0 right-0 z-50 shadow-lg transition-transform duration-200'
            )}
            style={{
                transform: selectedCount > 0 ? 'translateY(0)' : 'translateY(100%)',
                background: 'var(--bulk-actions-bg, var(--org-btn-primary-bg, rgba(0,0,0,0.06)))',
                color: 'var(--bulk-actions-text, var(--org-btn-primary-text, #111))'
            }}
        >
            <div className={cn('max-w-7xl mx-auto px-4 py-4')}>
                <div className={cn('flex items-center justify-between gap-4 flex-wrap')}>
                    {/* Left: Selection Count */}
                    <div className={cn('flex items-center gap-3')}>
                        <span className="font-bold text-lg">
                            {selectedCount} {selectedCount === 1 ? (isEventContext ? 'event' : 'athlete') : (isEventContext ? 'events' : 'athletes')} selected
                        </span>
                        <button
                            onClick={onClearSelection}
                            className={cn('text-sm underline transition-colors')}
                            style={{ color: 'inherit' }}
                        >
                            Clear selection
                        </button>
                    </div>

                    {/* Right: Actions */}
                    <div className={cn('flex items-center gap-2 flex-nowrap')}>
                        {/* Event-specific actions */}
                        {isEventContext && onCancel && (
                            <OrgAdminButton
                                onClick={onCancel}
                                variant="ghost"
                                icon="cancel"
                                className="hover:bg-white/10 whitespace-nowrap"
                                style={{ color: 'inherit' }}
                            >
                                Cancel Events
                            </OrgAdminButton>
                        )}
                        {isEventContext && onReschedule && (
                            <OrgAdminButton
                                onClick={onReschedule}
                                variant="ghost"
                                icon="schedule"
                                className="hover:bg-white/10 whitespace-nowrap"
                                style={{ color: 'inherit' }}
                            >
                                Reschedule
                            </OrgAdminButton>
                        )}
                        
                        {/* Delete - works for all contexts */}
                        <OrgAdminButton
                            onClick={onDelete}
                            variant="danger"
                            icon="delete"
                            className="whitespace-nowrap"
                            style={{ color: 'var(--org-status-error-text, #fff)' }}
                        >
                            Delete
                        </OrgAdminButton>
                    </div>
                </div>
            </div>
        </div>
    )
}
