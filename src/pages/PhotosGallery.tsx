/**
 * Gallery View Page
 *
 * Displays a single gallery with photos in a grid layout, with selection, tagging,
 * and yet-another-react-lightbox for full-size viewing.
 */

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import { useUserContext } from '../hooks/useUserContext'
import {
  getGalleryById,
  getAlbumsForGallery,
  getPhotosForGallery,
  getGalleryPhotoUrl,
  checkCanModerateGallery,
  checkCanUploadToGallery,
  getPhotoBookmarks,
  type Gallery,
  type GalleryPhoto,
  type GalleryAlbum,
  type KeysetCursor,
} from '../data/services/galleryService'
import PortalLayout from '../components/portal/PortalLayout'
import Card from '../components/portal/Card'
import Icon from '../components/portal/Icon'
import Button from '../components/portal/Button'
import { PhotoUploader } from '../components/gallery/PhotoUploader'
import { ParentPhotoUpload } from '../components/gallery/ParentPhotoUpload'
import { ModerationQueue } from '../components/gallery/ModerationQueue'
import { TaggingSlideout } from '../components/gallery/TaggingSlideout'
import { BulkTaggingModal } from '../components/gallery/BulkTaggingModal'
import { GalleryEditModal } from '../components/admin/galleries/GalleryEditModal'
import { PhotoFilterBar } from '../components/gallery/PhotoFilterBar'
import { AlbumManager } from '../components/gallery/AlbumManager'
import { BulkDownloadButton } from '../components/gallery/BulkDownloadButton'
import { PortalGalleryView } from '../components/portal/PortalGalleryView'
import { usePhotoFilters } from '../hooks/usePhotoFilters'
import { useInfinitePhotos } from '../hooks/useInfinitePhotos'
import { buildPhotoQuery } from '../utils/buildPhotoQuery'
import { showError } from '../utils/toast'
import { getLink } from '../utils/routes'
import { useI18n } from '../i18n/useI18n'

const GRID_PAGE_SIZE_MOBILE = 30
const GRID_PAGE_SIZE_DESKTOP = 48
const getGridPageSize = () =>
  typeof window !== 'undefined' && window.innerWidth < 768 ? GRID_PAGE_SIZE_MOBILE : GRID_PAGE_SIZE_DESKTOP

export default function PhotosGallery() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const isManageMode = location.pathname.includes('/manage')
  const { context, isReady } = useUserContext()
  const { t } = useI18n()
  const viewKey = isManageMode ? `photosGalleryManage:${id || 'unknown'}` : `photosGallery:${id || 'unknown'}`
  const { filters, setFilters, clearFilters, setDensity } = usePhotoFilters({
    viewKey,
    defaultSort: 'recent',
    allowedSorts: ['recent', 'oldest'],
    defaultStatus: 'all',
    allowedStatuses: ['all', 'approved', 'pending', 'rejected'],
    persistDensity: true,
  })
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const [canModerate, setCanModerate] = useState(false)
  const [canUpload, setCanUpload] = useState(false)
  const [showParentUpload, setShowParentUpload] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [taggingPhoto, setTaggingPhoto] = useState<GalleryPhoto | null>(null)
  const [taggingPhotoIndex, setTaggingPhotoIndex] = useState<number>(-1)
  const [bulkTaggingPhotos, setBulkTaggingPhotos] = useState<GalleryPhoto[]>([])
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [albums, setAlbums] = useState<GalleryAlbum[]>([])
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  const [hasMore, setHasMore] = useState(true)
  const [gridPageSize, setGridPageSize] = useState(getGridPageSize)
  const cursorRef = useRef<KeysetCursor | null>(null)
  const loadingMoreRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setGridPageSize(getGridPageSize())
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

  const albumOptions = useMemo(() => {
    const options = albums.map((album) => ({ value: album.id, label: album.name }))
    return [{ value: 'favorites', label: t('photos.bookmarks.favorites') }, ...options]
  }, [albums, t])

  const isFavoritesView = filters.album === 'favorites'

  const displayPhotos = useMemo(() => {
    if (!isFavoritesView) return photos
    return photos.filter((photo) => bookmarkedIds.has(photo.id))
  }, [photos, bookmarkedIds, isFavoritesView])

  const displayIndexMap = useMemo(
    () => new Map(displayPhotos.map((photo, index) => [photo.id, index])),
    [displayPhotos],
  )
  void displayIndexMap

  const photosByAlbum = useMemo(() => {
    if (filters.album || isFavoritesView || albums.length === 0) return null
    const byAlbum = new Map<string, GalleryPhoto[]>()
    const unassigned: GalleryPhoto[] = []
    displayPhotos.forEach((photo) => {
      if (photo.album_id) {
        const list = byAlbum.get(photo.album_id) || []
        list.push(photo)
        byAlbum.set(photo.album_id, list)
      } else {
        unassigned.push(photo)
      }
    })
    return { byAlbum, unassigned }
  }, [albums, displayPhotos, filters.album, isFavoritesView])

  const gridClass =
    filters.density === 'compact'
      ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6'
      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12'
  void gridClass

  const selectedDownloadIds = useMemo(() => {
    if (!gallery?.can_download) return []
    const photoMap = new Map(photos.map((photo) => [photo.id, photo]))
    return Array.from(selectedPhotos).filter((id) => photoMap.get(id)?.can_download !== false)
  }, [gallery, photos, selectedPhotos])

  const showingLabel = displayPhotos.length === 1 ? t('photos.photo') : t('photos.photos')
  const selectedLabel = selectedPhotos.size === 1 ? t('photos.selection.photo') : t('photos.selection.photos')



  const loadGallery = useCallback(async () => {
    if (!isReady || !id || !context) return
    setError(null)
    const galleryResult = await getGalleryById(context, id)

    if (!mountedRef.current) return

    if (galleryResult.error) {
      setError(galleryResult.error.message)
      return
    }

    setGallery(galleryResult.data)

    if (galleryResult.data) {
      const [moderateResult, uploadResult] = await Promise.all([
        checkCanModerateGallery(context, galleryResult.data.id),
        checkCanUploadToGallery(context, galleryResult.data.id),
      ])
      if (!mountedRef.current) return
      setCanModerate(moderateResult.allowed)
      setCanUpload(uploadResult.allowed)
    }
  }, [context, isReady, id])

  const loadAlbums = useCallback(async () => {
    if (!isReady || !id || !context) return
    const { data, error: albumsError } = await getAlbumsForGallery(context, id)
    if (!mountedRef.current) return
    if (albumsError) {
      showError(albumsError.message)
      return
    }
    setAlbums(data)
  }, [context, isReady, id])

  const loadPhotos = useCallback(async (reset: boolean): Promise<GalleryPhoto[] | null> => {
    if (!isReady || !id || !context) return null
    if (loadingMoreRef.current && !reset) return null

    if (reset) {
      setLoading(true)
      cursorRef.current = null
      setHasMore(true)
    } else {
      loadingMoreRef.current = true
      setLoadingMore(true)
    }

    const albumId = filters.album && filters.album !== 'favorites' ? filters.album : undefined
    const statusFilter = canModerate && filters.status !== 'all' ? (filters.status as any) : undefined

    const query = buildPhotoQuery(filters, {
      gallery_id: id,
      album_id: albumId,
      status: statusFilter,
      limit: gridPageSize,
    })

    const { data, error: photosError } = await getPhotosForGallery(context, {
      ...query,
      cursor: !reset ? cursorRef.current || undefined : undefined,
    })

    if (!mountedRef.current) return null

    if (photosError) {
      setError(photosError.message)
      setLoading(false)
      loadingMoreRef.current = false
      setLoadingMore(false)
      return null
    }

    if (reset) {
      setPhotos(data || [])
    } else {
      setPhotos((prev) => [...prev, ...(data || [])])
    }

    const last = data && data.length > 0 ? data[data.length - 1] : null
    cursorRef.current = last ? { created_at: last.created_at, id: last.id } : cursorRef.current
    setHasMore((data || []).length === gridPageSize)

    if (data && data.length > 0 && context.userId) {
      const bookmarkResult = await getPhotoBookmarks(context, data.map((photo) => photo.id))
      if (bookmarkResult.error) {
        showError(bookmarkResult.error.message)
      } else {
        setBookmarkedIds((prev) => {
          const next = reset ? new Set<string>() : new Set(prev)
          bookmarkResult.data.forEach((id) => next.add(id))
          return next
        })
      }
    } else if (reset) {
      setBookmarkedIds(new Set())
    }

    setLoading(false)
    loadingMoreRef.current = false
    setLoadingMore(false)
    return data || null
  }, [context, isReady, id, filters, gridPageSize, canModerate])

  useEffect(() => {
    loadGallery()
    loadAlbums()
  }, [loadGallery, loadAlbums])

  useEffect(() => {
    loadPhotos(true)
  }, [loadPhotos])

  useEffect(() => {
    setSelectedPhotos(new Set())
  }, [filters.q, filters.album, filters.athlete, filters.sort, filters.status, filters.from, filters.to])

  useInfinitePhotos({
    hasMore,
    isLoading: loading || loadingMore,
    onLoadMore: () => loadPhotos(false),
  })

  if (loading) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: t('common.home'), path: getLink('portal.dashboard') },
          { label: t('nav.photos'), path: getLink('portal.photos') },
          { label: t('common.loading') },
        ]}
      >
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="aspect-square bg-slate-200 dark:bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </PortalLayout>
    )
  }

  if (error || !gallery) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: t('common.home'), path: getLink('portal.dashboard') },
          { label: t('nav.photos'), path: getLink('portal.photos') },
          { label: t('common.error.label') },
        ]}
      >
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">
            {error || t('photos.errors.galleryNotFound')}
          </p>
        </Card>
      </PortalLayout>
    )
  }

  return (
    <PortalLayout
      breadcrumbs={[
        { label: t('common.home'), path: getLink('portal.dashboard') },
        { label: t('nav.photos'), path: getLink('portal.photos') },
        { label: gallery.name },
      ]}
    >
      {/* Header Section */}
      <section className="mb-16">
        <div className="flex flex-col gap-4">
          <h1 className="text-6xl md:text-7xl font-[900] tracking-tighter text-slate-900 dark:text-white leading-none">
            {gallery.name}
          </h1>

          <div className="flex items-center justify-between mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-8">
              {/* Action buttons */}
              {gallery.require_approval && (
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                  {t('photos.galleryView.moderationRequired')}
                </span>
              )}
              {!isManageMode && canModerate && (
                <Link to={getLink('portal.photosGalleryManage', { id: gallery.id })}>
                  <button className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-black dark:hover:text-white transition-colors">
                    <Icon name="edit" size="text-sm" />
                    {t('photos.galleryView.manage')}
                  </button>
                </Link>
              )}
              {!isManageMode && gallery.allow_contributions && canUpload && (
                <button
                  onClick={() => setShowParentUpload(!showParentUpload)}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-black dark:hover:text-white transition-colors"
                >
                  <Icon name="add" size="text-sm" />
                  {t('photos.galleryView.addYourPhotos')}
                </button>
              )}
              {canModerate && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-black dark:hover:text-white transition-colors"
                >
                  <Icon name="edit" size="text-sm" />
                  {t('photos.galleryView.updateAlbum')}
                </button>
              )}
            </div>

            <div className="text-sm font-medium text-slate-400 italic">
              {t('photos.galleryView.showingCount', { count: displayPhotos.length, label: showingLabel })}
            </div>
          </div>

          <div className="mt-6">
            <PhotoFilterBar
              filters={filters}
              onFiltersChange={setFilters}
              onClear={clearFilters}
              sortOptions={sortOptions}
              showStatus={canModerate}
              statusOptions={statusOptions}
              albumOptions={albumOptions}
              athleteOptions={athleteOptions}
              showDensity
              onDensityChange={setDensity}
            />
          </div>
        </div>
      </section>

      {/* Parent upload (shown in view mode when allow_contributions is true) */}
      {!isManageMode && showParentUpload && gallery && gallery.allow_contributions && (
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{t('photos.galleryView.shareHighlights')}</h2>
            <Button
              variant="secondary"
              onClick={() => setShowParentUpload(false)}
            >
              <Icon name="close" size="text-sm" />
            </Button>
          </div>
          <ParentPhotoUpload
            gallery={gallery}
            onUploadComplete={() => {
              setShowParentUpload(false)
              loadPhotos(true)
            }}
          />
        </Card>
      )}

      {/* Coach/admin upload and moderation (shown in manage mode) */}
      {isManageMode && gallery && canModerate && (
        <>
          {/* Moderation Queue */}
          {gallery.require_approval && (
            <Card className="mb-8">
              <h2 className="text-xl font-bold mb-4">{t('gallery.moderationQueue.title')}</h2>
              <ModerationQueue
                galleryId={gallery.id}
                onModerationComplete={() => {
                  loadPhotos(true)
                }}
              />
            </Card>
          )}

          <Card className="mb-8">
            <AlbumManager
              galleryId={gallery.id}
              onAlbumsUpdated={(next) => setAlbums(next)}
            />
          </Card>

          {/* Upload Photos */}
          <Card className="mb-8">
            <h2 className="text-xl font-bold mb-4">{t('photos.upload.title')}</h2>
            <PhotoUploader
              gallery={gallery}
              albumId={filters.album && filters.album !== 'favorites' ? filters.album : null}
              onUploadComplete={() => {
                loadPhotos(true)
              }}
            />
          </Card>
        </>
      )}

      {displayPhotos.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Icon name="photo_library" size="text-6xl" className="text-slate-300 dark:text-slate-600 mb-4 mx-auto" />
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              {t('photos.galleryView.empty')}
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Photo Grid */}
          {photosByAlbum ? (
            <div className="space-y-12 mb-32">
              {photosByAlbum.unassigned.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">
                    {t('photos.albums.unassigned')}
                  </h3>
                  <PortalGalleryView
                    gallery={gallery}
                    photos={photosByAlbum.unassigned}
                    bookmarkedIds={bookmarkedIds}
                    onBookmarkChange={(id, isBookmarked) => {
                      setBookmarkedIds((prev) => {
                        const next = new Set(prev)
                        if (isBookmarked) next.add(id)
                        else next.delete(id)
                        return next
                      })
                    }}
                    onPhotoClick={(photo) => {
                      const idx = displayPhotos.findIndex((p) => p.id === photo.id)
                      setLightboxIndex(idx)
                    }}
                    selectedIds={Array.from(selectedPhotos)}
                    onSelectionChange={(ids) => setSelectedPhotos(new Set(ids))}
                  />
                </div>
              )}
              {albums.map((album) => {
                const items = photosByAlbum.byAlbum.get(album.id) || []
                if (items.length === 0) return null
                return (
                  <div key={album.id}>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">
                      {album.name}
                    </h3>
                    <PortalGalleryView
                      gallery={gallery}
                      photos={items}
                      bookmarkedIds={bookmarkedIds}
                      onBookmarkChange={(id, isBookmarked) => {
                        setBookmarkedIds((prev) => {
                          const next = new Set(prev)
                          if (isBookmarked) next.add(id)
                          else next.delete(id)
                          return next
                        })
                      }}
                      onPhotoClick={(photo) => {
                        const idx = displayPhotos.findIndex((p) => p.id === photo.id)
                        setLightboxIndex(idx)
                      }}
                      selectedIds={Array.from(selectedPhotos)}
                      onSelectionChange={(ids) => setSelectedPhotos((prev) => {
                         // Merging selection from multiple grids is tricky if they overwrite
                         // But PortalGalleryView controlled mode just emits the ids.
                         // We need to merge.
                         // Actually the prompt says "Replace manual grid", implying one grid.
                         // But PhotosGallery supports grouping by album.
                         // The existing code iterates albums and renders grid for each.
                         // We are replacing `renderPhotoGrid` call.
                         
                         // If we have multiple PortalGalleryView instances, they need to share selection state properly.
                         // `onSelectionChange` typically returns the *new* full list.
                         // If I use it here, I might overwrite selection from other albums.
                         // I need to be careful.
                         
                         // Better approach:
                         // Keep `renderPhotoGrid` logic but make IT render PortalGalleryView?
                         
                         const newSet = new Set(prev)
                         // Determine which items were in this album's view to toggle them?
                         // The PortalGalleryView doesn't give us delta. It gives us "selectedIds".
                         // This is a limitation of the controlled component pattern when used in multiple instances sharing one state.
                         
                         // WORKAROUND:
                         // Since `PortalGalleryView` is now the fundamental block, 
                         // and we have multiple blocks share one state `selectedPhotos`.
                         // We need `onSelectionChange` to support merging.
                         
                         // Actually, if `PortalGalleryView` receives `selectedIds`, it displays them.
                         // When it emits `onSelectionChange`, it emits `[...ids]`.
                         // If I click one item in Album A, it emits [id].
                         // If I had items selected in Album B, they are missing from Album A's view probably?
                         // wait, `items` prop in `PortalGalleryView` determines scope.
                         // useGallerySelection is scoped to `items`.
                         // So it only knows about Album A items.
                         // So it spits out only Album A selections.
                         
                         // So we need to merge.
                         // We can take the emitted IDs, find which ones belong to this Album.
                         // Update `selectedPhotos` by replacing Album A's matches with new matches, keeping Album B's matches.
                         
                         const albumItemIds = new Set(items.map(i => i.id))
                         ids.forEach(id => newSet.add(id))
                         // Remove ones no longer in ids BUT were in albumItemIds
                         for (const id of albumItemIds) {
                            if (!ids.includes(id)) newSet.delete(id)
                         }
                         return newSet
                      })}
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mb-32">
              <PortalGalleryView
                gallery={gallery}
                photos={displayPhotos}
                bookmarkedIds={bookmarkedIds}
                onBookmarkChange={(id, isBookmarked) => {
                  setBookmarkedIds((prev) => {
                    const next = new Set(prev)
                    if (isBookmarked) next.add(id)
                    else next.delete(id)
                    return next
                  })
                }}
                onPhotoClick={(photo) => {
                  const idx = displayPhotos.findIndex((p) => p.id === photo.id)
                  setLightboxIndex(idx)
                }}
                selectedIds={Array.from(selectedPhotos)}
                onSelectionChange={(ids) => setSelectedPhotos(new Set(ids))}
              />
            </div>
          )}

          {loadingMore && (
            <div className="text-center text-sm text-slate-500 mb-12">
              {t('common.loading')}
            </div>
          )}

          {/* Bottom Action Bar - Fixed when photos are selected */}
          {selectedPhotos.size > 0 && (
            <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[60]">
              <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl px-8 py-4 rounded-full shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] border border-slate-200 dark:border-slate-700 flex items-center gap-10">
                <div className="flex items-center gap-4 border-r border-slate-200 dark:border-slate-700 pr-10">
                  <span className="text-black dark:text-white font-black text-sm">
                    {t('photos.selection.count', { count: selectedPhotos.size, label: selectedLabel })}
                  </span>
                  <button
                    onClick={() => setSelectedPhotos(new Set())}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>

                <div className="flex items-center gap-6">
                  <button className="flex items-center gap-2 text-sm font-bold hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-xl">ios_share</span>
                    {t('common.share')}
                  </button>
                  {gallery.can_download && (
                    <BulkDownloadButton
                      galleryId={gallery.id}
                      photoIds={selectedDownloadIds}
                      disabled={selectedDownloadIds.length === 0}
                      label={t('photos.download.selected')}
                      onComplete={() => setSelectedPhotos(new Set())}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Lightbox */}
          <Lightbox
            open={lightboxIndex >= 0}
            close={() => setLightboxIndex(-1)}
            index={lightboxIndex}
            slides={displayPhotos.map((photo) => ({
              src: getGalleryPhotoUrl(photo.storage_path),
              alt: photo.caption || t('photos.galleryView.photoAlt'),
            }))}
          />
        </>
      )}
      {/* Tagging slideout */}
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
          onClose={() => {
            setBulkTaggingPhotos([])
            setSelectedPhotos(new Set())
          }}
          onComplete={() => {
            loadPhotos(true)
          }}
        />
      )}

      {/* Gallery Edit Modal */}
      {gallery && (
        <GalleryEditModal
          open={showEditModal}
          gallery={gallery}
          photos={photos}
          onClose={() => setShowEditModal(false)}
          onSaved={(updatedGallery) => {
            setGallery(updatedGallery)
            setShowEditModal(false)
          }}
        />
      )}
    </PortalLayout>
  )
}
