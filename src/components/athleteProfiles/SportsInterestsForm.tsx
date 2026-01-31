import { useState, useEffect, useCallback, memo } from 'react'
import { updateAthleteSports } from '../../data/services/athleteSportsService'
import { getSystemSports } from '../../data/services/sportsService'
import { getAthleteTeamHistory } from '../../data/services/teamsService'
import { useUserContext } from '../../hooks/useUserContext'
import Button from '../portal/Button'
import Card from '../portal/Card'
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
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700">
            <div>
                <span className="text-sm font-medium text-slate-900 dark:text-white block">{sport.name}</span>
                {isLocked && (
                    <span className="text-xs text-amber-600 dark:text-amber-500 flex items-center mt-1">
                        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Enrolled in team
                    </span>
                )}
            </div>
            <div className="flex gap-4">
                <label className={`flex items-center gap-2 ${isLocked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`} title={isLocked ? "Cannot be removed while enrolled in a team" : ""}>
                    <input
                        type="checkbox"
                        checked={isPlaysSelected || isLocked}
                        disabled={isLocked}
                        onChange={() => !isLocked && onToggle(sport.id, 'plays')}
                        className={`w-4 h-4 rounded focus:ring-[var(--org-btn-primary-bg, #137fec)] ${
                            isLocked 
                                ? 'text-slate-400 border-slate-200 bg-slate-100 dark:bg-slate-800 dark:border-slate-600' 
                                : 'text-[var(--org-link-color)] border-slate-300'
                        }`}
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Plays</span>
                </label>
                {!isLocked && (
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isInterestedSelected}
                            onChange={() => onToggle(sport.id, 'interested')}
                            className="w-4 h-4 text-[var(--org-link-color)] border-slate-300 rounded focus:ring-[var(--org-btn-primary-bg, #137fec)]"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">Interested</span>
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
    let initialSelected = athlete.sports ? athlete.sports.map(s => ({
        sport_id: s.sport_id,
        sport_type: s.sport_type as SportType
    })) : []

    // Enforce locks: If a sport is locked, it MUST be in 'plays'
    if (lockedSportIds.size > 0) {
        const lockedArray = Array.from(lockedSportIds)
        let changed = false
        
        lockedArray.forEach(lockedId => {
            const playsExists = initialSelected.some(s => s.sport_id === lockedId && s.sport_type === 'plays')
            if (!playsExists) {
                initialSelected.push({ sport_id: lockedId, sport_type: 'plays' })
                changed = true
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
    return <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-slate-900 dark:border-white mx-auto"></div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-red-600 text-sm mb-4">{error}</div>
      )}
      
      {sports.length === 0 ? (
        <p className="text-sm text-slate-500">No sports available.</p>
      ) : (
        <div className="space-y-3">
          {sports.map((sport) => (
            <SportItem
              key={sport.id}
              sport={sport}
              selectedSports={selectedSports}
              lockedSportIds={lockedSportIds}
              onToggle={handleSportToggle}
            />
          ))}
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
