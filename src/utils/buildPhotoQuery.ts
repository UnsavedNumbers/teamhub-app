import type { PhotoFilters } from '../hooks/usePhotoFilters'
import type { GetPhotosParams, PhotoStatus } from '../data/services/galleryService'

export function buildPhotoQuery(
  filters: PhotoFilters,
  overrides: Partial<GetPhotosParams> = {}
): GetPhotosParams {
  let orderBy: GetPhotosParams['order_by'] = 'created_at'
  let orderDirection: GetPhotosParams['order_direction'] = 'desc'

  switch (filters.sort) {
    case 'oldest':
      orderBy = 'created_at'
      orderDirection = 'asc'
      break
    case 'taken_desc':
      orderBy = 'taken_at'
      orderDirection = 'desc'
      break
    case 'taken_asc':
      orderBy = 'taken_at'
      orderDirection = 'asc'
      break
    default:
      orderBy = 'created_at'
      orderDirection = 'desc'
      break
  }

  const status = filters.status && filters.status !== 'all'
    ? (filters.status as PhotoStatus)
    : undefined

  const resolvedAlbumId =
    overrides.album_id !== undefined
      ? overrides.album_id
      : filters.album && filters.album !== 'favorites'
      ? filters.album
      : undefined

  return {
    gallery_id: overrides.gallery_id || '',
    album_id: resolvedAlbumId,
    athlete_id: filters.athlete ?? undefined,
    status,
    order_by: orderBy,
    order_direction: orderDirection,
    search: filters.q || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    ...overrides,
  }
}
