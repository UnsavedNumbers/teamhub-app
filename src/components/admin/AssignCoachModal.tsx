import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from './'

interface AssignCoachModalProps {
    teamId: string
    orgId: string
    onClose: () => void
    onSuccess: (coachUserId: string, role: 'head_coach' | 'assistant_coach' | 'team_manager') => void
}

interface UserOption {
    id: string
    email: string
    display_name: string | null
}

/**
 * AssignCoachModal - Search and assign coaches to a team
 */
export function AssignCoachModal({ teamId: _teamId, orgId, onClose, onSuccess }: AssignCoachModalProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [users, setUsers] = useState<UserOption[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
    const [selectedRole, setSelectedRole] = useState<'head_coach' | 'assistant_coach' | 'team_manager'>('head_coach')
    const [error, setError] = useState<string | null>(null)

    // Search for users with coach role in the organization
    useEffect(() => {
        if (searchQuery.length < 2) {
            setUsers([])
            return
        }

        const searchUsers = async () => {
            setLoading(true)
            setError(null)
            try {
                // Search for users who are coaches in this org
                const { data: orgMembers, error: orgError } = await supabase
                    .from('organization_members')
                    .select('user_id, user:users(id, email, display_name)')
                    .eq('org_id', orgId)
                    .eq('role', 'coach')
                    .ilike('user:users.email', `%${searchQuery}%`)

                if (orgError) throw orgError

                // Also search by display_name if available
                const { data: usersData, error: usersError } = await supabase
                    .from('users')
                    .select('id, email, display_name')
                    .or(`email.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
                    .limit(20)

                if (usersError) throw usersError

                // Filter to only include users who are coaches in this org
                const coachUserIds = new Set((orgMembers || []).map((m: any) => m.user_id))
                const filteredUsers = (usersData || [])
                    .filter((u: any) => coachUserIds.has(u.id))
                    .map((u: any) => ({
                        id: u.id,
                        email: u.email,
                        display_name: u.display_name
                    }))

                setUsers(filteredUsers)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to search users')
                setUsers([])
            } finally {
                setLoading(false)
            }
        }

        const timeoutId = setTimeout(searchUsers, 300) // Debounce
        return () => clearTimeout(timeoutId)
    }, [searchQuery, orgId])

    const handleSubmit = () => {
        if (!selectedUserId) {
            setError('Please select a coach')
            return
        }
        onSuccess(selectedUserId, selectedRole)
    }

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: 'white',
                    borderRadius: '0.5rem',
                    padding: '1.5rem',
                    maxWidth: '500px',
                    width: '90%',
                    maxHeight: '80vh',
                    overflowY: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                    Assign Coach to Team
                </h2>

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

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                        Search Coach
                    </label>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Enter email or name..."
                        style={{
                            width: '100%',
                            padding: '0.5rem 0.75rem',
                            border: '1px solid var(--pa-n300, #d1d5db)',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem'
                        }}
                    />
                </div>

                {loading && <div style={{ padding: '1rem', textAlign: 'center' }}>Searching...</div>}

                {users.length > 0 && (
                    <div style={{ marginBottom: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
                        {users.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => setSelectedUserId(user.id)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    textAlign: 'left',
                                    border: selectedUserId === user.id
                                        ? '2px solid var(--org-btn-primary-bg, #3b82f6)'
                                        : '1px solid var(--pa-n200, #e5e7eb)',
                                    borderRadius: '0.375rem',
                                    marginBottom: '0.5rem',
                                    backgroundColor: selectedUserId === user.id ? '#eff6ff' : 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                    {user.display_name || user.email}
                                </div>
                                {user.display_name && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--pa-n600, #4b5563)' }}>
                                        {user.email}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                <div style={{ marginBottom: '1.5rem' }}>
                    <label htmlFor="coach-role" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                        Role
                    </label>
                    <select
                        id="coach-role"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as typeof selectedRole)}
                        style={{
                            width: '100%',
                            padding: '0.5rem 0.75rem',
                            border: '1px solid var(--pa-n300, #d1d5db)',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem'
                        }}
                    >
                        <option value="head_coach">Head Coach</option>
                        <option value="assistant_coach">Assistant Coach</option>
                        <option value="team_manager">Team Manager</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <Button onClick={onClose} style={{ backgroundColor: 'var(--pa-n200, #e5e7eb)', color: 'var(--pa-n700, #374151)' }}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!selectedUserId}>
                        Assign Coach
                    </Button>
                </div>
            </div>
        </div>
    )
}
