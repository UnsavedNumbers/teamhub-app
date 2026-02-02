import type { Gallery } from '@/data/services/galleryService'
import { Badge } from '../platformAdmin'

interface GalleryPreviewCardProps {
  gallery: Gallery
  onClick: () => void
}

export function GalleryPreviewCard({ gallery, onClick }: GalleryPreviewCardProps) {
  return (
    <button
      className="pa-card pa-shadow-sm pa-w-full pa-text-left hover:pa-shadow-md transition-shadow"
      onClick={onClick}
    >
      <div
        className="pa-rounded pa-overflow-hidden pa-bg-slate-100"
        style={{ aspectRatio: '4 / 3', display: 'grid', placeItems: 'center' }}
      >
        <span className="material-symbols-outlined pa-text-4xl pa-text-slate-400">photo_library</span>
      </div>
      <div className="pa-flex pa-justify-between pa-items-center pa-mt-3">
        <div>
          <div className="pa-font-semibold pa-truncate">{gallery.name}</div>
          <div className="pa-text-sm pa-text-muted">
            {gallery.photo_count !== undefined ? `${gallery.photo_count} photos` : 'Gallery'}
          </div>
        </div>
        {gallery.pending_count !== undefined && gallery.pending_count > 0 && (
          <Badge variant="warning">{gallery.pending_count} pending</Badge>
        )}
      </div>
    </button>
  )
}
