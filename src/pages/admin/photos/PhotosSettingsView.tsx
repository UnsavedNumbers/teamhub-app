import { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Select,
  Checkbox,
  InlineNotice,
} from '@/components/platformAdmin'
import { useUserContext } from '@/hooks/useUserContext'
import { useI18n } from '@/i18n/useI18n'
import { useHideEmptyGalleries } from './useHideEmptyGalleries'
import { showSuccess } from '@/utils/toast'

const STORAGE_KEY_PREFIX = 'admin_photos_settings_'

import { useDebugLifecycle } from '@/lib/debug/integrations/useDebugLifecycle'

export function PhotosSettingsView() {
  useDebugLifecycle('PhotosSettingsView')
  
  const { context } = useUserContext()
  const { t } = useI18n()
  const { hideEmpty, setHideEmpty } = useHideEmptyGalleries()
  void context

  const [defaultVisibility, setDefaultVisibility] = useState<'public' | 'team' | 'private'>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}default_visibility`)
      return (stored as any) || 'team'
    } catch {
      return 'team'
    }
  })

  const [defaultRequireApproval, setDefaultRequireApproval] = useState(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}default_require_approval`)
      return stored === 'true'
    } catch {
      return true
    }
  })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}default_visibility`, defaultVisibility)
      localStorage.setItem(`${STORAGE_KEY_PREFIX}default_require_approval`, String(defaultRequireApproval))
      localStorage.setItem(`${STORAGE_KEY_PREFIX}hide_empty`, String(hideEmpty))
    } catch {
      // Ignore storage errors
    }
  }, [defaultVisibility, defaultRequireApproval, hideEmpty])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    // Simulate save (in future, this could save to backend)
    await new Promise(resolve => setTimeout(resolve, 500))

    setSaving(false)
    setSaved(true)
    showSuccess(t('photos.settings.saved'))

    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="oa-form-shell oa-form-shell--centered">
      <Card className="oa-form-card">
        <div className="oa-form-layout">
          <div className="oa-form-section">
            <div className="oa-form-section-header">
              <h2 className="oa-form-section-title">{t('photos.settings.galleryPreferences')}</h2>
            </div>

            {saved && (
              <InlineNotice
                tone="success"
                title={t('photos.settings.saved')}
                message={t('photos.settings.saved')}
              />
            )}

            <div className="oa-form-section-body">
              <div className="oa-form-group oa-form-field oa-form-field--medium">
                <label className="oa-form-label">{t('photos.settings.defaultVisibility')}</label>
                <Select
                  className="oa-form-select"
                  value={defaultVisibility}
                  onChange={(e) => setDefaultVisibility(e.target.value as any)}
                  options={[
                    { label: t('common.public'), value: 'public' },
                    { label: t('common.team'), value: 'team' },
                    { label: t('common.private'), value: 'private' },
                  ]}
                />
                <p className="oa-form-help">
                  {t('photos.settings.defaultVisibility')} - {t('photos.form.requireApprovalHelp')}
                </p>
              </div>

              <div className="oa-form-group">
                <Checkbox
                  className="oa-form-checkbox"
                  label={t('photos.settings.defaultRequireApproval')}
                  helperText={t('photos.form.requireApprovalHelp')}
                  checked={defaultRequireApproval}
                  onChange={(e) => setDefaultRequireApproval(e.target.checked)}
                />
              </div>

              <div className="oa-form-group">
                <Checkbox
                  className="oa-form-checkbox"
                  label={t('photos.settings.hideEmptyByDefault')}
                  helperText={t('photos.settings.hideEmptyByDefault')}
                  checked={hideEmpty}
                  onChange={(e) => setHideEmpty(e.target.checked)}
                />
              </div>

              <div className="oa-form-actions">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? t('common.saving') : t('photos.settings.save')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
