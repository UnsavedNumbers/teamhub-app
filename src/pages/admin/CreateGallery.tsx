import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, PageHeader, Button, Input, Badge } from '@/components/platformAdmin'
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
  const [showAdvanced, setShowAdvanced] = useState(false)

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

  // Calculate form completion
  const isBasicInfoComplete = title.trim().length > 0
  const isEntityComplete = entityId.length > 0
  const completionSteps = [
    { label: 'Basic Info', complete: isBasicInfoComplete },
    { label: 'Entity Setup', complete: isEntityComplete },
    { label: 'Settings', complete: true }, // Always complete as defaults are set
  ]
  const completedSteps = completionSteps.filter(step => step.complete).length

  return (
    <div className="pa-root">
      <div className="pa-container pa-max-w-4xl">
        {/* Page Header (org admin styles) */}
        <div className="oa-page-header oa-mb-6">
          <PageHeader
            title={t('photos.createGallery')}
            description={t('photos.createGallerySubtitle')}
            breadcrumbs={[
              { label: t('photos.title'), path: getLink('admin.photos.list') },
              { label: t('photos.createGallery') },
            ]}
            actions={<Badge variant="info" size="small">{completedSteps}/{completionSteps.length} {t('photos.progress.complete', { completed: completedSteps, total: completionSteps.length })}</Badge>}
          />
        </div>

        <form onSubmit={handleSubmit} className="oa-form-layout oa-space-y-6" aria-labelledby="createGalleryHeading">
          {/* Basic Information Section */}
          <section className="oa-form-section" aria-labelledby="basicInfoHeading">
            <Card className="oa-card">
              <CardHeader className="oa-card-header">
                <CardTitle id="basicInfoHeading">{t('photos.section.basicInfo.title')}</CardTitle>
                <div className="oa-card-actions">
                  {isBasicInfoComplete && (
                    <Badge variant="success" size="small">
                      <span className="material-symbols-rounded" style={{ fontSize: '12px' }}>check_circle</span>
                      {t('photos.status.valid')}
                    </Badge>
                  )}
                </div>
                <div className="oa-form-section-subtitle">{t('photos.section.basicInfo.subtitle')}</div>
              </CardHeader>

              <CardContent>
                <div className="pa-p-6">
                  <div className="pa-grid pa-grid-cols-1 md:pa-grid-cols-2 pa-gap-6">
                    {/* Title */}
                    <div className="md:pa-col-span-2">
                      <label className="pa-label pa-flex pa-items-center pa-gap-2 pa-mb-2" htmlFor="title">
                        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>title</span>
                        {t('photos.form.title')}
                        <span className="pa-text-red-600">*</span>
                      </label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t('photos.form.titlePlaceholder')}
                        maxLength={120}
                        required
                        className={title.trim() ? 'pa-ring-2 pa-ring-primary/20' : ''}
                      />
                      <div className="pa-flex pa-justify-between pa-mt-1">
                        <p className="pa-text-xs pa-text-muted">
                          {120 - title.length} {t('photos.form.charactersRemaining', { count: 120 - title.length })}
                        </p>
                        {title.trim() && (
                          <Badge variant="success" size="small">{t('photos.status.valid')}</Badge>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="md:pa-col-span-2">
                      <label className="pa-label pa-flex pa-items-center pa-gap-2 pa-mb-2" htmlFor="description">
                        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>description</span>
                        {t('photos.form.description')}
                      </label>
                      <textarea
                        id="description"
                        className="oa-input oa-textarea pa-resize-none"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('photos.form.descriptionPlaceholder')}
                        rows={4}
                      />
                      <p className="pa-text-xs pa-text-muted pa-mt-1">
                        {t('photos.form.descriptionPlaceholder')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Entity Configuration Section */}
          <section className="oa-form-section" aria-labelledby="entityConfigHeading">
            <Card className="oa-card">
              <CardHeader className="oa-card-header">
                <CardTitle id="entityConfigHeading">{t('photos.section.entity.title')}</CardTitle>
                <div className="oa-card-actions">
                  {isEntityComplete && (
                    <Badge variant="success" size="small">
                      <span className="material-symbols-rounded" style={{ fontSize: '12px' }}>check_circle</span>
                      {t('photos.status.seasonSelected')}
                    </Badge>
                  )}
                </div>
                <div className="oa-form-section-subtitle">{t('photos.section.entity.subtitle')}</div>
              </CardHeader>

              <CardContent>
                <div className="pa-p-6">
                  <div className="pa-space-y-6">
                    {/* Entity Type */}
                <div>
                  <label className="pa-label pa-flex pa-items-center pa-gap-2 pa-mb-3" htmlFor="entityType">
                    <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>category</span>
                    {t('photos.form.entityType')}
                  </label>
                  <div className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-2 pa-gap-3">
                    <label className={`pa-relative pa-p-4 pa-border pa-rounded-lg pa-cursor-pointer pa-transition-all ${
                      entityType === 'organization'
                        ? 'pa-border-primary pa-bg-primary/5 pa-shadow-sm'
                        : 'pa-border-n200 hover:pa-border-n300'
                    }`}>
                      <input
                        type="radio"
                        name="entityType"
                        value="organization"
                        checked={entityType === 'organization'}
                        onChange={(e) => setEntityType(e.target.value as EntityTypeOption)}
                        className="pa-absolute pa-opacity-0"
                      />
                      <div className="pa-flex pa-items-center pa-gap-3">
                        <div className={`pa-w-4 pa-h-4 pa-rounded-full pa-border-2 pa-flex pa-items-center pa-justify-center ${
                          entityType === 'organization'
                            ? 'pa-border-primary pa-bg-primary'
                            : 'pa-border-n300'
                        }`}>
                          {entityType === 'organization' && (
                            <div className="pa-w-2 pa-h-2 pa-bg-white pa-rounded-full" />
                          )}
                        </div>
                        <div>
                          <div className="pa-font-medium pa-text-n700">Organization Gallery</div>
                          <div className="pa-text-sm pa-text-n500">Photos for the entire organization</div>
                        </div>
                      </div>
                    </label>

                    <label className={`pa-relative pa-p-4 pa-border pa-rounded-lg pa-cursor-pointer pa-transition-all ${
                      entityType === 'season'
                        ? 'pa-border-primary pa-bg-primary/5 pa-shadow-sm'
                        : 'pa-border-n200 hover:pa-border-n300'
                    }`}>
                      <input
                        type="radio"
                        name="entityType"
                        value="season"
                        checked={entityType === 'season'}
                        onChange={(e) => setEntityType(e.target.value as EntityTypeOption)}
                        className="pa-absolute pa-opacity-0"
                      />
                      <div className="pa-flex pa-items-center pa-gap-3">
                        <div className={`pa-w-4 pa-h-4 pa-rounded-full pa-border-2 pa-flex pa-items-center pa-justify-center ${
                          entityType === 'season'
                            ? 'pa-border-primary pa-bg-primary'
                            : 'pa-border-n300'
                        }`}>
                          {entityType === 'season' && (
                            <div className="pa-w-2 pa-h-2 pa-bg-white pa-rounded-full" />
                          )}
                        </div>
                        <div>
                          <div className="pa-font-medium pa-text-n700">Season Gallery</div>
                          <div className="pa-text-sm pa-text-n500">Photos for a specific season</div>
                        </div>
                      </div>
                    </label>
                  </div>
                  <p className="pa-text-xs pa-text-muted pa-mt-2">
                    {t('photos.form.entityTypeHelp')}
                  </p>
                </div>

                {/* Entity ID */}
                {entityType === 'season' && (
                  <div>
                    <label className="pa-label pa-flex pa-items-center pa-gap-2 pa-mb-2" htmlFor="entityId">
                      <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>tag</span>
                      {t('photos.form.selectEntity', { type: t('photos.galleryType.season') })}
                      <span className="pa-text-red-600">*</span>
                    </label>
                    <Input
                      id="entityId"
                      value={entityId}
                      onChange={(e) => setEntityId(e.target.value)}
                      placeholder={t('photos.form.seasonIdPlaceholder')}
                      className={entityId ? 'pa-ring-2 pa-ring-primary/20' : ''}
                    />
                    {entityId && (
                      <div className="pa-mt-2">
                        <Badge variant="success" size="small">✓ Season Selected</Badge>
                      </div>
                    )}
                  </div>
                )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Gallery Settings Section */}
          <Card className="oa-card">
            <CardHeader className="oa-card-header">
              <CardTitle> {t('photos.section.settings.title')} </CardTitle>
              <div className="oa-card-actions">
                <Button
                  type="button"
                  variant="ghost"
                  size="small"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="pa-text-n600"
                >
                  <span className="material-symbols-rounded pa-mr-1" style={{ fontSize: '16px' }}>
                    {showAdvanced ? 'expand_less' : 'expand_more'}
                  </span>
                  {showAdvanced ? t('photos.button.hideAdvanced') : t('photos.button.showAdvanced')}
                </Button>
              </div>
              <div className="oa-form-section-subtitle">{t('photos.section.settings.subtitle')}</div>
            </CardHeader>

            <CardContent>
              <div className="pa-p-6">
                <div className="pa-space-y-6">
                  {/* Fan Visibility */}
                  <div className="pa-p-4 pa-bg-n50 pa-rounded-lg pa-border pa-border-n200">
                    <FanVisibilityToggle
                      checked={visibleToFans}
                      onChange={setVisibleToFans}
                      entityType="gallery"
                      disabled={saving}
                    />
                  </div>
                {/* Advanced Settings */}
                {showAdvanced && (
                  <div className="pa-space-y-4 pa-pt-4 pa-border-t pa-border-n200">
                    <h4 className="pa-font-medium pa-text-n700 pa-flex pa-items-center pa-gap-2">
                      <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>admin_panel_settings</span>
                      Advanced Settings
                    </h4>

                    {/* Require Approval */}
                    <div className="pa-flex pa-items-start pa-gap-4 pa-p-4 pa-bg-white pa-rounded-lg pa-border pa-border-n200">
                      <input
                        type="checkbox"
                        id="requireApproval"
                        checked={requireApproval}
                        onChange={(e) => setRequireApproval(e.target.checked)}
                        className="pa-mt-1 pa-w-4 pa-h-4 pa-text-primary pa-border-n300 pa-rounded focus:pa-ring-primary"
                      />
                      <div className="pa-flex-1">
                        <label htmlFor="requireApproval" className="pa-label pa-cursor-pointer pa-flex pa-items-center pa-gap-2">
                          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>verified</span>
                          {t('photos.form.requireApproval')}
                        </label>
                        <p className="pa-text-sm pa-text-muted pa-mt-1">
                          {t('photos.form.requireApprovalHelp')}
                        </p>
                        {requireApproval && (
                          <Badge variant="warning" size="small" className="pa-mt-2">
                            <span className="material-symbols-rounded" style={{ fontSize: '12px' }}>warning</span>
                            Photos will need approval before being visible
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="pa-flex pa-flex-col sm:pa-flex-row pa-justify-end pa-gap-3 pa-pt-6 pa-border-t pa-border-n200">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={saving}
              className="pa-order-2 sm:pa-order-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              disabled={!isBasicInfoComplete || !isEntityComplete}
              className="pa-order-1 sm:pa-order-2 pa-min-w-[140px]"
            >
              {saving ? 'Creating Gallery...' : t('photos.createGallery')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
