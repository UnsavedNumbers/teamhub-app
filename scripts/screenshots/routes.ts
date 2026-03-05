/**
 * Route definitions and dynamic ID resolution for screenshot system
 * 
 * Defines curated route lists per role and utilities to resolve dynamic segments.
 */

import { Page } from '@playwright/test'
import { getLink, getRoute } from '../../src/utils/routes'
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

type RouteMatcher = {
  regex: RegExp
  paramNames: string[]
  routeSegments: string[]
}

const INVALID_PARAM_VALUES = new Set(['list', 'create', 'new', 'edit', 'update', 'delete'])

function buildRouteMatcher(routeKey: string): RouteMatcher | null {
  const route = getRoute(routeKey)
  if (!route) return null

  const paramNames: string[] = []
  const routeSegments = route.path.split('/').filter(Boolean)
  const patternParts = route.path.split('/').map((segment) => {
    if (segment.startsWith(':')) {
      paramNames.push(segment.slice(1))
      return '([^/?#]+)'
    }
    return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  })

  const regex = new RegExp(`^${patternParts.join('/')}(?:/)?(?:[?#].*)?$`)
  return { regex, paramNames, routeSegments }
}

function extractParamsFromPath(pathname: string, matcher: RouteMatcher): Record<string, string> | null {
  const match = pathname.match(matcher.regex)
  if (!match) return null

  const params: Record<string, string> = {}
  for (let i = 0; i < matcher.paramNames.length; i++) {
    const rawValue = decodeURIComponent(match[i + 1] || '').trim()
    if (!rawValue || INVALID_PARAM_VALUES.has(rawValue.toLowerCase())) {
      return null
    }
    params[matcher.paramNames[i]] = rawValue
  }

  return params
}

function extractParamsFromPathLoose(pathname: string, matcher: RouteMatcher): Record<string, string> | null {
  const pathSegments = pathname.split('/').filter(Boolean)
  if (pathSegments.length < matcher.routeSegments.length) {
    return null
  }

  const params: Record<string, string> = {}

  for (let index = 0; index < matcher.routeSegments.length; index++) {
    const routeSegment = matcher.routeSegments[index]
    const value = decodeURIComponent(pathSegments[index] || '').trim()

    if (!routeSegment.startsWith(':')) {
      if (routeSegment !== value) {
        return null
      }
      continue
    }

    if (!value || INVALID_PARAM_VALUES.has(value.toLowerCase())) {
      return null
    }

    params[routeSegment.slice(1)] = value
  }

  return Object.keys(params).length > 0 ? params : null
}

function getStaticPathPrefix(matcher: RouteMatcher): string {
  const staticSegments: string[] = []
  for (const segment of matcher.routeSegments) {
    if (segment.startsWith(':')) break
    staticSegments.push(segment)
  }

  if (staticSegments.length === 0) {
    return '/'
  }

  return `/${staticSegments.join('/')}/`
}

function toPathname(candidate: string, baseUrl: string): string | null {
  if (!candidate) return null

  try {
    if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
      return new URL(candidate).pathname
    }

    if (candidate.startsWith('/')) {
      return new URL(candidate, baseUrl).pathname
    }

    return new URL(`/${candidate.replace(/^\/+/, '')}`, baseUrl).pathname
  } catch {
    return null
  }
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
          idSelector: '[data-testid="team-row"], [data-testid="open-team"], a[href*="/admin/teams/"]',
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
          idSelector: 'div.group.relative.rounded-xl.overflow-hidden.cursor-pointer, div.group.flex.items-center.gap-4.p-4.rounded-xl.cursor-pointer, [data-testid="athlete-row"], [data-testid="open-athlete"], a[href*="/admin/athletes/"]',
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
        { routeKey: 'admin.travel.list' },
        {
          routeKey: 'admin.travel.edit',
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
          idSelector: 'a[href^="/admin/videos/"]:not([href="/admin/videos"]):not([href="/admin/videos/upload"]), [data-testid="video-row"], [data-testid="open-video"], a[href*="/admin/videos/"]',
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
          idSelector: '[data-testid="team-row"], [data-testid="open-team"], a[href*="/admin/teams/"]',
        },
        {
          routeKey: 'admin.teams.roster',
          requiresIdResolution: true,
          listRouteKey: 'admin.teams.list',
          idSelector: '[data-testid="team-row"], [data-testid="open-team"], a[href*="/admin/teams/"]',
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
        { routeKey: 'admin.attendance' },
        { routeKey: 'admin.videos.list' },
        {
          routeKey: 'admin.videos.detail',
          requiresIdResolution: true,
          listRouteKey: 'admin.videos.list',
          idSelector: 'a[href^="/admin/videos/"]:not([href="/admin/videos"]):not([href="/admin/videos/upload"]), [data-testid="video-row"], [data-testid="open-video"], a[href*="/admin/videos/"]',
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
        { routeKey: 'portal.calendar' },
        {
          routeKey: 'portal.eventDetail',
          requiresIdResolution: true,
          listRouteKey: 'portal.calendar',
          idSelector: '[data-testid="event-row"], a[href*="/portal/calendar/events/"]',
        },
        { routeKey: 'portal.payments' },
        {
          routeKey: 'portal.paymentDetail',
          requiresIdResolution: true,
          listRouteKey: 'portal.payments',
          idSelector: '[data-testid="payment-row"], a[href*="/portal/payments/"]',
        },
        { routeKey: 'portal.announcements' },
        {
          routeKey: 'portal.announcementDetail',
          requiresIdResolution: true,
          listRouteKey: 'portal.announcements',
          idSelector: '[data-testid="announcement-row"], a[href*="/portal/announcements/"]',
        },
        { routeKey: 'portal.photos' },
        {
          routeKey: 'portal.photosGallery',
          requiresIdResolution: true,
          listRouteKey: 'portal.photos',
          idSelector: '[data-testid="gallery-row"], a[href*="/portal/photos/gallery/"]',
        },
        { routeKey: 'portal.videos' },
        {
          routeKey: 'portal.videoDetail',
          requiresIdResolution: true,
          listRouteKey: 'portal.videos',
          idSelector: '[data-testid="video-row"], a[href*="/portal/videos/"]',
        },
        { routeKey: 'portal.uniforms' },
        {
          routeKey: 'portal.uniformKitDetail',
          requiresIdResolution: true,
          listRouteKey: 'portal.uniforms',
          idSelector: '[data-testid="uniform-row"], a[href*="/portal/uniforms/"]',
        },
        { routeKey: 'portal.travel' },
        {
          routeKey: 'portal.travelDetail',
          requiresIdResolution: true,
          listRouteKey: 'portal.travel',
          idSelector: '[data-testid="travel-row"], a[href*="/portal/travel/"]',
        },
        { routeKey: 'portal.tryouts' },
        {
          routeKey: 'portal.tryoutDetail',
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
        { routeKey: 'portal.announcements' },
        {
          routeKey: 'portal.announcementDetail',
          requiresIdResolution: true,
          listRouteKey: 'portal.announcements',
          idSelector: '[data-testid="announcement-row"], a[href*="/portal/announcements/"]',
        },
        { routeKey: 'portal.photos' },
        {
          routeKey: 'portal.photosGallery',
          requiresIdResolution: true,
          listRouteKey: 'portal.photos',
          idSelector: '[data-testid="gallery-row"], a[href*="/portal/photos/gallery/"]',
        },
        { routeKey: 'portal.videos' },
        {
          routeKey: 'portal.videoDetail',
          requiresIdResolution: true,
          listRouteKey: 'portal.videos',
          idSelector: '[data-testid="video-row"], a[href*="/portal/videos/"]',
        },
        { routeKey: 'portal.tryouts' },
        {
          routeKey: 'portal.tryoutDetail',
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
          routeKey: 'fan.events.detail',
          requiresIdResolution: true,
          listRouteKey: 'fan.schedule',
          idSelector: '[data-testid="event-row"], a[href*="/fan/events/"]',
        },
        { routeKey: 'fan.photos.list' },
        {
          routeKey: 'fan.photos.gallery',
          requiresIdResolution: true,
          listRouteKey: 'fan.photos.list',
          idSelector: '[data-testid="gallery-row"], a[href*="/fan/photos/gallery/"]',
        },
        { routeKey: 'fan.videos.list' },
        {
          routeKey: 'fan.videos.detail',
          requiresIdResolution: true,
          listRouteKey: 'fan.videos.list',
          idSelector: '[data-testid="video-row"], a[href*="/fan/videos/"]',
        },
        { routeKey: 'fan.tickets.list' },
        {
          routeKey: 'fan.tickets.detail',
          requiresIdResolution: true,
          listRouteKey: 'fan.tickets.list',
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
          idSelector: '[data-testid="team-row"], [data-testid="open-team"], a[href*="/admin/teams/"]',
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

    const matcher = buildRouteMatcher(task.routeKey)
    if (!matcher || matcher.paramNames.length === 0) {
      console.warn(`[Routes] Could not build route matcher for ${task.routeKey}`)
      return null
    }

    const findParamsFromCandidate = (candidate: string | null): Record<string, string> | null => {
      if (!candidate) return null
      const pathname = toPathname(candidate, baseUrl)
      if (!pathname) return null
      return extractParamsFromPath(pathname, matcher) || extractParamsFromPathLoose(pathname, matcher)
    }

    const routePrefix = getStaticPathPrefix(matcher)

    const selectorCandidates = Array.from(new Set([
      task.idSelector,
      `a[href^="${routePrefix}"]`,
      `a[href*="${routePrefix}"]`,
      '[data-testid$="-row"]',
      'tr.oa-clickable',
      'tbody tr',
      '.ios-event-row',
      '[class*="cursor-pointer"]',
      '[role="row"]',
    ].filter(Boolean) as string[]))

    // Poll for async list content (cards/rows/links) before giving up.
    // Some pages hydrate role/data state after initial network idle.
    let listContentDetected = false
    for (let attempt = 0; attempt < 20; attempt++) {
      const hrefValues = new Set<string>()
      const html = await page.content()
      const attrRegex = /\b(?:href|data-href|data-link)=(['"])(.*?)\1/g
      let attrMatch: RegExpExecArray | null = attrRegex.exec(html)
      while (attrMatch) {
        const value = (attrMatch[2] || '').trim()
        if (value) {
          hrefValues.add(value)
        }
        attrMatch = attrRegex.exec(html)
      }

      const hrefCandidates = Array.from(hrefValues)
      const prioritizedHrefCandidates = hrefCandidates.filter((href) => {
        const pathname = toPathname(href, baseUrl)
        return pathname?.startsWith(routePrefix) || false
      })

      for (const href of [...prioritizedHrefCandidates, ...hrefCandidates]) {
        const params = findParamsFromCandidate(href)
        if (params) {
          console.log(`[Routes] Resolved ${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(', ')} for ${task.routeKey}`)
          return params
        }
      }

      for (const selector of selectorCandidates) {
        const count = await page.locator(selector).count().catch(() => 0)
        if (count > 0) {
          listContentDetected = true
          break
        }
      }

      if (listContentDetected) {
        break
      }

      await page.waitForTimeout(500)
    }

    // Strategy 1: One more href/data-href/data-link pass after polling window.
    const hrefValues = new Set<string>()
    const html = await page.content()
    const attrRegex = /\b(?:href|data-href|data-link)=(['"])(.*?)\1/g
    let attrMatch: RegExpExecArray | null = attrRegex.exec(html)
    while (attrMatch) {
      const value = (attrMatch[2] || '').trim()
      if (value) {
        hrefValues.add(value)
      }
      attrMatch = attrRegex.exec(html)
    }

    const hrefCandidates = Array.from(hrefValues)
    const prioritizedHrefCandidates = hrefCandidates.filter((href) => {
      const pathname = toPathname(href, baseUrl)
      return pathname?.startsWith(routePrefix) || false
    })

    for (const href of [...prioritizedHrefCandidates, ...hrefCandidates]) {
      const params = findParamsFromCandidate(href)
      if (params) {
        console.log(`[Routes] Resolved ${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(', ')} for ${task.routeKey}`)
        return params
      }
    }

    // Strategy 2: Click likely row/card elements and detect route change.
    const resetToList = async () => {
      await page.goto(`${baseUrl}${listUrl}`, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
    }

    for (const selector of selectorCandidates) {
      const rows = page.locator(selector)
      const rowCount = await rows.count().catch(() => 0)
      const limit = Math.min(rowCount, 60)

      for (let index = 0; index < limit; index++) {
        const row = rows.nth(index)
        const rowVisible = await row.isVisible({ timeout: 1000 }).catch(() => false)
        if (!rowVisible) continue

        const directHref = await row.getAttribute('href').catch(() => null)
        const directDataHref = await row.getAttribute('data-href').catch(() => null)
        const directDataLink = await row.getAttribute('data-link').catch(() => null)

        const directParams =
          findParamsFromCandidate(directHref) ||
          findParamsFromCandidate(directDataHref) ||
          findParamsFromCandidate(directDataLink)

        if (directParams) {
          console.log(`[Routes] Resolved ${Object.entries(directParams).map(([k, v]) => `${k}=${v}`).join(', ')} for ${task.routeKey}`)
          return directParams
        }

        const nestedHref = await row.locator('a[href]').first().getAttribute('href').catch(() => null)
        const nestedParams = findParamsFromCandidate(nestedHref)
        if (nestedParams) {
          console.log(`[Routes] Resolved ${Object.entries(nestedParams).map(([k, v]) => `${k}=${v}`).join(', ')} for ${task.routeKey}`)
          return nestedParams
        }

        const beforeUrl = page.url()
        try {
          await row.click({ timeout: 3000 })
          await page.waitForTimeout(700)
        } catch {
          continue
        }

        const afterUrl = page.url()
        if (afterUrl !== beforeUrl) {
          const navigatedParams = findParamsFromCandidate(afterUrl)
          if (navigatedParams) {
            console.log(`[Routes] Resolved ${Object.entries(navigatedParams).map(([k, v]) => `${k}=${v}`).join(', ')} for ${task.routeKey}`)
            return navigatedParams
          }

          await resetToList()
        }
      }
    }

    console.warn(`[Routes] No items found in list for ${task.listRouteKey}, skipping ${task.routeKey}`)
    return null
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
