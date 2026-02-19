import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, EmptyState, Modal } from '@/components/platformAdmin'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
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
  const [pendingDeleteGalleryId, setPendingDeleteGalleryId] = useState<string | null>(null)
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

  const handleDelete = (galleryId: string) => {
    if (USE_FAKE_DATA) {
      setShowDemoModal(true)
      return
    }

    setPendingDeleteGalleryId(galleryId)
  }

  const confirmDeleteGallery = async (galleryId: string) => {
    if (!context) return
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
    <Card key={gallery.id} className="oa-gallery-card">
      <div className="oa-gallery-card-image">
        {gallery.cover_url ? (
          <img
            src={gallery.cover_url}
            alt={gallery.name}
            className="oa-gallery-card-img"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="oa-gallery-card-placeholder">
            <span className="material-symbols-outlined">photo_library</span>
          </div>
        )}
        <div className="oa-gallery-card-overlay" />
        {gallery.visibility === 'public' && (
          <div className="oa-gallery-card-badge">
            <span className="material-symbols-outlined">public</span>
            <span>Public</span>
          </div>
        )}
      </div>

      <div className="oa-gallery-card-body">
        <div className="oa-gallery-card-header">
          <h3 className="oa-gallery-card-title">{gallery.name}</h3>
          <p className="oa-gallery-card-meta">
            {(gallery.photo_count ?? 0) === 0
              ? t('photos.addFirstPhoto')
              : `${gallery.photo_count} ${gallery.photo_count === 1 ? t('photos.photo') : t('photos.photos')}`
            } • {new Date(gallery.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="oa-gallery-card-footer">
          <div className="oa-gallery-card-actions">
            <button
              className="oa-gallery-card-icon-btn"
              onClick={(e) => { e.stopPropagation(); handleEditClick(gallery) }}
              title={t('common.edit')}
            >
              <span className="material-symbols-outlined">edit</span>
            </button>
            {!gallery.is_system_generated && (
              <button
                className="oa-gallery-card-icon-btn oa-gallery-card-icon-btn--danger"
                onClick={(e) => { e.stopPropagation(); handleDelete(gallery.id) }}
                title={t('common.delete')}
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            )}
          </div>
          <button
            className="oa-gallery-card-browse"
            onClick={() => navigate(getLink('admin.photos.detail', { id: gallery.id }))}
          >
            {t('photos.viewGallery')}
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
    </Card>
  )

  return (
    <div className="oa-gallery-section">
      <div className="oa-gallery-section-header">
        <div>
          <h3 className="oa-gallery-section-title">{title}</h3>
          <p className="oa-gallery-section-subtitle">
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
        <div className="oa-gallery-grid">
          <Card className="oa-gallery-card oa-gallery-card--loading" />
          <Card className="oa-gallery-card oa-gallery-card--loading" />
          <Card className="oa-gallery-card oa-gallery-card--loading" />
        </div>
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
        <div className="oa-gallery-grid">{galleries.map(renderGalleryCard)}</div>
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

      <ConfirmDialog
        open={pendingDeleteGalleryId !== null}
        title={t('common.delete')}
        description={t('photos.confirmDeletePhotos', { count: 1 })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={() => {
          const galleryId = pendingDeleteGalleryId
          setPendingDeleteGalleryId(null)
          if (galleryId) {
            void confirmDeleteGallery(galleryId)
          }
        }}
        onCancel={() => setPendingDeleteGalleryId(null)}
      />
    </div>
  )
}
