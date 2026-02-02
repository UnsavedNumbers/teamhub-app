import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, PageHeader, StatCard } from '@/components/platformAdmin'
import {
  deleteGallery,
  deletePhotos,
  getGalleryById,
  getPhotosForGallery,
  setGalleryCover,
  type Gallery,
  type GalleryPhoto,
} from '@/data/services/galleryService'
import { useUserContext } from '@/hooks/useUserContext'
import { showError, showSuccess } from '@/utils/toast'
import { PhotoUploadZone } from '@/components/admin/galleries/PhotoUploadZone'
import { PhotoGalleryGrid } from '@/components/admin/galleries/PhotoGalleryGrid'
import { GalleryEditModal } from '@/components/admin/galleries/GalleryEditModal'
import { getLink } from '@/utils/routes'

export default function GalleryDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { context } = useUserContext()

  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  const load = async () => {
    if (!id || !context) return
    setLoading(true)
    const [gRes, pRes] = await Promise.all([
      getGalleryById(context, id),
      getPhotosForGallery(context, { gallery_id: id, order_by: 'sort_order', order_direction: 'asc' }),
    ])
    if (gRes.error) showError(gRes.error.message)
    if (pRes.error) showError(pRes.error.message)
    setGallery(gRes.data || null)
    setPhotos(pRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleDeleteGallery = async () => {
    if (!context || !gallery) return
    const confirm = window.confirm('Delete this gallery and all photos?')
    if (!confirm) return
    const { error } = await deleteGallery(context, gallery.id)
    if (error) {
      showError(error.message)
      return
    }
    showSuccess('Gallery deleted')
    navigate(getLink('admin.photos.list'))
  }

  const handleDeletePhotos = async (ids: string[]) => {
    if (!context || !gallery) return
    const { error } = await deletePhotos(context, gallery.id, ids)
    if (error) {
      showError(error.message)
      return
    }
    showSuccess('Photos deleted')
    load()
  }

  const handleSetCover = async (photoId: string) => {
    if (!context || !gallery) return
    const { error } = await setGalleryCover(context, gallery.id, photoId)
    if (error) {
      showError(error.message)
      return
    }
    showSuccess('Cover photo updated')
    load()
  }

  if (!id) return null

  return (
    <div className="pa-root">
      <div className="pa-container pa-space-y-4">
        <PageHeader
          title={gallery?.name || 'Gallery'}
          description={gallery?.description || 'Manage photos for this gallery'}
          primaryAction={
            <Button variant="secondary" onClick={() => navigate(getLink('admin.photos.list'))}>
              Back to galleries
            </Button>
          }
          actions={
            <>
              <Button variant="ghost" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button variant="danger" onClick={handleDeleteGallery}>
                Delete
              </Button>
            </>
          }
        />

        {loading ? (
          <Card className="pa-card pa-h-40 pa-animate-pulse" />
        ) : (
          <>
            <div className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-3 pa-gap-3">
              <StatCard label="Photos" value={photos.length} />
              <StatCard label="Visibility" value={gallery?.visibility || 'team'} />
              <StatCard label="Created" value={gallery ? new Date(gallery.created_at).toLocaleDateString() : '—'} />
            </div>

            <Card className="pa-card">
              <h4 className="pa-text-base pa-font-semibold pa-mb-2">Upload</h4>
              <PhotoUploadZone galleryId={id} onComplete={() => load()} />
            </Card>

            <Card className="pa-card pa-space-y-3">
              <div className="pa-flex pa-justify-between pa-items-center">
                <h4 className="pa-text-base pa-font-semibold">Photos</h4>
                <span className="pa-text-sm pa-text-muted">{photos.length} items</span>
              </div>
              <PhotoGalleryGrid
                photos={photos}
                coverPhotoId={gallery?.cover_photo_id || undefined}
                onDelete={handleDeletePhotos}
                onSetCover={handleSetCover}
              />
            </Card>
          </>
        )}
      </div>

      {editOpen && (
        <GalleryEditModal
          open={editOpen}
          gallery={gallery}
          photos={photos}
          onClose={() => setEditOpen(false)}
          onSaved={(g) => {
            setGallery(g)
            setEditOpen(false)
          }}
          onDelete={handleDeleteGallery}
        />
      )}
    </div>
  )
}
