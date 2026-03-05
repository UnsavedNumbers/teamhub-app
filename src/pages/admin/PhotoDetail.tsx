import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, PageHeader, Button, Badge } from '@/components/platformAdmin'
import { useUserContext } from '@/hooks/useUserContext'
import { useI18n } from '@/i18n/useI18n'
import { USE_FAKE_DATA } from '@/data/config'
import { showError, showSuccess } from '@/utils/toast'
import { getLink } from '@/utils/routes'
import {
  getGalleryById,
  getPhotosForGallery,
  deletePhotos,
  moderatePhotos,
  getPendingPhotosCount,
  setGalleryCover,
  type Gallery,
  type GalleryPhoto
} from '@/data/services/galleryService'
import { PhotoUploadZone } from '@/components/admin/galleries/PhotoUploadZone'
import { OrgAdminGalleryView } from '@/components/orgAdmin/OrgAdminGalleryView'
import { GalleryEditModal } from '@/components/admin/galleries/GalleryEditModal'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { TopLevelStats } from '@/components/common/TopLevelStats'
import '../../styles/orgAdmin.css'

type ViewMode = 'grid' | 'list'

export default function PhotoDetail() {
  const { galleryId, photoId } = useParams<{ galleryId: string; photoId: string }>()
  const { context } = useUserContext()
  const navigate = useNavigate()
  const { t } = useI18n()
  const tAny = t as any

  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[] | null>(null)
  const [approveAllPendingIds, setApproveAllPendingIds] = useState<string[] | null>(null)

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

        // Load photos and counts
        const [photosResult, pendingResult] = await Promise.all([
          getPhotosForGallery(context, { gallery_id: galleryId, order_by: 'created_at', order_direction: 'asc' }),
          getPendingPhotosCount(context, galleryId)
        ])

        if (photosResult.error) {
          throw photosResult.error
        }

        const foundPhoto = photosResult.data?.find((p) => p.id === photoId)
        if (!foundPhoto) {
          throw new Error('Photo not found')
        }

        if (mounted) {
          setGallery(galleryData)
          setPhotos(photosResult.data || [])
          setPendingCount(pendingResult.data)
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
      // reload photos and counts
      if (!galleryId) return
      const [photosResult, pendingResult] = await Promise.all([
        getPhotosForGallery(context, { gallery_id: galleryId }),
        getPendingPhotosCount(context, galleryId)
      ])
      setPhotos(photosResult.data || [])
      setPendingCount(pendingResult.data)
      setSelectedIds([])
    } catch (err) {
      showError(err instanceof Error ? err.message : tAny('photos.moderation.' + (action === 'approve' ? 'approveError' : 'rejectError')))
    }
  }

  const handleDelete = async (ids: string[]) => {
    if (USE_FAKE_DATA) {
      showError(t('photos.demoMode.deleteBlocked'))
      return
    }

    setDeleteTargetIds(ids)
  }

  const confirmDelete = async (ids: string[]) => {
    if (ids.length === 0) return
    const { error } = await deletePhotos(context!, gallery?.id || '', ids)
    if (error) {
      showError(error.message)
      return
    }

    showSuccess(t('photos.success.photosDeleted', { count: ids.length }))
    setSelectedIds([])

    if (!galleryId) return
    const [photosResult, pendingResult] = await Promise.all([
      getPhotosForGallery(context!, { gallery_id: galleryId }),
      getPendingPhotosCount(context!, galleryId)
    ])
    setPhotos(photosResult.data || [])
    setPendingCount(pendingResult.data)
  }

  const handleApproveAllClick = () => {
    if (!gallery || photos.length === 0) return
    const pendingIds = photos.filter((p) => (p.approval_status || p.status) === 'pending').map((p) => p.id)
    if (pendingIds.length === 0) return
    setApproveAllPendingIds(pendingIds)
  }

  const handleSetCover = async (photoId: string) => {
    if (USE_FAKE_DATA) {
      showError(t('photos.demoMode.deleteBlocked'))
      return
    }

    if (!context || !galleryId) return

    try {
      const { error } = await setGalleryCover(context, galleryId, photoId)
      if (error) throw error
      showSuccess(t('photos.success.coverSet' as any))
      // Reload gallery to get updated cover photo
      const { data: galleryData } = await getGalleryById(context, galleryId)
      if (galleryData) {
        setGallery(galleryData)
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : t('photos.errors.setCover' as any))
    }
  }

  const handleTagPhoto = (_photoId: string) => {
    // TODO: Implement tag photo modal
    showError('Photo tagging coming soon')
  }

  if (loading) {
    return (
      <div className="oa-root">
        <div style={{ padding: '24px' }}>
          <div className="oa-skeleton" style={{ height: '60px', marginBottom: '24px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            <div className="oa-skeleton" style={{ height: '600px', borderRadius: '8px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="oa-skeleton" style={{ height: '200px' }} />
              <div className="oa-skeleton" style={{ height: '200px' }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="oa-root">
      <ConfirmDialog
        open={deleteTargetIds !== null}
        title={t('common.delete')}
        description={t('photos.confirmDelete' as any)}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={() => {
          const ids = deleteTargetIds
          setDeleteTargetIds(null)
          if (ids && ids.length > 0) {
            void confirmDelete(ids)
          }
        }}
        onCancel={() => setDeleteTargetIds(null)}
      />

      <ConfirmDialog
        open={approveAllPendingIds !== null}
        title={t('photos.approveAll')}
        description={t('photos.approveAllConfirm')}
        confirmLabel={t('photos.approveAll')}
        cancelLabel={t('common.cancel')}
        variant="primary"
        onConfirm={() => {
          const pendingIds = approveAllPendingIds
          setApproveAllPendingIds(null)
          if (pendingIds && pendingIds.length > 0) {
            void handleModerate(pendingIds, 'approve')
          }
        }}
        onCancel={() => setApproveAllPendingIds(null)}
      />

      <div className="oa-container oa-space-y-4">
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
              <Button variant="primary" onClick={handleApproveAllClick}>
                {t('photos.approveAll')}
              </Button>
            </>
          }
        />

        {/* Stats */}
        <TopLevelStats
          className="oa-mb-3"
          ariaLabel="Gallery photo summary metrics"
          items={[
            { id: 'total', label: t('photos.stats.totalPhotos'), value: String(photos.length) },
            { id: 'approved', label: t('common.approved'), value: String(photos.filter((p) => (p.approval_status || p.status) === 'approved').length), tone: 'success' },
            { id: 'pending', label: t('photos.pendingApproval.badge'), value: String(pendingCount), tone: pendingCount > 0 ? 'warning' : 'default' },
            { id: 'flagged', label: t('photos.stats.flagged'), value: String(photos.filter((p) => (p.approval_status || p.status) === 'rejected').length), tone: 'danger' },
          ]}
        />

        {/* Upload Zone */}
        <Card className="oa-card oa-mt-3">
          <div className="oa-flex oa-items-center oa-justify-between oa-mb-3">
            <h4 className="oa-text-base oa-font-semibold">{t('photos.upload.title')}</h4>
            {gallery && gallery.allow_contributions && (
              <Badge variant="info">{gallery.gallery_type}</Badge>
            )}
          </div>
          <PhotoUploadZone
            galleryId={gallery?.id || ''}
            onComplete={async () => {
              if (!context || !galleryId) return
              const [photosResult, pendingResult] = await Promise.all([
                getPhotosForGallery(context, { gallery_id: galleryId }),
                getPendingPhotosCount(context, galleryId)
              ])
              setPhotos(photosResult.data || [])
              setPendingCount(pendingResult.data)
            }}
            maxPhotos={25 - photos.length}
            requireApproval={gallery?.require_approval || false}
          />
        </Card>

        {/* Photos Grid/List */}
        <Card className="oa-card oa-space-y-3 oa-mt-3">
          <div className="oa-flex oa-justify-between oa-items-center" style={{ minHeight: '32px' }}>
            {selectedIds.length > 0 ? (
               <div className="oa-flex oa-gap-2 oa-items-center">
                  <span className="oa-text-sm oa-text-muted">{selectedIds.length} selected</span>
                  <Button variant="danger" size="small" onClick={() => handleDelete(selectedIds)}>
                    {t('common.delete')}
                  </Button>
                  <Button variant="secondary" size="small" onClick={() => handleModerate(selectedIds, 'approve')}>
                    {t('common.approve' as any)}
                  </Button>
                  <Button variant="secondary" size="small" onClick={() => handleModerate(selectedIds, 'reject')}>
                    {t('common.reject' as any)}
                  </Button>
                  <Button variant="ghost" size="small" onClick={() => setSelectedIds([])}>
                     {t('common.cancel')}
                  </Button>
               </div>
            ) : (
                <>
                  <h4 className="oa-text-base oa-font-semibold">{t('photos.title')}</h4>
                  <div className="oa-flex oa-gap-3 oa-items-center">
                    <span className="oa-text-sm oa-text-muted">{t('photos.stats.photosCount', { count: photos.length })}</span>
                    {/* View Mode Toggle */}
                    <div className="oa-flex oa-gap-1 oa-border oa-border-radius-s oa-p-1">
                      <button
                        type="button"
                        className={`oa-view-toggle-btn ${viewMode === 'grid' ? 'oa-view-toggle-btn--active' : ''}`}
                        onClick={() => setViewMode('grid')}
                        aria-label={t('photos.gridView' as any)}
                      >
                        <span className="material-symbols-outlined">grid_view</span>
                      </button>
                      <button
                        type="button"
                        className={`oa-view-toggle-btn ${viewMode === 'list' ? 'oa-view-toggle-btn--active' : ''}`}
                        onClick={() => setViewMode('list')}
                        aria-label={t('photos.listView' as any)}
                      >
                        <span className="material-symbols-outlined">view_list</span>
                      </button>
                    </div>
                  </div>
                </>
            )}
          </div>

          <OrgAdminGalleryView
            gallery={gallery}
            photos={photos}
            loading={loading}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            selectionMode="multiple"
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            renderToolbar={() => null}
            onDelete={handleDelete}
            onModerate={handleModerate}
            onTagPhoto={handleTagPhoto}
            onSetCover={handleSetCover}
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
