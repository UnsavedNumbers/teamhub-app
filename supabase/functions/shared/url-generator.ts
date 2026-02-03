/**
 * URL Generation Utilities for Edge Functions
 * 
 * Since edge functions run in Deno and can't import React Router,
 * we need a standalone URL generation utility that mirrors the Route Manager.
 * 
 * This file should be kept in sync with src/utils/routes/definitions.ts
 */

// ============================================================================
// ROUTE DEFINITIONS (mirrored from src/utils/routes/definitions.ts)
// ============================================================================

const routes = {
  portal: {
    dashboard: '/portal/dashboard',
    calendar: '/portal/calendar',
    eventDetail: '/portal/calendar/events/:eventId',
    travel: '/portal/travel',
    travelDetail: '/portal/travel/:id',
    messages: '/portal/messages',
    announcementDetail: '/portal/messages/:announcementId',
    payments: '/portal/payments',
    paymentDetail: '/portal/payments/:id',
    paymentSuccess: '/portal/payments/success',
    paymentCancel: '/portal/payments/cancel',
    tickets: '/tickets',
    ticketEventDetail: '/tickets/events/:eventId',
    ticketOrderSuccess: '/tickets/order/:orderId',
    ticketAccess: '/tickets/access/:token',
    ticketValidate: '/tickets/validate/:token',
    myTickets: '/account/tickets',
    athletes: '/portal/athletes',
    requestAttachment: '/portal/athletes/request-attachment',
    join: '/portal/join',
    tryouts: '/portal/tryouts',
    tryoutDetail: '/portal/tryouts/:tryoutId',
    uniforms: '/portal/uniforms',
    uniformKitDetail: '/portal/uniforms/:kitId',
    settings: '/portal/settings',
    photos: '/portal/photos',
    photosGallery: '/portal/photos/gallery/:id',
    photosGalleryManage: '/portal/photos/gallery/:id/manage',
    roleSelection: '/portal/role-selection',
    // Org-Scoped Public Routes
    orgLanding: '/o/:orgSlug',
    orgTickets: '/o/:orgSlug/tickets',
    orgTicketEvent: '/o/:orgSlug/tickets/events/:eventId',
    orgTicketOrder: '/o/:orgSlug/tickets/order/:orderId',
    orgTicketAccess: '/o/:orgSlug/tickets/access/:token',
  },
  auth: {
    login: '/portal/login',
    signup: '/portal/signup',
    forgotPassword: '/portal/forgot-password',
    resetPassword: '/portal/reset-password',
    acceptInvite: '/portal/accept-invite',
    authCallback: '/portal/auth/callback',
    confirmEmail: '/portal/confirm-email',
    unauthorized: '/portal/unauthorized',
  },
  admin: {
    dashboard: '/admin',
    organization: {
      base: '/admin/organization',
      structure: '/admin/organization/overview',
      sports: '/admin/organization/sports',
      sportDetail: '/admin/organization/sports/:id',
      programs: '/admin/organization/programs',
      programDetail: '/admin/organization/programs/:id',
      levels: '/admin/organization/levels',
      levelDetail: '/admin/organization/levels/:id',
      teamsManagement: '/admin/organization/teams',
      seasons: '/admin/organization/seasons',
      seasonDetail: '/admin/organization/seasons/:id',
      forms: '/admin/organization/forms',
      users: '/admin/organization/users',
      billing: '/admin/organization/billing',
      planSelection: '/admin/organization/billing/plan-selection',
      checkoutSuccess: '/admin/organization/billing/checkout/success',
      checkoutCancel: '/admin/organization/billing/checkout/cancel',
      trialExpired: '/admin/organization/trial-expired',
    },
    onboarding: '/admin/onboarding',
    teams: {
      list: '/admin/teams',
      detail: '/admin/teams/:id',
      roster: '/admin/teams/:id/roster',
      update: '/admin/teams/:id/update',
    },
    sports: {
      list: '/admin/sports',
      detail: '/admin/sports/:sport_slug',
      update: '/admin/sports/:sport_id/update',
    },
    programs: {
      list: '/admin/programs',
      bySport: '/admin/programs/sport/:sport_slug',
      detail: '/admin/programs/:id',
      update: '/admin/programs/:id/update',
    },
    levels: {
      list: '/admin/levels',
      detail: '/admin/levels/:id',
      update: '/admin/levels/:id/update',
    },
    seasons: {
      list: '/admin/seasons',
      detail: '/admin/seasons/:id',
      update: '/admin/seasons/:id/update',
    },
    families: {
      list: '/admin/families',
      create: '/admin/families/new',
      detail: '/admin/families/:id',
      createAthlete: '/admin/families/:familyId/athletes/new',
    },
    guardians: {
      list: '/admin/guardians',
      create: '/admin/guardians/new',
      detail: '/admin/guardians/:id',
      createAthlete: '/admin/guardians/:familyId/athletes/new',
    },
    athletes: {
      list: '/admin/athletes',
      create: '/admin/athletes/new',
      detail: '/admin/athletes/:id',
      import: '/admin/athletes/import',
    },
    events: {
      list: '/admin/events',
      create: '/admin/events/new',
      detail: '/admin/events/:id',
      edit: '/admin/events/:id/edit',
      attendance: '/admin/events/:id/attendance',
    },
    announcements: {
      list: '/admin/announcements',
    },
    attendance: {
      path: '/admin/attendance',
    },
    payments: {
      list: '/admin/payments',
      detail: '/admin/payments/:id',
      create: '/admin/payments/new',
    },
    ticketing: {
      path: '/admin/ticketing',
    },
    ticketingEvents: {
      list: '/admin/ticketing/events',
      create: '/admin/ticketing/events/new',
      detail: '/admin/ticketing/events/:id',
      ticketTypes: {
        create: '/admin/ticketing/events/:id/ticket-types/new',
      },
    },
    ticketingOrders: {
      path: '/admin/ticketing/orders',
    },
    ticketingScanner: {
      path: '/admin/ticketing/scanner',
    },
    uniforms: {
      list: '/admin/uniforms',
      detail: '/admin/uniforms/:kitId',
    },
    travel: {
      list: '/admin/travel',
      create: '/admin/travel/new',
      edit: '/admin/travel/:id',
    },
    tryouts: {
      list: '/admin/tryouts',
      create: '/admin/tryouts/new',
      detail: '/admin/tryouts/:tryoutId',
    },
    users: {
      list: '/admin/organization/users',
      create: '/admin/users/new',
      edit: '/admin/organization/users/:userId/edit',
    },
    guardianRequests: {
      path: '/admin/guardian-requests',
    },
    settings: {
      path: '/admin/settings',
    },
    photos: {
      list: '/admin/photos',
      detail: '/admin/photos/:id',
    },
  },
  platformAdmin: {
    dashboard: '/platform-admin',
    organizations: {
      list: '/platform-admin/organizations',
      detail: '/platform-admin/organizations/:id',
    },
    users: {
      list: '/platform-admin/users',
      detail: '/platform-admin/users/:id',
    },
    admins: {
      path: '/platform-admin/admins',
    },
    structure: {
      path: '/platform-admin/structure',
    },
    payments: {
      path: '/platform-admin/payments',
    },
    fees: {
      path: '/platform-admin/fees',
    },
    audit: {
      path: '/platform-admin/audit',
    },
    featureFlags: {
      path: '/platform-admin/feature-flags',
    },
    ticketing: {
      allEvents: '/platform-admin/ticketing/events',
      orderLookup: '/platform-admin/ticketing/orders',
      webhookStatus: '/platform-admin/ticketing/webhooks',
      organization: '/platform-admin/ticketing/organizations/:id',
    },
    emailPreview: {
      path: '/platform-admin/email-preview',
    },
    photos: {
      overview: '/platform-admin/photos',
      contentReview: '/platform-admin/photos/content-review',
      storage: '/platform-admin/photos/storage',
      orgGalleries: '/platform-admin/organizations/:id/photos',
    },
    licenses: {
      overview: '/platform-admin/licenses',
      tiers: '/platform-admin/licenses/tiers',
      tierDetail: '/platform-admin/licenses/tiers/:id',
      features: '/platform-admin/licenses/features',
      featureDetail: '/platform-admin/licenses/features/:id',
      overrides: '/platform-admin/licenses/overrides',
      overrideCreate: '/platform-admin/licenses/overrides/new',
      overrideDetail: '/platform-admin/licenses/overrides/:id',
      audit: '/platform-admin/licenses/audit',
    },
  },
  root: {
    marketing: '/',
  },
} as const

// ============================================================================
// URL GENERATION FUNCTIONS
// ============================================================================

/**
 * Get a route path by key (e.g., 'portal.dashboard')
 */
function getRoutePath(routeKey: string): string {
  const keys = routeKey.split('.')
  let current: any = routes
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key]
    } else {
      throw new Error(`Route not found: ${routeKey}`)
    }
  }
  
  if (typeof current === 'object' && 'path' in current) {
    return current.path
  }
  
  throw new Error(`Route not found: ${routeKey}`)
}

/**
 * Generate a URL from a route key and optional parameters.
 * 
 * @example
 * getUrl('portal.dashboard') // Returns: '/portal/dashboard'
 * getUrl('portal.eventDetail', { eventId: '123' }) // Returns: '/portal/calendar/events/123'
 * getUrl('portal.orgTickets', { orgSlug: 'riverside-soccer' }) // Returns: '/o/riverside-soccer/tickets'
 * 
 * @param routeKey - The route key (e.g., 'portal.dashboard', 'admin.teams.detail')
 * @param params - Optional parameters for parameterized routes
 * @returns The generated URL path (without base URL)
 */
export function getUrl(routeKey: string, params?: Record<string, string>): string {
  let path = getRoutePath(routeKey)
  
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`:${key}`, value)
    }
  }
  
  // Verify all params were replaced
  if (path.includes(':')) {
    const missing = path.match(/:(\w+)/g)
    throw new Error(
      `Missing required parameters for route "${routeKey}": ${missing?.join(', ')}`
    )
  }
  
  return path
}

/**
 * Generate a full URL with base URL.
 * 
 * @example
 * getFullUrl('portal.dashboard', 'https://youthsports.team') // Returns: 'https://youthsports.team/portal/dashboard'
 * 
 * @param routeKey - The route key
 * @param baseUrl - The base URL (e.g., from SITE_URL env var)
 * @param params - Optional parameters for parameterized routes
 * @returns The generated full URL
 */
export function getFullUrl(routeKey: string, baseUrl: string, params?: Record<string, string>): string {
  const path = getUrl(routeKey, params)
  const normalizedBaseUrl = baseUrl.trim().replace(/\/$/, '')
  return `${normalizedBaseUrl}${path}`
}

// ============================================================================
// CONVENIENCE FUNCTIONS FOR COMMON ROUTES
// ============================================================================

/**
 * Generate org-scoped ticket URLs
 */
export function getOrgTicketUrl(orgSlug: string, baseUrl: string): string {
  return getFullUrl('portal.orgTickets', baseUrl, { orgSlug })
}

export function getOrgTicketEventUrl(orgSlug: string, eventId: string, baseUrl: string): string {
  return getFullUrl('portal.orgTicketEvent', baseUrl, { orgSlug, eventId })
}

export function getOrgTicketOrderUrl(orgSlug: string, orderId: string, baseUrl: string): string {
  return getFullUrl('portal.orgTicketOrder', baseUrl, { orgSlug, orderId })
}

export function getOrgTicketAccessUrl(orgSlug: string, token: string, baseUrl: string): string {
  return getFullUrl('portal.orgTicketAccess', baseUrl, { orgSlug, token })
}

/**
 * Generate payment URLs
 */
export function getPaymentSuccessUrl(baseUrl: string): string {
  return getFullUrl('portal.paymentSuccess', baseUrl)
}

export function getPaymentCancelUrl(baseUrl: string): string {
  return getFullUrl('portal.paymentCancel', baseUrl)
}

/**
 * Generate ticket access URLs
 */
export function getTicketAccessUrl(token: string, baseUrl: string): string {
  return getFullUrl('portal.ticketAccess', baseUrl, { token })
}

export function getTicketValidateUrl(token: string, baseUrl: string): string {
  return getFullUrl('portal.ticketValidate', baseUrl, { token })
}

/**
 * Generate event URLs
 */
export function getEventDetailUrl(eventId: string, baseUrl: string): string {
  return getFullUrl('portal.eventDetail', baseUrl, { eventId })
}

/**
 * Generate auth URLs
 */
export function getResetPasswordUrl(baseUrl: string): string {
  return getFullUrl('auth.resetPassword', baseUrl)
}

export function getAcceptInviteUrl(baseUrl: string): string {
  return getFullUrl('auth.acceptInvite', baseUrl)
}
