/**
 * Bulk Tagging Modal Component
 * 
 * Modal for tagging multiple photos at once with the same athletes.
 */

import { useState, useEffect } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { supabase } from '../../lib/supabase'
import { getGalleryPhotoUrl, type GalleryPhoto } from '../../data/services/galleryService'
import Button from '../portal/Button'
import Icon from '../portal/Icon'
import { showError, showSuccess } from '../../utils/toast'

interface BulkTaggingModalProps {
  photos: GalleryPhoto[]
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

interface Athlete {
  id: string
  first_name: string
  last_name: string
}

export function BulkTaggingModal({
  photos,
  isOpen,
  onClose,
  onComplete,
}: BulkTaggingModalProps) {
  const { context, isReady } = useUserContext()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isOpen || !isReady || !context.orgId) return

    const loadAthletes = async () => {
      setLoading(true)
      
      try {
        // Get gallery info from first photo
        if (photos.length === 0) {
          setLoading(false)
          return
        }

        const { data: galleryData } = await supabase
          .from('galleries')
          .select('gallery_type, entity_id, org_id')
          .eq('id', photos[0].gallery_id)
          .single()

        if (!galleryData) {
          setLoading(false)
          return
        }

        let athleteQuery = supabase
          .from('athletes')
          .select('id, first_name, last_name')
          .limit(100)

        // Filter by team if gallery is for a team
        if (galleryData.gallery_type === 'team' && galleryData.entity_id) {
          const { data: teamMembers } = await supabase
            .from('team_memberships')
            .select('athlete_id')
            .eq('team_id', galleryData.entity_id)
            .is('deleted_at', null)

          if (teamMembers && teamMembers.length > 0) {
            const athleteIds = teamMembers.map((tm: any) => tm.athlete_id)
            athleteQuery = athleteQuery.in('id', athleteIds)
          } else {
            setAthletes([])
            setLoading(false)
            return
          }
        } else if (galleryData.org_id) {
          const { data: families } = await supabase
            .from('families')
            .select('id')
            .eq('org_id', galleryData.org_id)

          if (families && families.length > 0) {
            const familyIds = families.map((f: any) => f.id)
            athleteQuery = athleteQuery.in('family_id', familyIds)
          }
        }

        const { data, error } = await athleteQuery

        if (error) {
          console.error('Error loading athletes:', error)
          setLoading(false)
          return
        }

        setAthletes((data || []) as Athlete[])
        setLoading(false)
      } catch (err) {
        console.error('Error in loadAthletes:', err)
        setLoading(false)
      }
    }

    loadAthletes()
  }, [isOpen, isReady, context.orgId])

  const filteredAthletes = athletes.filter((athlete) => {
    if (!searchQuery) return true
    const fullName = `${athlete.first_name} ${athlete.last_name}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase())
  })

  const toggleAthlete = (athleteId: string) => {
    setSelectedAthletes((prev) => {
      const next = new Set(prev)
      if (next.has(athleteId)) {
        next.delete(athleteId)
      } else {
        next.add(athleteId)
      }
      return next
    })
  }

  const handleFinish = async () => {
    if (selectedAthletes.size === 0) {
      showError('Please select at least one athlete')
      return
    }

    setSaving(true)

    try {
      const athleteIds = Array.from(selectedAthletes)
      const photoIds = photos.map((p) => p.id)

      // Bulk insert tags for all selected photos
      const tagsToInsert = photoIds.flatMap((photoId) =>
        athleteIds.map((athleteId) => ({
          photo_id: photoId,
          athlete_id: athleteId,
        }))
      )

      // Use upsert to avoid duplicates
      const { error: insertError } = await supabase
        .from('gallery_photo_tags')
        .upsert(tagsToInsert, {
          onConflict: 'photo_id,athlete_id',
        })

      if (insertError) throw insertError

      showSuccess(`Tagged ${photos.length} photo(s) with ${athleteIds.length} athlete(s)`)
      onComplete()
      onClose()
    } catch (err) {
      showError(`Failed to save tags: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-900 w-full sm:w-[800px] max-h-[90vh] flex flex-col shadow-xl rounded-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold">Currently Tagging ({photos.length} Selected)</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Tags added here will be applied to all selected items.
            </p>
          </div>
          <Button variant="secondary" onClick={onClose}>
            <Icon name="close" size="text-lg" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Selected photos strip */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800"
              >
                <img
                  src={getGalleryPhotoUrl(photo.storage_path)}
                  alt={`Photo ${photo.id}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search roster..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
            />
          </div>

          {/* Applied to batch */}
          {selectedAthletes.size > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Applied to Batch</h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedAthletes).map((athleteId) => {
                  const athlete = athletes.find((a) => a.id === athleteId)
                  if (!athlete) return null
                  return (
                    <div
                      key={athleteId}
                      className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full"
                    >
                      <span className="text-sm">{athlete.first_name} {athlete.last_name}</span>
                      <Icon name="check" size="text-xs" className="text-green-600 dark:text-green-400" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">SAVED</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Frequent athletes */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Frequent Athletes</h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : filteredAthletes.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                No athletes found
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {filteredAthletes.map((athlete) => {
                  const isSelected = selectedAthletes.has(athlete.id)
                  return (
                    <button
                      key={athlete.id}
                      onClick={() => toggleAthlete(athlete.id)}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-slate-600 flex items-center justify-center text-white font-bold">
                          {athlete.first_name[0]}{athlete.last_name[0]}
                        </div>
                        <div className="text-xs text-center truncate w-full">
                          {athlete.first_name} {athlete.last_name}
                        </div>
                        {isSelected && (
                          <Icon name="check_circle" className="text-blue-500" size="text-sm" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleFinish} disabled={saving || selectedAthletes.size === 0}>
            {saving ? 'Saving...' : `Finish Tagging ${photos.length} Photo${photos.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
