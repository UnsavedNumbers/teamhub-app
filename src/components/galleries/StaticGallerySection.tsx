import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getGalleryByEntity,
  getOrCreateStaticGallery,
  getPhotosForGallery,
  getGalleryPhotoThumbnailUrl,
  mapEntityToGalleryType,
  type Gallery,
  type GalleryEntityType,
  type GalleryPhoto,
} from '@/data/services/galleryService'
import { useUserContext } from '@/hooks/useUserContext'
import { useGalleryPermissions } from '@/hooks/useGalleryPermissions'
import { Button, EmptyState } from '../platformAdmin'
import { PhotoUploadButton } from './PhotoUploadButton'
import { PhotoThumbnailGrid } from './PhotoThumbnailGrid'
import { showError } from '@/utils/toast'

interface StaticGallerySectionProps {
  entityType: GalleryEntityType
  entityId: string
  canUpload?: boolean
  previewCount?: number
  title?: string
}

export function StaticGallerySection({
  entityType,
  entityId,
  canUpload = true,
  previewCount = 5,
  title = 'Photos',
}: StaticGallerySectionProps) {
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const perms = useGalleryPermissions(entityType)
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!context || !isReady || !entityId) return
      setLoading(true)
      try {
        const galleryType = mapEntityToGalleryType(entityType)
        // Ensure gallery exists
        const result = await getGalleryByEntity(context, galleryType, entityId)
        let g = result.data
        if (!g) {
          const created = await getOrCreateStaticGallery(context, galleryType, entityId)
          if (created.error || !created.id) throw created.error || new Error('Failed to create gallery')
          const refetched = await getGalleryByEntity(context, galleryType, entityId)
          g = refetched.data
        }
        if (g) {
          setGallery(g)
          const photosResp = await getPhotosForGallery(context, { gallery_id: g.id, limit: previewCount, order_by: 'created_at', order_direction: 'desc' })
          if (photosResp.error) throw photosResp.error
          setPhotos(photosResp.data)
        }
      } catch (err: any) {
        showError(err?.message || 'Unable to load gallery')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [context, isReady, entityId, entityType, previewCount])

  const handleUploadComplete = async () => {
    if (!context || !gallery) return
    const photosResp = await getPhotosForGallery(context, { gallery_id: gallery.id, limit: previewCount, order_by: 'created_at', order_direction: 'desc' })
    if (!photosResp.error) setPhotos(photosResp.data)
  }

  const thumbnails = photos.map((p) => ({
    id: p.id,
    thumbnail_url: getGalleryPhotoThumbnailUrl(p.thumbnail_path, p.storage_path),
  }))

  const viewAll = () => {
    if (gallery) navigate(`/portal/photos/gallery/${gallery.id}`)
  }

  return (
    <section className="pa-card pa-shadow-sm pa-p-4 pa-space-y-3">
      <div className="pa-flex pa-justify-between pa-items-center">
        <div className="pa-flex pa-gap-2 pa-items-center">
          <span className="material-symbols-outlined pa-text-lg">camera</span>
          <h3 className="pa-text-lg pa-font-semibold">{title}</h3>
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
    </section>
  )
}
