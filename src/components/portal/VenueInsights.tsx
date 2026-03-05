/**
 * Venue Insights Component
 * 
 * Displays venue information including photos, AI summary, and "What to expect" tips.
 * Handles loading states, errors, and partial data gracefully.
 * Renders as a collapsible section (collapsed by default).
 */

import { useMemo, useState } from 'react'
import { useVenueInsights, useRefreshVenueInsights } from '../../hooks/useVenueInsights'
import { useUserContext } from '../../hooks/useUserContext'
import VenuePhotoGallery from './VenuePhotoGallery'
import Button from './Button'
import Icon from './Icon'
import { sanitizeVenueSummary, sanitizeVenueTips } from '../../utils/sanitizeVenueContent'
import type { PlaceDetailsResponse } from '../../types/venueInsights'

interface VenueInsightsProps {
  placeId: string | null
  className?: string
}

export default function VenueInsights({ placeId, className = '' }: VenueInsightsProps) {
  const { context } = useUserContext()
  const { data, isLoading, error } = useVenueInsights(placeId)
  const refreshMutation = useRefreshVenueInsights()
  const [isExpanded, setIsExpanded] = useState(true)

  // Check if user can refresh (org_admin or coach)
  const canRefresh = useMemo(() => {
    if (!context) return false
    return context.roles.includes('org_admin') || context.roles.includes('coach')
  }, [context])

  // Don't render if no place_id
  if (!placeId) {
    return null
  }

  // Extract data
  const venueData = data?.data
  const placeDetails = venueData?.place_details as PlaceDetailsResponse | null | undefined
  const photos = venueData?.photos || []
  const aiSummary = venueData?.ai_summary
  const aiWhatToExpect = venueData?.ai_what_to_expect
  const errors = venueData?.errors

  // Determine if we should show the component
  const hasAreaSummary = placeDetails?.area_summary?.content_blocks && placeDetails.area_summary.content_blocks.length > 0
  const hasData = placeDetails || photos.length > 0 || aiSummary || aiWhatToExpect || hasAreaSummary
  const hasErrors = errors?.place_details || errors?.gemini

  if (isLoading && !hasData) {
    return (
      <div className={className}>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !hasData) {
    return (
      <div className={className}>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
            <Icon name="error_outline" size="text-base" />
            <span>Venue information temporarily unavailable</span>
          </div>
        </div>
      </div>
    )
  }

  if (!hasData && !hasErrors) {
    return null
  }

  const venueName = placeDetails?.name || 'Venue'

  return (
    <div className={className}>
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        {/* Collapsible Header (shows venue name) */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-2">
            <Icon name="place" size="text-lg" className="text-gray-500 dark:text-gray-400" />
            <span className="font-bold text-gray-900 dark:text-white">{venueName}</span>
          </div>
          <Icon
            name={isExpanded ? 'expand_less' : 'expand_more'}
            size="text-xl"
            className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors"
          />
        </button>

        {/* Collapsible Content */}
        {isExpanded && (
          <div className="mt-4 space-y-4">
            {/* Refresh button for admins/coaches */}
            {canRefresh && (
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (placeId) {
                      refreshMutation.mutate(placeId)
                    }
                  }}
                  disabled={refreshMutation.isPending}
                  className="text-xs py-1 px-3"
                >
                  {refreshMutation.isPending ? (
                    <>
                      <Icon name="refresh" size="text-sm" className="animate-spin inline mr-1" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <Icon name="refresh" size="text-sm" className="inline mr-1" />
                      Refresh
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Photos */}
            {photos.length > 0 && (
              <div>
                <VenuePhotoGallery photos={photos} venueName={venueName} />
              </div>
            )}

            {/* Area Summary (Google Places) */}
            {hasAreaSummary && (
              <div className="space-y-4">
                 <div className="flex items-center gap-2">
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">Area Overview</h4>
                   <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                    Google
                  </span>
                </div>
                {placeDetails!.area_summary!.content_blocks.map((block, idx) => (
                  <div key={idx}>
                    {block.topic !== 'overview' && (
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                            {block.topic}
                        </p>
                    )}
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {block.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* AI Summary */}
            {aiSummary && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">About this venue</h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                    AI
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {sanitizeVenueSummary(aiSummary)}
                </p>
              </div>
            )}

            {/* What to Expect */}
            {aiWhatToExpect && (
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-2">What to expect</h4>
                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {sanitizeVenueTips(aiWhatToExpect)
                    .split('\n')
                    .filter((line) => line.trim())
                    .map((line, index) => (
                      <div key={index} className="flex items-start gap-2 mb-1.5">
                        <span className="text-gray-500 dark:text-gray-400 mt-0.5">&bull;</span>
                        <span>{line.replace(/^[-*\u2022]\s*/, '').trim()}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Basic venue info if AI failed */}
            {!aiSummary && !aiWhatToExpect && placeDetails && (
              <div className="space-y-2">
                {/* venue name already shown in accordion header - omit duplicate here */}
                {placeDetails.formatted_address && (
                  <div className="flex items-center gap-2">
                    <Icon name="place" size="text-sm" className="text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {placeDetails.formatted_address}
                    </span>
                  </div>
                )}
                {placeDetails.rating && (
                  <div className="flex items-center gap-2">
                    <Icon name="star" size="text-sm" className="text-amber-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {placeDetails.rating}/5
                      {placeDetails.user_ratings_total &&
                        ` (${placeDetails.user_ratings_total} reviews)`}
                    </span>
                  </div>
                )}
                {placeDetails.website && (
                  <div className="flex items-center gap-2">
                    <Icon name="link" size="text-sm" className="text-gray-400" />
                    <a
                      href={placeDetails.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--org-link-color)] hover:underline"
                    >
                      Visit website
                    </a>
                  </div>
                )}
                {errors?.gemini && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    AI summary unavailable. Basic venue information shown.
                  </p>
                )}
              </div>
            )}

            {/* Error messages */}
            {hasErrors && (
              <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                {errors.place_details && <p>Place Details: {errors.place_details}</p>}
                {errors.gemini && <p>AI Summary: {errors.gemini}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

