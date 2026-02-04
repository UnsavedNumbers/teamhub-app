import type { Gallery } from '@/data/services/galleryService'
import { Badge } from '../platformAdmin'

interface GalleryPreviewCardProps {
  gallery: Gallery
  onClick: () => void
}

export function GalleryPreviewCard({ gallery, onClick }: GalleryPreviewCardProps) {
  const hasCoverThumbnails = !!gallery.cover_thumbnails;
  const legacyCoverUrl = gallery.cover_url;
  const hasCover = hasCoverThumbnails || !!legacyCoverUrl;
  
  // Choose the best fallback for 'src' (jpeg medium)
  const mainSrc = gallery.cover_thumbnails?.thumb_medium?.jpg || legacyCoverUrl;
  const altText = gallery.name ? `Cover photo for ${gallery.name}` : 'Gallery cover photo';

  return (
    <button
      className="pa-card pa-shadow-sm pa-w-full pa-text-left hover:pa-shadow-md transition-shadow pa-overflow-hidden pa-p-0 border-0 group pa-rounded-lg flex flex-col h-full bg-white"
      onClick={onClick}
    >
      <div
        className="pa-bg-slate-100 pa-relative pa-overflow-hidden w-full bg-slate-100"
        style={{ aspectRatio: '4 / 3' }}
      >
        {hasCover && mainSrc ? (
            <picture className="pa-absolute pa-inset-0 pa-w-full pa-h-full block">
                {gallery.cover_thumbnails?.thumb_medium?.webp && (
                    <source srcSet={gallery.cover_thumbnails.thumb_medium.webp} type="image/webp" />
                )}
                <img 
                    src={mainSrc} 
                    alt={altText}
                    loading="lazy"
                    className="pa-w-full pa-h-full object-cover transition-transform duration-500 group-hover:scale-105 block"
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
            </picture>
        ) : (
            <div className="pa-w-full pa-h-full pa-grid pa-place-items-center bg-slate-100 text-slate-400">
                 <span className="material-symbols-outlined pa-text-4xl pa-text-slate-400">photo_library</span>
            </div>
        )}
      </div>
      
      <div className="pa-p-3 flex-1 flex flex-col justify-end">
        <div className="pa-flex pa-justify-between pa-items-center">
            <div className="min-w-0 flex-1 pr-2">
              <div className="pa-font-semibold pa-truncate pa-text-slate-900 group-hover:pa-text-blue-600 transition-colors" title={gallery.name}>{gallery.name}</div>
              <div className="pa-text-sm pa-text-muted mt-0.5">
                {gallery.photo_count !== undefined ? `${gallery.photo_count} photos` : 'Gallery'}
              </div>
            </div>
            {gallery.pending_count !== undefined && gallery.pending_count > 0 && (
              <Badge variant="warning">{gallery.pending_count} pending</Badge>
            )}
        </div>
      </div>
    </button>
  )
}
