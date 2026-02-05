import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRelatedGalleries } from '@/hooks/useEntityGallery'
import { useTranslation } from '@/i18n'
import { type GalleryEntityType } from '@/data/services/galleryService'
import { ROUTES } from '@/constants/routes'

interface RelatedGalleriesSectionProps {
  entityType: Extract<GalleryEntityType, 'athlete' | 'team' | 'event' | 'travel_plan' | 'program'>
  entityId: string
  title?: string
}

/**
 * RelatedGalleriesSection - Shows galleries related to an entity.
 *
 * Displays grouped links to related galleries (e.g., for an athlete: their
 * team galleries, event galleries, travel plan galleries, etc.).
 *
 * Features:
 * - Card-based layout for each gallery
 * - Smooth hover animations
 * - Better visual hierarchy
 * - Responsive grid layout
 */
export function RelatedGalleriesSection({
  entityType,
  entityId,
}: RelatedGalleriesSectionProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [hoveredGallery, setHoveredGallery] = useState<string | null>(null)
  const { data: relatedGalleries, isLoading, error } = useRelatedGalleries(entityType, entityId)

  // Group galleries by relationship type
  const groupedGalleries = relatedGalleries?.reduce((acc, gallery) => {
    if (!acc[gallery.relationshipType]) {
      acc[gallery.relationshipType] = []
    }
    acc[gallery.relationshipType].push(gallery)
    return acc
  }, {} as Record<string, typeof relatedGalleries>) ?? {}

  const relationshipLabels: Record<string, string> = {
    team: t('photos.related.team'),
    athlete: t('photos.related.athlete'),
    event: t('photos.related.event'),
    travel: t('photos.related.travel'),
    program: t('photos.related.program'),
    season: t('photos.related.season'),
    org: t('photos.related.org'),
  }

  const hasGalleries = Object.keys(groupedGalleries).length > 0

  const openGallery = (galleryId: string) => {
    navigate(ROUTES.PORTAL_PHOTO_GALLERY(galleryId))
  }

  if (isLoading) {
    return (
      <div
        className="pa-related-galleries-loading"
        style={{
          marginTop: '16px',
        }}
      >
        <div
          className="pa-skeleton"
          style={{
            height: '24px',
            width: '120px',
            marginBottom: '16px',
            borderRadius: '6px',
            background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
        <div
          className="pa-skeleton"
          style={{
            height: '60px',
            borderRadius: '10px',
            background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      </div>
    )
  }

  if (error || !hasGalleries) {
    return null
  }

  return (
    <div
      className="pa-related-galleries-section"
      style={{
        marginTop: '16px',
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <h4
        className="pa-related-galleries-title"
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#64748b',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '18px',
            color: '#94a3b8',
          }}
        >
          folder_open
        </span>
        {t('photos.related.title')}
      </h4>

      <div
        className="pa-related-galleries-groups pa-space-y-4"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {Object.entries(groupedGalleries).map(([relationshipType, galleries]) => (
          <div
            key={relationshipType}
            className="pa-related-galleries-group"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <h5
              className="pa-related-galleries-category"
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                paddingLeft: '4px',
              }}
            >
              {relationshipLabels[relationshipType] ?? relationshipType}
            </h5>
            <div
              className="pa-related-galleries-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '12px',
              }}
            >
              {galleries.map((gallery) => {
                const isHovered = hoveredGallery === gallery.galleryId
                return (
                  <button
                    key={gallery.galleryId}
                    onClick={() => openGallery(gallery.galleryId)}
                    onMouseEnter={() => setHoveredGallery(gallery.galleryId)}
                    onMouseLeave={() => setHoveredGallery(null)}
                    className="pa-related-gallery-card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      background: isHovered
                        ? 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
                        : 'white',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'left',
                      boxShadow: isHovered ? '0 4px 16px rgba(0, 0, 0, 0.08)' : '0 1px 4px rgba(0, 0, 0, 0.04)',
                      transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                    }}
                  >
                    <div
                      className="pa-related-gallery-icon"
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: isHovered
                          ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                          : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        flexShrink: 0,
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: '20px',
                          color: isHovered ? 'white' : '#64748b',
                          transition: 'color 0.2s ease',
                        }}
                      >
                        photo_library
                      </span>
                    </div>
                    <div
                      className="pa-related-gallery-info"
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <span
                        className="pa-related-gallery-name"
                        style={{
                          display: 'block',
                          fontSize: '14px',
                          fontWeight: 500,
                          color: '#334155',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {gallery.galleryName}
                      </span>
                      <span
                        className="pa-related-gallery-count"
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          color: '#94a3b8',
                          marginTop: '2px',
                        }}
                      >
                        {gallery.photoCount}{' '}
                        {gallery.photoCount === 1 ? t('photos.photo') : t('photos.photos')}
                      </span>
                    </div>
                    <span
                      className="material-symbols-outlined pa-related-gallery-arrow"
                      style={{
                        fontSize: '18px',
                        color: '#cbd5e1',
                        transition: 'all 0.2s ease',
                        transform: isHovered ? 'translateX(4px) scale(1.1)' : 'translateX(0) scale(1)',
                      }}
                    >
                      arrow_forward
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
