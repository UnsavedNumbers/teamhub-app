import { useState, useEffect } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { getTeamCoaches, assignCoachToTeam, removeCoachFromTeam } from '../../data/services/teamsService'
import { AssignCoachModal } from './AssignCoachModal'
import { Button } from './'

interface CoachAssignment {
    id: string
    team_id: string
    user_id: string
    role: 'head_coach' | 'assistant_coach' | 'team_manager'
    created_at: string
    user?: {
        id: string
        email: string
        display_name: string | null
        phone: string | null
    }
}

interface TeamCoachesTabProps {
    teamId: string
    orgId: string
}

/**
 * TeamCoachesTab - Manage coach assignments for a team
 */
export function TeamCoachesTab({ teamId, orgId }: TeamCoachesTabProps) {
    const { context } = useUserContext()
    const [coaches, setCoaches] = useState<CoachAssignment[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const loadCoaches = async () => {
        if (!context || !teamId) return

        setLoading(true)
        setError(null)
        try {
            const { data, error: err } = await getTeamCoaches(context, teamId)
            if (err) {
                setError(err.message)
                setCoaches([])
            } else {
                setCoaches(data || [])
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load coaches')
            setCoaches([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadCoaches()
    }, [teamId, context])

    const handleAssignCoach = async (coachUserId: string, role: 'head_coach' | 'assistant_coach' | 'team_manager') => {
        if (!context) return

        setError(null)
        try {
            const { error: err } = await assignCoachToTeam(context, teamId, coachUserId, role)
            if (err) {
                setError(err.message)
            } else {
                setIsAdding(false)
                await loadCoaches()
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to assign coach')
        }
    }

    const handleRemoveCoach = async (coachUserId: string) => {
        if (!context) return
        if (!confirm('Are you sure you want to remove this coach from the team?')) return

        setError(null)
        try {
            const { error: err } = await removeCoachFromTeam(context, teamId, coachUserId)
            if (err) {
                setError(err.message)
            } else {
                await loadCoaches()
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove coach')
        }
    }

    if (loading) {
        return (
            <div className="oa-card">
                <div className="oa-card-title">Coaches</div>
                <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
            </div>
        )
    }

    return (
        <div className="oa-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div className="oa-card-title">Coaches</div>
                <Button onClick={() => setIsAdding(true)}>Add Coach</Button>
            </div>

            {error && (
                <div style={{
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                }}>
                    {error}
                </div>
            )}

            {coaches.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--pa-n600, #4b5563)' }}>
                    No coaches assigned to this team.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {coaches.map((coach) => (
                        <div
                            key={coach.id}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '1rem',
                                border: '1px solid var(--pa-n200, #e5e7eb)',
                                borderRadius: '0.375rem',
                                backgroundColor: 'white'
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--pa-n700, #374151)' }}>
                                    {coach.user?.display_name || coach.user?.email || 'Unknown User'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--pa-n600, #4b5563)', marginTop: '0.25rem' }}>
                                    {coach.user?.email}
                                    {coach.role && ` • ${coach.role.replace('_', ' ')}`}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--pa-n500, #6b7280)', marginTop: '0.25rem' }}>
                                    Assigned {new Date(coach.created_at).toLocaleDateString()}
                                </div>
                            </div>
                            <Button
                                onClick={() => handleRemoveCoach(coach.user_id)}
                                style={{
                                    backgroundColor: '#fee2e2',
                                    color: '#991b1b',
                                    border: 'none',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem'
                                }}
                            >
                                Remove
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {isAdding && (
                <AssignCoachModal
                    teamId={teamId}
                    orgId={orgId}
                    onClose={() => setIsAdding(false)}
                    onSuccess={(coachUserId, role) => {
                        handleAssignCoach(coachUserId, role)
                    }}
                />
            )}
        </div>
    )
}
