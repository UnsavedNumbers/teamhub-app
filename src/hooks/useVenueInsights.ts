/**
 * useVenueInsights Hook
 * 
 * React Query hook for fetching and managing venue insights.
 * Provides automatic caching, deduplication, and refetching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchVenueInsights, refreshVenueInsights } from '../data/services/venueInsightsService'

/**
 * Hook to fetch venue insights for a given place_id
 * 
 * @param placeId - Google Place ID (null to disable query)
 * @returns React Query result with venue insights data
 */
export function useVenueInsights(placeId: string | null) {
  return useQuery({
    queryKey: ['venueInsights', placeId],
    queryFn: () => {
      if (!placeId) {
        throw new Error('place_id is required')
      }
      return fetchVenueInsights(placeId, false)
    },
    enabled: !!placeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

/**
 * Hook to refresh venue insights (force fetch from APIs)
 * 
 * @returns Mutation function to refresh venue insights
 */
export function useRefreshVenueInsights() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (placeId: string) => refreshVenueInsights(placeId),
    onSuccess: (result, placeId) => {
      if (result.data) {
        // Update cache with new data
        queryClient.setQueryData(['venueInsights', placeId], result)
        // Invalidate to trigger refetch if needed
        queryClient.invalidateQueries({ queryKey: ['venueInsights', placeId] })
      }
    },
  })
}
