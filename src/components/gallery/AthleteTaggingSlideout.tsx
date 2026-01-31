/**
 * Athlete Tagging Slideout Component
 * 
 * Panel for tagging athletes in a single photo.
 * Shows suggested athletes and allows search/selection.
 */

import { useState, useEffect } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { supabase } from '../../lib/supabase'
import { getGalleryPhotoUrl, type GalleryPhoto } from '../../data/services/galleryService'
import Card from '../portal/Card'
import Button from '../portal/Button'
import Icon from '../portal/Icon'
import { showError, showSuccess } from '../../utils/toast'

interface AthleteTaggingSlideoutProps {
  photo: GalleryPhoto
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

interface Athlete {
  id: string
  first_name: string
  last_name: string
  photo_url?: string | null
}

export function AthleteTaggingSlideout({
  photo,
  isOpen,
  onClose,
  onSave,
}: AthleteTaggingSlideoutProps) {
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
        // Get gallery info to determine which athletes to show
        const { data: galleryData } = await supabase
          .from('galleries')
          .select('gallery_type, entity_id, org_id')
          .eq('id', photo.gallery_id)
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
          // Get athletes on this team
          const { data: teamMembers } = await supabase
            .from('team_memberships')
            .select('athlete_id')
            .eq('team_id', galleryData.entity_id)
            .is('deleted_at', null)

          if (teamMembers && teamMembers.length > 0) {
            const athleteIds = teamMembers.map((tm: any) => tm.athlete_id)
            athleteQuery = athleteQuery.in('id', athleteIds)
          } else {
            // No team members, return empty
            setAthletes([])
            setLoading(false)
            return
          }
        } else if (galleryData.org_id) {
          // For other gallery types, filter by org via families
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
        
        // Load existing tags
        if (photo.tagged_athletes) {
          setSelectedAthletes(new Set(photo.tagged_athletes.map((a) => a.id)))
        }

        setLoading(false)
      } catch (err) {
        console.error('Error in loadAthletes:', err)
        setLoading(false)
      }
    }

    loadAthletes()
  }, [isOpen, isReady, context.orgId, photo.tagged_athletes])

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

  const handleSave = async () => {
    if (!isReady) return

    setSaving(true)

    try {
      // Get current tags
      const { data: currentTags } = await supabase
        .from('gallery_photo_tags')
        .select('athlete_id')
        .eq('photo_id', photo.id)

      const currentAthleteIds = new Set((currentTags || []).map((t) => t.athlete_id))
      const selectedIds = Array.from(selectedAthletes)

      // Add new tags
      const toAdd = selectedIds.filter((id) => !currentAthleteIds.has(id))
      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('gallery_photo_tags')
          .insert(
            toAdd.map((athleteId) => ({
              photo_id: photo.id,
              athlete_id: athleteId,
            }))
          )

        if (insertError) throw insertError
      }

      // Remove deleted tags
      const toRemove = Array.from(currentAthleteIds).filter((id) => !selectedAthletes.has(id))
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('gallery_photo_tags')
          .delete()
          .eq('photo_id', photo.id)
          .in('athlete_id', toRemove)

        if (deleteError) throw deleteError
      }

      showSuccess('Tags saved successfully')
      onSave()
      onClose()
    } catch (err) {
      showError(`Failed to save tags: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-900 w-full sm:w-[600px] max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold">Tag Athletes</h2>
          <Button variant="ghost" size="small" onClick={onClose}>
            <Icon name="close" size="text-lg" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Photo preview */}
          <div className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
            <img
              src={getGalleryPhotoUrl(photo.storage_path)}
              alt="Photo to tag"
              className="w-full h-full object-cover"
            />
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

          {/* Selected athletes */}
          {selectedAthletes.size > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Selected Athletes</h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedAthletes).map((athleteId) => {
                  const athlete = athletes.find((a) => a.id === athleteId)
                  if (!athlete) return null
                  return (
                    <div
                      key={athleteId}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full"
                    >
                      <span className="text-sm">{athlete.first_name} {athlete.last_name}</span>
                      <button
                        onClick={() => toggleAthlete(athleteId)}
                        className="text-blue-600 dark:text-blue-400"
                      >
                        <Icon name="close" size="text-xs" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Athlete list */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Suggested Athletes</h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : filteredAthletes.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                No athletes found
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredAthletes.map((athlete) => {
                  const isSelected = selectedAthletes.has(athlete.id)
                  return (
                    <button
                      key={athlete.id}
                      onClick={() => toggleAthlete(athlete.id)}
                      className={`p-3 rounded-lg border-2 transition-colors text-left ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-slate-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {athlete.first_name[0]}{athlete.last_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {athlete.first_name} {athlete.last_name}
                          </div>
                        </div>
                        {isSelected && (
                          <Icon name="check_circle" className="text-blue-500 flex-shrink-0" />
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
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {selectedAthletes.size} athlete{selectedAthletes.size !== 1 ? 's' : ''} tagged
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save & Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
