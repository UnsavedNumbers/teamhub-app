/**
 * Tagging Slideout Component
 *
 * Panel for tagging people in a single photo.
 * Features:
 * - Context-aware suggestions by gallery type
 * - Search with debouncing and result highlighting
 * - Tagged people chips with remove
 * - Save & Next functionality
 * - Keyboard shortcuts (ESC, Enter in search)
 * - Focus trap and accessibility
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import {
  getGalleryPhotoUrl,
  type GalleryPhoto,
  type Gallery,
} from '../../data/services/galleryService'
import {
  getSuggestedPeopleForGallery,
  searchPeopleForGallery,
  setTagsForPhoto,
  type GalleryContext,
  type TaggedPerson,
  type SuggestedPerson,
} from '../../data/services/taggingService'
import Button from '../portal/Button'
import Icon from '../portal/Icon'
import { showError, showSuccess } from '../../utils/toast'

// ============================================================================
// Props Interface
// ============================================================================

export interface TaggingSlideoutProps {
  photo: GalleryPhoto
  gallery: Gallery
  isOpen: boolean
  onClose: () => void
  onSave: (options: { advanceToNext: boolean }) => void
  onOpenLightbox?: () => void
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

/**
 * Highlight search term in text (XSS-safe)
 */
function highlightMatch(text: string, query: string): string {
  if (!query) return text

  const escapedText = text.replace(/[&<>"']/g, (char) => {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return escapeMap[char]
  })

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedQuery})`, 'gi')
  return escapedText.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>')
}

// ============================================================================
// Component
// ============================================================================

export function TaggingSlideout({
  photo,
  gallery,
  isOpen,
  onClose,
  onSave,
  onOpenLightbox,
}: TaggingSlideoutProps) {
  const { context, isReady } = useUserContext()
  const t = useT()

  // State
  const [taggedPeople, setTaggedPeople] = useState<TaggedPerson[]>([])
  const [suggestions, setSuggestions] = useState<SuggestedPerson[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SuggestedPerson[]>([])
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null)
  const isMountedRef = useRef(true)

  // Gallery context - memoized to prevent infinite re-renders
  const galleryContext = useMemo<GalleryContext>(
    () => ({
      galleryId: gallery.id,
      galleryType: gallery.gallery_type,
      entityId: gallery.entity_id,
      orgId: gallery.org_id,
    }),
    [gallery.id, gallery.gallery_type, gallery.entity_id, gallery.org_id]
  )

  // ============================================================================
  // Effects
  // ============================================================================

  // Set up mounted ref
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Load suggestions when panel opens or photo changes
  useEffect(() => {
    if (!isOpen || !isReady || !photo.id) return

    const loadSuggestions = async () => {
      setLoading(true)
      try {
        // Get currently tagged IDs to exclude from suggestions
        const taggedIds = photo.tagged_athletes?.map((a) => a.id) || []

        const result = await getSuggestedPeopleForGallery(
          context,
          galleryContext,
          taggedIds,
          20
        )

        if (isMountedRef.current) {
          if (result.data) {
            setSuggestions(result.data)
          }
          setLoading(false)
        }
      } catch (err) {
        console.error('[TaggingSlideout] Error loading suggestions:', err)
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    }

    loadSuggestions()
  }, [isOpen, isReady, photo.id, galleryContext, context])

  // Sync tagged people when photo changes (e.g., after Save & Next)
  useEffect(() => {
    if (!isOpen || !photo.tagged_athletes) return

    const newTaggedPeople: TaggedPerson[] = photo.tagged_athletes.map((athlete) => ({
      ...athlete,
      displayName: `${athlete.first_name} ${athlete.last_name}`,
    }))

    setTaggedPeople(newTaggedPeople)
    setHasUnsavedChanges(false)
  }, [photo.tagged_athletes, photo.id, isOpen])

  // Debounced search handler - use refs to avoid dependency issues
  const contextRef = useRef(context)
  const galleryContextRef = useRef(galleryContext)

  // Update refs when values change
  useEffect(() => {
    contextRef.current = context
  }, [context])

  useEffect(() => {
    galleryContextRef.current = galleryContext
  }, [galleryContext])

  const debouncedSearch = useDebounce(async (query: string) => {
    if (!isMountedRef.current) return

    setSearchLoading(true)
    try {
      const result = await searchPeopleForGallery(contextRef.current, galleryContextRef.current, query, 20)

      if (isMountedRef.current) {
        setSearchResults(result.data || [])
        setSearchLoading(false)
      }
    } catch (err) {
      console.error('[TaggingSlideout] Error searching:', err)
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

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to close
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Focus search input on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // ============================================================================
  // Handlers
  // ============================================================================

  /**
   * Add a person to tagged list
   */
  const addPerson = (person: SuggestedPerson) => {
    const taggedPerson: TaggedPerson = {
      ...person,
      displayName: buildDisplayName(person),
    }

    setTaggedPeople((prev) => [...prev, taggedPerson])
    setHasUnsavedChanges(true)

    // Remove from suggestions/search results
    setSuggestions((prev) => prev.filter((p) => p.id !== person.id))
    setSearchResults((prev) => prev.filter((p) => p.id !== person.id))
  }

  /**
   * Remove a person from tagged list
   */
  const removePerson = (personId: string) => {
    const person = taggedPeople.find((p) => p.id === personId)
    setTaggedPeople((prev) => prev.filter((p) => p.id !== personId))
    setHasUnsavedChanges(true)

    // Optionally re-add to suggestions (if not already there)
    if (person && !suggestions.some((s) => s.id === personId)) {
      setSuggestions((prev) => [...prev, person])
    }
  }

  /**
   * Handle search input keydown
   */
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const currentList = searchQuery ? searchResults : suggestions
      if (currentList.length > 0) {
        addPerson(currentList[0])
        setSearchQuery('')
        setSearchResults([])
      }
    }
  }

  /**
   * Handle save
   */
  const handleSave = async (advanceToNext: boolean = false) => {
    if (saving || !isReady) return

    setSaving(true)

    try {
      const athleteIds = taggedPeople.map((p) => p.id)
      const result = await setTagsForPhoto(photo.id, athleteIds)

      if (result.error) {
        throw result.error
      }

      showSuccess(t('gallery.tagging.saveSuccess'), 4000, { position: 'top-center' })
      setHasUnsavedChanges(false)
      onSave({ advanceToNext })
    } catch (err) {
      showError(t('gallery.tagging.saveError', {
        error: err instanceof Error ? err.message : 'Unknown error',
      }))
    } finally {
      if (isMountedRef.current) {
        setSaving(false)
      }
    }
  }

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const currentList = searchQuery ? searchResults : suggestions
  const sectionLabel = searchQuery
    ? t('gallery.tagging.searchResults')
    : t('gallery.tagging.suggested')

  // Focus trap (simplified - focuses first focusable element on mount)
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // ============================================================================
  // Render
  // ============================================================================

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex pt-16">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Slideout Panel */}
      <div className="relative ml-auto flex h-full w-full max-w-md flex-col shadow-xl transition-transform">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('gallery.tagging.title')}</h2>
          <Button
            variant="secondary"
            onClick={onClose}
            aria-label={t('gallery.tagging.cancel')}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <Icon name="close" size="text-lg" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-850">
          {/* Photo preview */}
          <div className="aspect-[4/3] w-full overflow-hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={onOpenLightbox}
              className="relative h-full w-full group"
              aria-label="Open in lightbox"
            >
              <img
                src={getGalleryPhotoUrl(photo.storage_path)}
                alt={t('gallery.tagging.photoAlt')}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Icon name="open_in_full" size="text-3xl" className="text-white" />
                </div>
              </div>
            </button>
          </div>

          {/* Search */}
          <div className="p-4">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder={t('gallery.tagging.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 pr-24 dark:border-slate-600 dark:bg-slate-800"
              />
              {searchQuery && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  {t('gallery.tagging.enterToAdd')}
                </div>
              )}
              {searchLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                </div>
              )}
            </div>
          </div>

          {/* Tagged people chips */}
          {taggedPeople.length > 0 && (
            <div className="border-b border-slate-200 px-4 pb-4 dark:border-slate-700">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {t('gallery.tagging.peopleTagged', {
                    count: taggedPeople.length,
                    plural: taggedPeople.length !== 1 ? 's' : '',
                  })}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {taggedPeople.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 dark:bg-blue-900/30"
                  >
                    <span className="text-sm">{person.displayName}</span>
                    <button
                      onClick={() => removePerson(person.id)}
                      aria-label={t('gallery.tagging.removeButtonLabel', {
                        name: person.displayName,
                      })}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                    >
                      <Icon name="close" size="text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions / Search results */}
          <div className="p-4">
            <h3 className="mb-2 text-sm font-semibold">{sectionLabel}</h3>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : currentList.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                {searchQuery
                  ? t('gallery.tagging.noResults')
                  : t('gallery.tagging.noResults')}
              </p>
            ) : (
              <div className="space-y-2">
                {currentList.map((person) => {
                  const displayName = buildDisplayName(person)
                  const highlightedName = searchQuery
                    ? highlightMatch(displayName, searchQuery)
                    : displayName

                  return (
                    <button
                      key={person.id}
                      onClick={() => addPerson(person)}
                      className="flex w-full items-center gap-3 rounded-lg border-2 border-slate-200 p-3 text-left transition-colors hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                      aria-label={t('gallery.tagging.addToTagged', {
                        name: displayName,
                      })}
                    >
                      {/* Avatar */}
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-slate-600 font-bold text-white">
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

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          <span dangerouslySetInnerHTML={{ __html: highlightedName }} />
                        </div>
                        {person.role && (
                          <div className="text-xs text-slate-500">
                            {person.role}
                          </div>
                        )}
                      </div>

                      {/* Add button */}
                      <div className="text-blue-500">
                        <Icon name="add" size="text-lg" />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          {/* Unsaved changes warning */}
          {hasUnsavedChanges && (
            <div className="px-6 pt-4">
              <span className="text-xs text-orange-600 dark:text-orange-400">
                {t('gallery.tagging.unsavedChanges')}
              </span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-between px-6 py-4">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              {t('gallery.tagging.cancel')}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => handleSave(false)}
                disabled={saving}
              >
                {saving ? t('gallery.tagging.saving') : t('gallery.tagging.save')}
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSave(true)}
                disabled={saving}
              >
                {saving ? t('gallery.tagging.saving') : t('gallery.tagging.next')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Helper
// ============================================================================

function buildDisplayName(person: SuggestedPerson): string {
  return `${person.first_name} ${person.last_name}`
}
