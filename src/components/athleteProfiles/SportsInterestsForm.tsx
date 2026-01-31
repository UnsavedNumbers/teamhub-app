import { useState, useEffect, useCallback, memo } from 'react'
import { updateAthleteSports } from '../../data/services/athleteSportsService'
import { getSystemSports } from '../../data/services/sportsService'
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
    onToggle 
}: { 
    sport: Sport
    selectedSports: Array<{ sport_id: string; sport_type: SportType }>
    onToggle: (sportId: string, sportType: SportType) => void
}) => {
    const isPlaysSelected = selectedSports.some(s => s.sport_id === sport.id && s.sport_type === 'plays')
    const isInterestedSelected = selectedSports.some(s => s.sport_id === sport.id && s.sport_type === 'interested')

    return (
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-sm font-medium text-slate-900 dark:text-white">{sport.name}</span>
            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isPlaysSelected}
                        onChange={() => onToggle(sport.id, 'plays')}
                        className="w-4 h-4 text-[var(--org-link-color)] border-slate-300 rounded focus:ring-[var(--org-btn-primary-bg, #137fec)]"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Plays</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isInterestedSelected}
                        onChange={() => onToggle(sport.id, 'interested')}
                        className="w-4 h-4 text-[var(--org-link-color)] border-slate-300 rounded focus:ring-[var(--org-btn-primary-bg, #137fec)]"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Interested</span>
                </label>
            </div>
        </div>
    )
})

SportItem.displayName = 'SportItem'

export function SportsInterestsForm({ athlete, onSave }: SportsInterestsFormProps) {
  const { context } = useUserContext()
  const [sports, setSports] = useState<Sport[]>([])
  const [selectedSports, setSelectedSports] = useState<Array<{ sport_id: string; sport_type: SportType }>>([])
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

  // Initialize selected sports from athlete data
  useEffect(() => {
    if (athlete.sports) {
      setSelectedSports(athlete.sports.map(s => ({
        sport_id: s.sport_id,
        sport_type: s.sport_type as SportType
      })))
    }
  }, [athlete.sports])

  const handleSportToggle = useCallback((sportId: string, sportType: SportType) => {
    setSelectedSports(prev => {
        const exists = prev.some(s => s.sport_id === sportId && s.sport_type === sportType)
        if (exists) {
            return prev.filter(s => !(s.sport_id === sportId && s.sport_type === sportType))
        } else {
            return [...prev, { sport_id: sportId, sport_type: sportType }]
        }
    })
  }, [])

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
