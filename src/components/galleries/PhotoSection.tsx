import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getPhotosForGallery,
  getGalleryPhotoThumbnailUrl,
  ensureEntityGallery,
  type Gallery,
  type GalleryEntityType,
  type GalleryPhoto,
} from '@/data/services/galleryService'
import { useUserContext } from '@/hooks/useUserContext'
import { useGalleryPermissions } from '@/hooks/useGalleryPermissions'
import { Button, EmptyState } from '../platformAdmin'
import { PhotoUploadButton } from './PhotoUploadButton'
import { PhotoThumbnailGrid } from './PhotoThumbnailGrid'
import { RelatedGalleriesSection } from './RelatedGalleriesSection'
import { showError } from '@/utils/toast'

interface PhotoSectionProps {
  entityType: Extract<GalleryEntityType, 'athlete' | 'team' | 'event' | 'travel_plan' | 'program'>
  entityId: string
  canUpload?: boolean
  previewCount?: number
  title?: string
  showRelated?: boolean
}

/**
 * PhotoSection - Displays the direct gallery for auto-gallery entities.
 *
 * For athlete, team, event, travel_plan, program entities which have exactly
 * one system-generated gallery. Shows photo grid + upload + related galleries.
 *
 * Does NOT show "Create Gallery" button - the gallery is automatically created
 * by database triggers.
 */
export function PhotoSection({
  entityType,
  entityId,
  canUpload = true,
  previewCount = 5,
  title = 'Photos',
  showRelated = true,
}: PhotoSectionProps) {
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const perms = useGalleryPermissions(entityType)
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!context || !isReady || !entityId) return
      setLoading(true)
      setError(null)
      try {
        const { data: galleryData, error: galleryError } = await ensureEntityGallery(
          context,
          entityType,
          entityId
        )

        if (galleryError) throw galleryError

        if (!galleryData) {
          setError('Gallery not found. It may still be being created.')
          return
        }

        setGallery(galleryData as Gallery)

        const photosResp = await getPhotosForGallery(context, {
          gallery_id: galleryData.id,
          limit: previewCount,
          order_by: 'created_at',
          order_direction: 'desc',
        })

        if (photosResp.error) throw photosResp.error
        setPhotos(photosResp.data)
      } catch (err: any) {
        const msg = err?.message || 'Unable to load gallery'
        setError(msg)
        showError(msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [context, isReady, entityId, entityType, previewCount])

  const handleUploadComplete = async () => {
    if (!context || !gallery) return
    const photosResp = await getPhotosForGallery(context, {
      gallery_id: gallery.id,
      limit: previewCount,
      order_by: 'created_at',
      order_direction: 'desc',
    })
    if (!photosResp.error) {
      setPhotos(photosResp.data)
      // Update gallery photo count
      setGallery((prev) => ({
        ...prev!,
        photo_count: photosResp.data.length,
      }))
    }
  }

  const thumbnails = photos.map((p) => ({
    id: p.id,
    thumbnail_url: getGalleryPhotoThumbnailUrl(p.thumbnail_path, p.storage_path),
  }))

  const viewAll = () => {
    if (gallery) navigate(`/portal/photos/gallery/${gallery.id}`)
  }

  return (
    <section className="pa-card pa-shadow-sm pa-p-4 pa-space-y-4">
      {/* Direct Gallery Section */}
      <div className="pa-flex pa-justify-between pa-items-center">
        <div className="pa-flex pa-gap-2 pa-items-center">
          <span className="material-symbols-outlined pa-text-lg">photo_library</span>
          <h3 className="pa-text-lg pa-font-semibold">{title}</h3>
          {gallery && gallery.photo_count !== undefined && (
            <span className="pa-text-sm pa-text-muted">({gallery.photo_count} photos)</span>
          )}
        </div>
        {gallery && (
          <Button variant="secondary" size="compact" icon="open_in_new" onClick={viewAll}>
            View All
          </Button>
        )}
      </div>

      {loading ? (
        <div className="pa-flex pa-gap-2">
          {[...Array(Math.min(3, previewCount))].map((_, idx) => (
            <div key={idx} className="pa-skeleton" style={{ width: 64, height: 64 }} />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon="error_outline"
          title="Unable to load photos"
          description={error}
          noCard
        />
      ) : gallery && photos.length > 0 ? (
        <PhotoThumbnailGrid
          photos={thumbnails}
          totalCount={gallery.photo_count ?? photos.length}
          maxDisplay={previewCount}
          onViewAll={viewAll}
        />
      ) : (
        <EmptyState
          icon="photo_camera"
          title="No photos yet"
          description="Upload your first photo."
          noCard
        />
      )}

      {gallery && perms.canUpload && canUpload && (
        <PhotoUploadButton galleryId={gallery.id} onUploadComplete={handleUploadComplete} />
      )}

      {/* Related Galleries Section */}
      {showRelated && (
        <RelatedGalleriesSection entityType={entityType} entityId={entityId} />
      )}
    </section>
  )
}
