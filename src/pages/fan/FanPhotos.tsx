/**
 * Fan Photos & Videos Page
 * 
 * Browse photos and videos from followed entities.
 * Only shows galleries with fans_can_see = true.
 * Tagged athlete photos visible from ANY gallery with fans_can_see = true.
 * 
 * URL/ROUTE: /fan/photos
 * Design: FanConnect Minimalist Light
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getFollowedOrgs } from '../../data/services/fanService'
import {
  getFanGalleries,
  getFanGallery,
  getFanGalleryPhotos,
  type FanGallery,
  type FanGalleryGroup,
} from '../../data/services/fanPhotosService'
import type { GalleryPhoto, KeysetCursor } from '../../data/services/galleryService'
import { getLink, RouteKeys } from '../../utils/routes'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { showError } from '../../utils/toast'
import { useI18n } from '../../i18n/useI18n'
import { usePhotoFilters } from '../../hooks/usePhotoFilters'
import { PhotoFilterBar } from '../../components/gallery/PhotoFilterBar'
import { useInfinitePhotos } from '../../hooks/useInfinitePhotos'
import { buildPhotoQuery } from '../../utils/buildPhotoQuery'
import { BulkDownloadButton } from '../../components/gallery/BulkDownloadButton'
import '../../styles/fan.css'
import '../../styles/fan-layouts.css'

type FanPhoto = GalleryPhoto & {
  tagged_people?: string[]
  watermark_url?: string
}

const getPageSize = () => (typeof window !== 'undefined' && window.innerWidth < 768 ? 30 : 48)

import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'

export default function FanPhotos() {
  useDebugLifecycle('FanPhotos')
  
  const navigate = useNavigate()
  const { t } = useI18n()
  const tAny = t as unknown as (key: string, params?: any) => string

  const { filters, setFilters, clearFilters } = usePhotoFilters({
    viewKey: 'fanPhotos',
    defaultSort: 'recent',
    allowedSorts: ['recent', 'oldest'],
    persistDensity: false,
  })

  const [galleries, setGalleries] = useState<FanGallery[]>([])
  const [grouped, setGrouped] = useState<FanGalleryGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<KeysetCursor | null>(null)
  const [orgLogoById, setOrgLogoById] = useState<Record<string, string | null>>({})
  const [pageSize, setPageSize] = useState(getPageSize)
  const [mediaType, setMediaType] = useState<'photos' | 'videos'>('photos')
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setPageSize(getPageSize())
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const sortOptions = useMemo(
    () => [
      { value: 'recent', label: t('common.mostRecent') },
      { value: 'oldest', label: t('photos.filters.oldest') },
    ],
    [t]
  )

  const orgOptions = useMemo(() => {
    const options = grouped.map((group) => ({
      value: group.org_id,
      label: group.org_name || t('common.unknown'),
    }))
    return options.length > 1 ? options : []
  }, [grouped, t])

  const mergeGrouped = useCallback((prev: FanGalleryGroup[], next: FanGalleryGroup[]) => {
    const map = new Map<string, FanGalleryGroup>()
    prev.forEach((group) => map.set(group.org_id, { ...group, galleries: [...group.galleries] }))
    next.forEach((group) => {
      const existing = map.get(group.org_id)
      if (existing) {
        existing.galleries = [...existing.galleries, ...group.galleries]
      } else {
        map.set(group.org_id, { ...group, galleries: [...group.galleries] })
      }
    })
    return Array.from(map.values())
  }, [])

  const loadGalleries = useCallback(async (reset: boolean) => {
    if (loading || loadingMore) return

    if (mediaType === 'videos') {
      if (!mountedRef.current) return
      setGalleries([])
      setGrouped([])
      setHasMore(false)
      setCursor(null)
      setLoading(false)
      setLoadingMore(false)
      return
    }

    if (reset) {
      setLoading(true)
      setCursor(null)
      setHasMore(true)
    } else {
      setLoadingMore(true)
    }

    const { data, grouped: groupedData, error } = await getFanGalleries({
      search: filters.q || undefined,
      org_ids: filters.org ? [filters.org] : undefined,
      limit: pageSize,
      cursor: reset ? undefined : cursor || undefined,
      order_direction: filters.sort === 'oldest' ? 'asc' : 'desc',
    })

    if (!mountedRef.current) return

    if (error) {
      showError(error.message)
    } else {
      if (reset) {
        setGalleries(data)
        setGrouped(groupedData)
      } else {
        setGalleries((prev) => [...prev, ...data])
        setGrouped((prev) => mergeGrouped(prev, groupedData))
      }
      const last = data[data.length - 1]
      setCursor(last ? { created_at: last.created_at, id: last.id } : cursor)
      setHasMore(data.length === pageSize)
    }

    setLoading(false)
    setLoadingMore(false)
  }, [loading, loadingMore, filters.q, filters.org, filters.sort, mediaType, pageSize, cursor, mergeGrouped])

  useEffect(() => {
    const loadFollowedOrgLogos = async () => {
      const result = await getFollowedOrgs()
      if (!mountedRef.current || result.error) return
      const logoMap = (result.data || []).reduce<Record<string, string | null>>((acc, follow) => {
        acc[follow.org_id] = follow.org?.logo_url ?? null
        return acc
      }, {})
      setOrgLogoById(logoMap)
    }
    loadFollowedOrgLogos()
  }, [])

  useEffect(() => {
    loadGalleries(true)
  }, [loadGalleries])

  useInfinitePhotos({
    hasMore,
    isLoading: loading || loadingMore,
    onLoadMore: () => loadGalleries(false),
  })

  const handleGalleryClick = (galleryId: string) => {
    navigate(getLink(RouteKeys.FAN_PHOTOS_GALLERY, { id: galleryId }))
  }

  const hasResults = grouped.some((group) => group.galleries.length > 0)

  if (loading && galleries.length === 0) {
    return (
      <div className="fan-loading-page">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  return (
    <div className="fan-photos-page">
      {/* Page Header - Matching Design */}
      <div className="fan-photos-header">
        <div>
          <span className="fan-photos-label">{tAny('fan.photos.officialLabel')}</span>
          <h1 className="fan-photos-title">{tAny('fan.photos.mediaGalleryTitle')}</h1>
        </div>

        {/* Photos/Videos Toggle */}
        <div className="fan-photos-toggle">
          <button
            className={`fan-photos-toggle-btn ${mediaType === 'photos' ? 'active' : ''}`}
            onClick={() => setMediaType('photos')}
          >
            {tAny('fan.photos.filterType.photos')}
          </button>
          <button
            className={`fan-photos-toggle-btn ${mediaType === 'videos' ? 'active' : ''}`}
            onClick={() => setMediaType('videos')}
          >
            {tAny('fan.photos.filterType.videos')}
          </button>
        </div>
      </div>

      <div className="mb-6">
        <PhotoFilterBar
          filters={filters}
          onFiltersChange={setFilters}
          onClear={clearFilters}
          showDateRange={false}
          sortOptions={sortOptions}
          orgOptions={orgOptions}
        />
      </div>

      {(!hasResults || mediaType === 'videos') && !loading ? (
        <div className="fan-photos-empty">
          <div className="fan-photos-empty-icon">
            <span className="material-symbols-outlined">
              {filters.q ? 'search_off' : 'photo_library'}
            </span>
          </div>
          <h3 className="fan-photos-empty-title">
            {filters.q ? t('photos.filters.noResults') : tAny('fan.photos.noGalleries')}
          </h3>
          <p className="fan-photos-empty-text">
            {filters.q ? t('emptyStates.tryAdjusting') : tAny('fan.photos.checkBackLater')}
          </p>
        </div>
      ) : (
        <div className="fan-galleries-grid">
          {grouped.map((group) => (
            <div key={group.org_id} className="fan-galleries-group">
              <div className="fan-galleries-group-header">
                <div className="fan-galleries-group-title">
                  <span className="fan-galleries-group-logo">
                    {orgLogoById[group.org_id] ? (
                      <img src={orgLogoById[group.org_id] || undefined} alt={group.org_name || 'Organization'} />
                    ) : (
                      <span className="material-symbols-outlined">business</span>
                    )}
                  </span>
                  <span>{group.org_name || t('common.unknown')}</span>
                </div>
                {!filters.org && (
                  <button
                    className="fan-galleries-group-link"
                    onClick={() => setFilters({ org: group.org_id })}
                  >
                    {t('photos.browse.viewAll')}
                  </button>
                )}
              </div>
              <div className="fan-galleries-grid">
                {group.galleries.map((gallery) => (
                  <GalleryCard
                    key={gallery.id}
                    gallery={gallery}
                    onClick={() => handleGalleryClick(gallery.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {loadingMore && (
        <div className="fan-photos-load-more">
          <LoadingSpinner size="small" />
        </div>
      )}
    </div>
  )
}

/**
 * Gallery Card Component
 */
interface GalleryCardProps {
  gallery: FanGallery
  onClick: () => void
}

function GalleryCard({ gallery, onClick }: GalleryCardProps) {
  const { t } = useI18n()
  const tAny = t as unknown as (key: string, params?: any) => string

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="fan-gallery-card-masonry" onClick={onClick}>
      <div className="fan-gallery-cover-masonry">
        {gallery.cover_url ? (
          <img src={gallery.cover_url} alt={gallery.name} loading="lazy" />
        ) : (
          <div className="fan-gallery-cover-placeholder">
            <span className="material-symbols-outlined">photo_library</span>
          </div>
        )}
        <div className="fan-gallery-overlay">
          <p className="fan-gallery-category">{gallery.org_name || gallery.team_name || tAny('fan.photos.galleryLabel')}</p>
          <h3 className="fan-gallery-name-overlay">{gallery.name}</h3>
          <p className="fan-gallery-date-overlay">{formatDate(gallery.created_at)}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Gallery Detail Page
 * URL/ROUTE: /fan/photos/gallery/:id
 */
export function FanGalleryDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useI18n()
  const tAny = t as unknown as (key: string, params?: any) => string

  const { filters, setFilters, clearFilters, setDensity } = usePhotoFilters({
    viewKey: `fanGallery:${id || 'unknown'}`,
    defaultSort: 'recent',
    allowedSorts: ['recent', 'oldest'],
    persistDensity: true,
  })

  const [gallery, setGallery] = useState<FanGallery | null>(null)
  const [photos, setPhotos] = useState<FanPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<KeysetCursor | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<FanPhoto | null>(null)
  const [pageSize, setPageSize] = useState(getPageSize)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setPageSize(getPageSize())
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const sortOptions = useMemo(
    () => [
      { value: 'recent', label: t('common.mostRecent') },
      { value: 'oldest', label: t('photos.filters.oldest') },
    ],
    [t]
  )

  const loadGallery = useCallback(async () => {
    if (!id) return
    const { data, error } = await getFanGallery(id)
    if (!mountedRef.current) return
    if (error) {
      showError(error.message)
      return
    }
    setGallery(data)
  }, [id])

  const loadPhotos = useCallback(async (reset: boolean) => {
    if (!id || loadingMore) return

    if (reset) {
      setLoading(true)
      setCursor(null)
      setHasMore(true)
    } else {
      setLoadingMore(true)
    }

    const query = buildPhotoQuery(filters, {
      gallery_id: id,
      limit: pageSize,
    })

    const { gallery_id: _galleryId, ...params } = query

    const { data, error } = await getFanGalleryPhotos(id, {
      ...params,
      cursor: reset ? undefined : cursor || undefined,
    })

    if (!mountedRef.current) return

    if (error) {
      showError(error.message)
    } else {
      if (reset) {
        setPhotos(data)
      } else {
        setPhotos((prev) => [...prev, ...data])
      }
      const last = data[data.length - 1]
      setCursor(last ? { created_at: last.created_at, id: last.id } : cursor)
      setHasMore(data.length === pageSize)
    }

    setLoading(false)
    setLoadingMore(false)
  }, [id, filters, pageSize, cursor, loadingMore])

  useEffect(() => {
    loadGallery()
  }, [loadGallery])

  useEffect(() => {
    loadPhotos(true)
  }, [loadPhotos])

  useInfinitePhotos({
    hasMore,
    isLoading: loading || loadingMore,
    onLoadMore: () => loadPhotos(false),
  })

  if (loading && photos.length === 0) {
    return (
      <div className="fan-loading-page">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (!gallery) {
    return (
      <div className="fan-empty-state">
        <span className="material-symbols-outlined">error</span>
        <h3>{tAny('fan.photos.galleryNotFoundTitle')}</h3>
        <p>{tAny('fan.photos.galleryNotFoundMessage')}</p>
        <button
          className="fan-btn fan-btn-primary"
          onClick={() => navigate(getLink(RouteKeys.FAN_PHOTOS))}
        >
          {tAny('fan.photos.backToPhotos')}
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Back Button */}
      <button
        className="fan-back-btn"
        onClick={() => navigate(getLink(RouteKeys.FAN_PHOTOS))}
      >
        <span className="material-symbols-outlined">arrow_back</span>
        {tAny('fan.photos.backToPhotos')}
      </button>

      {/* Gallery Header */}
      <div className="fan-gallery-header">
        <h1 className="fan-gallery-detail-name">{gallery.name}</h1>
        {gallery.description && (
          <p className="fan-gallery-description">{gallery.description}</p>
        )}
        <div className="fan-gallery-meta">
          <span>{gallery.org_name || gallery.team_name}</span>
          <span>•</span>
          <span>
            {(gallery.photo_count || 0) === 1
              ? tAny('fan.photos.photoCount', { count: gallery.photo_count || 0 })
              : tAny('fan.photos.photoCount_plural', { count: gallery.photo_count || 0 })}
          </span>
          <span>•</span>
          <span>{new Date(gallery.created_at).toLocaleDateString()}</span>
        </div>

        <div className="fan-gallery-actions">
          {gallery.can_download && (
            <BulkDownloadButton
              galleryId={gallery.id}
              label={t('photos.download.download')}
            />
          )}
          <button className="fan-btn fan-btn-secondary">
            <span className="material-symbols-outlined">share</span>
            {t('common.share')}
          </button>
        </div>
      </div>

      <div className="mb-6">
        <PhotoFilterBar
          filters={filters}
          onFiltersChange={setFilters}
          onClear={clearFilters}
          sortOptions={sortOptions}
          showStatus={false}
          showDensity
          onDensityChange={setDensity}
        />
      </div>

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <div className="fan-empty-state">
          <span className="material-symbols-outlined">image</span>
          <h3>{tAny('fan.photos.noPhotosYet')}</h3>
          <p>{tAny('fan.photos.checkBackLater')}</p>
        </div>
      ) : (
        <div className={`fan-photos-grid ${filters.density === 'compact' ? 'fan-photos-grid-compact' : ''}`}>
          {photos.map((photo, index) => (
            <div
              key={photo.id || index}
              className="fan-photo-item"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img src={photo.thumbnail_url || photo.url} alt="" loading="lazy" />
            </div>
          ))}
        </div>
      )}

      {loadingMore && (
        <div className="fan-photos-load-more">
          <LoadingSpinner size="small" />
        </div>
      )}

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          photos={photos}
          onClose={() => setSelectedPhoto(null)}
          onNavigate={(photo) => setSelectedPhoto(photo)}
        />
      )}
    </>
  )
}

/**
 * Photo Lightbox Component
 */
interface PhotoLightboxProps {
  photo: FanPhoto
  photos: FanPhoto[]
  onClose: () => void
  onNavigate: (photo: FanPhoto) => void
}

function PhotoLightbox({ photo, photos, onClose, onNavigate }: PhotoLightboxProps) {
  const { t } = useI18n()
  const tAny = t as unknown as (key: string, params?: any) => string
  const currentIndex = photos.findIndex((p) => p.id === photo.id)

  const handlePrev = () => {
    if (currentIndex > 0) {
      onNavigate(photos[currentIndex - 1])
    }
  }

  const handleNext = () => {
    if (currentIndex < photos.length - 1) {
      onNavigate(photos[currentIndex + 1])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrev()
    if (e.key === 'ArrowRight') handleNext()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className="fan-lightbox"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="fan-lightbox-content" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="fan-lightbox-close" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Navigation */}
        {currentIndex > 0 && (
          <button className="fan-lightbox-nav fan-lightbox-prev" onClick={handlePrev}>
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
        )}
        {currentIndex < photos.length - 1 && (
          <button className="fan-lightbox-nav fan-lightbox-next" onClick={handleNext}>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        )}

        {/* Image */}
        <div className="fan-lightbox-image">
          <img src={photo.url} alt="" />
          {photo.watermark_url && (
            <div className="fan-lightbox-watermark" />
          )}
        </div>

        {/* Photo Info */}
        <div className="fan-lightbox-info">
          {photo.tagged_people && photo.tagged_people.length > 0 && (
            <div className="fan-lightbox-tags">
              <span className="fan-lightbox-tags-label">{tAny('fan.photos.taggedLabel')}</span>    
              {photo.tagged_people.map((person: string, index: number) => (
                <span key={index} className="fan-lightbox-tag">{person}</span>
              ))}
            </div>
          )}
          <div className="fan-lightbox-actions">
            <button className="fan-btn fan-btn-secondary">
              <span className="material-symbols-outlined">download</span>
              {t('common.download')}
            </button>
            <button className="fan-btn fan-btn-secondary">
              <span className="material-symbols-outlined">share</span>
              {t('common.share')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Athlete Photos Page
 * URL/ROUTE: /fan/photos/athlete/:athleteId
 */
export function FanAthletePhotos() {
  const { athleteId } = useParams<{ athleteId: string }>()
  const navigate = useNavigate()
  const { t } = useI18n()
  const tAny = t as unknown as (key: string, params?: any) => string

  const athleteName = ''
  const [photos, setPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null)

  useEffect(() => {
    loadAthletePhotos()
  }, [athleteId])

  const loadAthletePhotos = async () => {
    setLoading(true)
    // In production: fetch photos tagged with this athlete
    // from ANY gallery where fans_can_see = true
    setPhotos([])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="fan-loading-page">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  return (
    <>
      {/* Back Button */}
      <button
        className="fan-back-btn"
        onClick={() => navigate(getLink(RouteKeys.FAN_PHOTOS))}
      >
        <span className="material-symbols-outlined">arrow_back</span>
        {tAny('fan.photos.backToPhotos')}
      </button>

      <div className="fan-page-header">
        <h1 className="fan-page-title">
          {tAny('fan.photos.photosOf', { name: athleteName || t('errors.athlete') })}
        </h1>
        <p className="fan-page-subtitle">
          {photos.length === 1
            ? tAny('fan.photos.photosAcrossGalleries', { count: photos.length })
            : tAny('fan.photos.photosAcrossGalleries_plural', { count: photos.length })}
        </p>
      </div>

      {photos.length === 0 ? (
        <div className="fan-empty-state">
          <span className="material-symbols-outlined">image</span>
          <h3>{tAny('fan.photos.noPhotosFound')}</h3>
          <p>{tAny('fan.photos.noTaggedPhotos')}</p>
        </div>
      ) : (
        <div className="fan-photos-grid">
          {photos.map((photo, index) => (
            <div
              key={photo.id || index}
              className="fan-photo-item"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img src={photo.thumbnail_url || photo.url} alt="" loading="lazy" />
            </div>
          ))}
        </div>
      )}

      {selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          photos={photos}
          onClose={() => setSelectedPhoto(null)}
          onNavigate={(photo) => setSelectedPhoto(photo)}
        />
      )}
    </>
  )
}
