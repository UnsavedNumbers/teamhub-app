/**
 * Route definitions and dynamic ID resolution for screenshot system
 * 
 * Defines curated route lists per role and utilities to resolve dynamic segments.
 */

import { Page } from '@playwright/test'
import { getLink } from '../../src/utils/routes'
import type { Role } from './config'

// ============================================================================
// Route task types
// ============================================================================

export interface RouteTask {
  routeKey: string
  params?: Record<string, string | number>
  requiresIdResolution?: boolean
  listRouteKey?: string
  idSelector?: string
}

// ============================================================================
// Route lists per role
// ============================================================================

/**
 * Get route tasks for a role
 * Returns a curated list of routes to screenshot for the given role
 */
export function getRoutesForRole(role: Role): RouteTask[] {
  switch (role) {
    case 'org_admin':
      return [
        { routeKey: 'admin.dashboard' },
        { routeKey: 'admin.organization.structure' },
        { routeKey: 'admin.sports.list' },
        { routeKey: 'admin.programs.list' },
        { routeKey: 'admin.levels.list' },
        { routeKey: 'admin.teams.list' },
        {
          routeKey: 'admin.teams.detail',
          requiresIdResolution: true,
          listRouteKey: 'admin.teams.list',
          idSelector: '[data-testid="team-row"], a[href*="/admin/teams/"]',
        },
        { routeKey: 'admin.seasons.list' },
        {
          routeKey: 'admin.seasons.detail',
          requiresIdResolution: true,
          listRouteKey: 'admin.seasons.list',
          idSelector: '[data-testid="season-row"], a[href*="/admin/seasons/"]',
        },
        { routeKey: 'admin.organization.users' },
        { routeKey: 'admin.organization.bulkInvite' },
        { routeKey: 'admin.athletes.list' },
        {
          routeKey: 'admin.athletes.detail',
          requiresIdResolution: true,
          listRouteKey: 'admin.athletes.list',
          idSelector: '[data-testid="athlete-row"], a[href*="/admin/athletes/"]',
        },
        { routeKey: 'admin.guardians.list' },
        {
          routeKey: 'admin.guardians.detail',
          requiresIdResolution: true,
          listRouteKey: 'admin.guardians.list',
          idSelector: '[data-testid="guardian-row"], a[href*="/admin/guardians/"]',
        },
        { routeKey: 'admin.guardianRequests' },
        { routeKey: 'admin.ticketingEvents.list' },
        {
          routeKey: 'admin.ticketingEvents.detail',
          requiresIdResolution: true,
          listRouteKey: 'admin.ticketingEvents.list',
          idSelector: '[data-testid="event-row"], a[href*="/admin/ticketing/events/"]',
        },
        { routeKey: 'admin.ticketingEvents.seatMaps.list' },
        { routeKey: 'admin.ticketingOrders' },
        { routeKey: 'admin.ticketingScanner' },
        { routeKey: 'admin.payments.list' },
        { routeKey: 'admin.events.list' },
        {
          routeKey: 'admin.events.detail',
          requiresIdResolution: true,
          listRouteKey: 'admin.events.list',
          idSelector: '[data-testid="event-row"], a[href*="/admin/events/"]',
        },
        { routeKey: 'admin.facilities.list' },
        { routeKey: 'admin.attendance' },
        { routeKey: 'admin.notifications' },
        { routeKey: 'admin.contactRequests.list' },
        { routeKey: 'admin.announcements.list' },
        {
          routeKey: 'admin.announcements.detail',
          requiresIdResolution: true,
          listRouteKey: 'admin.announcements.list',
          idSelector: '[data-testid="announcement-row"], a[href*="/admin/announcements/"]',
        },
        { routeKey: 'admin.travel.list' },
        {
          routeKey: 'admin.travel.detail',
          requiresIdResolution: true,
          listRouteKey: 'admin.travel.list',
          idSelector: '[data-testid="travel-row"], a[href*="/admin/travel/"]',
        },
        { routeKey: 'admin.uniforms.list' },
        { routeKey: 'admin.reports.overview' },
        { routeKey: 'admin.reports.builder' },
        { routeKey: 'admin.reports.saved' },
        { routeKey: 'admin.reports.exports' },
        { routeKey: 'admin.reports.schedules' },
        { routeKey: 'admin.photos.list' },
        {
          routeKey: 'admin.photos.detail',
          requiresIdResolution: true,
          listRouteKey: 'admin.photos.list',
          idSelector: '[data-testid="gallery-row"], a[href*="/admin/photos/"]',
        },
        { routeKey: 'admin.photos.create' },
        { routeKey: 'admin.videos.list' },
        {
          routeKey: 'admin.videos.detail',
          requiresIdResolution: true,
          listRouteKey: 'admin.videos.list',
          idSelector: '[data-testid="video-row"], a[href*="/admin/videos/"]',
        },
        { routeKey: 'admin.videos.upload' },
        { routeKey: 'admin.settings' },
        { routeKey: 'admin.help' },
        { routeKey: 'admin.contact' },
      ]

    case 'coach':
      return [
        { routeKey: 'admin.dashboard' },
        { routeKey: 'admin.teams.list' },
        {
          routeKey: 'admin.teams.detail',
          requiresIdResolution: true,
          listRouteKey: 'admin.teams.list',
          idSelector: '[data-testid="team-row"], a[href*="/admin/teams/"]',
        },
        {
          routeKey: 'admin.teams.roster',
          requiresIdResolution: true,
          listRouteKey: 'admin.teams.list',
          idSelector: '[data-testid="team-row"], a[href*="/admin/teams/"]',
          params: {}, // Will be populated with team ID from resolution
        },
        { routeKey: 'admin.events.list' },
        {
          routeKey: 'admin.events.detail',
          requiresIdResolution: true,
          listRouteKey: 'admin.events.list',
          idSelector: '[data-testid="event-row"], a[href*="/admin/events/"]',
        },
        { routeKey: 'admin.announcements.list' },
        {
          routeKey: 'admin.announcements.detail',
          requiresIdResolution: true,
          listRouteKey: 'admin.announcements.list',
          idSelector: '[data-testid="announcement-row"], a[href*="/admin/announcements/"]',
        },
        { routeKey: 'admin.attendance' },
        { routeKey: 'admin.videos.list' },
        {
          routeKey: 'admin.videos.detail',
          requiresIdResolution: true,
          listRouteKey: 'admin.videos.list',
          idSelector: '[data-testid="video-row"], a[href*="/admin/videos/"]',
        },
        { routeKey: 'admin.photos.list' },
        {
          routeKey: 'admin.photos.detail',
          requiresIdResolution: true,
          listRouteKey: 'admin.photos.list',
          idSelector: '[data-testid="gallery-row"], a[href*="/admin/photos/"]',
        },
        { routeKey: 'admin.settings' },
        { routeKey: 'admin.help' },
        { routeKey: 'admin.contact' },
      ]

    case 'parent':
      return [
        { routeKey: 'portal.dashboard' },
        { routeKey: 'portal.athletes' },
        {
          routeKey: 'portal.athletes.profile',
          requiresIdResolution: true,
          listRouteKey: 'portal.athletes',
          idSelector: '[data-testid="athlete-row"], a[href*="/portal/athletes/"]',
        },
        { routeKey: 'portal.calendar' },
        {
          routeKey: 'portal.eventDetail',
          requiresIdResolution: true,
          listRouteKey: 'portal.calendar',
          idSelector: '[data-testid="event-row"], a[href*="/portal/calendar/events/"]',
        },
        { routeKey: 'portal.payments' },
        {
          routeKey: 'portal.payments.detail',
          requiresIdResolution: true,
          listRouteKey: 'portal.payments',
          idSelector: '[data-testid="payment-row"], a[href*="/portal/payments/"]',
        },
        { routeKey: 'portal.huddles.announcements' },
        {
          routeKey: 'portal.announcementDetail',
          requiresIdResolution: true,
          listRouteKey: 'portal.huddles.announcements',
          idSelector: '[data-testid="announcement-row"], a[href*="/portal/messages/"]',
        },
        { routeKey: 'portal.photos' },
        {
          routeKey: 'portal.photos.gallery',
          requiresIdResolution: true,
          listRouteKey: 'portal.photos',
          idSelector: '[data-testid="gallery-row"], a[href*="/portal/photos/gallery/"]',
        },
        { routeKey: 'portal.videos' },
        {
          routeKey: 'portal.videos.detail',
          requiresIdResolution: true,
          listRouteKey: 'portal.videos',
          idSelector: '[data-testid="video-row"], a[href*="/portal/videos/"]',
        },
        { routeKey: 'portal.uniforms' },
        {
          routeKey: 'portal.uniforms.detail',
          requiresIdResolution: true,
          listRouteKey: 'portal.uniforms',
          idSelector: '[data-testid="uniform-row"], a[href*="/portal/uniforms/"]',
        },
        { routeKey: 'portal.travel' },
        {
          routeKey: 'portal.travel.detail',
          requiresIdResolution: true,
          listRouteKey: 'portal.travel',
          idSelector: '[data-testid="travel-row"], a[href*="/portal/travel/"]',
        },
        { routeKey: 'portal.tryouts' },
        {
          routeKey: 'portal.tryouts.detail',
          requiresIdResolution: true,
          listRouteKey: 'portal.tryouts',
          idSelector: '[data-testid="tryout-row"], a[href*="/portal/tryouts/"]',
        },
        { routeKey: 'portal.myTickets' },
        { routeKey: 'portal.bookmarkedEvents' },
        { routeKey: 'portal.following' },
        { routeKey: 'portal.settings' },
        { routeKey: 'portal.help' },
        { routeKey: 'portal.contact' },
      ]

    case 'athlete':
      return [
        { routeKey: 'portal.dashboard' },
        { routeKey: 'portal.calendar' },
        {
          routeKey: 'portal.eventDetail',
          requiresIdResolution: true,
          listRouteKey: 'portal.calendar',
          idSelector: '[data-testid="event-row"], a[href*="/portal/calendar/events/"]',
        },
        { routeKey: 'portal.athletes' },
        {
          routeKey: 'portal.athletes.profile',
          requiresIdResolution: true,
          listRouteKey: 'portal.athletes',
          idSelector: '[data-testid="athlete-row"], a[href*="/portal/athletes/"]',
        },
        { routeKey: 'portal.huddles.announcements' },
        {
          routeKey: 'portal.announcementDetail',
          requiresIdResolution: true,
          listRouteKey: 'portal.huddles.announcements',
          idSelector: '[data-testid="announcement-row"], a[href*="/portal/messages/"]',
        },
        { routeKey: 'portal.photos' },
        {
          routeKey: 'portal.photos.gallery',
          requiresIdResolution: true,
          listRouteKey: 'portal.photos',
          idSelector: '[data-testid="gallery-row"], a[href*="/portal/photos/gallery/"]',
        },
        { routeKey: 'portal.videos' },
        {
          routeKey: 'portal.videos.detail',
          requiresIdResolution: true,
          listRouteKey: 'portal.videos',
          idSelector: '[data-testid="video-row"], a[href*="/portal/videos/"]',
        },
        { routeKey: 'portal.tryouts' },
        {
          routeKey: 'portal.tryouts.detail',
          requiresIdResolution: true,
          listRouteKey: 'portal.tryouts',
          idSelector: '[data-testid="tryout-row"], a[href*="/portal/tryouts/"]',
        },
        { routeKey: 'portal.bookmarkedEvents' },
        { routeKey: 'portal.settings' },
        { routeKey: 'portal.help' },
      ]

    case 'fan':
      return [
        { routeKey: 'fan.home' },
        { routeKey: 'fan.schedule' },
        {
          routeKey: 'fan.eventDetail',
          requiresIdResolution: true,
          listRouteKey: 'fan.schedule',
          idSelector: '[data-testid="event-row"], a[href*="/fan/events/"]',
        },
        { routeKey: 'fan.photos' },
        {
          routeKey: 'fan.photos.gallery',
          requiresIdResolution: true,
          listRouteKey: 'fan.photos',
          idSelector: '[data-testid="gallery-row"], a[href*="/fan/photos/gallery/"]',
        },
        { routeKey: 'fan.videos' },
        {
          routeKey: 'fan.videos.detail',
          requiresIdResolution: true,
          listRouteKey: 'fan.videos',
          idSelector: '[data-testid="video-row"], a[href*="/fan/videos/"]',
        },
        { routeKey: 'fan.tickets' },
        {
          routeKey: 'fan.tickets.detail',
          requiresIdResolution: true,
          listRouteKey: 'fan.tickets',
          idSelector: '[data-testid="ticket-row"], a[href*="/fan/tickets/"]',
        },
        { routeKey: 'fan.following' },
        { routeKey: 'fan.profile' },
        { routeKey: 'fan.profile.edit' },
        { routeKey: 'fan.profile.notifications' },
        { routeKey: 'fan.profile.linkedAthletes' },
        { routeKey: 'fan.profile.privacy' },
      ]

    case 'staff':
      // Staff role uses similar routes to coach
      return [
        { routeKey: 'admin.dashboard' },
        { routeKey: 'admin.teams.list' },
        {
          routeKey: 'admin.teams.detail',
          requiresIdResolution: true,
          listRouteKey: 'admin.teams.list',
          idSelector: '[data-testid="team-row"], a[href*="/admin/teams/"]',
        },
        { routeKey: 'admin.events.list' },
        {
          routeKey: 'admin.events.detail',
          requiresIdResolution: true,
          listRouteKey: 'admin.events.list',
          idSelector: '[data-testid="event-row"], a[href*="/admin/events/"]',
        },
        { routeKey: 'admin.announcements.list' },
        { routeKey: 'admin.attendance' },
      ]

    default:
      return []
  }
}

// ============================================================================
// Dynamic ID resolution
// ============================================================================

/**
 * Resolve dynamic segment (e.g., :id) by navigating to list page and getting first item
 */
export async function resolveDynamicSegment(
  page: Page,
  task: RouteTask,
  baseUrl: string
): Promise<Record<string, string> | null> {
  if (!task.requiresIdResolution || !task.listRouteKey) {
    return null
  }

  console.log(`[Routes] Resolving ID for ${task.routeKey} via ${task.listRouteKey}`)

  try {
    // Navigate to list page
    const listUrl = getLink(task.listRouteKey)
    await page.goto(`${baseUrl}${listUrl}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000) // Give time for list to render

    // Try to find first row/link
    const selector = task.idSelector || '[data-testid*="-row"], a[href*="/"]'
    const firstLink = page.locator(selector).first()

    const isVisible = await firstLink.isVisible({ timeout: 5000 }).catch(() => false)
    if (!isVisible) {
      console.warn(`[Routes] No items found in list for ${task.listRouteKey}, skipping ${task.routeKey}`)
      return null
    }

    // Get href attribute (prefer this over clicking to avoid navigation)
    let href = await firstLink.getAttribute('href').catch(() => null)
    
    // If no href, try to get it from the element's onclick or data attributes
    if (!href) {
      href = await firstLink.evaluate((el) => {
        // Try data attributes
        const dataHref = el.getAttribute('data-href') || el.getAttribute('data-link')
        if (dataHref) return dataHref
        
        // Try onclick handler (extract URL if possible)
        const onclick = el.getAttribute('onclick')
        if (onclick) {
          const urlMatch = onclick.match(/['"]([^'"]+)['"]/)
          if (urlMatch) return urlMatch[1]
        }
        
        return null
      }).catch(() => null)
    }
    
    // If still no href, we need to click (but this will navigate)
    if (!href) {
      // Store current URL to potentially go back
      const currentUrl = page.url()
      try {
        await firstLink.click({ timeout: 5000 })
        await page.waitForURL(/\/admin\/|\/portal\/|\/fan\//, { timeout: 5000 })
        const url = page.url()
        href = url
        
        // Try to go back to list page if possible
        try {
          await page.goBack({ waitUntil: 'domcontentloaded', timeout: 5000 })
          await page.waitForLoadState('networkidle')
        } catch {
          // If going back fails, re-navigate to list
          const listUrl = getLink(task.listRouteKey!)
          await page.goto(`${baseUrl}${listUrl}`, { waitUntil: 'domcontentloaded' })
          await page.waitForLoadState('networkidle')
        }
      } catch {
        console.warn(`[Routes] Could not get href or navigate for ${task.routeKey}`)
        return null
      }
    }

    // Extract ID from href/URL
    // Match UUIDs: /admin/teams/550e8400-e29b-41d4-a716-446655440000
    // Or numeric IDs: /admin/teams/123
    // Handle both absolute and relative URLs
    const urlPath = href.startsWith('http') ? new URL(href).pathname : href
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    const numericPattern = /\/(\d+)(?:\/|$)/
    const pathPattern = /\/([a-f0-9-]{20,})(?:\/|$)/i // Long alphanumeric IDs
    
    let id: string | null = null
    
    // Try UUID first
    const uuidMatch = urlPath.match(uuidPattern)
    if (uuidMatch) {
      id = uuidMatch[0]
    } else {
      // Try numeric
      const numericMatch = urlPath.match(numericPattern)
      if (numericMatch) {
        id = numericMatch[1]
      } else {
        // Try path pattern (for longer IDs)
        const pathMatch = urlPath.match(pathPattern)
        if (pathMatch) {
          id = pathMatch[1]
        }
      }
    }
    
    if (!id) {
      console.warn(`[Routes] Could not extract ID from ${href} (path: ${urlPath})`)
      return null
    }
    
    // Determine param name from route key
    // Check route definition to get exact param name
    let paramName = 'id'
    
    try {
      // Try to get the route definition to find the actual param name
      const routePath = getLink(task.routeKey)
      // Extract param names from path (e.g., :eventId, :id)
      const paramMatches = routePath.match(/:\w+/g)
      if (paramMatches && paramMatches.length > 0) {
        // Use the first param (remove the colon)
        paramName = paramMatches[0].slice(1)
      } else {
        // Fallback to heuristics
        if (task.routeKey.includes('event') && !task.routeKey.includes('events.list')) {
          paramName = 'eventId'
        } else if (task.routeKey.includes('announcement')) {
          paramName = 'announcementId'
        } else if (task.routeKey.includes('tryout')) {
          paramName = 'tryoutId'
        } else if (task.routeKey.includes('ticket')) {
          paramName = 'ticketId'
        } else if (task.routeKey.includes('kit') || (task.routeKey.includes('uniform') && task.routeKey.includes('detail'))) {
          paramName = 'kitId'
        }
      }
    } catch {
      // If getLink fails, use heuristics
      if (task.routeKey.includes('event') && !task.routeKey.includes('events.list')) {
        paramName = 'eventId'
      } else if (task.routeKey.includes('announcement')) {
        paramName = 'announcementId'
      } else if (task.routeKey.includes('tryout')) {
        paramName = 'tryoutId'
      } else if (task.routeKey.includes('ticket')) {
        paramName = 'ticketId'
      } else if (task.routeKey.includes('kit') || (task.routeKey.includes('uniform') && task.routeKey.includes('detail'))) {
        paramName = 'kitId'
      }
    }

    console.log(`[Routes] Resolved ${paramName}=${id} for ${task.routeKey}`)
    return { [paramName]: id }
  } catch (error) {
    console.warn(`[Routes] Failed to resolve ID for ${task.routeKey}:`, error)
    return null
  }
}

/**
 * Get full URL for a route task
 */
export function getRouteUrl(task: RouteTask, baseUrl: string, params?: Record<string, string>): string {
  const allParams = { ...task.params, ...params }
  const path = getLink(task.routeKey, allParams)
  return `${baseUrl}${path}`
}
