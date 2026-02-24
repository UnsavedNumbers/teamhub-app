import EmptyState from './EmptyState'

interface CoachEmptyStateProps {
    message?: string
}

/**
 * Empty state component for coaches with no team assignments
 */
export function CoachEmptyState({ message }: CoachEmptyStateProps) {
    return (
        <EmptyState
            icon="group"
            title="No Teams Assigned"
            description={message || "Contact your organization admin to get assigned to a team."}
        />
    )
}
