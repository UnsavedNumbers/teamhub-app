
interface CoachEmptyStateProps {
    message?: string
}

/**
 * Empty state component for coaches with no team assignments
 */
export function CoachEmptyState({ message }: CoachEmptyStateProps) {
    return (
        <div className="coach-empty-state" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem 1.5rem',
            textAlign: 'center',
            minHeight: '400px'
        }}>
            <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                marginBottom: '1rem',
                color: 'var(--pa-n700, #374151)'
            }}>
                No Teams Assigned
            </h2>
            <p style={{
                fontSize: '1rem',
                color: 'var(--pa-n600, #4b5563)',
                maxWidth: '500px',
                lineHeight: '1.6'
            }}>
                {message || "Contact your organization admin to get assigned to a team."}
            </p>
        </div>
    )
}
