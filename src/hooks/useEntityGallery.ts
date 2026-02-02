import { useQuery } from '@tanstack/react-query'
import { useUserContext } from './useUserContext'
import {
  getEntityGallery,
  getRelatedGalleries,
  type Gallery,
  type GalleryEntityType,
  type RelatedGallery,
} from '@/data/services/galleryService'

/**
 * Hook for fetching entity gallery (for athlete, team, event, travel_plan, program)
 * Uses the new getEntityGallery function which returns the system-generated gallery.
 */
export function useEntityGallery(entityType: GalleryEntityType, entityId: string | null) {
  const { context, isReady } = useUserContext()

  return useQuery<Gallery | null, Error>({
    queryKey: ['entity-gallery', entityType, entityId, context?.orgId],
    enabled: isReady && !!context && !!entityId,
    queryFn: async () => {
      if (!context || !entityId) return null
      const { data, error } = await getEntityGallery(context, entityType, entityId)
      if (error) throw error
      return data
    },
    retry: false,
  })
}

/**
 * Hook for fetching related galleries for an entity
 * Uses the new getRelatedGalleries RPC function.
 */
export function useRelatedGalleries(entityType: GalleryEntityType, entityId: string | null) {
  const { context, isReady } = useUserContext()

  return useQuery<RelatedGallery[], Error>({
    queryKey: ['related-galleries', entityType, entityId, context?.orgId],
    enabled: isReady && !!context && !!entityId,
    queryFn: async () => {
      if (!context || !entityId) return []
      const { data, error } = await getRelatedGalleries(context, entityType, entityId)
      if (error) throw error
      return data
    },
    retry: false,
  })
}
