/**
 * NearbyAmenities Component
 *
 * Accordion-based display of four curated categories: Pre-Game Food, Coffee & Quick Stops,
 * Essentials & Convenience, Post-Game Hangouts. Context-aware default expanded section.
 * Handles loading, error, and fallback (unranked by category) gracefully.
 */

import { useMemo, useState, useRef, useEffect } from 'react'
import { useNearbyAmenities, useRefreshNearbyAmenities, canShowNearbyAmenities } from '../../hooks/useNearbyAmenities'
import { useUserContext } from '../../hooks/useUserContext'
import { sanitizeVenueContent } from '../../utils/sanitizeVenueContent'
import Card from './Card'
import Button from './Button'
import Icon from './Icon'
import type { AmenityItem } from '../../data/services/nearbyAmenitiesService'

/** Four curated categories (must match Edge Function canonical names) */
const CURATED_CATEGORIES = [
  { id: 'Pre-Game Food', name: 'Pre-Game Food', descriptor: 'Fast, family-friendly meals', icon: 'restaurant' as const },
  { id: 'Coffee & Quick Stops', name: 'Coffee & Quick Stops', descriptor: 'Coffee, cafes & grab-and-go', icon: 'local_cafe' as const },
  { id: 'Essentials & Convenience', name: 'Essentials & Convenience', descriptor: 'Restrooms, stores & pharmacies', icon: 'shopping_bag' as const },
  { id: 'Post-Game Hangouts', name: 'Post-Game Hangouts', descriptor: 'Casual spots for groups', icon: 'place' as const },
] as const

type CuratedCategoryId = (typeof CURATED_CATEGORIES)[number]['id']

interface NearbyAmenitiesProps {
  latitude?: number | null
  longitude?: number | null
  placeId?: string | null
  eventType: string
  eventStartTime: string
  className?: string
  variant?: 'event' | 'travel'
}

/**
 * Sanitize AI-generated description to prevent XSS (Technical T9)
 */
function sanitizeDescription(description: string | undefined | null): string {
  if (!description) return ''
  return sanitizeVenueContent(description)
}

/**
 * Normalize API category to one of the four curated category ids (for display/accordion)
 */
function normalizeToCuratedCategory(category: string | undefined | null): CuratedCategoryId | null {
  if (!category) return null
  const t = category.trim()
  const found = CURATED_CATEGORIES.find(c => c.id === t || c.id.toLowerCase() === t.toLowerCase())
  return found ? found.id : null
}

/**
 * Group amenities by the four curated categories only; preserves category order; hides uncategorized
 */
function groupByCuratedCategories(amenities: AmenityItem[]): Array<{ category: typeof CURATED_CATEGORIES[number]; items: AmenityItem[] }> {
  const map = new Map<CuratedCategoryId, AmenityItem[]>()
  for (const cat of CURATED_CATEGORIES) map.set(cat.id, [])

  for (const amenity of amenities) {
    const catId = normalizeToCuratedCategory(amenity.category)
    if (catId && map.has(catId)) map.get(catId)!.push(amenity)
  }

  return CURATED_CATEGORIES
    .map(category => ({ category, items: map.get(category.id)! }))
    .filter(entry => entry.items.length > 0)
}

/**
 * Get Google Maps URL for a place
 */
function getMapsUrl(placeId: string | undefined, name: string): string | null {
  if (placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${placeId}`
  }
  if (name) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`
  }
  return null
}

/**
 * Category icon mapping (for AmenityRow)
 */
function getCategoryIcon(category: string): string {
  const lowerCategory = category.toLowerCase()
  if (lowerCategory.includes('food') || lowerCategory.includes('meal') || lowerCategory.includes('restaurant')) return 'restaurant'
  if (lowerCategory.includes('coffee') || lowerCategory.includes('drinks') || lowerCategory.includes('cafe')) return 'local_cafe'
  if (lowerCategory.includes('snack') || lowerCategory.includes('convenience') || lowerCategory.includes('essential')) return 'shopping_bag'
  if (lowerCategory.includes('restroom')) return 'wc'
  return 'place'
}

/**
 * Default expanded accordion key from event start time (context-aware)
 * Before event start → Pre-Game Food; Morning events → Coffee & Quick Stops; After event end → Post-Game Hangouts
 */
function getDefaultExpandedKey(eventStartTime: string, categoryIdsWithItems: CuratedCategoryId[]): CuratedCategoryId | null {
  if (categoryIdsWithItems.length === 0) return null
  const now = Date.now()
  let eventStart: number
  try {
    eventStart = new Date(eventStartTime).getTime()
  } catch {
    return categoryIdsWithItems[0]
  }
  const hour = new Date(eventStartTime).getUTCHours()

  if (now < eventStart) {
    return categoryIdsWithItems.includes('Pre-Game Food') ? 'Pre-Game Food' : categoryIdsWithItems[0]
  }
  if (hour >= 5 && hour < 11) {
    return categoryIdsWithItems.includes('Coffee & Quick Stops') ? 'Coffee & Quick Stops' : categoryIdsWithItems[0]
  }
  return categoryIdsWithItems.includes('Post-Game Hangouts') ? 'Post-Game Hangouts' : categoryIdsWithItems[0]
}

const TITLE_BY_VARIANT = {
  travel: 'Near the venue',
  event: 'Nearby Amenities',
} as const

const SUBTITLE = 'Food, coffee & essentials within walking distance'

export default function NearbyAmenities({
  latitude,
  longitude,
  placeId,
  eventType,
  eventStartTime,
  className = '',
  variant = 'event',
}: NearbyAmenitiesProps) {
  const { context } = useUserContext()
  
  // Check if we can show the component
  const canShow = canShowNearbyAmenities(latitude, longitude, placeId)
  
  // Fetch nearby amenities
  const { data, isLoading, error } = useNearbyAmenities({
    latitude,
    longitude,
    placeId,
    eventType,
    eventStartTime,
    enabled: canShow,
  })
  
  // Refresh mutation
  const refreshMutation = useRefreshNearbyAmenities()
  
  // Check if user can refresh (org_admin or coach)
  const canRefresh = useMemo(() => {
    if (!context) return false
    return context.roles.includes('org_admin') || context.roles.includes('coach')
  }, [context])

  // Don't render if we can't show
  if (!canShow) {
    return null
  }

  // Extract amenities
  const amenities = data?.amenities || []
  const hasData = amenities.length > 0
  const isFallback = data?.fallback === true
  
  // Loading state (only show skeleton if no data) - mirror final layout
  if (isLoading && !hasData) {
    return (
      <div className={className}>
        <Card className="p-0 overflow-hidden relative bg-gradient-to-r from-[var(--org-btn-primary-bg,#137fec)]/5 to-transparent dark:from-[var(--org-btn-primary-bg,#137fec)]/10 dark:to-transparent">
          <div className="absolute top-0 left-0 bg-black text-white px-4 py-2 rounded-br-lg w-32 h-10 animate-pulse" />
          <div className="pt-12 p-6 space-y-4 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 max-w-xs" />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Error state - hide section instead of showing error
  if (error && !hasData) {
    return null
  }

  // No data - hide section
  if (!hasData) {
    return null
  }

  const groupedByCategory = useMemo(() => groupByCuratedCategories(amenities), [amenities])
  const categoryIdsWithItems = useMemo(() => groupedByCategory.map(g => g.category.id), [groupedByCategory])
  const defaultExpanded = useMemo(
    () => getDefaultExpandedKey(eventStartTime, categoryIdsWithItems),
    [eventStartTime, categoryIdsWithItems]
  )
  const [expandedKey, setExpandedKey] = useState<CuratedCategoryId | null>(defaultExpanded)
  const headerRefs = useRef<Map<CuratedCategoryId, HTMLButtonElement | null>>(new Map())

  useEffect(() => {
    setExpandedKey(prev => (prev && categoryIdsWithItems.includes(prev) ? prev : defaultExpanded))
  }, [defaultExpanded, categoryIdsWithItems])

  const handleRefresh = () => {
    refreshMutation.mutate({
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
      placeId: placeId ?? undefined,
      eventType,
      eventStartTime,
      refresh: true,
    })
  }

  return (
    <div className={className}>
      <Card className="p-0 overflow-hidden relative bg-gradient-to-r from-[var(--org-btn-primary-bg,#137fec)]/5 to-transparent dark:from-[var(--org-btn-primary-bg,#137fec)]/10 dark:to-transparent">
        {/* Black ribbon header - matches Venue / Lodging / Event Schedule */}
        <div className="absolute top-0 left-0 bg-black text-white px-4 py-2 rounded-br-lg flex items-center gap-2 text-xl font-black uppercase tracking-wider">
          <Icon name="explore" size="text-2xl" />
          {TITLE_BY_VARIANT[variant]}
        </div>

        <div className="pt-12 p-6 space-y-4">
          {/* Subtitle */}
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {SUBTITLE}
          </p>

          {/* Refresh - right-aligned under ribbon */}
          {canRefresh && (
            <div className="flex justify-end -mt-2">
              <Button
                variant="secondary"
                onClick={handleRefresh}
                disabled={refreshMutation.isPending}
                className="text-xs py-2 px-4"
              >
                {refreshMutation.isPending ? (
                  <>
                    <Icon name="refresh" className="animate-spin inline mr-1" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <Icon name="refresh" className="inline mr-1" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Fallback notice */}
          {isFallback && (
            <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded">
              AI descriptions temporarily unavailable. Showing nearby places by category.
            </p>
          )}

          {/* Accordion: one section per category that has items; fallback to flat list if none match */}
          {groupedByCategory.length > 0 ? (
          <div className="space-y-1" role="region" aria-label="Nearby amenities by category">
            {groupedByCategory.map(({ category, items }, index) => {
              const isExpanded = expandedKey === category.id
              const panelId = `nearby-amenities-panel-${category.id.replace(/\s+/g, '-')}`
              const headerId = `nearby-amenities-header-${category.id.replace(/\s+/g, '-')}`

              const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setExpandedKey(prev => (prev === category.id ? null : category.id))
                  return
                }
                if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                  e.preventDefault()
                  const next = groupedByCategory[index + 1]
                  if (next) {
                    headerRefs.current.get(next.category.id)?.focus()
                    setExpandedKey(next.category.id)
                  }
                }
                if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                  e.preventDefault()
                  const prev = groupedByCategory[index - 1]
                  if (prev) {
                    headerRefs.current.get(prev.category.id)?.focus()
                    setExpandedKey(prev.category.id)
                  }
                }
                if (e.key === 'Home') {
                  e.preventDefault()
                  const first = groupedByCategory[0]
                  if (first) {
                    headerRefs.current.get(first.category.id)?.focus()
                    setExpandedKey(first.category.id)
                  }
                }
                if (e.key === 'End') {
                  e.preventDefault()
                  const last = groupedByCategory[groupedByCategory.length - 1]
                  if (last) {
                    headerRefs.current.get(last.category.id)?.focus()
                    setExpandedKey(last.category.id)
                  }
                }
              }

              return (
                <div
                  key={category.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900/50"
                >
                  <h4>
                    <button
                      ref={el => headerRefs.current.set(category.id, el)}
                      type="button"
                      id={headerId}
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      onClick={() => setExpandedKey(prev => (prev === category.id ? null : category.id))}
                      onKeyDown={handleKeyDown}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--org-btn-primary-bg,#137fec)] focus:ring-inset"
                    >
                      <Icon
                        name={category.icon}
                        size="text-lg"
                        className="flex-shrink-0 text-[var(--org-btn-primary-bg,#137fec)]"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="font-bold text-slate-900 dark:text-white block">{category.name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{category.descriptor}</span>
                      </span>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                        {items.length}
                      </span>
                      <Icon
                        name="expand_more"
                        size="text-xl"
                        className={`flex-shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </h4>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={headerId}
                    hidden={!isExpanded}
                    className={isExpanded ? '' : 'hidden'}
                  >
                    <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 space-y-2">
                      {items.map((amenity, i) => (
                        <AmenityRow key={`${amenity.place_id}-${i}`} amenity={amenity} category={category.id} />
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          ) : (
            <div className="space-y-2">
              {amenities.map((amenity, i) => (
                <AmenityRow key={`${amenity.place_id}-${i}`} amenity={amenity} category={amenity.category} />
              ))}
            </div>
          )}

          {/* Footer with icon */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Icon name="info" size="text-sm" className="text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-400">
              Walking times are approximate
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}

/**
 * Individual amenity row component - place card with icon circle, walking badge, tagline
 */
function AmenityRow({ amenity, category }: { amenity: AmenityItem; category?: string }) {
  const mapsUrl = getMapsUrl(amenity.place_id, amenity.name)
  const sanitizedDescription = sanitizeDescription(amenity.description)
  const categoryIcon = getCategoryIcon(category || amenity.category || 'Nearby')

  return (
    <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:shadow-sm transition-all duration-200">
      {/* Category icon in circle */}
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--org-btn-primary-bg,#137fec)]/10 dark:bg-[var(--org-btn-primary-bg,#137fec)]/20 flex items-center justify-center"
        aria-hidden
      >
        <Icon name={categoryIcon} size="text-lg" className="text-[var(--org-btn-primary-bg,#137fec)]" />
      </div>

      {/* Place info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap gap-y-1">
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-slate-900 dark:text-white hover:text-[var(--org-link-color)] hover:underline truncate"
            >
              {amenity.name}
            </a>
          ) : (
            <span className="font-bold text-slate-900 dark:text-white truncate">
              {amenity.name}
            </span>
          )}
          {amenity.walking_minutes > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700/80 px-2.5 py-1 rounded-full whitespace-nowrap border border-slate-200 dark:border-slate-600">
              <Icon name="directions_walk" size="text-xs" />
              ~{amenity.walking_minutes} min
            </span>
          )}
        </div>
        {sanitizedDescription && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 italic">
            {sanitizedDescription}
          </p>
        )}
      </div>

      {/* Maps link icon */}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 p-2 text-slate-400 hover:text-[var(--org-btn-primary-bg,#137fec)] transition-colors rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
          aria-label={`Open ${amenity.name} in Google Maps`}
        >
          <Icon name="open_in_new" size="text-lg" />
        </a>
      )}
    </div>
  )
}
