/**
 * NearbyAmenities Component
 * 
 * Displays AI-curated nearby amenities (food, coffee, convenience) for event venues.
 * Shows walking distance, category grouping, and short descriptions.
 * Handles loading, error, and fallback states gracefully.
 */

import { useMemo } from 'react'
import { useNearbyAmenities, useRefreshNearbyAmenities, canShowNearbyAmenities } from '../../hooks/useNearbyAmenities'
import { useUserContext } from '../../hooks/useUserContext'
import { sanitizeVenueContent } from '../../utils/sanitizeVenueContent'
import Card from './Card'
import Button from './Button'
import Icon from './Icon'
import type { AmenityItem } from '../../data/services/nearbyAmenitiesService'

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
 * Group amenities by category
 */
function groupAmenitiesByCategory(amenities: AmenityItem[]): Map<string, AmenityItem[]> {
  const groups = new Map<string, AmenityItem[]>()
  
  for (const amenity of amenities) {
    const category = amenity.category || 'Nearby'
    if (!groups.has(category)) {
      groups.set(category, [])
    }
    groups.get(category)!.push(amenity)
  }
  
  return groups
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
 * Category icon mapping
 */
function getCategoryIcon(category: string): string {
  const lowerCategory = category.toLowerCase()
  if (lowerCategory.includes('food') || lowerCategory.includes('meal') || lowerCategory.includes('restaurant')) {
    return 'restaurant'
  }
  if (lowerCategory.includes('coffee') || lowerCategory.includes('drinks')) {
    return 'local_cafe'
  }
  if (lowerCategory.includes('snack') || lowerCategory.includes('convenience') || lowerCategory.includes('essential')) {
    return 'shopping_bag'
  }
  if (lowerCategory.includes('restroom')) {
    return 'wc'
  }
  return 'place'
}

export default function NearbyAmenities({
  latitude,
  longitude,
  placeId,
  eventType,
  eventStartTime,
  className = '',
  // variant can be used for future UI variations
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
  
  // Loading state (only show skeleton if no data)
  if (isLoading && !hasData) {
    return (
      <div className={className}>
        <Card className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="space-y-3">
              <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
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

  // Group amenities by category
  const groupedAmenities = groupAmenitiesByCategory(amenities)
  const hasMultipleGroups = groupedAmenities.size > 1

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
      <Card className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="explore" className="text-[var(--org-btn-primary-bg,#137fec)]" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Nearby Amenities
            </h3>
          </div>
          {canRefresh && (
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
          )}
        </div>
        
        {/* Fallback notice */}
        {isFallback && (
          <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded">
            AI descriptions temporarily unavailable. Showing nearby places.
          </p>
        )}

        {/* Amenities list */}
        {hasMultipleGroups ? (
          // Grouped view
          <div className="space-y-4">
            {Array.from(groupedAmenities.entries()).map(([category, items]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon 
                    name={getCategoryIcon(category)} 
                    size="text-base" 
                    className="text-slate-400" 
                  />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {category}
                  </h4>
                </div>
                <div className="space-y-2">
                  {items.map((amenity, index) => (
                    <AmenityRow key={`${amenity.place_id}-${index}`} amenity={amenity} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Simple list view
          <div className="space-y-2">
            {amenities.map((amenity, index) => (
              <AmenityRow key={`${amenity.place_id}-${index}`} amenity={amenity} />
            ))}
          </div>
        )}

        {/* Footer with cached/AI indicator */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Walking times are approximate
          </span>
          {!isFallback && (
            <span className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded">
              AI curated
            </span>
          )}
        </div>
      </Card>
    </div>
  )
}

/**
 * Individual amenity row component
 */
function AmenityRow({ amenity }: { amenity: AmenityItem }) {
  const mapsUrl = getMapsUrl(amenity.place_id, amenity.name)
  const sanitizedDescription = sanitizeDescription(amenity.description)
  
  return (
    <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
      {/* Place info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
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
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full whitespace-nowrap">
              <Icon name="directions_walk" size="text-xs" />
              ~{amenity.walking_minutes} min
            </span>
          )}
        </div>
        {sanitizedDescription && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
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
          className="flex-shrink-0 p-2 text-slate-400 hover:text-[var(--org-btn-primary-bg,#137fec)] transition-colors"
          aria-label={`Open ${amenity.name} in Google Maps`}
        >
          <Icon name="open_in_new" size="text-lg" />
        </a>
      )}
    </div>
  )
}
