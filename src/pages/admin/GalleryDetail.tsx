import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, PageHeader, StatCard, Badge, InlineNotice } from '@/components/platformAdmin'
import {
  deleteGallery,
  deletePhotos,
  getGalleryById,
  getPhotosForGallery,
  setGalleryCover,
  type Gallery,
  type GalleryPhoto,
} from '@/data/services/galleryService'
import { getMockGalleryById, getMockPhotosForGallery } from '@/data/fake/mockGalleries'
import { useUserContext } from '@/hooks/useUserContext'
import { useI18n } from '@/i18n/useI18n'
import { USE_FAKE_DATA } from '@/data/config'
import { showError, showSuccess } from '@/utils/toast'
import { PhotoUploadZone } from '@/components/admin/galleries/PhotoUploadZone'
import { PhotoGalleryGrid } from '@/components/admin/galleries/PhotoGalleryGrid'
import { GalleryEditModal } from '@/components/admin/galleries/GalleryEditModal'
import { getLink } from '@/utils/routes'

const MAX_PHOTOS_PER_GALLERY = 25

export default function GalleryDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { context } = useUserContext()
  const { t } = useI18n()

  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  const load = async () => {
    if (!id || !context) return
    setLoading(true)

    // Demo mode: use mock data
    if (USE_FAKE_DATA) {
      const mockGallery = getMockGalleryById(id)
      const mockPhotos = getMockPhotosForGallery(id)
      setGallery(mockGallery || null)
      setPhotos(mockPhotos)
      setLoading(false)
      return
    }

    const [gRes, pRes] = await Promise.all([
      getGalleryById(context, id),
      getPhotosForGallery(context, { gallery_id: id, order_by: 'created_at', order_direction: 'asc' }),
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

  const photoStats = useMemo(() => {
    const approved = photos.filter((p) => p.approval_status === 'approved').length
    const pending = photos.filter((p) => p.approval_status === 'pending').length
    const total = photos.length
    const remaining = Math.max(0, MAX_PHOTOS_PER_GALLERY - total)
    const limitReached = total >= MAX_PHOTOS_PER_GALLERY

    return { approved, pending, total, remaining, limitReached }
  }, [photos])

  const handleDeleteGallery = async () => {
    if (USE_FAKE_DATA) {
      showError(t('photos.demoMode.deleteBlocked'))
      return
    }

    if (!context || !gallery) return
    const confirm = window.confirm(t('photos.confirmDeletePhotos', { count: photos.length }))
    if (!confirm) return
    const { error } = await deleteGallery(context, gallery.id)
    if (error) {
      showError(error.message)
      return
    }
    showSuccess(t('photos.success.galleryDeleted'))
    navigate(getLink('admin.photos.list'))
  }

  const handleDeletePhotos = async (ids: string[]) => {
    if (USE_FAKE_DATA) {
      showError(t('photos.demoMode.deleteBlocked'))
      return
    }

    if (!context || !gallery) return
    const { error } = await deletePhotos(context, gallery.id, ids)
    if (error) {
      showError(error.message)
      return
    }
    showSuccess(t('photos.success.photosDeleted', { count: ids.length }))
    load()
  }

  const handleSetCover = async (photoId: string) => {
    if (USE_FAKE_DATA) {
      showError(t('photos.demoMode.editBlocked'))
      return
    }

    if (!context || !gallery) return
    const { error } = await setGalleryCover(context, gallery.id, photoId)
    if (error) {
      showError(error.message)
      return
    }
    showSuccess(t('photos.success.coverPhotoSet'))
    load()
  }

  const handleEdit = () => {
    if (USE_FAKE_DATA) {
      showError(t('photos.demoMode.editBlocked'))
      return
    }
    setEditOpen(true)
  }

  if (!id) return null

  return (
    <div className="pa-root">
      <div className="pa-container pa-space-y-4">
        <PageHeader
          title={gallery?.name || t('photos.viewGallery')}
          description={gallery?.description || t('photos.subtitle')}
          breadcrumbs={[
            { label: t('nav.photos'), href: getLink('admin.photos.list') },
            { label: gallery?.name || t('photos.viewGallery') },
          ]}
          actions={
            <>
              <Button variant="secondary" onClick={() => navigate(getLink('admin.photos.list'))}>
                {t('common.backToList')}
              </Button>
              <Button variant="ghost" onClick={handleEdit}>
                {t('common.edit')}
              </Button>
              <Button variant="danger" onClick={handleDeleteGallery}>
                {t('common.delete')}
              </Button>
            </>
          }
        />

        {loading ? (
          <Card className="pa-card pa-h-40 pa-animate-pulse" />
        ) : (
          <>
            {/* Stats */}
            <div className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-4 pa-gap-3">
              <StatCard label={t('photos.stats.totalPhotos')} value={photoStats.total} />
              <StatCard label={t('common.approved')} value={photoStats.approved} />
              <StatCard label={t('photos.pendingApproval.badge')} value={photoStats.pending} />
              <StatCard 
                label={t('common.remaining')} 
                value={`${photoStats.remaining}/${MAX_PHOTOS_PER_GALLERY}`} 
              />
            </div>

            {/* Photo Limit Warning */}
            {photoStats.limitReached && (
              <InlineNotice
                tone="warning"
                title={t('photos.photoLimit.reached')}
                message={t('photos.photoLimit.reachedMessage', { limit: MAX_PHOTOS_PER_GALLERY })}
              />
            )}

            {/* Pending Approval Notice */}
            {photoStats.pending > 0 && gallery?.require_approval && (
              <InlineNotice
                tone="info"
                title={t('photos.pendingApproval.adminMessage', { count: photoStats.pending })}
                message={t('photos.pendingApproval.waitingMessage')}
              />
            )}

            {/* Upload Zone */}
            {!photoStats.limitReached && (
              <Card className="pa-card">
                <div className="pa-flex pa-items-center pa-justify-between pa-mb-3">
                  <h4 className="pa-text-base pa-font-semibold">{t('photos.uploadPhotos')}</h4>
                  {photoStats.remaining > 0 && photoStats.remaining < 5 && (
                    <Badge variant="warning">
                      {t('photos.photoLimit.canUpload', { count: photoStats.remaining })}
                    </Badge>
                  )}
                </div>
                <PhotoUploadZone 
                  galleryId={id} 
                  onComplete={() => load()} 
                  maxPhotos={photoStats.remaining}
                  requireApproval={gallery?.require_approval || false}
                />
              </Card>
            )}

            {/* Photos Grid */}
            <Card className="pa-card pa-space-y-3">
              <div className="pa-flex pa-justify-between pa-items-center">
                <h4 className="pa-text-base pa-font-semibold">{t('photos.title')}</h4>
                <span className="pa-text-sm pa-text-muted">
                  {t('photos.stats.photosCount', { count: photos.length })}
                </span>
              </div>
              
              {photos.length === 0 ? (
                <div className="pa-text-center pa-py-12 pa-text-muted">
                  <p>{t('photos.stats.emptyGallery')}</p>
                  <p className="pa-text-sm pa-mt-1">{t('photos.upload.title')}</p>
                </div>
              ) : (
                <PhotoGalleryGrid
                  photos={photos}
                  coverPhotoId={gallery?.cover_photo_id || undefined}
                  onDelete={handleDeletePhotos}
                  onSetCover={handleSetCover}
                  showPendingBadge={gallery?.require_approval || false}
                />
              )}
            </Card>
          </>
        )}
      </div>

      {editOpen && gallery && (
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

