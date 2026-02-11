import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import { Button, Card, InlineNotice } from '@/components/platformAdmin'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import {
  deleteGallery,
  deletePhotos,
  getGalleryById,
  getAlbumsForGallery,
  getPhotosForGallery,
  getGalleryPhotoUrl,
  moderatePhotos,
  type Gallery,
  type GalleryPhoto,
  type GalleryAlbum,
  type KeysetCursor,
} from '@/data/services/galleryService'
import { getMockGalleryById, getMockPhotosForGallery } from '@/data/fake/mockGalleries'
import { useUserContext } from '@/hooks/useUserContext'
import { useI18n } from '@/i18n/useI18n'
import { usePhotoFilters } from '@/hooks/usePhotoFilters'
import { PhotoFilterBar } from '@/components/gallery/PhotoFilterBar'
import { useInfinitePhotos } from '@/hooks/useInfinitePhotos'
import { buildPhotoQuery } from '@/utils/buildPhotoQuery'
import { USE_FAKE_DATA } from '@/data/config'
import { showError, showSuccess } from '@/utils/toast'
import { PhotoUploadZone } from '@/components/admin/galleries/PhotoUploadZone'
import { OrgAdminGalleryView } from '@/components/orgAdmin/OrgAdminGalleryView'
import { GalleryEditModal } from '@/components/admin/galleries/GalleryEditModal'
import { TaggingSlideout } from '@/components/gallery/TaggingSlideout'
import { BulkTaggingModal } from '@/components/gallery/BulkTaggingModal'
import { AlbumManager } from '@/components/gallery/AlbumManager'
import { getLink } from '@/utils/routes'
import '../../styles/orgAdmin.css'

const MAX_PHOTOS_PER_GALLERY = 25
const GRID_PAGE_SIZE_MOBILE = 30
const GRID_PAGE_SIZE_DESKTOP = 48

const getGridPageSize = () =>
  typeof window !== 'undefined' && window.innerWidth < 768 ? GRID_PAGE_SIZE_MOBILE : GRID_PAGE_SIZE_DESKTOP

export default function GalleryDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { context } = useUserContext()
  const { t } = useI18n()

  

  const { filters, setFilters, clearFilters, setDensity } = usePhotoFilters({
    viewKey: `adminGallery:${id || 'unknown'}`,
    defaultSort: 'recent',
    allowedSorts: ['recent', 'oldest'],
    defaultStatus: 'all',
    allowedStatuses: ['all', 'approved', 'pending', 'rejected'],
    persistDensity: true,
  })
  void setDensity

  // Local state for immediate UI updates (debounced URL sync)
  const [localSearchQuery, setLocalSearchQuery] = useState(filters.q)

  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [albums, setAlbums] = useState<GalleryAlbum[]>([])
  const cursorRef = useRef<KeysetCursor | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [gridPageSize, setGridPageSize] = useState(getGridPageSize)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [page, setPage] = useState(1)
  const [taggingPhoto, setTaggingPhoto] = useState<GalleryPhoto | null>(null)
  const [taggingPhotoIndex, setTaggingPhotoIndex] = useState<number>(-1)
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const [bulkTaggingPhotos, setBulkTaggingPhotos] = useState<GalleryPhoto[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const mountedRef = useRef(true)
  const loadingMoreRef = useRef(false)
  const photoFeedRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    // Reset on mount (important for React Strict Mode which unmounts/remounts)
    mountedRef.current = true
    // Mark component initialized after first render
    initializedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Sync local search query with URL filter when URL changes externally
  useEffect(() => {
    setLocalSearchQuery(filters.q)
  }, [filters.q])

  // Debounce search query updates to URL (prevent reload on every keystroke)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchQuery !== filters.q) {
        setFilters({ q: localSearchQuery })
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [localSearchQuery, filters.q, setFilters])

  // Scroll to photo feed when filters change (better UX)
  useEffect(() => {
    if (photoFeedRef.current && initializedRef.current) {
      photoFeedRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [filters.q, filters.album, filters.athlete, filters.sort, filters.status, filters.from, filters.to])

  useEffect(() => {
    const handleResize = () => {
      setGridPageSize(getGridPageSize())
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const loadGallery = useCallback(async () => {
    if (!id || !context) return
    if (USE_FAKE_DATA) {
      const mockGalleryDb = getMockGalleryById(id)
      if (mountedRef.current) {
        setGallery(
          mockGalleryDb
            ? ({ ...mockGalleryDb, can_download: mockGalleryDb.can_download ?? undefined } as unknown as Gallery)
            : null,
        )
      }
      return
    }

    const { data, error } = await getGalleryById(context, id)
    if (!mountedRef.current) return
    if (error) {
      showError(error.message)
      return
    }
    setGallery(data || null)
  }, [id, context])

  const loadAlbums = useCallback(async () => {
    if (!id || !context || USE_FAKE_DATA) return
    const { data, error } = await getAlbumsForGallery(context, id)
    if (!mountedRef.current) return
    if (error) {
      showError(error.message)
      return
    }
    setAlbums(data)
  }, [id, context])

  const loadPhotos = useCallback(async (reset: boolean): Promise<GalleryPhoto[] | null> => {
    if (!id || !context) return null
    if (loadingMoreRef.current && !reset) return null

    if (reset) {
      setLoading(true)
      loadingMoreRef.current = false
      cursorRef.current = null
      setHasMore(true)
    } else {
      loadingMoreRef.current = true
      setLoadingMore(true)
    }

    if (USE_FAKE_DATA) {
      const mockPhotosDb = getMockPhotosForGallery(id)
      const mockPhotos = mockPhotosDb.map(
        (p) => ({ ...p, can_download: p.can_download ?? undefined }) as unknown as GalleryPhoto,
      )
      if (mountedRef.current) {
        setPhotos(mockPhotos)
        setHasMore(false)
        setLoading(false)
        loadingMoreRef.current = false
        setLoadingMore(false)
      }
      return mockPhotos
    }

    const albumId = filters.album && filters.album !== 'favorites' ? filters.album : undefined
    const limit = viewMode === 'grid' ? gridPageSize : rowsPerPage
    const offset = viewMode === 'list' ? (page - 1) * rowsPerPage : undefined

    const query = buildPhotoQuery(filters, {
      gallery_id: id,
      album_id: albumId,
      limit,
      offset,
    })

    const { data, error } = await getPhotosForGallery(context, {
      ...query,
      cursor: viewMode === 'grid' && !reset ? cursorRef.current || undefined : undefined,
    })
    

    if (!mountedRef.current) return null

    if (error) {
      showError(error.message)
    } else {
      if (viewMode === 'grid') {
        setPhotos((prev) => (reset ? data : [...prev, ...data]))
        const last = data[data.length - 1]
        cursorRef.current = last ? { created_at: last.created_at, id: last.id } : cursorRef.current
        setHasMore(data.length === limit)
      } else {
        setPhotos(data)
        setHasMore(data.length === limit)
      }
    }

    
    setLoading(false)
    loadingMoreRef.current = false
    setLoadingMore(false)
    return data || null
  }, [id, context, filters, viewMode, gridPageSize, rowsPerPage, page])

  useEffect(() => {
    loadGallery()
    loadAlbums()
  }, [loadGallery, loadAlbums])

  useEffect(() => {
    if (viewMode === 'list') {
      setPage(1)
    }
  }, [viewMode, filters.q, filters.album, filters.athlete, filters.sort, filters.status, filters.from, filters.to])

  useEffect(() => {
    loadPhotos(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, context, viewMode, filters.q, filters.album, filters.athlete, filters.sort, filters.status, filters.from, filters.to, gridPageSize, rowsPerPage, page])

  useInfinitePhotos({
    hasMore: viewMode === 'grid' ? hasMore : false,
    isLoading: loading || loadingMore,
    onLoadMore: () => loadPhotos(false),
  })

  // Wrapped filter setter that updates local search immediately
  const handleFilterChange = useCallback(
    (updates: Parameters<typeof setFilters>[0]) => {
      if ('q' in updates) {
        // Update local state immediately for instant UI feedback
        setLocalSearchQuery(updates.q || '')
        // Remove 'q' from updates as it will be handled by debounce effect
        const { q, ...otherUpdates } = updates
        if (Object.keys(otherUpdates).length > 0) {
          setFilters(otherUpdates)
        }
      } else {
        setFilters(updates)
      }
    },
    [setFilters]
  )

  // Wrapped clear filters that also resets local search
  const handleClearFilters = useCallback(() => {
    setLocalSearchQuery('')
    clearFilters()
  }, [clearFilters])

  const photoStats = useMemo(() => {
    const approved = photos.filter((p) => p.approval_status === 'approved').length
    const pending = photos.filter((p) => p.approval_status === 'pending').length
    const flagged = photos.filter((p) => p.approval_status === 'rejected').length
    const total = photos.length
    const remaining = Math.max(0, MAX_PHOTOS_PER_GALLERY - total)
    const limitReached = total >= MAX_PHOTOS_PER_GALLERY

    return { approved, pending, flagged, total, remaining, limitReached }
  }, [photos])

  const sortOptions = useMemo(
    () => [
      { value: 'recent', label: t('common.mostRecent') },
      { value: 'oldest', label: t('photos.filters.oldest') },
    ],
    [t],
  )

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: t('photos.filters.statusAll') },
      { value: 'approved', label: t('common.approved') },
      { value: 'pending', label: t('photos.pendingApproval.badge') },
      { value: 'rejected', label: t('photos.filters.statusRejected') },
    ],
    [t],
  )

  const albumOptions = useMemo(
    () => albums.map((album) => ({ value: album.id, label: album.name })),
    [albums],
  )

  const athleteOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    photos.forEach((photo) => {
      photo.tagged_athletes?.forEach((athlete) => {
        const name = `${athlete.first_name} ${athlete.last_name}`.trim()
        map.set(athlete.id, { id: athlete.id, name })
      })
    })
    return Array.from(map.values()).map((athlete) => ({ value: athlete.id, label: athlete.name }))
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
    loadPhotos(true)
    loadGallery()
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
      showError(t('gallery.moderationQueue.approveError'))
    } else {
      showSuccess(t('photos.success.photosApproved'))
      loadPhotos(true)
      loadGallery()
    }
  }

  const entityMeta = useMemo(() => {
    if (!gallery) return null
    const label = gallery.entity_name || t(`photos.galleryType.${gallery.gallery_type}`)
    if (!gallery.entity_id) {
      if (gallery.gallery_type === 'org') {
        return { label: gallery.org_name || label, link: getLink('admin.organization.base') }
      }
      return { label }
    }

    switch (gallery.gallery_type) {
      case 'team':
        return { label, link: getLink('admin.teams.detail', { id: gallery.entity_id }) }
      case 'event':
        return { label, link: getLink('admin.events.detail', { id: gallery.entity_id }) }
      case 'season':
        return { label, link: getLink('admin.seasons.detail', { id: gallery.entity_id }) }
      case 'program':
        return { label, link: getLink('admin.programs.detail', { id: gallery.entity_id }) }
      case 'athlete':
        return { label, link: getLink('admin.athletes.detail', { id: gallery.entity_id }) }
      case 'travel':
        return { label, link: getLink('admin.travel.edit', { id: gallery.entity_id }) }
      default:
        return { label }
    }
  }, [gallery, t])

  if (loading) {
    return (
      <div className="oa-root">
        <div style={{ padding: '24px' }}>
          <div className="oa-skeleton" style={{ height: '60px', marginBottom: '24px' }} />
          <div className="oa-skeleton" style={{ height: '400px', borderRadius: '8px', marginBottom: '32px' }} />
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="oa-skeleton" style={{ height: '40px', width: '100px' }} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="oa-skeleton" style={{ height: '150px' }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Show error if gallery not found
  if (!gallery) {
    return (
      <div className="org-structure-page">
        <div className="oa-p-6">
          <InlineNotice
            tone="error"
            title={t('photos.errors.galleryNotFound')}
            message={t('photos.errors.galleryNotFound')}
          />
          <div className="oa-mt-4">
            <Button variant="secondary" onClick={() => navigate(getLink('admin.photos.list'))}>
              {t('common.goBack')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  

  return (
    <div className="org-structure-page">
      <AdminPageHeader
        title={gallery?.name || t('photos.allGalleries')}
        subtitle={entityMeta?.label}
        breadcrumbs={[
          { label: t('photos.title'), path: getLink('admin.photos.list') },
          { label: gallery?.name || t('photos.allGalleries') },
        ]}
        actions={
          <div style={{ display: 'flex', gap: 'var(--oa-space-3)' }}>
            <Button variant="secondary" onClick={handleEdit}>
              {t('photos.updateAlbumInfo')}
            </Button>
            <Button variant="primary" onClick={handleApproveAll}>
              {t('photos.approveAll')}
            </Button>
          </div>
        }
      >
        {entityMeta?.link && (
          <div className="oa-text-sm oa-text-muted">
            <Link to={entityMeta.link}>{t('photos.linkedTo')} {entityMeta.label}</Link>
          </div>
        )}
      </AdminPageHeader>

      <div className="oa-space-y-6">

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
                  <span className="org-stat-value" style={{ color: 'var(--oa-theme-action-primary)' }}>{String(photoStats.pending).padStart(2, '0')}</span>
                </div>
                <div className="org-stat-box">
                  <span className="org-stat-label">{t('common.approved')}</span>
                  <span className="org-stat-value" style={{ color: 'var(--oa-success)' }}>{String(photoStats.approved).padStart(2, '0')}</span>
                </div>
                <div className="org-stat-box">
                  <span className="org-stat-label">{t('photos.stats.flagged')}</span>
                  <span className="org-stat-value" style={{ color: 'var(--oa-danger)' }}>{String(photoStats.flagged).padStart(2, '0')}</span>
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
                <div style={{ padding: 'var(--oa-space-6)' }}>
                  <PhotoUploadZone 
                    galleryId={id} 
                    onComplete={() => {
                      loadPhotos(true)
                      loadGallery()
                    }} 
                    maxPhotos={photoStats.remaining}
                    requireApproval={gallery?.require_approval || false}
                  />
                </div>
              </Card>
            )}

            {gallery && !USE_FAKE_DATA && (
              <Card title={t('photos.albums.title')} className="oa-card oa-card--no-padding oa-mt-3">
                <div style={{ padding: 'var(--oa-space-6)' }}>
                  <AlbumManager
                    galleryId={gallery.id}
                    onAlbumsUpdated={(next) => setAlbums(next)}
                  />
                </div>
              </Card>
            )}

            {/* Photo Feed Section */}
            <Card 
              title={t('photos.photoFeed')}
              className="oa-card oa-card--no-padding oa-mt-3"
              actions={
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {selectedIds.length > 0 && (
                    <>
                      <span className="oa-text-sm oa-text-muted oa-mr-2">{selectedIds.length} selected</span>
                      <Button variant="danger" size="small" onClick={() => handleDeletePhotos(selectedIds)}>
                        Delete
                      </Button>
                      <Button variant="secondary" size="small" onClick={() => {
                        const selectedPhotos = photos.filter(p => selectedIds.includes(p.id))
                        setBulkTaggingPhotos(selectedPhotos)
                        setSelectedIds([])
                      }}>
                        Tag
                      </Button>
                      <Button variant="secondary" size="small" onClick={() => {
                        // Approve
                         moderatePhotos(context!, selectedIds, 'approve').then(() => {
                           loadPhotos(true)
                           showSuccess(t('photos.success.photosApproved'))
                           setSelectedIds([])
                         })
                      }}>
                        Approve
                      </Button>
                    </>
                  )}
                  <div style={{ width: '1px', height: '24px', background: 'var(--oa-border-subtle)', margin: '0 8px' }}></div>
                  <button 
                    onClick={() => setViewMode('grid')}
                    style={{ 
                      padding: '8px', 
                      color: viewMode === 'grid' ? 'var(--oa-theme-action-primary)' : 'var(--oa-text-muted)',
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
                      color: viewMode === 'list' ? 'var(--oa-theme-action-primary)' : 'var(--oa-text-muted)',
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
              <div style={{ padding: 'var(--oa-space-6)' }}>
                <div ref={photoFeedRef} id="photo-feed" className="oa-mb-4">
                  <PhotoFilterBar
                    filters={filters}
                    searchValue={localSearchQuery}
                    onFiltersChange={handleFilterChange}
                    onClear={handleClearFilters}
                    sortOptions={sortOptions}
                    showStatus
                    statusOptions={statusOptions}
                    albumOptions={albumOptions}
                    athleteOptions={athleteOptions}
                  />
                </div>
                {photos.length === 0 ? (
                  <div className="oa-text-center oa-py-12 oa-text-muted">
                    <p>{t('photos.stats.emptyGallery')}</p>
                    <p className="oa-text-sm oa-mt-1">{t('photos.upload.title')}</p>
                  </div>
                ) : (
                  <>
                    <OrgAdminGalleryView
                      gallery={gallery}
                      photos={photos}
                      loading={loading}
                      viewMode={viewMode}
                      onViewModeChange={setViewMode}
                      renderToolbar={() => null} // We use the page's filter bar
                      onDelete={handleDeletePhotos}
                      onModerate={async (ids, action) => {
                        if (!context || !gallery) return
                        if (USE_FAKE_DATA) {
                          showError(t('photos.demoMode.deleteBlocked'))
                          return
                        }
                        const { error } = await moderatePhotos(context, ids, action)
                        if (error) {
                          showError(
                            action === 'approve'
                              ? t('gallery.moderationQueue.approveError')
                              : t('gallery.moderationQueue.rejectError')
                          )
                          return
                        }
                        showSuccess(t('photos.success.photosApproved'))
                        loadPhotos(true)
                        loadGallery()
                      }}
                      onPhotoClick={(photo, index) => {
                        setTaggingPhoto(photo)
                        setTaggingPhotoIndex(index)
                      }}
                      selectionMode="multiple"
                      selectedIds={selectedIds}
                      onSelectionChange={setSelectedIds}
                    />
                    {viewMode === 'list' && (
                      <div className="oa-flex oa-justify-between oa-items-center oa-mt-6">
                        <div className="oa-flex oa-items-center oa-gap-2 whitespace-nowrap">
                          <span className="oa-text-sm oa-text-muted mr-2">{t('common.table.rowsPerPage')}</span>
                          <select
                            className="oa-input oa-w-28"
                            value={rowsPerPage}
                            onChange={(e) => {
                              setRowsPerPage(Number(e.target.value))
                              setPage(1)
                            }}
                          >
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>
                        {(page > 1 || hasMore) && (
                          <div className="oa-flex oa-items-center oa-gap-2">
                            <Button
                              variant="secondary"
                              size="small"
                              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                              disabled={page === 1}
                            >
                              {t('common.table.previousPage')}
                            </Button>
                            <span className="oa-text-sm">{page}</span>
                            <Button
                              variant="secondary"
                              size="small"
                              onClick={() => setPage((prev) => prev + 1)}
                              disabled={!hasMore}
                            >
                              {t('common.table.nextPage')}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    {viewMode === 'grid' && loadingMore && (
                      <div className="oa-text-center oa-mt-6 oa-text-muted">{t('common.loading')}</div>
                    )}
                  </>
                )}
              </div>
            </Card>
          </>
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
          onDelete={gallery.is_system_generated ? undefined : handleDeleteGallery}
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
            const refreshed = await loadPhotos(true)
            if (refreshed && advanceToNext && taggingPhotoIndex >= 0) {
              const nextIndex = taggingPhotoIndex + 1
              if (nextIndex < refreshed.length) {
                setTaggingPhoto(refreshed[nextIndex])
                setTaggingPhotoIndex(nextIndex)
                return
              }
            }
            setTaggingPhoto(null)
            setTaggingPhotoIndex(-1)
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
            loadPhotos(true)
            loadGallery()
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
          alt: photo.caption || t('photos.galleryView.photoAlt'),
        }))}
      />
    </div>
  )
}
