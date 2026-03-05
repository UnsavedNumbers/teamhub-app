/**
 * Demo Guide Hook
 * 
 * Provides easy access to demo guide functionality for pages.
 * Manages guide state and provides helpers for showing guides.
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useDemoSession } from '@/contexts/DemoSessionContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import { isInDemoSession } from '@/utils/demoMode'
import { getPageGuide, hasPageGuide } from '@/data/demo/pageGuides'
import { getPrimaryRole } from '@/utils/roleHelpers'
import type { PageGuide } from '@/data/demo/pageGuides'

const DEMO_GUIDE_DISMISSED_KEY_PREFIX = 'ys_demo_guide_dismissed_'

/**
 * Get storage key for a dismissed guide
 */
function getDismissedKey(pageId: string): string {
  return `${DEMO_GUIDE_DISMISSED_KEY_PREFIX}${pageId}`
}

/**
 * Check if a guide has been dismissed for this session
 */
function isGuideDismissed(pageId: string): boolean {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return false
  }

  try {
    return sessionStorage.getItem(getDismissedKey(pageId)) === 'true'
  } catch {
    return false
  }
}

/**
 * Mark a guide as dismissed
 */
function markGuideDismissed(pageId: string): void {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return
  }

  try {
    sessionStorage.setItem(getDismissedKey(pageId), 'true')
  } catch (error) {
    console.warn('[useDemoGuide] Failed to mark guide as dismissed:', error)
  }
}

/**
 * Hook return type
 */
export interface UseDemoGuideReturn {
  /** Current guide for this page (if available) */
  guide: PageGuide | null
  /** Whether the guide drawer should be shown */
  showGuide: boolean
  /** Open the guide drawer */
  openGuide: () => void
  /** Close the guide drawer */
  closeGuide: () => void
  /** Whether we're in a demo session */
  isDemoSession: boolean
}

/**
 * Hook to manage demo guides for the current page
 * 
 * Automatically detects the current page and provides guide functionality.
 * 
 * @param pageId - Optional page ID override (defaults to detecting from route)
 * @param autoShow - Whether to automatically show guide on mount (default: true)
 */
export function useDemoGuide(pageId?: string, autoShow: boolean = true): UseDemoGuideReturn {
  const location = useLocation()
  const { session } = useDemoSession()
  const [isOpen, setIsOpen] = useState(false)

  // Determine if we're in a demo session
  const isDemoSession = isInDemoSession() && session.is_demo_session

  // Detect page ID from route if not provided
  const detectedPageId = useMemo(() => {
    if (pageId) return pageId

    // Map route path to page ID
    const path = location.pathname

    // Portal routes
    if (path.startsWith('/portal/dashboard')) return 'portal-dashboard'
    if (path.startsWith('/portal/calendar')) {
      if (path.includes('/events/') && path.includes('/edit')) return 'portal-event-edit'
      if (path.includes('/events/')) return 'portal-event-detail'
      return 'portal-calendar'
    }
    if (path.startsWith('/portal/bookmarked-events')) return 'portal-bookmarkedEvents'
    if (path.startsWith('/portal/athletes')) {
      if (path.includes('/request-attachment')) return 'portal-requestAttachment'
      return 'portal-athletes'
    }
    if (path.startsWith('/portal/tickets')) {
      if (path.includes('/events/')) return 'portal-ticketEventDetail'
      if (path.includes('/order/')) return 'portal-ticketOrderSuccess'
      if (path.includes('/access')) return 'portal-ticketAccess'
      return 'portal-myTickets'
    }
    if (path.startsWith('/portal/payments')) {
      if (path.includes('/success')) return 'portal-paymentSuccess'
      if (path.includes('/cancel')) return 'portal-paymentCancel'
      if (path.match(/\/payments\/[^/]+$/)) return 'portal-paymentDetail'
      return 'portal-payments'
    }
    if (path.startsWith('/portal/uniforms')) return 'portal-uniforms'
    if (path.startsWith('/portal/announcements')) {
      if (path.match(/\/announcements\/[^/]+$/)) return 'portal-announcementDetail'
      return 'portal-messages'
    }
    if (path.startsWith('/portal/huddles')) {
      return 'portal-messages'
    }
    if (path.match(/^\/portal\/messages\/[^/]+$/)) return 'portal-announcementDetail'
    if (path.startsWith('/portal/messages')) {
      return 'portal-messages'
    }
    if (path.startsWith('/portal/following')) return 'portal-following'
    if (path.startsWith('/portal/discover')) return 'portal-discoverOrgs'
    if (path.startsWith('/portal/join')) return 'portal-join'
    if (path.startsWith('/portal/photos')) {
      if (path.includes('/gallery/') && path.includes('/manage')) return 'portal-photosGalleryManage'
      if (path.includes('/gallery/')) return 'portal-photosGallery'
      return 'portal-photos'
    }
    if (path.startsWith('/portal/videos')) {
      if (path.match(/\/videos\/[^/]+$/)) return 'portal-videoDetail'
      return 'portal-videos'
    }
    if (path.startsWith('/portal/tryouts')) {
      if (path.match(/\/tryouts\/[^/]+$/)) return 'portal-tryoutDetail'
      return 'portal-tryouts'
    }
    if (path.startsWith('/portal/travel')) {
      if (path.match(/\/travel\/[^/]+$/)) return 'portal-travelDetail'
      return 'portal-travel'
    }
    if (path.startsWith('/portal/settings')) return 'portal-settings'
    if (path.startsWith('/portal/help')) {
      if (path.includes('/contact')) return 'portal-contact'
      return 'portal-help'
    }

    // Admin routes
    if (path.startsWith('/admin/dashboard')) return 'admin-dashboard'
    if (path.startsWith('/admin/organization')) {
      if (path.includes('/structure')) return 'admin-organization-structure'
      if (path.includes('/sports')) return 'admin-sports-list'
      if (path.includes('/programs')) return 'admin-programs-list'
      if (path.includes('/users')) return 'admin-organization-users'
      if (path.includes('/sub-orgs')) return 'admin-organization-subOrgs'
      if (path.includes('/billing')) return 'admin-organization-billing'
      return 'admin-organization-structure'
    }
    if (path.startsWith('/admin/sports')) {
      if (path.match(/\/sports\/[^/]+\/update$/)) return 'admin-sports-update'
      if (path.match(/\/sports\/[^/]+$/)) return 'admin-sports-detail'
      return 'admin-sports-list'
    }
    if (path.startsWith('/admin/programs')) {
      if (path.match(/\/programs\/[^/]+\/update$/)) return 'admin-programs-update'
      if (path.match(/\/programs\/[^/]+$/)) return 'admin-programs-detail'
      return 'admin-programs-list'
    }
    if (path.startsWith('/admin/levels')) {
      if (path.match(/\/levels\/[^/]+\/update$/)) return 'admin-levels-update'
      if (path.match(/\/levels\/[^/]+$/)) return 'admin-levels-detail'
      return 'admin-levels-list'
    }
    if (path.startsWith('/admin/teams')) {
      if (path.match(/\/teams\/[^/]+\/roster$/)) return 'admin-teams-roster'
      if (path.match(/\/teams\/[^/]+\/update$/)) return 'admin-teams-update'
      if (path.match(/\/teams\/[^/]+$/)) return 'admin-teams-detail'
      return 'admin-teams-list'
    }
    if (path.startsWith('/admin/seasons')) {
      if (path.match(/\/seasons\/[^/]+\/update$/)) return 'admin-seasons-update'
      if (path.match(/\/seasons\/[^/]+$/)) return 'admin-seasons-detail'
      return 'admin-seasons-list'
    }
    if (path.startsWith('/admin/athletes')) {
      if (path.includes('/create')) return 'admin-athletes-create'
      if (path.match(/\/athletes\/[^/]+$/)) return 'admin-athletes-detail'
      return 'admin-athletes-list'
    }
    if (path.startsWith('/admin/guardians')) {
      if (path.includes('/requests')) return 'admin-guardianRequests'
      if (path.match(/\/guardians\/[^/]+$/)) return 'admin-guardians-detail'
      return 'admin-guardians-list'
    }
    if (path.startsWith('/admin/ticketing')) {
      if (path.includes('/events')) {
        if (path.includes('/seat-maps')) return 'admin-ticketingEvents-seatMaps'
        return 'admin-ticketingEvents'
      }
      if (path.includes('/orders')) return 'admin-ticketingOrders'
      if (path.includes('/scanner')) return 'admin-ticketingScanner'
      return 'admin-ticketingEvents'
    }
    if (path.startsWith('/admin/payments')) {
      if (path.match(/\/payments\/[^/]+$/)) return 'admin-payments-detail'
      return 'admin-payments-list'
    }
    if (path.startsWith('/admin/photos')) {
      if (path.includes('/create')) return 'admin-photos-create'
      if (path.match(/\/photos\/[^/]+$/)) return 'admin-photos-detail'
      return 'admin-photos-list'
    }
    if (path.startsWith('/admin/videos')) {
      if (path.includes('/upload')) return 'admin-videos-upload'
      if (path.match(/\/videos\/[^/]+$/)) return 'admin-videos-detail'
      return 'admin-videos-list'
    }
    if (path.startsWith('/admin/events')) {
      if (path.match(/\/events\/[^/]+\/edit$/)) return 'admin-events-edit'
      if (path.match(/\/events\/[^/]+$/)) return 'admin-events-detail'
      return 'admin-events-list'
    }
    if (path.startsWith('/admin/attendance')) return 'admin-attendance'
    if (path.startsWith('/admin/notifications')) return 'admin-notifications'
    if (path.startsWith('/admin/announcements')) {
      if (path.match(/\/announcements\/[^/]+$/)) return 'admin-announcements-detail'
      return 'admin-announcements-list'
    }
    if (path.startsWith('/admin/travel')) {
      if (path.match(/\/travel\/[^/]+$/)) return 'admin-travel-detail'
      return 'admin-travel-list'
    }
    if (path.startsWith('/admin/uniforms')) {
      if (path.match(/\/uniforms\/[^/]+$/)) return 'admin-uniforms-detail'
      return 'admin-uniforms-list'
    }
    if (path.startsWith('/admin/settings')) return 'admin-settings'
    if (path.startsWith('/admin/help')) {
      if (path.includes('/contact')) return 'admin-contact'
      return 'admin-help'
    }

    return null
  }, [pageId, location.pathname])

  // Get user's current role for filtering
  const { currentOrganization } = useOrganization()
  const userRole = useMemo(() => {
    if (!currentOrganization) return null
    const primaryRole = getPrimaryRole(currentOrganization)
    if (!primaryRole) return null
    
    // Map to demo role
    if (primaryRole === 'org_admin') return 'org_admin'
    if (primaryRole === 'coach') return 'coach'
    if (primaryRole === 'parent') return 'parent'
    if (primaryRole === 'athlete') return 'athlete'
    if (primaryRole === 'staff') return 'staff'
    return null
  }, [currentOrganization])

  // Get guide for current page
  const guide = useMemo(() => {
    if (!isDemoSession || !detectedPageId) return null
    if (!hasPageGuide(detectedPageId)) return null

    const pageGuide = getPageGuide(detectedPageId)
    if (!pageGuide) return null

    // Filter by role: show guide if user has ANY matching role
    if (userRole && pageGuide.roles.length > 0) {
      if (!pageGuide.roles.includes(userRole)) {
        return null // User's role doesn't match any guide role
      }
    }

    return pageGuide
  }, [isDemoSession, detectedPageId, userRole])

  // Auto-show guide on mount if enabled and not dismissed
  useEffect(() => {
    if (!isDemoSession || !guide || !autoShow) return
    if (isOpen) return // Already open

    // Check if guide was dismissed
    if (isGuideDismissed(detectedPageId || '')) return

    // Show guide after a short delay
    const timer = setTimeout(() => {
      setIsOpen(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [isDemoSession, guide, autoShow, isOpen, detectedPageId])

  // Open guide
  const openGuide = useCallback(() => {
    if (!guide) return
    setIsOpen(true)
  }, [guide])

  // Close guide and mark as dismissed
  const closeGuide = useCallback(() => {
    setIsOpen(false)
    if (detectedPageId) {
      markGuideDismissed(detectedPageId)
    }
  }, [detectedPageId])

  return {
    guide: guide || null,
    showGuide: isOpen && guide !== null,
    openGuide,
    closeGuide,
    isDemoSession,
  }
}
