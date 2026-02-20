/**
 * Demo Guide Drawer Component
 * 
 * Contextual guide drawer that slides in from the right side.
 * Uses Radix UI Dialog for accessibility and focus management.
 * Provides demo users with helpful information about each page.
 */

import * as Dialog from '@radix-ui/react-dialog'
import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '@/i18n/useI18n'
import { useDemoTracking } from '@/lib/analytics/demoTracking'
import { useDemoSession } from '@/contexts/DemoSessionContext'
import type { PageGuide } from '@/data/demo/pageGuides'
import { getLink } from '@/utils/routes'
import './DemoGuideDrawer.css'

interface DemoGuideDrawerProps {
  /** Page guide content to display */
  guide: PageGuide
  /** Whether the drawer is open */
  isOpen: boolean
  /** Callback when drawer should close */
  onClose: () => void
}

export function DemoGuideDrawer({ guide, isOpen, onClose }: DemoGuideDrawerProps) {
  const t = useT()
  const navigate = useNavigate()
  const { trackGuideOpened, trackGuideDismissed, trackGuideActionClicked } = useDemoTracking()
  const { session } = useDemoSession()

  // Track guide opened
  useEffect(() => {
    if (isOpen && session.is_demo_session && session.demo_code) {
      trackGuideOpened(guide.pageId, {
        demo_code: session.demo_code,
        demo_role: guide.roles[0] || 'parent',
        demo_org_id: session.demo_org_id || '',
        organization_id: session.organization_id || null,
      })
    }
  }, [isOpen, guide.pageId, session, trackGuideOpened])

  // Handle close with tracking
  const handleClose = useCallback(() => {
    if (session.is_demo_session && session.demo_code) {
      trackGuideDismissed(guide.pageId, {
        demo_code: session.demo_code,
        demo_role: guide.roles[0] || 'parent',
        demo_org_id: session.demo_org_id || '',
        organization_id: session.organization_id || null,
      })
    }
    onClose()
  }, [onClose, guide.pageId, session, trackGuideDismissed])

  // Handle "Try this now" action click
  const handleTryThisClick = useCallback(() => {
    if (session.is_demo_session && session.demo_code) {
      trackGuideActionClicked(guide.pageId, 'try_this_now', {
        demo_code: session.demo_code,
        demo_role: guide.roles[0] || 'parent',
        demo_org_id: session.demo_org_id || '',
        organization_id: session.organization_id || null,
      })
    }
    // Navigate to the suggested action (if routeKey is provided in guide)
    // For now, just close the drawer - navigation will be handled by the page
    handleClose()
  }, [guide.pageId, session, trackGuideActionClicked, handleClose])

  if (!guide) {
    return null
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="demo-guide-overlay" />
        <Dialog.Content className="demo-guide-content" aria-describedby={undefined}>
          {/* Header */}
          <div className="demo-guide-header">
            <Dialog.Title className="demo-guide-title">
              {guide.title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="demo-guide-close"
                aria-label={t('common.close')}
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </Dialog.Close>
          </div>

          {/* Content */}
          <div className="demo-guide-body">
            {/* Top Actions */}
            <div className="demo-guide-section">
              <h3 className="demo-guide-section-title">
                {t('demo.guide.topActions')}
              </h3>
              <ul className="demo-guide-list">
                {guide.topActions.map((action, index) => (
                  <li key={index} className="demo-guide-list-item">
                    {action}
                  </li>
                ))}
              </ul>
            </div>

            {/* Try This Now */}
            <div className="demo-guide-section">
              <h3 className="demo-guide-section-title">
                {t('demo.guide.tryThisNow')}
              </h3>
              <p className="demo-guide-try-this">{guide.tryThisNow}</p>
              <button
                className="demo-guide-action-button"
                onClick={handleTryThisClick}
                type="button"
              >
                {t('demo.guide.tryThisButton')}
              </button>
            </div>

            {/* Tips */}
            <div className="demo-guide-section">
              <h3 className="demo-guide-section-title">
                {t('demo.guide.tips')}
              </h3>
              <ul className="demo-guide-list">
                {guide.tips.map((tip, index) => (
                  <li key={index} className="demo-guide-list-item">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Business Value */}
            <div className="demo-guide-section">
              <h3 className="demo-guide-section-title">
                {t('demo.guide.businessValue')}
              </h3>
              <p className="demo-guide-business-value">{guide.businessValue}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="demo-guide-footer">
            <button
              className="demo-guide-dismiss-button"
              onClick={handleClose}
              type="button"
            >
              {t('demo.guide.dismiss')}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
