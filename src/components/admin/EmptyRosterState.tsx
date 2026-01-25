/**
 * Empty Roster State
 * 
 * Enhanced empty state for team roster with two primary actions:
 * 1. Add New Athlete (primary button)
 * 2. Select Existing Athlete (autosuggest)
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { searchAthletes } from '../../data/services/familyService'
import { addAthletesToTeam } from '../../data/services/teamsService'
import { Button } from '../platformAdmin'
import { EntitySelect, type EntitySelectOption } from '../common/EntitySelect'
import { showSuccess, showError, showInfo } from '../../utils/toast'
import type { AthleteWithTeams } from '../../types/athletes'

interface EmptyRosterStateProps {
  teamId: string
  seasonId: string | null
  onAddAthlete: () => void
  onAthleteAdded?: () => void
}

interface AthleteOption {
  id: string
  label: string
  first_name: string
  last_name: string
  age: number | null
}

export function EmptyRosterState({
  teamId,
  seasonId,
  onAddAthlete,
  onAthleteAdded,
}: EmptyRosterStateProps) {
  const { context, isReady } = useUserContext()
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Fetch athletes for autosuggest
  const fetchAthleteOptions = useCallback(
    async (query: string): Promise<AthleteOption[]> => {
      if (!isReady || !context.orgId || query.length < 2) {
        return []
      }

      try {
        const { data, error } = await searchAthletes(context, {
          search: query,
          excludeTeamId: teamId,
          excludeSeasonId: seasonId || undefined,
        })

        if (error) {
          console.error('Error searching athletes:', error)
          return []
        }

        return (data || []).map((athlete: AthleteWithTeams) => {
          const age = athlete.age !== null && athlete.age !== undefined ? athlete.age : null
          const ageLabel = age !== null ? `, Age ${age}` : ''
          return {
            id: athlete.id,
            label: `${athlete.first_name} ${athlete.last_name}${ageLabel}`,
            first_name: athlete.first_name,
            last_name: athlete.last_name,
            age,
            data: {
              id: athlete.id,
              label: `${athlete.first_name} ${athlete.last_name}${ageLabel}`,
              first_name: athlete.first_name,
              last_name: athlete.last_name,
              age,
            },
          }
        })
      } catch (err) {
        console.error('Error in fetchAthleteOptions:', err)
        return []
      }
    },
    [context, isReady, teamId, seasonId]
  )

  // Get athlete by ID (for when value is set externally)
  // Note: EntitySelect may call this, but we don't need it since we clear selection after assignment
  const getAthleteById = useCallback(
    async (_id: string): Promise<AthleteOption | null> => {
      // Since we clear selection immediately after assignment, this shouldn't be needed
      // But EntitySelect requires it, so return null (component will work without it)
      return null
    },
    []
  )

  // Handle athlete selection and assignment
  const handleAthleteSelect = useCallback(
    async (athleteId: string | null) => {
      if (!athleteId || !seasonId || assigning) {
        return
      }

      setAssigning(true)
      setAssignError(null)

      try {
        const { data, error } = await addAthletesToTeam(context, teamId, seasonId, [athleteId])

        if (error) {
          if (isMountedRef.current) {
            setAssignError(error.message || 'Could not assign athlete. Try again.')
          }
          return
        }

        if (data) {
          if (data.added.length > 0) {
            showSuccess(`${data.added.length} athlete${data.added.length > 1 ? 's' : ''} added to team`)
          }

          if (data.skipped.length > 0) {
            showInfo(`${data.skipped.length} athlete${data.skipped.length > 1 ? 's' : ''} already on team`)
          }

          if (data.errors.length > 0) {
            showError(`Could not add ${data.errors.length} athlete${data.errors.length > 1 ? 's' : ''}`)
          }

          // Clear selection
          setSelectedAthleteId(null)

          // Refresh roster
          if (onAthleteAdded) {
            onAthleteAdded()
          }
        }
      } catch (err) {
        if (isMountedRef.current) {
          setAssignError(err instanceof Error ? err.message : 'Could not assign athlete. Try again.')
        }
      } finally {
        if (isMountedRef.current) {
          setAssigning(false)
        }
      }
    },
    [context, teamId, seasonId, assigning, onAthleteAdded]
  )

  // Handle EntitySelect change
  const handleSelectChange = useCallback(
    (id: string | null, _option: EntitySelectOption<AthleteOption> | null) => {
      setSelectedAthleteId(id)
      if (id) {
        handleAthleteSelect(id)
      }
    },
    [handleAthleteSelect]
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: 'var(--pa-space-8) var(--pa-space-4)',
        textAlign: 'center',
      }}
    >
      {/* Icon/Visual Marker */}
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'var(--pa-n100)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--pa-space-4)',
        }}
        className="dark:bg-slate-800"
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '32px',
            color: 'var(--pa-n400)',
            fontVariationSettings: "'FILL' 0",
          }}
        >
          people
        </span>
      </div>

      {/* Headline */}
      <h3
        className="pa-h3 dark:text-white"
        style={{
          margin: '0 0 var(--pa-space-2) 0',
          color: 'var(--pa-n900)',
          maxWidth: '500px',
        }}
      >
        No athletes on this team.
      </h3>

      {/* Supporting Text */}
      <p
        className="pa-body-m dark:text-slate-400"
        style={{
          margin: '0 0 var(--pa-space-6) 0',
          color: 'var(--pa-n600)',
          maxWidth: '500px',
        }}
      >
        Add a new athlete or assign an existing one.
      </p>

      {/* Action Area */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--pa-space-4)',
          width: '100%',
          maxWidth: '500px',
        }}
      >
        {/* Primary Action: Add New Athlete */}
        <Button
          onClick={onAddAthlete}
          variant="primary"
          style={{
            width: '100%',
          }}
        >
          Add Athlete
        </Button>

        {/* Secondary Action: Select Existing Athlete */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--pa-space-2)',
          }}
        >
          <label
            htmlFor="athlete-select"
            className="pa-label dark:text-slate-300"
            style={{
              textAlign: 'left',
              color: 'var(--pa-n700)',
            }}
          >
            Select existing athlete
          </label>
          <EntitySelect<AthleteOption>
            id="athlete-select"
            value={selectedAthleteId}
            onChange={handleSelectChange}
            fetchOptions={fetchAthleteOptions}
            getOptionById={getAthleteById}
            placeholder="Search by name..."
            minQueryLength={2}
            debounceMs={300}
            disabled={!seasonId || assigning}
            loadingText="Searching athletes..."
            noResultsText="No athletes found"
            renderOption={(option) => {
              const athlete = option.data as AthleteOption | undefined
              if (!athlete) return <span>{option.label}</span>
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--pa-n900)' }} className="dark:text-white">
                    {athlete.first_name} {athlete.last_name}
                  </span>
                  {athlete.age !== null && (
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--pa-n500)',
                      }}
                      className="dark:text-slate-400"
                    >
                      Age {athlete.age}
                    </span>
                  )}
                </div>
              )
            }}
          />
          {assignError && (
            <p
              className="pa-body-s"
              style={{
                color: 'var(--pa-danger)',
                margin: 'var(--pa-space-1) 0 0 0',
                textAlign: 'left',
              }}
            >
              {assignError}
            </p>
          )}
          {!seasonId && (
            <p
              className="pa-body-s dark:text-slate-400"
              style={{
                color: 'var(--pa-n500)',
                margin: 'var(--pa-space-1) 0 0 0',
                textAlign: 'left',
              }}
            >
              Select an active season to assign existing athletes.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
