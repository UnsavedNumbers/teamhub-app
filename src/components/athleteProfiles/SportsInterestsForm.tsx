import { useState, useEffect, useCallback, memo } from 'react'
import { updateAthleteSports } from '../../data/services/athleteSportsService'
import { getSystemSports } from '../../data/services/sportsService'
import { getAthleteTeamHistory } from '../../data/services/teamsService'
import { useUserContext } from '../../hooks/useUserContext'
import Button from '../portal/Button'
import type { Sport } from '../../data/types/organization'
import type { Athlete } from '../../types/family'

type SportType = 'plays' | 'interested'

interface SportsInterestsFormProps {
  athlete: Athlete
  onSave: () => void // Callback to refresh athlete data
}

// Memoized Sport Item Component
const SportItem = memo(({ 
    sport, 
    selectedSports, 
    lockedSportIds,
    onToggle 
}: { 
    sport: Sport
    selectedSports: Array<{ sport_id: string; sport_type: SportType }>
    lockedSportIds: Set<string>
    onToggle: (sportId: string, sportType: SportType) => void
}) => {
    const isPlaysSelected = selectedSports.some(s => s.sport_id === sport.id && s.sport_type === 'plays')
    const isInterestedSelected = selectedSports.some(s => s.sport_id === sport.id && s.sport_type === 'interested')
    const isLocked = lockedSportIds.has(sport.id)

    return (
        <div className="sport-item">
            <div>
                <span className="sport-item-name">{sport.name}</span>
                {isLocked && (
                    <span className="sport-item-locked">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Enrolled in team
                    </span>
                )}
            </div>
            <div className="sport-item-controls">
                <label className="form-checkbox-label" title={isLocked ? "Cannot be removed while enrolled in a team" : ""}>
                    <input
                        type="checkbox"
                        className="form-checkbox"
                        checked={isPlaysSelected || isLocked}
                        disabled={isLocked}
                        onChange={() => !isLocked && onToggle(sport.id, 'plays')}
                    />
                    <span>Plays</span>
                </label>
                {!isLocked && (
                    <label className="form-checkbox-label">
                        <input
                            type="checkbox"
                            className="form-checkbox"
                            checked={isInterestedSelected}
                            onChange={() => onToggle(sport.id, 'interested')}
                        />
                        <span>Interested</span>
                    </label>
                )}
            </div>
        </div>
    )
})

SportItem.displayName = 'SportItem'

export function SportsInterestsForm({ athlete, onSave }: SportsInterestsFormProps) {
  const { context } = useUserContext()
  const [sports, setSports] = useState<Sport[]>([])
  const [selectedSports, setSelectedSports] = useState<Array<{ sport_id: string; sport_type: SportType }>>([])
  const [lockedSportIds, setLockedSportIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load system sports
  useEffect(() => {
    const loadSports = async () => {
      setIsLoading(true)
      const { data, error } = await getSystemSports()
      if (data) {
        setSports(data)
      } else {
        console.error('Failed to load sports:', error)
      }
      setIsLoading(false)
    }
    loadSports()
  }, [])

  // Load team history to determine locks
  useEffect(() => {
    const loadHistory = async () => {
        if (!athlete.id) return
        const { data } = await getAthleteTeamHistory(context, athlete.id)
        if (data && data.length > 0) {
            setLockedSportIds(new Set(data))
        }
    }
    loadHistory()
  }, [athlete.id, context])

  // Initialize selected sports from athlete data, enforcing locks
  useEffect(() => {
    const initialSelected = athlete.sports ? athlete.sports.map(s => ({
        sport_id: s.sport_id,
        sport_type: s.sport_type as SportType
    })) : []

    // Enforce locks: If a sport is locked, it MUST be in 'plays'
    if (lockedSportIds.size > 0) {
        const lockedArray = Array.from(lockedSportIds)
        
        lockedArray.forEach(lockedId => {
            const playsExists = initialSelected.some(s => s.sport_id === lockedId && s.sport_type === 'plays')
            if (!playsExists) {
                initialSelected.push({ sport_id: lockedId, sport_type: 'plays' })
            }
        })
        
        // Note: we're using a local copy 'initialSelected' to set state, 
        // so we catch locked items even if not in DB yet.
    }

    setSelectedSports(initialSelected)
  }, [athlete.sports, lockedSportIds])

  const handleSportToggle = useCallback((sportId: string, sportType: SportType) => {
    setSelectedSports(prev => {
        if (sportType === 'plays' && lockedSportIds.has(sportId)) {
            return prev // Cannot toggle off if locked
        }

        const exists = prev.some(s => s.sport_id === sportId && s.sport_type === sportType)
        if (exists) {
            return prev.filter(s => !(s.sport_id === sportId && s.sport_type === sportType))
        } else {
            return [...prev, { sport_id: sportId, sport_type: sportType }]
        }
    })
  }, [lockedSportIds])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const { error: sportsError } = await updateAthleteSports(
        athlete.id,
        athlete.org_id || context.orgId,
        selectedSports
      )
      if (sportsError) throw sportsError
      onSave() // Refresh parent data
    } catch (err) {
      console.error('Error updating sports:', err)
      setError(err instanceof Error ? err.message : 'Failed to update sports')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="profile-form-loading">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading sports...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="portal-form">
      {error && (
        <div className="form-error-banner">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </div>
      )}
      
      <div className="form-fields">
        {sports.length === 0 ? (
          <p className="text-muted">No sports available.</p>
        ) : (
          sports.map((sport) => (
            <SportItem
              key={sport.id}
              sport={sport}
              selectedSports={selectedSports}
              lockedSportIds={lockedSportIds}
              onToggle={handleSportToggle}
            />
          ))
        )}
      </div>

      <div className="form-actions">
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
