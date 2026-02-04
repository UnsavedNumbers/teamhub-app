/**
 * Bulk Tagging Modal Component
 *
 * Modal for tagging multiple photos at once with the same people.
 * Uses the tagging service for context-aware suggestions.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { supabase } from '../../lib/supabase'
import {
  getGalleryPhotoUrl,
  type GalleryPhoto,
  type Gallery,
} from '../../data/services/galleryService'
import {
  getSuggestedPeopleForGallery,
  searchPeopleForGallery,
  type GalleryContext,
  type SuggestedPerson,
} from '../../data/services/taggingService'
import Button from '../portal/Button'
import Icon from '../portal/Icon'
import { showError, showSuccess } from '../../utils/toast'

// ============================================================================
// Props Interface
// ============================================================================

interface BulkTaggingModalProps {
  photos: GalleryPhoto[]
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Debounce utility function
 */
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  return useCallback(
    (...args: Parameters<T>) => {
      // Cancel previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Abort previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller for this request
      const controller = new AbortController()
      abortControllerRef.current = controller

      timeoutRef.current = setTimeout(() => {
        callback(...args)
        timeoutRef.current = null
        abortControllerRef.current = null
      }, delay)
    },
    [callback, delay]
  )
}

// ============================================================================
// Component
// ============================================================================

export function BulkTaggingModal({
  photos,
  isOpen,
  onClose,
  onComplete,
}: BulkTaggingModalProps) {
  const { context, isReady } = useUserContext()
  const t = useT()

  // State
  const [suggestions, setSuggestions] = useState<SuggestedPerson[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SuggestedPerson[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [gallery, setGallery] = useState<Gallery | null>(null)

  // Refs
  const isMountedRef = useRef(true)

  // Set up mounted ref
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Load gallery info and suggestions when modal opens
  useEffect(() => {
    if (!isOpen || !isReady || !context.orgId || photos.length === 0) return

    const loadData = async () => {
      setLoading(true)

      try {
        // Get gallery info from first photo
        const { data: galleryData } = await supabase
          .from('galleries')
          .select('*')
          .eq('id', photos[0].gallery_id)
          .single()

        if (!galleryData) {
          setLoading(false)
          return
        }

        setGallery(galleryData as Gallery)

        // Get suggestions using tagging service
        const galleryContext: GalleryContext = {
          galleryId: galleryData.id,
          galleryType: galleryData.gallery_type,
          entityId: galleryData.entity_id,
          orgId: galleryData.org_id,
        }

        const result = await getSuggestedPeopleForGallery(
          context,
          galleryContext,
          [],
          50
        )

        if (isMountedRef.current) {
          if (result.data) {
            setSuggestions(result.data)
          }
          setLoading(false)
        }
      } catch (err) {
        console.error('[BulkTaggingModal] Error loading data:', err)
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    }

    loadData()
  }, [isOpen, isReady, context, photos])

  // Debounced search handler
  const debouncedSearch = useDebounce(async (query: string) => {
    if (!isMountedRef.current || !gallery) return

    setSearchLoading(true)
    try {
      const galleryContext: GalleryContext = {
        galleryId: gallery.id,
        galleryType: gallery.gallery_type,
        entityId: gallery.entity_id,
        orgId: gallery.org_id,
      }

      const result = await searchPeopleForGallery(context, galleryContext, query, 50)

      if (isMountedRef.current) {
        setSearchResults(result.data || [])
        setSearchLoading(false)
      }
    } catch (err) {
      console.error('[BulkTaggingModal] Error searching:', err)
      if (isMountedRef.current) {
        setSearchResults([])
        setSearchLoading(false)
      }
    }
  }, 300)

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (value.trim()) {
      debouncedSearch(value)
    } else {
      setSearchResults([])
      setSearchLoading(false)
    }
  }

  // Get current list (search results or suggestions)
  const currentList = searchQuery ? searchResults : suggestions

  // Toggle person selection
  const togglePerson = (personId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(personId)) {
        next.delete(personId)
      } else {
        next.add(personId)
      }
      return next
    })
  }

  // Get display name for person
  const getDisplayName = (person: SuggestedPerson): string => {
    return `${person.first_name} ${person.last_name}`
  }

  // Handle finish
  const handleFinish = async () => {
    if (selectedIds.size === 0) {
      showError(t('gallery.bulkTagging.selectPersonError'))
      return
    }

    setSaving(true)

    try {
      const personIds = Array.from(selectedIds)
      const photoIds = photos.map((p) => p.id)

      // Bulk insert tags for all selected photos
      const tagsToInsert = photoIds.flatMap((photoId) =>
        personIds.map((personId) => ({
          photo_id: photoId,
          athlete_id: personId,
        }))
      )

      // Use upsert to avoid duplicates
      const { error: insertError } = await supabase
        .from('gallery_photo_tags')
        .upsert(tagsToInsert, {
          onConflict: 'photo_id,athlete_id',
        })

      if (insertError) throw insertError

      showSuccess(
        t('gallery.bulkTagging.saveSuccess', {
          photoCount: photos.length,
          photoPlural: photos.length !== 1 ? 's' : '',
          personCount: personIds.length,
          personPlural: personIds.length !== 1 ? 's' : '',
        }),
        4000,
        { position: 'top-center' }
      )
      onComplete()
      onClose()
    } catch (err) {
      showError(
        t('gallery.bulkTagging.saveError', {
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      )
    } finally {
      if (isMountedRef.current) {
        setSaving(false)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-900 w-full sm:w-[800px] max-h-[90vh] flex flex-col shadow-xl rounded-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold">
              {t('gallery.bulkTagging.title', {
                count: photos.length,
                plural: photos.length !== 1 ? 's' : '',
              })}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('gallery.bulkTagging.subtitle')}
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
                  alt={t('gallery.bulkTagging.photoAlt', { id: photo.id })}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder={t('gallery.bulkTagging.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-4 py-2 pr-12 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
            />
            {searchLoading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
            )}
          </div>

          {/* Applied to batch */}
          {selectedIds.size > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">
                {t('gallery.bulkTagging.appliedToBatch')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedIds).map((personId) => {
                  const person = [...currentList, ...suggestions].find(
                    (p) => p.id === personId
                  )
                  if (!person) return null
                  return (
                    <div
                      key={personId}
                      className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full"
                    >
                      <span className="text-sm">{getDisplayName(person)}</span>
                      <Icon
                        name="check"
                        size="text-xs"
                        className="text-green-600 dark:text-green-400"
                      />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {t('gallery.bulkTagging.saved')}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Suggested people */}
          <div>
            <h3 className="text-sm font-semibold mb-2">
              {t('gallery.bulkTagging.suggested')}
            </h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : currentList.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                {t('gallery.bulkTagging.noResults')}
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {currentList.map((person) => {
                  const isSelected = selectedIds.has(person.id)
                  const displayName = getDisplayName(person)

                  return (
                    <button
                      key={person.id}
                      onClick={() => togglePerson(person.id)}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                      aria-label={`Toggle ${displayName}`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-slate-600 flex items-center justify-center text-white font-bold">
                          {person.photo_url ? (
                            <img
                              src={person.photo_url}
                              alt={displayName}
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            <span>
                              {person.first_name[0]}
                              {person.last_name[0]}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-center truncate w-full">
                          {displayName}
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
            {t('gallery.bulkTagging.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleFinish}
            disabled={saving || selectedIds.size === 0}
          >
            {saving
              ? t('gallery.bulkTagging.saving')
              : t('gallery.bulkTagging.finishTagging', {
                  count: photos.length,
                  plural: photos.length !== 1 ? 's' : '',
                })}
          </Button>
        </div>
      </div>
    </div>
  )
}
