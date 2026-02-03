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

export function PhotoThumbnailGrid({
  photos,
  totalCount,
  maxDisplay = 5,
  onViewAll,
}: PhotoThumbnailGridProps) {
  const shown = photos.slice(0, maxDisplay)
  const remaining = Math.max(0, totalCount - shown.length)

  return (
    <div className="pa-flex pa-gap-2 pa-items-center">
      {shown.map((photo, idx) => {
        const isLast = idx === shown.length - 1 && remaining > 0
        return (
          <div
            key={photo.id}
            className="pa-rounded-sm pa-overflow-hidden pa-border pa-border-slate-200"
            style={{ width: 64, height: 64, position: 'relative' }}
          >
            <img
              src={photo.thumbnail_url}
              alt="Gallery preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {isLast && (
              <button
                onClick={onViewAll}
                className="pa-absolute pa-inset-0 pa-bg-black/60 pa-text-white pa-text-sm"
                style={{ display: 'grid', placeItems: 'center' }}
              >
                +{remaining}
              </button>
            )}
          </div>
        )
      })}
      {shown.length === 0 && (
        <div className="pa-text-sm pa-text-muted">No photos yet</div>
      )}
    </div>
  )
}
