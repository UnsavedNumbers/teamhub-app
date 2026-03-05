import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Team } from '@/data/types/organization'

interface TeamSwitcherProps {
    selectedTeamId: string | null
    onTeamChange: (teamId: string | null) => void
    teams: Team[]
}

const STORAGE_KEY = 'coach_selected_team_id'
const URL_PARAM = 'team'

/**
 * TeamSwitcher component for coach portal header
 * Allows coaches to filter views by selected team
 * Persists selection in localStorage and URL param
 */
export function TeamSwitcher({ selectedTeamId, onTeamChange, teams }: TeamSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchParams, setSearchParams] = useSearchParams()
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Load from URL param or localStorage on mount
    useEffect(() => {
        const urlTeamId = searchParams.get(URL_PARAM)
        const storedTeamId = localStorage.getItem(STORAGE_KEY)
        
        if (urlTeamId && teams.some(t => t.id === urlTeamId)) {
            onTeamChange(urlTeamId)
        } else if (storedTeamId && teams.some(t => t.id === storedTeamId)) {
            onTeamChange(storedTeamId)
        } else if (teams.length > 0) {
            // Default to first team if none selected
            onTeamChange(teams[0].id)
        }
    }, [teams, onTeamChange, searchParams])

    // Update URL and localStorage when selection changes
    useEffect(() => {
        if (selectedTeamId) {
            localStorage.setItem(STORAGE_KEY, selectedTeamId)
            const newParams = new URLSearchParams(searchParams)
            newParams.set(URL_PARAM, selectedTeamId)
            setSearchParams(newParams, { replace: true })
        } else {
            localStorage.removeItem(STORAGE_KEY)
            const newParams = new URLSearchParams(searchParams)
            newParams.delete(URL_PARAM)
            setSearchParams(newParams, { replace: true })
        }
    }, [selectedTeamId, searchParams, setSearchParams])

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const selectedTeam = teams.find(t => t.id === selectedTeamId)
    const displayText = selectedTeam ? selectedTeam.name : teams.length > 0 ? 'Select Team' : 'No Teams'

    if (teams.length === 0) {
        return null // Don't show switcher if no teams
    }

    if (teams.length === 1) {
        // Show team name without dropdown if only one team
        return (
            <div style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                color: 'var(--pa-n700, #374151)',
                fontWeight: 500
            }}>
                {teams[0].name}
            </div>
        )
    }

    return (
        <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    border: '1px solid var(--pa-n300, #d1d5db)',
                    borderRadius: '0.375rem',
                    backgroundColor: 'white',
                    color: 'var(--pa-n700, #374151)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    minWidth: '150px',
                    justifyContent: 'space-between'
                }}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <span>{displayText}</span>
                <span style={{ fontSize: '0.75rem' }}>{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '0.25rem',
                        backgroundColor: 'white',
                        border: '1px solid var(--pa-n300, #d1d5db)',
                        borderRadius: '0.375rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        zIndex: 1000,
                        minWidth: '200px',
                        maxHeight: '300px',
                        overflowY: 'auto'
                    }}
                >
                    <button
                        onClick={() => {
                            onTeamChange(null)
                            setIsOpen(false)
                        }}
                        style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            textAlign: 'left',
                            border: 'none',
                            backgroundColor: selectedTeamId === null ? 'var(--pa-n100, #f3f4f6)' : 'white',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            color: 'var(--pa-n700, #374151)'
                        }}
                        onMouseEnter={(e) => {
                            if (selectedTeamId !== null) {
                                e.currentTarget.style.backgroundColor = 'var(--pa-n50, #f9fafb)'
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (selectedTeamId !== null) {
                                e.currentTarget.style.backgroundColor = 'white'
                            }
                        }}
                    >
                        All Teams
                    </button>
                    {teams.map((team) => (
                        <button
                            key={team.id}
                            onClick={() => {
                                onTeamChange(team.id)
                                setIsOpen(false)
                            }}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                textAlign: 'left',
                                border: 'none',
                                borderTop: '1px solid var(--pa-n200, #e5e7eb)',
                                backgroundColor: selectedTeamId === team.id ? 'var(--pa-n100, #f3f4f6)' : 'white',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                color: 'var(--pa-n700, #374151)'
                            }}
                            onMouseEnter={(e) => {
                                if (selectedTeamId !== team.id) {
                                    e.currentTarget.style.backgroundColor = 'var(--pa-n50, #f9fafb)'
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (selectedTeamId !== team.id) {
                                    e.currentTarget.style.backgroundColor = 'white'
                                }
                            }}
                        >
                            {team.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
