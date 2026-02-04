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

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../../i18n/useI18n'
import { getFanGalleries, type FanGallery } from '../../data/services/fanPhotosService'
import { getFollowedOrgs } from '../../data/services/fanService'
import type { FanOrgFollow } from '../../types/staffAndFan'
import { getLink, RouteKeys } from '../../utils/routes'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { showError } from '../../utils/toast'
import '../../styles/fan.css'
import '../../styles/fan-layouts.css'

type FilterType = 'all' | 'photos' | 'videos'
type FilterEntity = 'all' | string

export default function FanPhotos() {
  const { t } = useI18n()
  const navigate = useNavigate()
  
  // Data state
  const [galleries, setGalleries] = useState<FanGallery[]>([])
  const [followedOrgs, setFollowedOrgs] = useState<FanOrgFollow[]>([])
  const [taggedAthletePhotos, setTaggedAthletePhotos] = useState<{ athleteId: string; athleteName: string; photos: any[] }[]>([])
  
  // UI state
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterEntity, setFilterEntity] = useState<FilterEntity>('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  // Virtualization ref
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  // Infinite scroll observer
  useEffect(() => {
    if (loading) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMoreGalleries()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [loading, hasMore])

  const loadInitialData = async () => {
    setLoading(true)
    
    const [galleriesResult, orgsResult] = await Promise.all([
      getFanGalleries(),
      getFollowedOrgs(),
    ])
    
    if (galleriesResult.error) {
      showError(galleriesResult.error.message)
    } else {
      setGalleries(galleriesResult.data)
      setHasMore(galleriesResult.data.length >= 20)
    }

    if (!orgsResult.error && orgsResult.data) {
      setFollowedOrgs(orgsResult.data)
    }
    
    setLoading(false)
  }

  const loadMoreGalleries = async () => {
    if (loading || !hasMore) return
    
    setLoading(true)
    const nextPage = page + 1
    
    const { data, error } = await getFanGalleries()
    
    if (!error && data) {
      setGalleries(prev => [...prev, ...data])
      setPage(nextPage)
      setHasMore(data.length >= 20)
    }
    
    setLoading(false)
  }

  const handleGalleryClick = (galleryId: string) => {
    navigate(getLink(RouteKeys.FAN_PHOTOS_GALLERY, { id: galleryId }))
  }

  // Filter galleries based on search and filters
  const filteredGalleries = galleries.filter(gallery => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      gallery.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gallery.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Entity filter
    const matchesEntity = filterEntity === 'all' || gallery.org_id === filterEntity
    
    // Type filter (would need type metadata on galleries)
    const matchesType = filterType === 'all'
    
    return matchesSearch && matchesEntity && matchesType
  })

  if (loading && galleries.length === 0) {
    return (
      <div className="fan-loading-page">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="fan-photos-page">
      {/* Page Header - Matching Design */}
      <div className="fan-photos-header">
        <div>
          <span className="fan-photos-label">Official Gallery</span>
          <h1 className="fan-photos-title">Media Gallery</h1>
        </div>

        {/* Photos/Videos Toggle */}
        <div className="fan-photos-toggle">
          <button 
            className={`fan-photos-toggle-btn ${filterType === 'photos' || filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('photos')}
          >
            Photos
          </button>
          <button 
            className={`fan-photos-toggle-btn ${filterType === 'videos' ? 'active' : ''}`}
            onClick={() => setFilterType('videos')}
          >
            Videos
          </button>
        </div>
      </div>

      {/* Gallery Grid */}
      {filteredGalleries.length === 0 ? (
        <div className="fan-photos-empty">
          <div className="fan-photos-empty-icon">
            <span className="material-symbols-outlined">
              {searchQuery ? 'search_off' : 'photo_library'}
            </span>
          </div>
          <h3 className="fan-photos-empty-title">
            {searchQuery ? 'No galleries found' : 'No galleries available'}
          </h3>
          <p className="fan-photos-empty-text">
            {searchQuery ? 'Try adjusting your search' : 'Check back later for new photos'}
          </p>
        </div>
      ) : (
        <>
          <div className="fan-galleries-grid">
            {filteredGalleries.map((gallery) => (
              <GalleryCard
                key={gallery.id}
                gallery={gallery}
                onClick={() => handleGalleryClick(gallery.id)}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="fan-photos-load-more">
              <button 
                className="fan-load-more-btn"
                onClick={loadMoreGalleries}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More Content'}
              </button>
            </div>
          )}
        </>
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
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
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
          <p className="fan-gallery-category">{gallery.org_name || gallery.team_name || 'Gallery'}</p>
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
  
  const [gallery, setGallery] = useState<FanGallery | null>(null)
  const [photos, setPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    loadGallery()
  }, [id])

  const loadGallery = async () => {
    setLoading(true)
    
    // In production, fetch gallery details and photos
    // For now, use mock data structure
    const { data, error } = await getFanGalleries()
    
    if (!error && data) {
      const found = data.find((g: FanGallery) => g.id === id)
      if (found) {
        setGallery(found)
        // Mock photos - in production would be separate API call
        setPhotos([])
      }
    }
    
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="fan-loading-page">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!gallery) {
    return (
      <div className="fan-empty-state">
        <span className="material-symbols-outlined">error</span>
        <h3>Gallery not found</h3>
        <p>This gallery may have been removed or is not available to fans</p>
        <button 
          className="fan-btn fan-btn-primary"
          onClick={() => navigate(getLink(RouteKeys.FAN_PHOTOS))}
        >
          Back to Photos
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
        Back to Photos
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
          <span>{gallery.photo_count || 0} photos</span>
          <span>•</span>
          <span>{new Date(gallery.created_at).toLocaleDateString()}</span>
        </div>
        
        <div className="fan-gallery-actions">
          <button className="fan-btn fan-btn-secondary">
            <span className="material-symbols-outlined">download</span>
            Download All
          </button>
          <button className="fan-btn fan-btn-secondary">
            <span className="material-symbols-outlined">share</span>
            Share
          </button>
        </div>
      </div>

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <div className="fan-empty-state">
          <span className="material-symbols-outlined">image</span>
          <h3>No photos yet</h3>
          <p>Check back later for new photos</p>
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
  photo: any
  photos: any[]
  onClose: () => void
  onNavigate: (photo: any) => void
}

function PhotoLightbox({ photo, photos, onClose, onNavigate }: PhotoLightboxProps) {
  const currentIndex = photos.findIndex(p => p.id === photo.id)
  
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
              <span className="fan-lightbox-tags-label">Tagged:</span>
              {photo.tagged_people.map((person: string, index: number) => (
                <span key={index} className="fan-lightbox-tag">{person}</span>
              ))}
            </div>
          )}
          <div className="fan-lightbox-actions">
            <button className="fan-btn fan-btn-secondary">
              <span className="material-symbols-outlined">download</span>
              Download
            </button>
            <button className="fan-btn fan-btn-secondary">
              <span className="material-symbols-outlined">share</span>
              Share
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
  
  const [athleteName, setAthleteName] = useState('')
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
        <LoadingSpinner size="lg" />
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
        Back to Photos
      </button>

      <div className="fan-page-header">
        <h1 className="fan-page-title">Photos of {athleteName || 'Athlete'}</h1>
        <p className="fan-page-subtitle">{photos.length} photos across all galleries</p>
      </div>

      {photos.length === 0 ? (
        <div className="fan-empty-state">
          <span className="material-symbols-outlined">image</span>
          <h3>No photos found</h3>
          <p>No tagged photos available for this athlete</p>
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
