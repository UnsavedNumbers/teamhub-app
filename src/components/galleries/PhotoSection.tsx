import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getPhotosForGallery,
  getGalleryPhotoThumbnailUrl,
  ensureEntityGallery,
  type Gallery,
  type GalleryEntityType,
  type GalleryPhoto,
} from '@/data/services/galleryService'
import { useUserContext } from '@/hooks/useUserContext'
import { useGalleryPermissions } from '@/hooks/useGalleryPermissions'
import { useTranslation } from '@/i18n'
import { Button, EmptyState } from '../platformAdmin'
import { PhotoUploadButton } from './PhotoUploadButton'
import { PhotoThumbnailGrid } from './PhotoThumbnailGrid'
import { RelatedGalleriesSection } from './RelatedGalleriesSection'
import { showError } from '@/utils/toast'
import { ROUTES } from '@/constants/routes'

interface PhotoSectionProps {
  entityType: Extract<GalleryEntityType, 'athlete' | 'team' | 'event' | 'travel_plan' | 'program'>
  entityId: string
  canUpload?: boolean
  previewCount?: number
  title?: string
  showRelated?: boolean
}

/**
 * PhotoSection - Displays the direct gallery for auto-gallery entities.
 *
 * For athlete, team, event, travel_plan, program entities which have exactly
 * one system-generated gallery. Shows photo grid + upload + related galleries.
 *
 * Features:
 * - Enhanced visual design with gradient accents
 * - Smooth loading skeleton with shimmer effect
 * - Improved empty states with engaging visuals
 * - Better accessibility and responsive design
 *
 * Does NOT show "Create Gallery" button - the gallery is automatically created
 * by database triggers.
 */
export function PhotoSection({
  entityType,
  entityId,
  canUpload = true,
  previewCount = 5,
  title,
  showRelated = true,
}: PhotoSectionProps) {
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const perms = useGalleryPermissions(entityType)
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!context || !isReady || !entityId) return
      setLoading(true)
      setError(null)
      try {
        const { data: galleryData, error: galleryError } = await ensureEntityGallery(
          context,
          entityType,
          entityId
        )

        if (galleryError) throw galleryError

        if (!galleryData) {
          setError('Gallery not found. It may still be being created.')
          return
        }

        setGallery(galleryData as Gallery)

        const photosResp = await getPhotosForGallery(context, {
          gallery_id: galleryData.id,
          limit: previewCount,
          order_by: 'created_at',
          order_direction: 'desc',
        })

        if (photosResp.error) throw photosResp.error
        setPhotos(photosResp.data)
      } catch (err: any) {
        const msg = err?.message || 'Unable to load gallery'
        setError(msg)
        showError(msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [context, isReady, entityId, entityType, previewCount])

  const handleUploadComplete = async () => {
    if (!context || !gallery) return
    const photosResp = await getPhotosForGallery(context, {
      gallery_id: gallery.id,
      limit: previewCount,
      order_by: 'created_at',
      order_direction: 'desc',
    })
    if (!photosResp.error) {
      setPhotos(photosResp.data)
      // Update gallery photo count
      setGallery((prev) => ({
        ...prev!,
        photo_count: photosResp.data.length,
      }))
    }
  }

  const thumbnails = photos.map((p) => ({
    id: p.id,
    thumbnail_url: getGalleryPhotoThumbnailUrl(p.thumbnail_path, p.storage_path),
  }))

  const viewAll = () => {
    if (gallery) {
      setIsExiting(true)
      setTimeout(() => {
        navigate(ROUTES.PORTAL_PHOTO_GALLERY(gallery.id))
      }, 150)
    }
  }

  return (
    <section
      className={`pa-card pa-photo-section ${isExiting ? 'pa-exiting' : ''}`}
      style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        opacity: isExiting ? 0 : 1,
        transition: 'opacity 0.15s ease',
      }}
    >
      {/* Accent Gradient Bar */}
      <div
        className="pa-photo-section-accent"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
        }}
      />

      {/* Header */}
      <div
        className="pa-photo-section-header pa-flex pa-justify-between pa-items-center"
        style={{
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div
          className="pa-flex pa-gap-3 pa-items-center"
          style={{
            alignItems: 'center',
          }}
        >
          <div
            className="pa-photo-section-icon"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                color: 'white',
                fontSize: '22px',
              }}
            >
              photo_library
            </span>
          </div>
          <div>
            <h3
              className="pa-text-lg pa-font-semibold"
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              {title || t('photos.sectionTitle')}
              {gallery && gallery.photo_count !== undefined && (
                <span
                  className="pa-photo-count-badge"
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    padding: '2px 10px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                    color: '#64748b',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  {gallery.photo_count} {gallery.photo_count === 1 ? t('photos.photo') : t('photos.photos')}
                </span>
              )}
            </h3>
          </div>
        </div>
        {gallery && (
          <Button
            variant="secondary"
            size="compact"
            icon="open_in_new"
            onClick={viewAll}
            style={{
              borderRadius: '8px',
              fontWeight: 500,
              transition: 'all 0.2s ease',
            }}
            className="pa-view-all-btn"
          >
            {t('photos.viewAll')}
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="pa-photo-section-content">
        {loading ? (
          <div
            className="pa-photo-loading-skeleton"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
              gap: '12px',
            }}
          >
            {[...Array(Math.min(3, previewCount))].map((_, idx) => (
              <div
                key={idx}
                className="pa-skeleton pa-photo-skeleton"
                style={{
                  width: '100%',
                  aspectRatio: idx === 0 ? '4/3' : '1',
                  borderRadius: '12px',
                  background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                  gridRow: idx === 0 ? 'span 2' : 'auto',
                }}
              />
            ))}
          </div>
        ) : error ? (
          <div
            className="pa-photo-error-state"
            style={{
              padding: '32px',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
              borderRadius: '12px',
              border: '1px solid #fecaca',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '48px',
                color: '#ef4444',
                display: 'block',
                marginBottom: '12px',
              }}
            >
              error_outline
            </span>
            <h4
              style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: 600,
                color: '#991b1b',
              }}
            >
              {t('photos.error.title')}
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: '#b91c1c',
              }}
            >
              {error}
            </p>
          </div>
        ) : gallery && photos.length > 0 ? (
          <PhotoThumbnailGrid
            photos={thumbnails}
            totalCount={gallery.photo_count ?? photos.length}
            maxDisplay={previewCount}
            onViewAll={viewAll}
          />
        ) : (
          <div
            className="pa-photo-empty-state"
            style={{
              padding: '40px 32px',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderRadius: '12px',
              border: '2px dashed #cbd5e1',
              transition: 'all 0.2s ease',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '56px',
                color: '#94a3b8',
                display: 'block',
                marginBottom: '16px',
              }}
            >
              photo_camera
            </span>
            <h4
              style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: '#475569',
              }}
            >
              {t('photos.empty.title')}
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: '#64748b',
              }}
            >
              {t('photos.empty.description')}
            </p>
          </div>
        )}
      </div>

      {/* Upload Section */}
      {gallery && perms.canUpload && canUpload && (
        <div
          className="pa-photo-upload-section"
          style={{
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <PhotoUploadButton galleryId={gallery.id} onUploadComplete={handleUploadComplete} />
        </div>
      )}

      {/* Related Galleries Section */}
      {showRelated && (
        <div
          className="pa-related-galleries-wrapper"
          style={{
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <RelatedGalleriesSection entityType={entityType} entityId={entityId} />
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .pa-view-all-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }

        .pa-photo-empty-state:hover {
          borderColor: '#94a3b8';
          background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)';
        }

        .pa-photo-thumbnail:hover img {
          transform: scale(1.1);
        }
      `}</style>
    </section>
  )
}
