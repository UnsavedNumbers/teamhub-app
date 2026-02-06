import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import { Button, Card, InlineNotice } from '@/components/platformAdmin'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import {
  deleteGallery,
  deletePhotos,
  getGalleryById,
  getPhotosForGallery,
  getGalleryPhotoUrl,
  moderatePhotos,
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
import { TaggingSlideout } from '@/components/gallery/TaggingSlideout'
import { BulkTaggingModal } from '@/components/gallery/BulkTaggingModal'
import { getLink } from '@/utils/routes'

const MAX_PHOTOS_PER_GALLERY = 25
const PHOTOS_PER_PAGE = 12

export default function GalleryDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { context } = useUserContext()
  const { t } = useI18n()
  const tAny = t as any

  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [entityInfo, setEntityInfo] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [visibleCount, setVisibleCount] = useState(PHOTOS_PER_PAGE)
  const [taggingPhoto, setTaggingPhoto] = useState<GalleryPhoto | null>(null)
  const [taggingPhotoIndex, setTaggingPhotoIndex] = useState<number>(-1)
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const [bulkTaggingPhotos, setBulkTaggingPhotos] = useState<GalleryPhoto[]>([])

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
    
    // TODO: Load entity info for breadcrumbs if gallery has entity_id
    // For now, mock the structure
    if (gRes.data?.entity_id) {
      setEntityInfo({
        sport: 'Soccer',
        program: 'Travel',
        level: 'U12 Boys',
        season: 'Fall 2025',
        team: 'U12 Eagles',
        venue: 'Starlight Complex',
        city: 'Austin',
        state: 'TX',
        date: gRes.data.created_at
      })
    }
    
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const photoStats = useMemo(() => {
    const approved = photos.filter((p) => p.approval_status === 'approved').length
    const pending = photos.filter((p) => p.approval_status === 'pending').length
    const flagged = photos.filter((p) => p.approval_status === 'rejected').length
    const total = photos.length
    const remaining = Math.max(0, MAX_PHOTOS_PER_GALLERY - total)
    const limitReached = total >= MAX_PHOTOS_PER_GALLERY

    return { approved, pending, flagged, total, remaining, limitReached }
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

  const handleEdit = () => {
    if (USE_FAKE_DATA) {
      showError(t('photos.demoMode.editBlocked'))
      return
    }
    setEditOpen(true)
  }

  if (!id) return null

  const handleApproveAll = async () => {
    if (USE_FAKE_DATA) {
      showError(t('photos.demoMode.deleteBlocked'))
      return
    }
    const pendingIds = photos.filter((p) => p.approval_status === 'pending').map((p) => p.id)
    if (pendingIds.length === 0) {
      showError(t('photos.noPendingPhotos'))
      return
    }
    const confirm = window.confirm(t('photos.approveAllConfirm'))
    if (!confirm) return
    const { error } = await moderatePhotos(context, pendingIds, 'approve')
    if (error) {
      showError(tAny('photos.moderation.approveError'))
    } else {
      showSuccess(t('photos.success.photosApproved'))
      load()
    }
  }

  // Get subtitle based on gallery type
  const getGallerySubtitle = () => {
    if (!gallery) return undefined
    switch (gallery.gallery_type) {
      case 'event':
        return entityInfo ? `${entityInfo.venue || 'Event'} — ${entityInfo.city || ''}, ${entityInfo.state || ''}` : 'Event Album'
      case 'team':
        return entityInfo?.team || 'Team Album'
      case 'org':
        return 'Organization Album'
      case 'athlete':
        return 'Athlete Album'
      case 'program':
        return entityInfo?.program || 'Program Album'
      case 'season':
        return entityInfo?.season || 'Season Album'
      case 'travel':
        return 'Travel Album'
      default:
        return undefined
    }
  }

  return (
    <div className="org-structure-page">
      <AdminPageHeader
        title={gallery?.name || t('photos.viewGallery')}
        subtitle={getGallerySubtitle()}
        breadcrumbs={[
          { label: 'Photos', path: getLink('admin.photos.list') },
          { label: gallery?.name || 'Gallery' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: 'var(--pa-space-3)' }}>
            <Button variant="secondary" onClick={handleEdit}>
              {t('photos.updateAlbumInfo')}
            </Button>
            <Button variant="primary" onClick={handleApproveAll}>
              {t('photos.approveAll')}
            </Button>
          </div>
        }
      />

      <div className="pa-space-y-6">

        {loading ? (
          <Card className="pa-card pa-h-40 pa-animate-pulse" />
        ) : (
          <>
            {/* Stats */}
            <section className="org-stats-section">
              <div className="org-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="org-stat-box">
                  <span className="org-stat-label">{t('photos.stats.totalPhotos')}</span>
                  <span className="org-stat-value">{String(photoStats.total).padStart(2, '0')}</span>
                </div>
                <div className="org-stat-box">
                  <span className="org-stat-label">{t('photos.pendingApproval.badge')}</span>
                  <span className="org-stat-value" style={{ color: 'var(--pa-theme-action-primary)' }}>{String(photoStats.pending).padStart(2, '0')}</span>
                </div>
                <div className="org-stat-box">
                  <span className="org-stat-label">{t('common.approved')}</span>
                  <span className="org-stat-value" style={{ color: 'var(--pa-success)' }}>{String(photoStats.approved).padStart(2, '0')}</span>
                </div>
                <div className="org-stat-box">
                  <span className="org-stat-label">{t('photos.stats.flagged')}</span>
                  <span className="org-stat-value" style={{ color: 'var(--pa-danger)' }}>{String(photoStats.flagged).padStart(2, '0')}</span>
                </div>
              </div>
            </section>

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
              <Card title={t('photos.upload.title')} className="oa-card oa-card--no-padding">
                <div style={{ padding: 'var(--pa-space-6)' }}>
                  <PhotoUploadZone 
                    galleryId={id} 
                    onComplete={() => load()} 
                    maxPhotos={photoStats.remaining}
                    requireApproval={gallery?.require_approval || false}
                  />
                </div>
              </Card>
            )}

            {/* Photo Feed Section */}
            <Card 
              title={t('photos.photoFeed')}
              className="oa-card oa-card--no-padding pa-mt-3"
              actions={
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setViewMode('grid')}
                    style={{ 
                      padding: '8px', 
                      color: viewMode === 'grid' ? 'var(--pa-theme-action-primary)' : 'var(--pa-text-muted)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <span className="material-symbols-outlined">grid_view</span>
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    style={{ 
                      padding: '8px', 
                      color: viewMode === 'list' ? 'var(--pa-theme-action-primary)' : 'var(--pa-text-muted)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <span className="material-symbols-outlined">list</span>
                  </button>
                </div>
              }
            >
              <div style={{ padding: 'var(--pa-space-6)' }}>
                {photos.length === 0 ? (
                  <div className="pa-text-center pa-py-12 pa-text-muted">
                    <p>{t('photos.stats.emptyGallery')}</p>
                    <p className="pa-text-sm pa-mt-1">{t('photos.upload.title')}</p>
                  </div>
                ) : (
                  <>
                    <PhotoGalleryGrid
                    photos={photos.slice(0, visibleCount)}
                    coverPhotoId={gallery?.cover_photo_id || undefined}
                    onDelete={handleDeletePhotos}
                    showPendingBadge={gallery?.require_approval || false}
                    viewMode={viewMode}
                    onPhotoClick={(photo, index) => {
                      setTaggingPhoto(photo)
                      setTaggingPhotoIndex(index)
                    }}
                    onBulkTag={(selectedPhotos) => {
                      setBulkTaggingPhotos(selectedPhotos)
                    }}
                    onModerate={async (ids, action) => {
                      if (!context || !gallery) return
                      if (USE_FAKE_DATA) {
                        showError(t('photos.demoMode.deleteBlocked'))
                        return
                      }
                      const { error } = await moderatePhotos(context, ids, action)
                      if (error) {
                        showError(tAny('photos.moderation.' + (action === 'approve' ? 'approveError' : 'rejectError')))
                        return
                      }
                      showSuccess(t('photos.success.photosApproved'))
                      load()
                    }}
                  />
                  
                    {/* Load More Button - only show when there are more photos */}
                    {visibleCount < photos.length && (
                      <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'center' }}>
                        <Button 
                          variant="secondary" 
                          onClick={() => setVisibleCount((prev) => prev + PHOTOS_PER_PAGE)}
                        >
                          {t('photos.loadMore')}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
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

      {taggingPhoto && gallery && (
        <TaggingSlideout
          photo={taggingPhoto}
          gallery={gallery}
          isOpen={!!taggingPhoto}
          onClose={() => {
            setTaggingPhoto(null)
            setTaggingPhotoIndex(-1)
          }}
          onOpenLightbox={() => {
            setLightboxIndex(taggingPhotoIndex >= 0 ? taggingPhotoIndex : 0)
            setTaggingPhoto(null)
            setTaggingPhotoIndex(-1)
          }}
          onSave={async ({ advanceToNext }) => {
            if (id) {
              const result = await getPhotosForGallery(context, { gallery_id: id, order_by: 'created_at', order_direction: 'asc' })
              if (result.data) {
                setPhotos(result.data)
                if (advanceToNext && taggingPhotoIndex >= 0) {
                  const nextIndex = taggingPhotoIndex + 1
                  if (nextIndex < result.data.length) {
                    setTaggingPhoto(result.data[nextIndex])
                    setTaggingPhotoIndex(nextIndex)
                  } else {
                    setTaggingPhoto(null)
                    setTaggingPhotoIndex(-1)
                  }
                }
              }
            }
          }}
        />
      )}

      {/* Bulk tagging modal */}
      {bulkTaggingPhotos.length > 0 && (
        <BulkTaggingModal
          photos={bulkTaggingPhotos}
          isOpen={bulkTaggingPhotos.length > 0}
          onClose={() => setBulkTaggingPhotos([])}
          onComplete={() => {
            setBulkTaggingPhotos([])
            load()
          }}
        />
      )}

      {/* Lightbox */}
      <Lightbox
        open={lightboxIndex >= 0}
        close={() => setLightboxIndex(-1)}
        index={lightboxIndex}
        slides={photos.map((photo) => ({
          src: getGalleryPhotoUrl(photo.storage_path),
          alt: photo.caption || 'Gallery photo',
        }))}
      />
    </div>
  )
}
