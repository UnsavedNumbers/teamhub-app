import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Button, Checkbox, AdminPageHeader } from '@/components/platformAdmin'
import { useI18n } from '@/i18n/useI18n'
import { getLink } from '@/utils/routes'
import { USE_FAKE_DATA } from '@/data/config'
import { useState } from 'react'
import { Modal } from '@/components/platformAdmin'
import { useHideEmptyGalleries } from './useHideEmptyGalleries'
import { useFeatureFlags } from '@/utils/featureFlags'
import './AdminPhotosLayout.css'

const VIEWS = [
  { key: 'dashboard', path: '/admin/photos', labelKey: 'photos.dashboard.title', icon: 'dashboard' },
  { key: 'browse', path: '/admin/photos/browse', labelKey: 'photos.browse.title', icon: 'folder' },
  { key: 'search', path: '/admin/photos/search', labelKey: 'photos.search.title', icon: 'search' },
  { key: 'bulk', path: '/admin/photos/bulk', labelKey: 'photos.bulk.title', icon: 'inventory_2' },
  { key: 'settings', path: '/admin/photos/settings', labelKey: 'photos.settings.title', icon: 'settings' },
] as const

import { useDebugLifecycle } from '@/lib/debug/integrations/useDebugLifecycle'

export function AdminPhotosLayout() {
  useDebugLifecycle('AdminPhotosLayout')
  
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [showDemoModal, setShowDemoModal] = useState(false)
  const { hideEmpty, setHideEmpty } = useHideEmptyGalleries()
  const { isEnabled } = useFeatureFlags(['photos_bulk_operations'])

  const handleCreateGallery = () => {
    if (USE_FAKE_DATA) {
      setShowDemoModal(true)
      return
    }
    navigate(getLink('admin.photos.create'))
  }

  // Filter views based on feature flags
  const visibleViews = VIEWS.filter(view => {
    if (view.key === 'bulk' && !isEnabled('photos_bulk_operations')) {
      return false
    }
    return true
  })

  const currentView = visibleViews.find(v => location.pathname === v.path || (v.key === 'dashboard' && location.pathname === '/admin/photos')) || visibleViews[0]
  void currentView

  return (
    <div className="oa-root admin-photos-layout">
      <AdminPageHeader 
        title={t('photos.title')}
        actions={
          <Button variant="primary" icon="add_a_photo" onClick={handleCreateGallery}>
            {t('photos.createGallery')}
          </Button>
        }
      />
      <div className="oa-container">
        <div className="photos-view-switcher">
          <div className="view-switcher-buttons">
            {visibleViews.map((view) => {
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
          <p className="oa-text-sm oa-text-muted oa-mb-4">
            {t('photos.demoMode.createBlocked')}
          </p>
          <div className="oa-flex oa-justify-end">
            <Button variant="primary" onClick={() => setShowDemoModal(false)}>
              {t('common.ok')}
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  )
}
