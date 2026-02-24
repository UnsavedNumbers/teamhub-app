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

    // Try to find first row
    const rowSelector = task.idSelector || '[data-testid*="-row"], tr, [class*="row"]'
    const firstRow = page.locator(rowSelector).first()

    const isVisible = await firstRow.isVisible({ timeout: 5000 }).catch(() => false)
    if (!isVisible) {
      console.warn(`[Routes] No items found in list for ${task.listRouteKey}, skipping ${task.routeKey}`)
      return null
    }

    // Look for View or Edit button within the row (prefer View for detail pages)
    // These buttons typically navigate to detail/edit pages
    let href: string | null = null
    
    // Try to find View button first (for detail pages)
    const viewButton = firstRow.locator('button:has-text("View"), button:has-text("view")').first()
    const viewButtonExists = await viewButton.count().catch(() => 0) > 0
    
    if (viewButtonExists) {
      // Click View button and get the URL it navigates to (most reliable)
      const currentUrl = page.url()
      try {
        await viewButton.click({ timeout: 5000 })
        await page.waitForURL(/\/admin\/|\/portal\/|\/fan\//, { timeout: 5000 })
        href = page.url()
        
        // Go back to list
        await page.goBack({ waitUntil: 'domcontentloaded', timeout: 5000 })
        await page.waitForLoadState('networkidle')
      } catch {
        console.warn(`[Routes] Could not navigate via View button for ${task.routeKey}`)
      }
    }
    
    // If no View button, try Edit button
    if (!href) {
      const editButton = firstRow.locator('button:has-text("Edit"), button:has-text("edit"), button[icon="edit"]').first()
      const editButtonExists = await editButton.count().catch(() => 0) > 0
      
      if (editButtonExists) {
        // Click Edit button and get the URL it navigates to
        const currentUrl = page.url()
        try {
          await editButton.click({ timeout: 5000 })
          await page.waitForURL(/\/admin\/|\/portal\/|\/fan\//, { timeout: 5000 })
          href = page.url()
          
          // Go back to list
          await page.goBack({ waitUntil: 'domcontentloaded', timeout: 5000 })
          await page.waitForLoadState('networkidle')
        } catch {
          console.warn(`[Routes] Could not navigate via Edit button for ${task.routeKey}`)
        }
      }
    }
    
    // Fallback: try to get href from row link or data attributes
    if (!href) {
      href = await firstRow.locator('a[href*="/"]').first().getAttribute('href').catch(() => null)
      
      if (!href) {
        href = await firstRow.evaluate((el) => {
          const dataHref = el.getAttribute('data-href') || el.getAttribute('data-link')
          if (dataHref) return dataHref
          
          // Try to find a link within the row
          const link = el.querySelector('a[href]')
          if (link) return (link as HTMLAnchorElement).href
          
          return null
        }).catch(() => null)
      }
    }
    
    // Last resort: click the row itself (if clickable)
    if (!href) {
      const currentUrl = page.url()
      try {
        await firstRow.click({ timeout: 5000 })
        await page.waitForURL(/\/admin\/|\/portal\/|\/fan\//, { timeout: 5000 })
        href = page.url()
        
        // Go back to list
        await page.goBack({ waitUntil: 'domcontentloaded', timeout: 5000 })
        await page.waitForLoadState('networkidle')
      } catch {
        console.warn(`[Routes] Could not get href or navigate for ${task.routeKey}`)
        return null
      }
    }

    if (!href) {
      console.warn(`[Routes] Could not find URL for ${task.routeKey}`)
      return null
    }

    // Extract ID from href/URL - handle UUIDs, numeric IDs, and slugs
    // Examples: 
    //   /admin/teams/550e8400-e29b-41d4-a716-446655440000 (UUID)
    //   /admin/teams/123 (numeric)
    //   /admin/teams/team-u10-soccer-001 (slug)
    //   /admin/videos/mock-video-2 (slug)
    //   /portal/photos/gallery/mock-gallery-3 (nested slug)
    const urlPath = href.startsWith('http') ? new URL(href).pathname : href
    
    // Split path and get the last meaningful segment (skip empty segments)
    const segments = urlPath.split('/').filter(Boolean)
    if (segments.length === 0) {
      console.warn(`[Routes] Could not extract ID from ${href} (path: ${urlPath})`)
      return null
    }
    
    // Get the last segment as ID (works for both simple and nested paths)
    // For nested paths like /portal/photos/gallery/mock-gallery-3, we want "mock-gallery-3"
    const id = segments[segments.length - 1]
    
    // Validate it looks like an ID (not empty, not just a route name like "list" or "create")
    const routeNames = ['list', 'create', 'new', 'edit', 'update', 'delete']
    if (!id || id.length < 1 || routeNames.includes(id.toLowerCase())) {
      console.warn(`[Routes] Could not extract valid ID from ${href} (path: ${urlPath}, last segment: ${id})`)
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
