import { useQuery } from '@tanstack/react-query'
import { useUserContext } from './useUserContext'
import {
  getGalleriesForUser,
  mapEntityToGalleryType,
  type Gallery,
  type GalleryEntityType,
} from '@/data/services/galleryService'

export function useGalleries(entityType: GalleryEntityType, entityId: string | null) {
  const { context, isReady } = useUserContext()

  return useQuery({
    queryKey: ['galleries', entityType, entityId, context?.orgId],
    enabled: isReady && !!context && !!entityId,
    queryFn: async () => {
      if (!context || !entityId) return []
      const galleryType = mapEntityToGalleryType(entityType)
      const { data, error } = await getGalleriesForUser(context, {
        gallery_type: galleryType,
        entity_id: entityId,
        org_id: context.orgId,
      })
      if (error) throw error
      return data as Gallery[]
    },
  })
}
