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
import { getSeasons } from '@/data/services/seasonsService'
import { mapFanVisibilityToGalleryVisibility } from '@/utils/fanVisibilityHelpers'

type EntityTypeOption = 'organization' | 'season'
type SeasonRecord = { id: string; name?: string | null }
type SeasonOption = { id: string; name: string }

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
  const [seasons, setSeasons] = useState<SeasonOption[]>([])
  const [seasonsLoading, setSeasonsLoading] = useState(false)

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

  useEffect(() => {
    if (entityType !== 'season' || !context || seasons.length > 0) return
    let mounted = true
    const loadSeasons = async () => {
      setSeasonsLoading(true)
      const { data, error } = await getSeasons(context, {})
      if (!mounted) return
      if (error) {
        showError(error.message || t('photos.errors.loadGalleries'))
      } else {
        const list = (data || []).map((season: SeasonRecord) => ({
          id: season.id,
          name: season.name || season.id,
        }))
        setSeasons(list)
      }
      setSeasonsLoading(false)
    }
    loadSeasons()
    return () => {
      mounted = false
    }
  }, [entityType, context, seasons.length, t])

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
    <div className="oa-root oa-gallery-form">
      <div className="oa-gallery-form__container">
        {/* Page Header (org admin styles) */}
        <div className="oa-page-header oa-gallery-form__header">
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

        <form onSubmit={handleSubmit} className="oa-form-layout oa-gallery-form__layout" aria-labelledby="createGalleryHeading">
          {/* Basic Information Section */}
          <section className="oa-form-section" aria-labelledby="basicInfoHeading">
            <Card className="oa-card">
              <CardHeader className="oa-card-header oa-gallery-form__section-header">
                <CardTitle id="basicInfoHeading" className="oa-gallery-form__section-title">
                  {t('photos.section.basicInfo.title')}
                </CardTitle>
                <div className="oa-card-actions">
                  {isBasicInfoComplete && (
                    <Badge variant="success" size="small">
                      <span className="material-symbols-rounded oa-form-icon oa-form-icon--badge">check_circle</span>
                      {t('photos.status.valid')}
                    </Badge>
                  )}
                </div>
                <div className="oa-gallery-form__section-subtitle">{t('photos.section.basicInfo.subtitle')}</div>
              </CardHeader>

              <CardContent className="oa-gallery-form__section-body">
                <div className="oa-gallery-form__grid oa-gallery-form__grid--2">
                  {/* Title */}
                  <div className="oa-gallery-form__field oa-gallery-form__field--full oa-gallery-form__field--wide">
                    <label className="oa-form-label" htmlFor="title">
                      <span className="material-symbols-rounded oa-form-icon">title</span>
                      {t('photos.form.title')}
                      <span className="oa-form-required">*</span>
                    </label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t('photos.form.titlePlaceholder')}
                      maxLength={120}
                      required
                      className={`oa-form-input${title.trim() ? ' is-filled' : ''}`}
                    />
                    <div className="oa-form-help-row">
                      <p className="oa-form-help">
                        {120 - title.length} {t('photos.form.charactersRemaining', { count: 120 - title.length })}
                      </p>
                      {title.trim() && (
                        <Badge variant="success" size="small">{t('photos.status.valid')}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="oa-gallery-form__field oa-gallery-form__field--full oa-gallery-form__field--wide">
                    <label className="oa-form-label" htmlFor="description">
                      <span className="material-symbols-rounded oa-form-icon">description</span>
                      {t('photos.form.description')}
                    </label>
                    <textarea
                      id="description"
                      className="oa-form-textarea"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('photos.form.descriptionPlaceholder')}
                      rows={4}
                    />
                    <p className="oa-form-help">
                      {t('photos.form.descriptionPlaceholder')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Entity Configuration Section */}
          <section className="oa-form-section" aria-labelledby="entityConfigHeading">
            <Card className="oa-card">
              <CardHeader className="oa-card-header oa-gallery-form__section-header">
                <CardTitle id="entityConfigHeading" className="oa-gallery-form__section-title">
                  {t('photos.section.entity.title')}
                </CardTitle>
              </CardHeader>

              <CardContent className="oa-gallery-form__section-body">
                <div className="oa-gallery-form__stack">
                    {/* Entity Type */}
                    <div className="oa-gallery-form__field oa-gallery-form__field--medium">
                      <label className="oa-form-label" htmlFor="entityType">
                        <span className="material-symbols-rounded oa-form-icon">category</span>
                        {t('photos.form.entityType')}
                      </label>
                      <div className="oa-segmented">
                        <button
                          type="button"
                          className={`oa-segmented__button${entityType === 'organization' ? ' is-active' : ''}`}
                          onClick={() => setEntityType('organization')}
                          aria-pressed={entityType === 'organization'}
                        >
                          {t('photos.galleryType.organization')}
                        </button>
                        <button
                          type="button"
                          className={`oa-segmented__button${entityType === 'season' ? ' is-active' : ''}`}
                          onClick={() => setEntityType('season')}
                          aria-pressed={entityType === 'season'}
                        >
                          {t('photos.galleryType.season')}
                        </button>
                      </div>
                      <p className="oa-form-help">
                        {t('photos.form.entityTypeHelp')}
                      </p>
                    </div>

                  {/* Entity ID */}
                  {entityType === 'season' && (
                    <div className="oa-gallery-form__field oa-gallery-form__field--medium">
                      <label className="oa-form-label" htmlFor="entityId">
                        <span className="material-symbols-rounded oa-form-icon">tag</span>
                        {t('photos.form.selectEntity', { type: t('photos.galleryType.season') })}
                        <span className="oa-form-required">*</span>
                      </label>
                      <select
                        id="entityId"
                        value={entityId}
                        onChange={(e) => setEntityId(e.target.value)}
                        className={`oa-form-select${entityId ? ' is-filled' : ''}`}
                        disabled={seasonsLoading}
                      >
                        <option value="">
                          {seasonsLoading
                            ? t('common.loading')
                            : t('photos.form.selectEntity', { type: t('photos.galleryType.season') })}
                        </option>
                        {seasons.map((season) => (
                          <option key={season.id} value={season.id}>
                            {season.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Gallery Settings Section */}
          <Card className="oa-card">
            <CardHeader className="oa-card-header oa-gallery-form__section-header">
              <CardTitle className="oa-gallery-form__section-title">
                {t('photos.section.settings.title')}
              </CardTitle>
              <div className="oa-card-actions">
                <Button
                  type="button"
                  variant="ghost"
                  size="small"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="oa-gallery-form__toggle"
                >
                  <span className="material-symbols-rounded oa-form-icon oa-gallery-form__toggle-icon">
                    {showAdvanced ? 'expand_less' : 'expand_more'}
                  </span>
                  {showAdvanced ? t('photos.button.hideAdvanced') : t('photos.button.showAdvanced')}
                </Button>
              </div>
              <div className="oa-gallery-form__section-subtitle">{t('photos.section.settings.subtitle')}</div>
            </CardHeader>

            <CardContent className="oa-gallery-form__section-body">
              <div className="oa-gallery-form__stack">
                  {/* Fan Visibility */}
                  <div className="oa-gallery-form__panel">
                    <FanVisibilityToggle
                      checked={visibleToFans}
                      onChange={setVisibleToFans}
                      entityType="gallery"
                      disabled={saving}
                    />
                  </div>
                {/* Advanced Settings */}
                {showAdvanced && (
                  <div className="oa-gallery-form__advanced">
                    <h4 className="oa-gallery-form__advanced-title">
                      <span className="material-symbols-rounded oa-form-icon">admin_panel_settings</span>
                      {t('photos.section.settings.advancedTitle')}
                    </h4>

                    {/* Require Approval */}
                    <div className="oa-gallery-form__panel oa-gallery-form__panel--light">
                      <label htmlFor="requireApproval" className="oa-checkbox-row">
                        <input
                          type="checkbox"
                          id="requireApproval"
                          checked={requireApproval}
                          onChange={(e) => setRequireApproval(e.target.checked)}
                          className="oa-checkbox-input"
                        />
                        <span className="oa-checkbox-label">
                          <span className="material-symbols-rounded oa-form-icon">verified</span>
                          {t('photos.form.requireApproval')}
                        </span>
                      </label>
                      <p className="oa-form-help">
                        {t('photos.form.requireApprovalHelp')}
                      </p>
                      {requireApproval && (
                        <div className="oa-form-help-row">
                          <Badge variant="warning" size="small">
                            <span className="material-symbols-rounded oa-form-icon oa-form-icon--badge">warning</span>
                            {t('photos.form.requireApprovalWarning')}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="oa-form-actions oa-gallery-form__actions">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={saving}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              disabled={!isBasicInfoComplete || !isEntityComplete}
            >
              {saving ? t('photos.button.creatingGallery') : t('photos.createGallery')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
