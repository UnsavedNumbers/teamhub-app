import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, EmptyState } from '@/components/platformAdmin'
import {
  deleteGallery,
  getGalleriesForUser,
  mapEntityToGalleryType,
  type Gallery,
  type GalleryEntityType,
} from '@/data/services/galleryService'
import { useUserContext } from '@/hooks/useUserContext'
import { showError, showSuccess } from '@/utils/toast'
import { GalleryCreateModal } from './GalleryCreateModal'
import { GalleryEditModal } from './GalleryEditModal'
import { getLink } from '@/utils/routes'

interface Props {
  entityType?: GalleryEntityType
  entityId?: string
  orgId?: string
  title?: string
  allowCreate?: boolean
}

export function GalleryManagementSection({
  entityType,
  entityId,
  orgId,
  title = 'Galleries',
  allowCreate = true,
}: Props) {
  const { context } = useUserContext()
  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Gallery | null>(null)
  const navigate = useNavigate()

  const galleryTypeFilter = useMemo(() => (entityType ? mapEntityToGalleryType(entityType) : undefined), [entityType])

  const load = async () => {
    if (!context) return
    setLoading(true)
    const { data, error } = await getGalleriesForUser(context, {
      org_id: orgId || context.orgId,
      gallery_type: galleryTypeFilter,
      entity_id: entityId,
    })
    if (error) {
      showError(error.message)
      setLoading(false)
      return
    }
    setGalleries(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, entityType, orgId])

  const handleDelete = async (galleryId: string) => {
    if (!context) return
    const confirm = window.confirm('Delete this gallery and all photos?')
    if (!confirm) return
    const { error } = await deleteGallery(context, galleryId)
    if (error) {
      showError(error.message)
      return
    }
    showSuccess('Gallery deleted')
    load()
  }

  const renderGalleryCard = (gallery: Gallery) => (
    <Card key={gallery.id} className="pa-card pa-flex pa-justify-between pa-items-center pa-gap-4">
      <div className="pa-flex pa-gap-3 pa-items-center">
        <div
          className="pa-w-14 pa-h-14 pa-rounded-lg pa-bg-surface-muted pa-flex pa-items-center pa-justify-center pa-overflow-hidden"
          style={{ border: '1px solid var(--pa-border-subtle)' }}
        >
          {gallery.cover_url ? (
            <img src={gallery.cover_url} alt={gallery.name} className="pa-w-full pa-h-full pa-object-cover" />
          ) : (
            <span className="pa-text-muted pa-text-lg">📸</span>
          )}
        </div>
        <div>
          <div className="pa-flex pa-gap-2 pa-items-center">
            <p className="pa-text-base pa-font-semibold pa-m-0">{gallery.name}</p>
            {gallery.visibility && <Badge variant="info">{gallery.visibility}</Badge>}
          </div>
          <p className="pa-text-sm pa-text-muted pa-m-0">
            {gallery.photo_count ?? 0} photos • {new Date(gallery.created_at).toLocaleDateString()}
          </p>
          <p className="pa-text-xs pa-text-muted pa-m-0">
            {gallery.gallery_type}{gallery.entity_id ? ` • ${gallery.entity_id.slice(0, 8)}` : ''}
          </p>
        </div>
      </div>
      <div className="pa-flex pa-gap-2">
        <Button variant="secondary" onClick={() => navigate(getLink('admin.photos.detail', { id: gallery.id }))}>
          View
        </Button>
        <Button variant="ghost" onClick={() => setEditing(gallery)}>
          Edit
        </Button>
        <Button variant="danger" onClick={() => handleDelete(gallery.id)}>
          Delete
        </Button>
      </div>
    </Card>
  )

  return (
    <div className="pa-space-y-4">
      <div className="pa-flex pa-justify-between pa-items-center">
        <div>
          <h3 className="pa-text-lg pa-font-semibold">{title}</h3>
          <p className="pa-text-sm pa-text-muted">
            {entityType ? `Photos for this ${entityType.replace('_', ' ')}` : 'All galleries in this organization'}
          </p>
        </div>
        {allowCreate && (
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            Create Gallery
          </Button>
        )}
      </div>

      {loading ? (
        <Card className="pa-card pa-h-32 pa-animate-pulse" />
      ) : galleries.length === 0 ? (
        <EmptyState
          title="No galleries yet"
          description="Create a gallery to start uploading photos."
          action={allowCreate ? { label: 'Create Gallery', onClick: () => setShowCreate(true) } : undefined}
        />
      ) : (
        <div className="pa-space-y-3">{galleries.map(renderGalleryCard)}</div>
      )}

      {showCreate && (
        <GalleryCreateModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          defaultEntityId={entityId}
          defaultEntityType={entityType}
          entityLabel={entityType ? `Creating gallery for ${entityType}` : 'Choose the entity this gallery belongs to.'}
          onCreated={() => load()}
        />
      )}

      {editing && (
        <GalleryEditModal
          open={!!editing}
          gallery={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
          onDelete={() => {
            if (!editing) return
            handleDelete(editing.id)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
