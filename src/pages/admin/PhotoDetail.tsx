import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, PageHeader, Button, Badge } from '@/components/platformAdmin'
import { useUserContext } from '@/hooks/useUserContext'
import { useI18n } from '@/i18n/useI18n'
import { USE_FAKE_DATA } from '@/data/config'
import { showError, showSuccess } from '@/utils/toast'
import { getLink } from '@/utils/routes'
import { getGalleryById, getPhotosForGallery, deletePhotos, type Gallery, type GalleryPhoto } from '@/data/services/galleryService'

export default function PhotoDetail() {
  const { galleryId, photoId } = useParams<{ galleryId: string; photoId: string }>()
  const { context } = useUserContext()
  const navigate = useNavigate()
  const { t } = useI18n()

  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [photo, setPhoto] = useState<GalleryPhoto | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

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
        const { data: photos, error: photosError } = await getPhotosForGallery(context, { gallery_id: galleryId })
        if (photosError) {
          throw photosError
        }

        const foundPhoto = photos?.find((p) => p.id === photoId)
        if (!foundPhoto) {
          throw new Error('Photo not found')
        }

        if (mounted) {
          setGallery(galleryData)
          setPhoto(foundPhoto)
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

  const handleDelete = async () => {
    if (USE_FAKE_DATA) {
      showError(t('photos.demoMode.deleteBlocked'))
      return
    }

    if (!context || !galleryId || !photoId || !photo) return

    const confirmed = window.confirm(t('photos.confirmDeletePhotos', { count: 1 }))
    if (!confirmed) return

    setDeleting(true)
    try {
      const { error } = await deletePhotos(context, galleryId, [photoId])
      if (error) throw error

      showSuccess(t('photos.success.photoDeleted'))
      navigate(getLink('admin.photos.detail', { id: galleryId }))
    } catch (err) {
      showError(err instanceof Error ? err.message : t('photos.errors.deletePhoto'))
    } finally {
      setDeleting(false)
    }
  }

  const handleDownload = () => {
    if (!photo) return
    
    // Open the photo URL in a new tab for download
    window.open(photo.url || photo.storage_path, '_blank')
  }

  const handleBackToGallery = () => {
    if (galleryId) {
      navigate(getLink('admin.photos.detail', { id: galleryId }))
    } else {
      navigate(getLink('admin.photos.list'))
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

  if (!photo || !gallery) {
    return (
      <div className="pa-root">
        <div className="pa-container">
          <Card>
            <div className="pa-text-center pa-py-12">
              <p className="pa-text-muted">{t('photos.errors.loadPhotos')}</p>
              <Button variant="ghost" onClick={handleBackToGallery} className="pa-mt-4">
                {t('common.back')}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="pa-root">
      <div className="pa-container">
        <PageHeader
          title={t('photos.viewPhoto')}
          description={gallery.name}
          breadcrumbs={[
            { label: 'Photos', path: getLink('admin.photos.list') },
            { label: gallery.name, path: getLink('admin.photos.detail', { id: gallery.id }) },
            { label: t('photos.viewPhoto') },
          ]}
        />

        <div className="pa-grid pa-grid-cols-1 lg:pa-grid-cols-3 pa-gap-6">
          {/* Photo Display */}
          <div className="lg:pa-col-span-2">
            <Card>
              <div className="pa-bg-black pa-rounded-lg pa-overflow-hidden">
                <img
                  src={photo.url || photo.storage_path}
                  alt={photo.filename || 'Photo'}
                  className="pa-w-full pa-h-auto pa-object-contain pa-max-h-[70vh]"
                />
              </div>
            </Card>
          </div>

          {/* Photo Metadata */}
          <div className="pa-space-y-4">
            {/* Status */}
            <Card>
              <h3 className="pa-text-sm pa-font-semibold pa-mb-3">{t('photos.photoDetails.status')}</h3>
              <div className="pa-space-y-2">
                {photo.status === 'pending' && (
                  <Badge variant="warning">{t('photos.pendingApproval.badge')}</Badge>
                )}
                {photo.status === 'approved' && (
                  <Badge variant="success">{t('photos.autoApproved')}</Badge>
                )}
                {photo.status === 'rejected' && (
                  <Badge variant="error">Rejected</Badge>
                )}
              </div>
            </Card>

            {/* Details */}
            <Card>
              <h3 className="pa-text-sm pa-font-semibold pa-mb-3">{t('photos.photoDetails.details')}</h3>
              <div className="pa-space-y-2 pa-text-sm">
                <div>
                  <span className="pa-text-muted">{t('photos.photoDetails.fileName')}:</span>
                  <div className="pa-break-all">{photo.filename || 'Unknown'}</div>
                </div>
                {photo.size_bytes && (
                  <div>
                    <span className="pa-text-muted">{t('photos.photoDetails.size')}:</span>
                    <div>{(photo.size_bytes / 1024).toFixed(1)} KB</div>
                  </div>
                )}
                <div>
                  <span className="pa-text-muted">{t('photos.photoDetails.uploaded')}:</span>
                  <div>{new Date(photo.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <Card>
              <h3 className="pa-text-sm pa-font-semibold pa-mb-3">{t('photos.photoDetails.actions')}</h3>
              <div className="pa-space-y-2">
                <Button
                  variant="secondary"
                  onClick={handleDownload}
                  className="pa-w-full"
                >
                  {t('photos.downloadPhoto')}
                </Button>
                
                <Button
                  variant="secondary"
                  onClick={handleBackToGallery}
                  className="pa-w-full"
                >
                  {t('photos.photoDetails.backToGallery')}
                </Button>
                
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  loading={deleting}
                  className="pa-w-full"
                >
                  {t('photos.deletePhoto')}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
