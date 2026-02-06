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
import './PhotosSettingsView.css'

const STORAGE_KEY_PREFIX = 'admin_photos_settings_'

export function PhotosSettingsView() {
  const { context } = useUserContext()
  const { t } = useI18n()
  const { hideEmpty, setHideEmpty } = useHideEmptyGalleries()

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
    <div className="photos-settings">
      <Card className="settings-card">
        <h2>{t('photos.settings.galleryPreferences')}</h2>

        {saved && (
          <InlineNotice
            tone="success"
            message={t('photos.settings.saved')}
          />
        )}

        <div className="settings-form">
          <div className="setting-group">
            <label className="setting-label">{t('photos.settings.defaultVisibility')}</label>
            <Select
              value={defaultVisibility}
              onChange={(e) => setDefaultVisibility(e.target.value as any)}
              options={[
                { label: t('common.public'), value: 'public' },
                { label: t('common.team'), value: 'team' },
                { label: t('common.private'), value: 'private' },
              ]}
            />
            <p className="setting-help">
              {t('photos.settings.defaultVisibility')} - {t('photos.form.requireApprovalHelp')}
            </p>
          </div>

          <div className="setting-group">
            <label className="setting-label">{t('photos.settings.defaultRequireApproval')}</label>
            <Checkbox
              checked={defaultRequireApproval}
              onChange={(e) => setDefaultRequireApproval(e.target.checked)}
            />
            <p className="setting-help">
              {t('photos.form.requireApprovalHelp')}
            </p>
          </div>

          <div className="setting-group">
            <label className="setting-label">{t('photos.settings.hideEmptyByDefault')}</label>
            <Checkbox
              checked={hideEmpty}
              onChange={(e) => setHideEmpty(e.target.checked)}
            />
            <p className="setting-help">
              {t('photos.settings.hideEmptyByDefault')} - Hide galleries with no photos by default
            </p>
          </div>

          <div className="settings-actions">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? t('common.saving') : t('photos.settings.save')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
