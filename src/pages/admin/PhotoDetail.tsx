import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, PageHeader, Button, Badge, StatCard } from '@/components/platformAdmin'
import { useUserContext } from '@/hooks/useUserContext'
import { useI18n } from '@/i18n/useI18n'
import { USE_FAKE_DATA } from '@/data/config'
import { showError, showSuccess } from '@/utils/toast'
import { getLink } from '@/utils/routes'
import { getGalleryById, getPhotosForGallery, deletePhotos, moderatePhotos, type Gallery, type GalleryPhoto } from '@/data/services/galleryService'
import { PhotoUploadZone } from '@/components/admin/galleries/PhotoUploadZone'
import { PhotoGalleryGrid } from '@/components/admin/galleries/PhotoGalleryGrid'
import { GalleryEditModal } from '@/components/admin/galleries/GalleryEditModal'

export default function PhotoDetail() {
  const { galleryId, photoId } = useParams<{ galleryId: string; photoId: string }>()
  const { context } = useUserContext()
  const navigate = useNavigate()
  const { t } = useI18n()
  const tAny = t as any

  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!context || !galleryId || !photoId) {
        setLoading(false)
        return
      }

      try {
        // Load gallery
        const { data: galleryData, error: galleryError } = await getGalleryById(context, galleryId)
        if (galleryError || !galleryData) {
          throw galleryError || new Error('Gallery not found')
        }

        // Load photos
        const { data: photos, error: photosError } = await getPhotosForGallery(context, { gallery_id: galleryId, order_by: 'created_at', order_direction: 'asc' })
        if (photosError) {
          throw photosError
        }

        const foundPhoto = photos?.find((p) => p.id === photoId)
        if (!foundPhoto) {
          throw new Error('Photo not found')
        }

        if (mounted) {
          setGallery(galleryData)
          setPhotos(photos || [])
        }
      } catch (err) {
        if (mounted) {
          showError(err instanceof Error ? err.message : t('photos.errors.loadPhotos'))
          navigate(getLink('admin.photos.list'))
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [context, galleryId, photoId, navigate, t])

  const handleModerate = async (ids: string[], action: 'approve' | 'reject') => {
    if (USE_FAKE_DATA) {
      showError(t('photos.demoMode.deleteBlocked'))
      return
    }

    if (!context) return
    try {
      const { error } = await moderatePhotos(context, ids, action)
      if (error) throw error
      showSuccess(action === 'approve' ? t('photos.success.photosApproved') : t('photos.success.photosRejected'))
      // reload photos
      if (!galleryId) return
      const { data: refreshedPhotos } = await getPhotosForGallery(context, { gallery_id: galleryId })
      setPhotos(refreshedPhotos || [])
    } catch (err) {
      showError(err instanceof Error ? err.message : tAny('photos.moderation.' + (action === 'approve' ? 'approveError' : 'rejectError')))
    }
  }

  if (loading) {
    return (
      <div className="pa-root">
        <div className="pa-container pa-flex pa-items-center pa-justify-center pa-min-h-[400px]">
          <div className="pa-animate-spin pa-text-4xl">⏳</div>
        </div>
      </div>
    )
  }

  return (
    <div className="pa-root">
      <div className="pa-container pa-space-y-4">
        <PageHeader
          title={gallery?.name || t('photos.viewGallery')}
          description={gallery?.description || ''}
          breadcrumbs={[
            { label: t('nav.photos'), path: getLink('admin.photos.list') },
            { label: gallery?.name || t('photos.viewGallery') },
          ]}
          actions={
            <>
              <Button variant="secondary" onClick={() => navigate(getLink('admin.photos.list'))}>
                {t('common.backToList')}
              </Button>
              <Button variant="ghost" onClick={() => setEditOpen(true)}>
                {t('photos.updateAlbumInfo')}
              </Button>
              <Button variant="primary" onClick={async () => {
                if (!gallery || photos.length === 0) return
                const pendingIds = photos.filter((p) => (p.approval_status || p.status) === 'pending').map((p) => p.id)
                if (pendingIds.length === 0) return
                const confirm = window.confirm(t('photos.approveAllConfirm'))
                if (!confirm) return
                await handleModerate(pendingIds, 'approve')
              }}>
                {t('photos.approveAll')}
              </Button>
            </>
          }
        />

        {/* Stats */}
        <div className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-4 pa-gap-3">
          <StatCard label={t('photos.stats.totalPhotos')} value={String(photos.length)} />
          <StatCard label={t('common.approved')} value={String(photos.filter((p) => (p.approval_status || p.status) === 'approved').length)} />
          <StatCard label={t('photos.pendingApproval.badge')} value={String(photos.filter((p) => (p.approval_status || p.status) === 'pending').length)} />
          <StatCard label={t('photos.stats.flagged')} value={String(photos.filter((p) => (p.approval_status || p.status) === 'rejected').length)} />
        </div>

        {/* Upload Zone */}
        <Card className="pa-card pa-mt-3">
          <div className="pa-flex pa-items-center pa-justify-between pa-mb-3">
            <h4 className="pa-text-base pa-font-semibold">{t('photos.upload.title')}</h4>
            {gallery && gallery.allow_contributions && (
              <Badge variant="info">{gallery.gallery_type}</Badge>
            )}
          </div>
          <PhotoUploadZone
            galleryId={gallery?.id || ''}
            onComplete={async () => {
              if (!context || !galleryId) return
              const { data } = await getPhotosForGallery(context, { gallery_id: galleryId })
              setPhotos(data || [])
            }}
            maxPhotos={25 - photos.length}
            requireApproval={gallery?.require_approval || false}
          />
        </Card>

        {/* Photos Grid */}
        <Card className="pa-card pa-space-y-3 pa-mt-3">
          <div className="pa-flex pa-justify-between pa-items-center">
            <h4 className="pa-text-base pa-font-semibold">{t('photos.title')}</h4>
            <span className="pa-text-sm pa-text-muted">{t('photos.stats.photosCount', { count: photos.length })}</span>
          </div>

          <PhotoGalleryGrid
            photos={photos}
            coverPhotoId={gallery?.cover_photo_id || undefined}
            onDelete={async (ids) => {
              if (USE_FAKE_DATA) {
                showError(t('photos.demoMode.deleteBlocked'))
                return
              }
              const { error } = await deletePhotos(context, gallery?.id || '', ids)
              if (error) showError(error.message)
              else {
                showSuccess(t('photos.success.photosDeleted', { count: ids.length }))
                if (!galleryId) return
                const { data } = await getPhotosForGallery(context, { gallery_id: galleryId })
                setPhotos(data || [])
              }
            }}
            showPendingBadge={gallery?.require_approval || false}
            onModerate={handleModerate}
          />
        </Card>

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
            onDelete={async () => {
              if (USE_FAKE_DATA) {
                showError(t('photos.demoMode.deleteBlocked'))
                return
              }
              const { error } = await deletePhotos(context, gallery.id, photos.map((p) => p.id))
              if (error) {
                showError(error.message)
                return
              }
              showSuccess(t('photos.success.galleryDeleted'))
              navigate(getLink('admin.photos.list'))
            }}
          />
        )}
      </div>
    </div>
  )
}
