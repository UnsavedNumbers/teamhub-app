/**
 * NearbyAmenities Component
 *
 * Accordion-based display of four curated categories: Pre-Game Food, Coffee & Quick Stops,
 * Essentials & Convenience, Post-Game Hangouts. Context-aware default expanded section.
 * Handles loading, error, and fallback (unranked by category) gracefully.
 */

import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
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
  variant?: 'event' | 'travel' | 'fan'
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
  
  // Exact match first
  const exactMatch = CURATED_CATEGORIES.find(c => c.id === t)
  if (exactMatch) return exactMatch.id
  
  // Case-insensitive match
  const caseMatch = CURATED_CATEGORIES.find(c => c.id.toLowerCase() === t.toLowerCase())
  if (caseMatch) return caseMatch.id
  
  // Fuzzy match for common variations
  const lower = t.toLowerCase()
  if (lower.includes('pre-game') || lower.includes('pregame') || lower.includes('food')) return 'Pre-Game Food'
  if (lower.includes('coffee') || lower.includes('cafe') || lower.includes('quick')) return 'Coffee & Quick Stops'
  if (lower.includes('essential') || lower.includes('convenience') || lower.includes('store')) return 'Essentials & Convenience'
  if (lower.includes('post-game') || lower.includes('postgame') || lower.includes('hangout')) return 'Post-Game Hangouts'
  
  return null
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
  fan: 'Nearby',
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

  // Extract amenities
  const amenities = data?.amenities || []
  const hasData = amenities.length > 0
  const isFallback = data?.fallback === true
  
  // DEBUG: Log categories coming from API
  if (hasData) {
    console.log('[NearbyAmenities] API returned categories:', amenities.map(a => ({ name: a.name, category: a.category })))
  }
  
  // All hooks must be called before any conditional returns
  const groupedByCategory = useMemo(() => 
    hasData ? groupByCuratedCategories(amenities) : [], 
    [amenities, hasData]
  )
  const categoryIdsWithItems = useMemo(() => 
    groupedByCategory.map(g => g.category.id), 
    [groupedByCategory]
  )
  const defaultExpanded = useMemo(
    () => getDefaultExpandedKey(eventStartTime, categoryIdsWithItems),
    [eventStartTime, categoryIdsWithItems]
  )
  const [expandedKey, setExpandedKey] = useState<CuratedCategoryId | null>(defaultExpanded)
  const headerRefs = useRef<Map<CuratedCategoryId, HTMLButtonElement | null>>(new Map())

  useEffect(() => {
    setExpandedKey(prev => (prev && categoryIdsWithItems.includes(prev) ? prev : defaultExpanded))
  }, [defaultExpanded, categoryIdsWithItems])

  const handleRefresh = useCallback(() => {
    refreshMutation.mutate({
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
      placeId: placeId ?? undefined,
      eventType,
      eventStartTime,
      refresh: true,
    })
  }, [refreshMutation, latitude, longitude, placeId, eventType, eventStartTime])

  // Now safe to do conditional returns after all hooks
  // Don't render if we can't show
  if (!canShow) {
    return null
  }
  
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

  // Fan variant uses fan-event-sidebar-card styling
  if (variant === 'fan') {
    return (
      <div className={`fan-event-sidebar-card ${className}`}>
        <h3 className="fan-event-sidebar-title">
          <span className="material-symbols-outlined">explore</span>
          {TITLE_BY_VARIANT[variant]}
        </h3>
        <p className="fan-event-sidebar-text fan-text-xs">
          {SUBTITLE}
        </p>

        {/* Fallback notice */}
        {isFallback && (
          <p className="fan-commute-location fan-text-xs">
            AI descriptions temporarily unavailable. Showing nearby places by category.
          </p>
        )}

        {/* Accordion */}
        {groupedByCategory.length > 0 ? (
          <div className="fan-nearby-accordion" role="region" aria-label="Nearby amenities by category">
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
                <div key={category.id} className="fan-nearby-category">
                  <h4>
                    <button
                      ref={el => headerRefs.current.set(category.id, el)}
                      type="button"
                      id={headerId}
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      onClick={() => setExpandedKey(prev => (prev === category.id ? null : category.id))}
                      onKeyDown={handleKeyDown}
                      className="fan-nearby-category-header"
                    >
                      <span className="material-symbols-outlined">
                        {category.icon}
                      </span>
                      <span className="fan-nearby-category-name">
                        <strong>{category.name}</strong>
                        <span>{category.descriptor}</span>
                      </span>
                      <span className="fan-nearby-category-count">
                        {items.length}
                      </span>
                      <span className={`material-symbols-outlined fan-nearby-category-arrow ${isExpanded ? 'expanded' : ''}`}>
                        expand_more
                      </span>
                    </button>
                  </h4>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={headerId}
                    hidden={!isExpanded}
                    className={isExpanded ? '' : 'hidden'}
                  >
                    <div className="fan-nearby-category-content">
                      {items.map((amenity, i) => (
                        <AmenityRow key={`${amenity.place_id}-${i}`} amenity={amenity} category={category.id} isFan />
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="fan-nearby-list">
            {amenities.map((amenity, i) => (
              <AmenityRow key={`${amenity.place_id}-${i}`} amenity={amenity} category={amenity.category} isFan />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="fan-nearby-footer">
          Walking times are approximate
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <Card className="p-0 overflow-hidden relative bg-gradient-to-r from-[var(--org-btn-primary-bg,#137fec)]/5 to-transparent dark:from-[var(--org-btn-primary-bg,#137fec)]/10 dark:to-transparent">
        {/* Black ribbon header - matches Venue / Lodging / Event Schedule */}
        <div className="absolute top-0 left-0 bg-black text-white px-4 py-2 rounded-br-lg flex items-center gap-2 text-xl font-black uppercase tracking-wider">
          <Icon name="explore" size="text-2xl" />
          {TITLE_BY_VARIANT[variant]}
        </div>

        <div className="pt-12 px-4 pb-4 space-y-3">
          {/* Subtitle */}
          <p className="text-xs text-slate-500 dark:text-slate-400">
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
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--org-btn-primary-bg,#137fec)] focus:ring-inset"
                    >
                      <Icon
                        name={category.icon}
                        size="text-base"
                        className="flex-shrink-0 text-[var(--org-btn-primary-bg,#137fec)]"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">{category.name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">{category.descriptor}</span>
                      </span>
                      <span className="text-xs font-medium text-slate-400 tabular-nums">
                        {items.length}
                      </span>
                      <Icon
                        name="expand_more"
                        size="text-lg"
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
                    <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-1">
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

          {/* Footer */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
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
 * Individual amenity row component - compact horizontal layout
 */
function AmenityRow({ amenity, category, isFan = false }: { amenity: AmenityItem; category?: string; isFan?: boolean }) {
  const mapsUrl = getMapsUrl(amenity.place_id, amenity.name)
  const sanitizedDescription = sanitizeDescription(amenity.description)
  const categoryIcon = getCategoryIcon(category || amenity.category || 'Nearby')

  if (isFan) {
    return (
      <a
        href={mapsUrl || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="fan-nearby-item"
      >
        {/* Category icon */}
        <div className="fan-nearby-item-icon">
          <span className="material-symbols-outlined">
            {categoryIcon}
          </span>
        </div>

        {/* Name and description */}
        <div className="fan-nearby-item-info">
          <span className="fan-nearby-item-name">
            {amenity.name}
          </span>
          {sanitizedDescription && (
            <span className="fan-nearby-item-desc">
              {sanitizedDescription}
            </span>
          )}
        </div>

        {/* Walking time */}
        {amenity.walking_minutes > 0 && (
          <span className="fan-nearby-item-walk">
            <span className="material-symbols-outlined">
              directions_walk
            </span>
            {amenity.walking_minutes}m
          </span>
        )}

        {/* External link icon */}
        <span className="material-symbols-outlined fan-nearby-item-link">
          open_in_new
        </span>
      </a>
    )
  }

  return (
    <a
      href={mapsUrl || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-b-0"
    >
      {/* Category icon */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--org-btn-primary-bg,#137fec)]/10 flex items-center justify-center"
        aria-hidden
      >
        <Icon name={categoryIcon} size="text-base" className="text-[var(--org-btn-primary-bg,#137fec)]" />
      </div>

      {/* Name and description */}
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-sm text-slate-900 dark:text-white block truncate">
          {amenity.name}
        </span>
        {sanitizedDescription && (
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
            {sanitizedDescription}
          </span>
        )}
      </div>

      {/* Walking time */}
      {amenity.walking_minutes > 0 && (
        <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <Icon name="directions_walk" size="text-sm" />
          {amenity.walking_minutes}m
        </span>
      )}

      {/* External link icon */}
      <Icon name="open_in_new" size="text-sm" className="flex-shrink-0 text-slate-300 dark:text-slate-600" />
    </a>
  )
}
