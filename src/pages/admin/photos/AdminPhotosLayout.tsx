import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Button, Checkbox } from '@/components/platformAdmin'
import { useI18n } from '@/i18n/useI18n'
import { getLink } from '@/utils/routes'
import { USE_FAKE_DATA } from '@/data/config'
import { useState } from 'react'
import { Modal } from '@/components/platformAdmin'
import { useHideEmptyGalleries } from './useHideEmptyGalleries'
import './AdminPhotosLayout.css'

const VIEWS = [
  { key: 'dashboard', path: '/admin/photos', labelKey: 'photos.dashboard.title', icon: 'dashboard' },
  { key: 'browse', path: '/admin/photos/browse', labelKey: 'photos.browse.title', icon: 'folder' },
  { key: 'search', path: '/admin/photos/search', labelKey: 'photos.search.title', icon: 'search' },
  { key: 'bulk', path: '/admin/photos/bulk', labelKey: 'photos.bulk.title', icon: 'inventory_2' },
  { key: 'settings', path: '/admin/photos/settings', labelKey: 'photos.settings.title', icon: 'settings' },
] as const

export function AdminPhotosLayout() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [showDemoModal, setShowDemoModal] = useState(false)
  const { hideEmpty, setHideEmpty } = useHideEmptyGalleries()

  const handleCreateGallery = () => {
    if (USE_FAKE_DATA) {
      setShowDemoModal(true)
      return
    }
    navigate(getLink('admin.photos.create'))
  }

  const currentView = VIEWS.find(v => location.pathname === v.path || (v.key === 'dashboard' && location.pathname === '/admin/photos')) || VIEWS[0]

  return (
    <div className="pa-root admin-photos-layout">
      <div className="pa-container">
        <div className="photos-layout-header">
          <div className="photos-layout-title-section">
            <h1 className="photos-title">{t('photos.title')}</h1>
            <p className="photos-subtitle">{t('photos.subtitle')}</p>
          </div>
          <Button variant="primary" icon="add_a_photo" onClick={handleCreateGallery}>
            {t('photos.createGallery')}
          </Button>
        </div>

        <div className="photos-view-switcher">
          <div className="view-switcher-buttons">
            {VIEWS.map((view) => {
              const isActive = location.pathname === view.path || (view.key === 'dashboard' && location.pathname === '/admin/photos')
              return (
                <Button
                  key={view.key}
                  variant={isActive ? 'primary' : 'secondary'}
                  size="compact"
                  icon={view.icon}
                  onClick={() => navigate(view.path)}
                >
                  {t(view.labelKey)}
                </Button>
              )
            })}
          </div>
          <div className="view-switcher-actions">
            <label className="hide-empty-toggle-global">
              <Checkbox
                checked={hideEmpty}
                onChange={(e) => setHideEmpty(e.target.checked)}
              />
              <span>{t('photos.settings.hideEmptyByDefault')}</span>
            </label>
          </div>
        </div>

        <div className="photos-view-content">
          <Outlet />
        </div>

        {/* Demo Mode Modal */}
        <Modal
          open={showDemoModal}
          onClose={() => setShowDemoModal(false)}
          title={t('photos.demoMode.title')}
        >
          <p className="pa-text-sm pa-text-muted pa-mb-4">
            {t('photos.demoMode.createBlocked')}
          </p>
          <div className="pa-flex pa-justify-end">
            <Button variant="primary" onClick={() => setShowDemoModal(false)}>
              {t('common.ok')}
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  )
}
