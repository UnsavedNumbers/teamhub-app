import { useNavigate } from 'react-router-dom'
import { useRelatedGalleries } from '@/hooks/useEntityGallery'
import { type GalleryEntityType } from '@/data/services/galleryService'
import { EmptyState } from '../platformAdmin'

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
 */
export function RelatedGalleriesSection({
  entityType,
  entityId,
  title = 'Related Photos',
}: RelatedGalleriesSectionProps) {
  const navigate = useNavigate()
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
    team: 'Team Photos',
    athlete: 'Athlete Photos',
    event: 'Event Photos',
    travel: 'Travel Photos',
    program: 'Program Photos',
    season: 'Season Photos',
    org: 'Organization Photos',
  }

  const hasGalleries = Object.keys(groupedGalleries).length > 0

  const openGallery = (galleryId: string) => {
    navigate(`/portal/photos/gallery/${galleryId}`)
  }

  if (isLoading) {
    return (
      <div className="pa-mt-4 pa-pt-4 pa-border-t pa-border-slate-200">
        <h4 className="pa-text-sm pa-font-semibold pa-text-muted pa-mb-2">{title}</h4>
        <div className="pa-skeleton" style={{ height: 40 }} />
      </div>
    )
  }

  if (error || !hasGalleries) {
    return null
  }

  return (
    <div className="pa-mt-4 pa-pt-4 pa-border-t pa-border-slate-200">
      <h4 className="pa-text-sm pa-font-semibold pa-text-muted pa-mb-3">{title}</h4>

      <div className="pa-space-y-3">
        {Object.entries(groupedGalleries).map(([relationshipType, galleries]) => (
          <div key={relationshipType} className="pa-space-y-2">
            <h5 className="pa-text-xs pa-font-medium pa-text-muted pa-uppercase">
              {relationshipLabels[relationshipType] ?? relationshipType}
            </h5>
            <div className="pa-flex pa-flex-wrap pa-gap-2">
              {galleries.map((gallery) => (
                <button
                  key={gallery.galleryId}
                  onClick={() => openGallery(gallery.galleryId)}
                  className="pa-inline-flex pa-items-center pa-gap-2 pa-px-3 pa-py-1.5
                    pa-bg-slate-100 dark:pa-bg-slate-800
                    pa-rounded pa-text-sm
                    hover:pa-bg-slate-200 dark:hover:pa-bg-slate-700
                    pa-transition-colors"
                >
                  <span className="material-symbols-outlined pa-text-base">photo_library</span>
                  <span>{gallery.galleryName}</span>
                  <span className="pa-text-xs pa-text-muted">
                    ({gallery.photoCount} {gallery.photoCount === 1 ? 'photo' : 'photos'})
                  </span>
                  <span className="material-symbols-outlined pa-text-sm">open_in_new</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
