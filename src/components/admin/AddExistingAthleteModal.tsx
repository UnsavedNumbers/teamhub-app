/**
 * Add Existing Athlete Modal
 * 
 * Modal for adding existing athletes to a team with search and filter capabilities.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { searchAthletes } from '../../data/services/familyService'
import { addAthletesToTeam } from '../../data/services/teamsService'
import type {
  AddExistingAthleteModalProps,
  FilterState,
  AthleteWithTeams
} from '../../types/athletes'
import { Input, EmptyState } from '../platformAdmin'
import { OrgAdminButton } from './OrgAdminButton'

/**
 * Debounce utility function
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null

  const debounced = function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  return debounced
}

export function AddExistingAthleteModal({
  open,
  onClose,
  teamId,
  seasonId,
  onSuccess,
}: AddExistingAthleteModalProps) {
  const { context, isReady } = useUserContext()

  // State declarations (compile-clean)
  const [filters, setFilters] = useState<FilterState>({ search: '' })
  const [athletes, setAthletes] = useState<AthleteWithTeams[]>([])
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<boolean>(false)

  // Refs (compile-clean)
  const isMountedRef = useRef<boolean>(true)
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef<number>(0)
  const selectedAthletesRef = useRef<Set<string>>(new Set())
  const debouncedSearchRef = useRef<ReturnType<typeof debounce> | null>(null)

  // Initial filter state
  const initialFilters: FilterState = { search: '' }

  // Setup cleanup effect (Bug #1 solution)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      if (debouncedSearchRef.current) {
        debouncedSearchRef.current.cancel()
      }
    }
  }, [])

  // Reset state when modal closes (Bug #7 solution)
  useEffect(() => {
    if (!open) {
      setFilters(initialFilters)
      setSelectedAthletes(new Set<string>())
      selectedAthletesRef.current = new Set<string>()
      setError(null)
      setLoading(false)
      setSubmitting(false)
      setAthletes([])
    }
  }, [open])

  // Fetch athletes with request ID tracking (Bug #2 solution)
  const fetchAthletes = useCallback(async (currentFilters: FilterState): Promise<void> => {
    if (!isReady || !context.orgId) return

    const currentRequestId = ++requestIdRef.current

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    // Only search if search term is at least 2 characters (Issue #8 solution)
    if (currentFilters.search && currentFilters.search.length < 2) {
      if (isMountedRef.current && currentRequestId === requestIdRef.current) {
        setAthletes([])
        setLoading(false)
        setError(null)
      }
      return
    }

    if (isMountedRef.current && currentRequestId === requestIdRef.current) {
      setLoading(true)
      setError(null)
    }

    try {
      const { data, error: searchError } = await searchAthletes(context, {
        search: currentFilters.search || undefined,
        ageMin: currentFilters.ageMin,
        ageMax: currentFilters.ageMax,
        levelId: currentFilters.levelId,
        programId: currentFilters.programId,
        excludeTeamId: teamId,
        excludeSeasonId: seasonId,
      })

      // Only update if this is still the latest request and component is mounted
      if (currentRequestId === requestIdRef.current && isMountedRef.current) {
        if (searchError) {
          setError(searchError.message)
          setAthletes([])
        } else {
          setAthletes(data || [])
          setError(null)
        }
        setLoading(false)
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current && isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to search athletes')
        setAthletes([])
        setLoading(false)
      }
    }
  }, [context, isReady, teamId, seasonId])

  // Debounced search effect (Issue #8 solution)
  useEffect(() => {
    if (!open || !isReady) return

    // Cancel previous debounced call
    if (debouncedSearchRef.current) {
      debouncedSearchRef.current.cancel()
    }

    // Create new debounced function
    const debouncedFn = debounce(() => {
      fetchAthletes(filters)
    }, 350)

    debouncedSearchRef.current = debouncedFn

    // Trigger search
    debouncedFn()

    // Cleanup
    return () => {
      if (debouncedSearchRef.current) {
        debouncedSearchRef.current.cancel()
      }
    }
  }, [filters, open, isReady, fetchAthletes])

  // Handlers (Bug #3, #6 solution - useCallback with functional updates)
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    setFilters(prev => ({ ...prev, search: e.target.value }))
  }, [])

  const toggleSelection = useCallback((athleteId: string): void => {
    setSelectedAthletes(prev => {
      const next = new Set<string>(prev)
      if (next.has(athleteId)) {
        next.delete(athleteId)
      } else {
        next.add(athleteId)
      }
      selectedAthletesRef.current = next
      return next
    })
  }, [])

  const handleSelectAll = useCallback((): void => {
    setSelectedAthletes(() => {
      const next = new Set<string>(athletes.map(a => a.id))
      selectedAthletesRef.current = next
      return next
    })
  }, [athletes])

  const handleDeselectAll = useCallback((): void => {
    setSelectedAthletes(() => {
      const next = new Set<string>()
      selectedAthletesRef.current = next
      return next
    })
  }, [])

  const handleClearFilters = useCallback((): void => {
    setFilters(initialFilters)
  }, [])

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (submitting) return // Bug #8 solution - early return guard

    const current = selectedAthletesRef.current
    if (current.size === 0) return

    setSubmitting(true)
    setError(null)

    try {
      const athleteIds = Array.from(current)
      const result = await addAthletesToTeam(context, teamId, seasonId, athleteIds)

      if (result.error) {
        setError(result.error.message)
        setSubmitting(false)
        return
      }

      if (result.data) {
        // Show success message
        const { added, skipped, errors } = result.data
        let message = `Successfully added ${added.length} athlete${added.length !== 1 ? 's' : ''} to the team.`
        if (skipped.length > 0) {
          message += ` ${skipped.length} athlete${skipped.length !== 1 ? 's were' : ' was'} already on the team.`
        }
        if (errors.length > 0) {
          message += ` ${errors.length} athlete${errors.length !== 1 ? 's' : ''} could not be added.`
        }

        // Close modal and refresh roster
        onSuccess()
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add athletes to team')
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false)
      }
    }
  }, [submitting, context, teamId, seasonId, onSuccess, onClose])

  if (!open) return null

  const selectedCount = selectedAthletes.size
  const hasActiveFilters = filters.search.length > 0 || 
    filters.ageMin !== undefined || 
    filters.ageMax !== undefined || 
    filters.levelId !== undefined || 
    filters.programId !== undefined

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(11, 15, 20, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Dialog */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="pa-card"
          style={{
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            margin: 'var(--pa-space-4)',
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{ padding: 'var(--pa-space-5)', borderBottom: '1px solid var(--pa-n100)' }}>
            <h2 className="pa-h2" style={{ margin: 0 }}>
              Add Existing Athletes to Team
            </h2>
            <p className="pa-body-m" style={{ margin: 'var(--pa-space-2) 0 0 0', color: 'var(--pa-n700)' }}>
              Search and select athletes to add to this team
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: 'var(--pa-space-5)', flex: 1, overflow: 'auto' }}>
            {/* Search Input */}
            <div style={{ marginBottom: 'var(--pa-space-4)' }}>
              <Input
                type="text"
                placeholder="Search by name (minimum 2 characters)..."
                value={filters.search}
                onChange={handleSearchChange}
                disabled={loading || submitting}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="pa-card pa-mb-4"
                style={{
                  background: 'var(--pa-danger-bg)',
                  border: '1px solid var(--pa-danger)',
                  padding: 'var(--pa-space-3)',
                  marginBottom: 'var(--pa-space-4)',
                }}
              >
                <p className="pa-body-m" style={{ margin: 0, color: 'var(--pa-danger)' }}>
                  {error}
                </p>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div style={{ textAlign: 'center', padding: 'var(--pa-space-6)' }}>
                <p className="pa-body-m" style={{ color: 'var(--pa-n500)' }}>
                  Searching athletes...
                </p>
              </div>
            )}

            {/* Athlete List */}
            {!loading && athletes.length > 0 && (
              <div style={{ marginBottom: 'var(--pa-space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--pa-space-3)' }}>
                  <p className="pa-body-m" style={{ margin: 0, fontWeight: 700 }}>
                    {athletes.length} athlete{athletes.length !== 1 ? 's' : ''} found
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--pa-space-2)' }}>
                    <OrgAdminButton
                      variant="secondary"
                      size="compact"
                      onClick={handleSelectAll}
                      disabled={submitting}
                    >
                      Select All
                    </OrgAdminButton>
                    <OrgAdminButton
                      variant="secondary"
                      size="compact"
                      onClick={handleDeselectAll}
                      disabled={submitting}
                    >
                      Deselect All
                    </OrgAdminButton>
                  </div>
                </div>

                <div
                  style={{
                    border: '1px solid var(--pa-n200)',
                    borderRadius: 'var(--pa-radius-m)',
                    maxHeight: '400px',
                    overflow: 'auto',
                  }}
                >
                  {athletes.map((athlete) => {
                    const isSelected = selectedAthletes.has(athlete.id)
                    const isDisabled = false // Could check if already on team

                    return (
                      <div
                        key={athlete.id}
                        style={{
                          padding: 'var(--pa-space-4)',
                          borderBottom: '1px solid var(--pa-n100)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--pa-space-3)',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          opacity: isDisabled ? 0.5 : 1,
                          background: isSelected ? 'var(--pa-n50)' : 'transparent',
                        }}
                        onClick={() => !isDisabled && toggleSelection(athlete.id)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDisabled || submitting}
                          onChange={() => !isDisabled && toggleSelection(athlete.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div style={{ flex: 1 }}>
                          <p className="pa-body-m" style={{ margin: 0, fontWeight: 700 }}>
                            {athlete.first_name} {athlete.last_name}
                          </p>
                          <p className="pa-body-s" style={{ margin: 'var(--pa-space-1) 0 0 0', color: 'var(--pa-n500)' }}>
                            {athlete.age !== null ? `Age ${athlete.age}` : 'Age unknown'}
                            {athlete.currentTeams && athlete.currentTeams.length > 0 && (
                              <> • Current teams: {athlete.currentTeams.map(t => t.teamName).join(', ')}</>
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && athletes.length === 0 && (
              <EmptyState
                icon="person_search"
                title={hasActiveFilters ? "No athletes match your filters" : "Start searching"}
                description={
                  hasActiveFilters
                    ? "Try adjusting your search or filters to find athletes."
                    : "Type at least 2 characters to search for athletes."
                }
                action={
                  hasActiveFilters
                    ? {
                        label: 'Clear Filters',
                        onClick: handleClearFilters,
                      }
                    : undefined
                }
              />
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: 'var(--pa-space-5)',
              borderTop: '1px solid var(--pa-n100)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <p className="pa-body-m" style={{ margin: 0, color: 'var(--pa-n500)' }}>
              {selectedCount > 0 ? `${selectedCount} athlete${selectedCount !== 1 ? 's' : ''} selected` : 'No athletes selected'}
            </p>
            <div style={{ display: 'flex', gap: 'var(--pa-space-3)' }}>
              <OrgAdminButton
                variant="secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </OrgAdminButton>
              <OrgAdminButton
                variant="primary"
                onClick={handleSubmit}
                disabled={submitting || selectedCount === 0}
                loading={submitting}
              >
                {submitting ? 'Adding...' : 'Add to Team'}
              </OrgAdminButton>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
