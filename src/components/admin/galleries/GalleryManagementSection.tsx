import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, Modal } from '@/components/platformAdmin'
import {
  deleteGallery,
  getGalleriesForUser,
  mapEntityToGalleryType,
  type Gallery,
  type GalleryEntityType,
} from '@/data/services/galleryService'
import { useUserContext } from '@/hooks/useUserContext'
import { useI18n } from '@/i18n/useI18n'
import { USE_FAKE_DATA } from '@/data/config'
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
  onGalleriesLoaded?: (galleries: Gallery[]) => void
  onLoadingChange?: (loading: boolean) => void
}

export function GalleryManagementSection({
  entityType,
  entityId,
  orgId,
  title = 'Galleries',
  allowCreate = true,
  onGalleriesLoaded,
  onLoadingChange,
}: Props) {
  const { context } = useUserContext()
  const { t } = useI18n()
  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Gallery | null>(null)
  const [showDemoModal, setShowDemoModal] = useState(false)
  const navigate = useNavigate()

  const galleryTypeFilter = useMemo(() => (entityType ? mapEntityToGalleryType(entityType) : undefined), [entityType])

  const load = async () => {
    if (!context) return
    setLoading(true)
    onLoadingChange?.(true)
    try {
      const { data, error } = await getGalleriesForUser(context, {
      org_id: orgId || context.orgId,
      gallery_type: galleryTypeFilter,
      entity_id: entityId,
    })
    if (error) {
      showError(error.message)
        return
      }
      const fetchedGalleries = data || []
      setGalleries(fetchedGalleries)
      onGalleriesLoaded?.(fetchedGalleries)
    } finally {
      setLoading(false)
      onLoadingChange?.(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, entityType, orgId, onGalleriesLoaded, onLoadingChange])

  const handleDelete = async (galleryId: string) => {
    if (USE_FAKE_DATA) {
      setShowDemoModal(true)
      return
    }

    if (!context) return
    const confirm = window.confirm(t('photos.confirmDeletePhotos', { count: 1 }))
    if (!confirm) return
    const { error } = await deleteGallery(context, galleryId)
    if (error) {
      showError(error.message)
      return
    }
    showSuccess(t('photos.success.galleryDeleted'))
    load()
  }

  const handleCreateClick = () => {
    if (USE_FAKE_DATA) {
      setShowDemoModal(true)
      return
    }
    // Navigate to create page instead of showing modal
    navigate(getLink('admin.photos.create'))
  }

  const handleEditClick = (gallery: Gallery) => {
    if (USE_FAKE_DATA) {
      setShowDemoModal(true)
      return
    }
    setEditing(gallery)
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
            {(gallery.photo_count ?? 0) === 0 
              ? t('photos.addFirstPhoto')
              : `${gallery.photo_count} ${gallery.photo_count === 1 ? t('photos.photo') : t('photos.photos')}`
            } • {new Date(gallery.created_at).toLocaleDateString()}
          </p>
          <p className="pa-text-xs pa-text-muted pa-m-0">
            {t(`photos.galleryType.${gallery.gallery_type}` as any)}
            {gallery.entity_id ? ` • ${gallery.entity_id.slice(0, 8)}` : ''}
          </p>
        </div>
      </div>
      <div className="pa-flex pa-gap-2">
        <Button variant="secondary" onClick={() => navigate(getLink('admin.photos.detail', { id: gallery.id }))}>
          {t('photos.viewGallery')}
        </Button>
        <Button variant="ghost" onClick={() => handleEditClick(gallery)}>
          {t('common.edit')}
        </Button>
        <Button variant="danger" onClick={() => handleDelete(gallery.id)}>
          {t('common.delete')}
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
            {entityType 
              ? `${t('photos.title')} ${t('photos.linkedTo')} ${t(`photos.galleryType.${entityType}` as any).toLowerCase()}`
              : t('photos.subtitle')}
          </p>
        </div>
        {allowCreate && (
          <Button variant="primary" onClick={handleCreateClick}>
            {t('photos.createGallery')}
          </Button>
        )}
      </div>

      {loading ? (
        <Card className="pa-card pa-h-32 pa-animate-pulse" />
      ) : galleries.length === 0 ? (
        <EmptyState
          title={t('photos.empty.title')}
          description={t('photos.empty.message')}
          action={allowCreate ? { 
            label: t('photos.createGallery'), 
            onClick: handleCreateClick 
          } : undefined}
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
          entityLabel={entityType ? `${t('photos.createGallerySubtitle')} ${t(`photos.galleryType.${entityType}` as any)}` : t('photos.createGallerySubtitle')}
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

      {/* Demo Mode Modal */}
      <Modal
        open={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        title={t('photos.demoMode.title')}
      >
        <p className="pa-text-sm pa-text-muted pa-mb-4">
          {t('photos.demoMode.message')}
        </p>
        <div className="pa-flex pa-justify-end">
          <Button variant="primary" onClick={() => setShowDemoModal(false)}>
            {t('common.ok')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
