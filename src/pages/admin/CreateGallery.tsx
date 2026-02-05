import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, PageHeader, Button, Input } from '@/components/platformAdmin'
import { FanVisibilityToggle } from '@/components/admin/FanVisibilityToggle'
import { useUserContext } from '@/hooks/useUserContext'
import { useI18n } from '@/i18n/useI18n'
import { USE_FAKE_DATA } from '@/data/config'
import { showError, showSuccess } from '@/utils/toast'
import { getLink } from '@/utils/routes'
import { createGalleryForEntity, mapEntityToGalleryType, type GalleryEntityType } from '@/data/services/galleryService'
import { mapFanVisibilityToGalleryVisibility } from '@/utils/fanVisibilityHelpers'

type EntityTypeOption = 'organization' | 'season'

export default function CreateGallery() {
  const { context } = useUserContext()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useI18n()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [entityType, setEntityType] = useState<EntityTypeOption>('organization')
  const [entityId, setEntityId] = useState('')
  const [requireApproval, setRequireApproval] = useState(false)
  const [visibleToFans, setVisibleToFans] = useState(false)
  const [saving, setSaving] = useState(false)

  // Pre-fill from query params
  useEffect(() => {
    const typeParam = searchParams.get('type')
    const idParam = searchParams.get('entityId')
    
    if (typeParam === 'organization' || typeParam === 'season') {
      setEntityType(typeParam)
    }
    
    if (idParam) {
      setEntityId(idParam)
    }
  }, [searchParams])

  // Auto-set org ID when entity type is organization
  useEffect(() => {
    if (entityType === 'organization' && context?.orgId && !entityId) {
      setEntityId(context.orgId)
    }
  }, [entityType, context?.orgId, entityId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Demo mode block
    if (USE_FAKE_DATA) {
      showError(t('photos.demoMode.createBlocked'))
      return
    }

    if (!context) {
      showError('User context not available')
      return
    }

    if (!title.trim()) {
      showError(t('photos.form.titleRequired'))
      return
    }

    if (!entityId) {
      showError(t('photos.form.entityRequired', { type: entityType }))
      return
    }

    setSaving(true)
    try {
      const galleryType = mapEntityToGalleryType(entityType as GalleryEntityType)
      const visibility = mapFanVisibilityToGalleryVisibility(visibleToFans)
      const { data, error } = await createGalleryForEntity(
        context,
        galleryType,
        entityId,
        title.trim(),
        true, // is_active
        requireApproval,
        description.trim() || null,
        visibility
      )

      if (error || !data) {
        throw error || new Error('Failed to create gallery')
      }

      showSuccess(t('photos.success.galleryCreated'))
      navigate(getLink('admin.photos.detail', { id: data.id }))
    } catch (err) {
      showError(err instanceof Error ? err.message : t('photos.errors.createGallery'))
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigate(getLink('admin.photos.list'))
  }

  return (
    <div className="pa-root">
      <div className="pa-container">
        <PageHeader
          title={t('photos.createGallery')}
          description={t('photos.createGallerySubtitle')}
          breadcrumbs={[
            { label: 'Photos', path: getLink('admin.photos.list') },
            { label: t('photos.createGallery') },
          ]}
        />

        <Card>
          <form onSubmit={handleSubmit} className="pa-space-y-6">
            {/* Title */}
            <div>
              <label className="pa-label" htmlFor="title">
                {t('photos.form.title')} <span className="pa-text-red-600">*</span>
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('photos.form.titlePlaceholder')}
                maxLength={120}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="pa-label" htmlFor="description">
                {t('photos.form.description')}
              </label>
              <textarea
                id="description"
                className="pa-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('photos.form.descriptionPlaceholder')}
                rows={4}
              />
            </div>

            {/* Entity Type */}
            <div>
              <label className="pa-label" htmlFor="entityType">
                {t('photos.form.entityType')}
              </label>
              <select
                id="entityType"
                className="pa-input"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value as EntityTypeOption)}
              >
                <option value="organization">{t('photos.galleryType.organization')}</option>
                <option value="season">{t('photos.galleryType.season')}</option>
              </select>
              <p className="pa-text-xs pa-text-muted pa-mt-1">
                {t('photos.form.entityTypeHelp')}
              </p>
            </div>

            {/* Entity ID */}
            {entityType === 'season' && (
              <div>
                <label className="pa-label" htmlFor="entityId">
                  {t('photos.form.selectEntity', { type: t('photos.galleryType.season') })}
                </label>
                <Input
                  id="entityId"
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  placeholder="Season ID"
                />
                <p className="pa-text-xs pa-text-muted pa-mt-1">
                  {t('photos.form.seasonIdPlaceholder')}
                </p>
              </div>
            )}

            {/* Require Approval */}
            <div className="pa-flex pa-items-start pa-gap-3">
              <input
                type="checkbox"
                id="requireApproval"
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
                className="pa-mt-1"
              />
              <div>
                <label htmlFor="requireApproval" className="pa-label pa-cursor-pointer">
                  {t('photos.form.requireApproval')}
                </label>
                <p className="pa-text-xs pa-text-muted">
                  {t('photos.form.requireApprovalHelp')}
                </p>
              </div>
            </div>

            {/* Fan Visibility */}
            <div>
              <FanVisibilityToggle
                checked={visibleToFans}
                onChange={setVisibleToFans}
                entityType="gallery"
                disabled={saving}
              />
            </div>

            {/* Actions */}
            <div className="pa-flex pa-justify-end pa-gap-3 pa-pt-4 pa-border-t">
              <Button type="button" variant="ghost" onClick={handleCancel}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="primary" loading={saving}>
                {t('photos.createGallery')}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
