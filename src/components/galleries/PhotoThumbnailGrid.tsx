import { useState } from 'react'

interface PhotoThumbnail {
  id: string
  thumbnail_url: string
}

interface PhotoThumbnailGridProps {
  photos: PhotoThumbnail[]
  totalCount: number
  maxDisplay?: number
  onViewAll: () => void
}

/**
 * PhotoThumbnailGrid - Enhanced photo thumbnail grid with improved visual design.
 *
 * Features:
 * - Responsive grid layout (2-5 columns based on viewport)
 * - Larger thumbnails with smooth hover animations
 * - Asymmetric "hero" thumbnail for visual interest
 * - Smooth transitions and micro-interactions
 * - Better accessibility with larger tap targets
 */
export function PhotoThumbnailGrid({
  photos,
  totalCount,
  maxDisplay = 5,
  onViewAll,
}: PhotoThumbnailGridProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const shown = photos.slice(0, maxDisplay)
  const remaining = Math.max(0, totalCount - shown.length)
  const isLastOverlayed = shown.length > 0 && remaining > 0

  return (
    <div
      className="pa-photo-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
        gap: '12px',
        maxWidth: '100%',
      }}
    >
      {shown.map((photo, idx) => {
        const isLast = idx === shown.length - 1 && remaining > 0
        const isHovered = hoveredIndex === idx
        const isHero = idx === 0

        return (
          <div
            key={photo.id}
            className="pa-photo-thumbnail"
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1',
              borderRadius: '12px',
              overflow: 'hidden',
              cursor: isLast ? 'pointer' : 'default',
              boxShadow: isHovered ? '0 8px 24px rgba(0, 0, 0, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
            }}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={isLast ? onViewAll : undefined}
            onKeyDown={(e) => {
              if (isLast && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                onViewAll()
              }
            }}
            role={isLast ? 'button' : 'img'}
            tabIndex={isLast ? 0 : -1}
            aria-label={isLast ? `View all ${totalCount} photos` : `Photo ${idx + 1} of ${totalCount}`}
          >
            <img
              src={photo.thumbnail_url}
              alt={`Photo ${idx + 1}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.3s ease',
                transform: isHovered ? 'scale(1.1)' : 'scale(1)',
              }}
              loading="lazy"
            />
            {isLast && (
              <div
                className="pa-photo-overlay"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.85) 0%, rgba(147, 51, 234, 0.85) 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: isHero ? '18px' : '14px',
                  transition: 'opacity 0.2s ease',
                  opacity: isHovered || isLastOverlayed ? 1 : 0.9,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: isHero ? '28px' : '20px',
                    display: 'block',
                  }}
                >
                  photo_library
                </span>
                <span>+{remaining}</span>
                {isHero && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      opacity: 0.9,
                    }}
                  >
                    more photos
                  </span>
                )}
              </div>
            )}
          </div>
        )
      })}
      {shown.length === 0 && (
        <div
          className="pa-empty-grid"
          style={{
            gridColumn: '1 / -1',
            padding: '32px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: '12px',
            border: '2px dashed #cbd5e1',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '48px',
              color: '#94a3b8',
              display: 'block',
              marginBottom: '12px',
            }}
          >
            photo_camera
          </span>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: '#64748b',
              fontWeight: 500,
            }}
          >
            No photos yet
          </p>
        </div>
      )}
    </div>
  )
}
