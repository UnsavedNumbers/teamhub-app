/**
 * Demo Guide Integration Component
 * 
 * Helper component that automatically shows demo guides for pages.
 * Add this to any page that should have a demo guide.
 */

import { useDemoGuide } from '@/hooks/useDemoGuide'
import { DemoGuideDrawer } from './DemoGuideDrawer'

interface DemoGuideIntegrationProps {
  /** Optional page ID override (defaults to auto-detection from route) */
  pageId?: string
  /** Whether to auto-show guide on mount (default: true) */
  autoShow?: boolean
}

/**
 * Renders the demo guide drawer when in demo session and a guide exists for the current page.
 */
export function DemoGuideIntegration({ pageId, autoShow = true }: DemoGuideIntegrationProps) {
  const { guide, showGuide, closeGuide, isDemoSession } = useDemoGuide(pageId, autoShow)

  if (!isDemoSession || !guide) {
    return null
  }

  return (
    <DemoGuideDrawer
      guide={guide}
      isOpen={showGuide}
      onClose={closeGuide}
    />
  )
}
