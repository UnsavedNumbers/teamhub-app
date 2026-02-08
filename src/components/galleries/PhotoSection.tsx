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
import { useT } from '@/i18n/useI18n'
import { Card } from '../platformAdmin'
import Icon from '../portal/Icon'
import { PhotoUploadButton } from './PhotoUploadButton'
import { PhotoThumbnailGrid } from './PhotoThumbnailGrid'
import { RelatedGalleriesSection } from './RelatedGalleriesSection'
import { showError } from '@/utils/toast'
import { ROUTES } from '@/constants/routes'

interface PhotoSectionProps {
  entityType: Extract<GalleryEntityType, 'athlete' | 'team' | 'event' | 'travel_plan' | 'program'>
  entityId: string
  /** Optional org ID - if provided, will be used to create gallery if entity has no org_id in DB */
  orgId?: string
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
  orgId,
  canUpload = true,
  previewCount = 5,
  title,
  showRelated = true,
}: PhotoSectionProps) {
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const t = useT()
  const perms = useGalleryPermissions(entityType)
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExiting, setIsExiting] = useState(false)
  const [noOrgAssigned, setNoOrgAssigned] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!context || !isReady || !entityId) return
      setLoading(true)
      setError(null)
      setNoOrgAssigned(false)
      try {
        const { data: galleryData, error: galleryError } = await ensureEntityGallery(
          context,
          entityType,
          entityId,
          undefined, // name
          orgId // pass explicit orgId if provided
        )

        if (galleryError) {
          // Check if error is due to missing organization
          if (galleryError.message?.includes('Organization not found')) {
            setNoOrgAssigned(true)
            setLoading(false)
            return
          }
          throw galleryError
        }

        if (!galleryData) {
          // No gallery and no error - likely missing org
          setNoOrgAssigned(true)
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
  }, [context, isReady, entityId, entityType, previewCount, orgId])

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
    <Card className={`p-6 relative rounded-tl-none pa-photo-section ${isExiting ? 'pa-exiting' : ''}`} style={{ opacity: isExiting ? 0 : 1, transition: 'opacity 0.15s ease' }}>
      {/* Black Header Bar - Matching other right column cards */}
      <div className="absolute top-0 left-0 bg-black text-white px-4 py-2 rounded-br-lg flex items-center gap-2 text-xl font-black uppercase tracking-wider">
        <Icon name="photo_library" size="text-2xl" />
        {title || t('photos.sectionTitle' as any)}
        {gallery && gallery.photo_count !== undefined && (
          <span className="text-sm font-normal text-gray-300 ml-2">
            ({gallery.photo_count} {gallery.photo_count === 1 ? t('photos.photo') : t('photos.photos')})
          </span>
        )}
        {gallery && (
          <button
            onClick={viewAll}
            className="ml-auto text-xs font-normal text-gray-300 hover:text-white flex items-center gap-1 transition-colors"
          >
            {t('photos.viewAll' as any)}
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </button>
        )}
      </div>

      {/* Content with pt-12 to account for header */}
      <div className="pt-12 pa-photo-section-content">
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
                margin: '0 0 16px 0',
                fontSize: '14px',
                color: '#b91c1c',
              }}
            >
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                refresh
              </span>
              Retry
            </button>
          </div>
        ) : noOrgAssigned ? (
          <div
            className="pa-photo-no-org-state"
            style={{
              padding: '32px',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              borderRadius: '12px',
              border: '1px solid #fcd34d',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '48px',
                color: '#f59e0b',
                display: 'block',
                marginBottom: '12px',
              }}
            >
              domain_disabled
            </span>
            <h4
              style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: 600,
                color: '#92400e',
              }}
            >
              No Organization Assigned
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: '#a16207',
              }}
            >
              Photos cannot be uploaded until this athlete is assigned to an organization.
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
              {t('photos.emptySection.title')}
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: '#64748b',
              }}
            >
              {t('photos.emptySection.description')}
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

        .pa-photo-empty-state:hover {
          borderColor: '#94a3b8';
          background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)';
        }

        .pa-photo-thumbnail:hover img {
          transform: scale(1.1);
        }
      `}</style>
    </Card>
  )
}
