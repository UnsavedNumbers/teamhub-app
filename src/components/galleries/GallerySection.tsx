import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGalleries } from '@/hooks/useGalleries'
import { useGalleryPermissions } from '@/hooks/useGalleryPermissions'
import { GalleryCreateModal } from './GalleryCreateModal'
import { GalleryPreviewCard } from './GalleryPreviewCard'
import { Button, EmptyState } from '../platformAdmin'
import type { GalleryEntityType } from '@/data/services/galleryService'
import { getLink } from '@/utils/routes'

interface GallerySectionProps {
  entityType: GalleryEntityType
  entityId: string
  title?: string
  allowCreate?: boolean
  context?: 'portal' | 'admin'
}

export function GallerySection({ entityType, entityId, title = 'Galleries', allowCreate = true, context = 'portal' }: GallerySectionProps) {
  const navigate = useNavigate()
  const { data, isLoading, refetch } = useGalleries(entityType, entityId)
  const { canCreate } = useGalleryPermissions(entityType)
  const [modalOpen, setModalOpen] = useState(false)

  const galleries = data || []
  const canCreateFinal = allowCreate && canCreate

  const openGallery = (id: string) => {
    const route = context === 'admin'
      ? getLink('admin.photos.detail', { id })
      : getLink('portal.photosGallery', { id })
    navigate(route)
  }

  return (
    <section className="pa-card pa-shadow-sm pa-p-4 pa-space-y-3">
      <div className="pa-flex pa-justify-between pa-items-center">
        <div className="pa-flex pa-gap-2 pa-items-center">
          <span className="material-symbols-outlined pa-text-lg">photo_library</span>
          <h3 className="pa-text-lg pa-font-semibold">{title}</h3>
        </div>
        {canCreateFinal && (
          <Button variant="primary" size="compact" icon="add" onClick={() => setModalOpen(true)}>
            Create Gallery
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="pa-grid pa-grid-cols-1 md:pa-grid-cols-2 xl:pa-grid-cols-3 pa-gap-3">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="pa-card pa-shadow-sm pa-p-4">
              <div className="pa-skeleton pa-mb-2" style={{ height: 140 }} />
              <div className="pa-skeleton" style={{ width: '60%', height: 16 }} />
            </div>
          ))}
        </div>
      ) : galleries.length === 0 ? (
        <EmptyState
          icon="photo_library"
          title="No galleries yet"
          description="Create galleries to organize event photos."
          action={
            canCreateFinal
              ? { label: 'Create gallery', onClick: () => setModalOpen(true) }
              : undefined
          }
          noCard
        />
      ) : (
        <div className="pa-grid pa-grid-cols-1 md:pa-grid-cols-2 xl:pa-grid-cols-3 pa-gap-3">
          {galleries.map((gallery) => (
            <GalleryPreviewCard key={gallery.id} gallery={gallery} onClick={() => openGallery(gallery.id)} />
          ))}
        </div>
      )}

      <GalleryCreateModal
        entityType={entityType}
        entityId={entityId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => refetch()}
      />
    </section>
  )
}
