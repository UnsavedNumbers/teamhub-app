/**
 * Demo Page View Tracker
 * 
 * Automatically tracks page views in PostHog for demo sessions.
 * Uses PostHog's built-in pageview tracking and adds custom page ID properties.
 */

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { usePostHog } from '@posthog/react'
import { useDemoSession } from '@/contexts/DemoSessionContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import { getPrimaryRole } from '@/utils/roleHelpers'
import { getPageGuide } from '@/data/demo/pageGuides'
import type { DemoAllowedRole } from '@/types/demoManagement'

/**
 * Map standard roles to demo roles
 */
function mapRoleToDemoRole(role: string | null | undefined): DemoAllowedRole {
  if (role === 'org_admin') return 'org_admin'
  if (role === 'coach') return 'coach'
  if (role === 'parent') return 'parent'
  if (role === 'athlete') return 'athlete'
  if (role === 'staff') return 'staff'
  return 'parent'
}

/**
 * Detect page ID from route path
 */
function detectPageId(pathname: string): string | null {
  // Portal routes
  if (pathname.startsWith('/portal/dashboard')) return 'portal-dashboard'
  if (pathname.startsWith('/portal/calendar')) {
    if (pathname.includes('/events/') && pathname.includes('/edit')) return 'portal-event-edit'
    if (pathname.includes('/events/')) return 'portal-event-detail'
    return 'portal-calendar'
  }
  if (pathname.startsWith('/portal/bookmarked-events')) return 'portal-bookmarkedEvents'
  if (pathname.startsWith('/portal/athletes')) {
    if (pathname.includes('/request-attachment')) return 'portal-requestAttachment'
    return 'portal-athletes'
  }
  if (pathname.startsWith('/portal/tickets')) {
    if (pathname.includes('/events/')) return 'portal-ticketEventDetail'
    if (pathname.includes('/order/')) return 'portal-ticketOrderSuccess'
    if (pathname.includes('/access')) return 'portal-ticketAccess'
    return 'portal-myTickets'
  }
  if (pathname.startsWith('/portal/payments')) {
    if (pathname.includes('/success')) return 'portal-paymentSuccess'
    if (pathname.includes('/cancel')) return 'portal-paymentCancel'
    if (pathname.match(/\/payments\/[^/]+$/)) return 'portal-paymentDetail'
    return 'portal-payments'
  }
  if (pathname.startsWith('/portal/uniforms')) return 'portal-uniforms'
  if (pathname.startsWith('/portal/announcements')) {
    if (pathname.match(/\/announcements\/[^/]+$/)) return 'portal-announcementDetail'
    return 'portal-messages'
  }
  if (pathname.startsWith('/portal/huddles')) {
    return 'portal-messages'
  }
  if (pathname.match(/^\/portal\/messages\/[^/]+$/)) {
    return 'portal-announcementDetail'
  }
  if (pathname.startsWith('/portal/messages')) {
    return 'portal-messages'
  }
  if (pathname.startsWith('/portal/following')) return 'portal-following'
  if (pathname.startsWith('/portal/discover')) return 'portal-discoverOrgs'
  if (pathname.startsWith('/portal/join')) return 'portal-join'
  if (pathname.startsWith('/portal/photos')) {
    if (pathname.includes('/gallery/') && pathname.includes('/manage')) return 'portal-photosGalleryManage'
    if (pathname.includes('/gallery/')) return 'portal-photosGallery'
    return 'portal-photos'
  }
  if (pathname.startsWith('/portal/videos')) {
    if (pathname.match(/\/videos\/[^/]+$/)) return 'portal-videoDetail'
    return 'portal-videos'
  }
  if (pathname.startsWith('/portal/tryouts')) {
    if (pathname.match(/\/tryouts\/[^/]+$/)) return 'portal-tryoutDetail'
    return 'portal-tryouts'
  }
  if (pathname.startsWith('/portal/travel')) {
    if (pathname.match(/\/travel\/[^/]+$/)) return 'portal-travelDetail'
    return 'portal-travel'
  }
  if (pathname.startsWith('/portal/settings')) return 'portal-settings'
  if (pathname.startsWith('/portal/help')) {
    if (pathname.includes('/contact')) return 'portal-contact'
    return 'portal-help'
  }

  // Admin routes
  if (pathname.startsWith('/admin/dashboard')) return 'admin-dashboard'
  if (pathname.startsWith('/admin/organization')) {
    if (pathname.includes('/structure')) return 'admin-organization-structure'
    if (pathname.includes('/sports')) return 'admin-sports-list'
    if (pathname.includes('/programs')) return 'admin-programs-list'
    if (pathname.includes('/users')) return 'admin-organization-users'
    if (pathname.includes('/sub-orgs')) return 'admin-organization-subOrgs'
    if (pathname.includes('/billing')) return 'admin-organization-billing'
    return 'admin-organization-structure'
  }
  if (pathname.startsWith('/admin/sports')) {
    if (pathname.match(/\/sports\/[^/]+\/update$/)) return 'admin-sports-update'
    if (pathname.match(/\/sports\/[^/]+$/)) return 'admin-sports-detail'
    return 'admin-sports-list'
  }
  if (pathname.startsWith('/admin/programs')) {
    if (pathname.match(/\/programs\/[^/]+\/update$/)) return 'admin-programs-update'
    if (pathname.match(/\/programs\/[^/]+$/)) return 'admin-programs-detail'
    return 'admin-programs-list'
  }
  if (pathname.startsWith('/admin/levels')) {
    if (pathname.match(/\/levels\/[^/]+\/update$/)) return 'admin-levels-update'
    if (pathname.match(/\/levels\/[^/]+$/)) return 'admin-levels-detail'
    return 'admin-levels-list'
  }
  if (pathname.startsWith('/admin/teams')) {
    if (pathname.match(/\/teams\/[^/]+\/roster$/)) return 'admin-teams-roster'
    if (pathname.match(/\/teams\/[^/]+\/update$/)) return 'admin-teams-update'
    if (pathname.match(/\/teams\/[^/]+$/)) return 'admin-teams-detail'
    return 'admin-teams-list'
  }
  if (pathname.startsWith('/admin/seasons')) {
    if (pathname.match(/\/seasons\/[^/]+\/update$/)) return 'admin-seasons-update'
    if (pathname.match(/\/seasons\/[^/]+$/)) return 'admin-seasons-detail'
    return 'admin-seasons-list'
  }
  if (pathname.startsWith('/admin/athletes')) {
    if (pathname.includes('/create')) return 'admin-athletes-create'
    if (pathname.match(/\/athletes\/[^/]+$/)) return 'admin-athletes-detail'
    return 'admin-athletes-list'
  }
  if (pathname.startsWith('/admin/guardians')) {
    if (pathname.includes('/requests')) return 'admin-guardianRequests'
    if (pathname.match(/\/guardians\/[^/]+$/)) return 'admin-guardians-detail'
    return 'admin-guardians-list'
  }
  if (pathname.startsWith('/admin/ticketing')) {
    if (pathname.includes('/events')) {
      if (pathname.includes('/seat-maps')) return 'admin-ticketingEvents-seatMaps'
      return 'admin-ticketingEvents'
    }
    if (pathname.includes('/orders')) return 'admin-ticketingOrders'
    if (pathname.includes('/scanner')) return 'admin-ticketingScanner'
    return 'admin-ticketingEvents'
  }
  if (pathname.startsWith('/admin/payments')) {
    if (pathname.match(/\/payments\/[^/]+$/)) return 'admin-payments-detail'
    return 'admin-payments-list'
  }
  if (pathname.startsWith('/admin/photos')) {
    if (pathname.includes('/create')) return 'admin-photos-create'
    if (pathname.match(/\/photos\/[^/]+$/)) return 'admin-photos-detail'
    return 'admin-photos-list'
  }
  if (pathname.startsWith('/admin/videos')) {
    if (pathname.includes('/upload')) return 'admin-videos-upload'
    if (pathname.match(/\/videos\/[^/]+$/)) return 'admin-videos-detail'
    return 'admin-videos-list'
  }
  if (pathname.startsWith('/admin/events')) {
    if (pathname.match(/\/events\/[^/]+\/edit$/)) return 'admin-events-edit'
    if (pathname.match(/\/events\/[^/]+$/)) return 'admin-events-detail'
    return 'admin-events-list'
  }
  if (pathname.startsWith('/admin/attendance')) return 'admin-attendance'
  if (pathname.startsWith('/admin/notifications')) return 'admin-notifications'
  if (pathname.startsWith('/admin/announcements')) {
    if (pathname.match(/\/announcements\/[^/]+$/)) return 'admin-announcements-detail'
    return 'admin-announcements-list'
  }
  if (pathname.startsWith('/admin/travel')) {
    if (pathname.match(/\/travel\/[^/]+$/)) return 'admin-travel-detail'
    return 'admin-travel-list'
  }
  if (pathname.startsWith('/admin/uniforms')) {
    if (pathname.match(/\/uniforms\/[^/]+$/)) return 'admin-uniforms-detail'
    return 'admin-uniforms-list'
  }
  if (pathname.startsWith('/admin/settings')) return 'admin-settings'
  if (pathname.startsWith('/admin/help')) {
    if (pathname.includes('/contact')) return 'admin-contact'
    return 'admin-help'
  }

  return null
}

/**
 * Component that tracks page views for demo sessions
 * Should be placed high in the component tree (in App.tsx)
 */
export function DemoPageViewTracker() {
  const location = useLocation()
  const posthog = usePostHog()
  const { session } = useDemoSession()
  const { currentOrganization } = useOrganization()

  useEffect(() => {
    // Only track if in demo session and PostHog is available
    if (!session.is_demo_session || !session.demo_code || !posthog) {
      return
    }

    // Skip tracking for auth pages and demo entry
    if (
      location.pathname.startsWith('/portal/auth/') ||
      location.pathname === '/demo' ||
      location.pathname === '/demo-request' ||
      location.pathname === '/demo/welcome'
    ) {
      return
    }

    // Detect page ID
    const pageId = detectPageId(location.pathname)
    if (!pageId) {
      return
    }

    // Get page guide to determine page name
    const guide = getPageGuide(pageId)
    const pageName = guide?.title || location.pathname

    // Determine user's role
    const primaryRole = currentOrganization ? getPrimaryRole(currentOrganization) : 'parent'
    const demoRole = mapRoleToDemoRole(primaryRole || 'parent')

    try {
      posthog.capture('$pageview', {
        page_id: pageId,
        page_name: pageName,
        page_path: location.pathname,
        demo_session: true,
        demo_code: session.demo_code,
        demo_role: demoRole,
        demo_org_id: session.demo_org_id || '',
        organization_id: session.organization_id || null,
      })
    } catch {
      /* no-op: failures must never break the app */
    }
  }, [location.pathname, session.is_demo_session, session.demo_code, session.demo_org_id, session.organization_id, posthog, currentOrganization])

  return null
}
