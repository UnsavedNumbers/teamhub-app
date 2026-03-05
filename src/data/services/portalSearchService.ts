/**
 * Portal Search Service
 * 
 * Provides unified search across portal entities: athletes, events, galleries, payments, etc.
 */

import type { UserContext } from '../fake/userContext'
import { searchAthletes } from './familyService'
import { getEvents } from './eventsService'
import { getGalleriesForUser } from './galleryService'
import { getFeeAssignmentsForUser } from './paymentsService'
import { debug } from '../../lib/debug'

export type PortalSearchEntityType = 'athlete' | 'event' | 'photo_gallery' | 'payment' | 'team'

export interface PortalSearchResult {
  id: string
  entityType: PortalSearchEntityType
  title: string
  context: string // e.g., "Athlete", "Event", "Photo Gallery", "Payment"
  url: string
  metadata?: string // Additional context like date, amount, etc.
}

export interface PortalSearchParams {
  query: string
  context: UserContext
  limit?: number
  entityTypes?: PortalSearchEntityType[]
}

/**
 * Search across portal entities
 */
export async function searchPortalEntities(
  params: PortalSearchParams
): Promise<{ data: PortalSearchResult[]; error: Error | null }> {
  const { query, context, limit = 10, entityTypes = ['athlete', 'event', 'photo_gallery', 'payment'] } = params

  if (!query.trim() || query.length < 2) {
    return { data: [], error: null }
  }

  debug.data('PortalSearchService.searchPortalEntities', 'Request', { query, entityTypes, limit })

  const results: PortalSearchResult[] = []

  try {
    // Search athletes
    if (entityTypes.includes('athlete')) {
      const { data: athletes, error: athletesError } = await searchAthletes(context, {
        search: query,
        limit: Math.ceil(limit / entityTypes.length),
      })

      if (!athletesError && athletes) {
        athletes.forEach((athlete) => {
          results.push({
            id: athlete.id,
            entityType: 'athlete',
            title: `${athlete.first_name} ${athlete.last_name}`,
            context: 'Athlete',
            url: `/portal/athletes/${athlete.id}/edit`,
            metadata: athlete.preferred_name ? `Preferred: ${athlete.preferred_name}` : undefined,
          })
        })
      }
    }

    // Search events (include both upcoming and past events)
    if (entityTypes.includes('event')) {
      const { data: events, error: eventsError } = await getEvents(context, {
        search: query,
        limit: Math.ceil(limit / entityTypes.length),
        timeContext: 'all', // Search all events, not just upcoming
      })

      if (!eventsError && events) {
        events.forEach((event) => {
          const eventDate = event.start_time ? new Date(event.start_time).toLocaleDateString() : ''
          results.push({
            id: event.id,
            entityType: 'event',
            title: event.title || 'Untitled Event',
            context: 'Event',
            url: `/portal/calendar/events/${event.id}`,
            metadata: eventDate ? `Date: ${eventDate}` : undefined,
          })
        })
      }
    }

    // Search galleries
    if (entityTypes.includes('photo_gallery')) {
      const { data: galleries, error: galleriesError } = await getGalleriesForUser(context, {
        search: query,
        limit: Math.ceil(limit / entityTypes.length),
      })

      if (!galleriesError && galleries) {
        galleries.forEach((gallery) => {
          const photoCount = gallery.photo_count ? `${gallery.photo_count} photos` : ''
          results.push({
            id: gallery.id,
            entityType: 'photo_gallery',
            title: gallery.name || gallery.title || 'Untitled Gallery',
            context: 'Photo Gallery',
            url: `/portal/photos/gallery/${gallery.id}`,
            metadata: photoCount || undefined,
          })
        })
      }
    }

    // Search payments/fee assignments
    if (entityTypes.includes('payment')) {
      const { data: assignments, error: paymentsError } = await getFeeAssignmentsForUser(context)

      if (!paymentsError && assignments) {
        type EnrichedAssignment = typeof assignments[0] & {
          fee?: { title?: string; amount_cents?: number };
          athlete?: { first_name: string; last_name: string };
        };
        const searchLower = query.toLowerCase()
        const filtered = (assignments as EnrichedAssignment[])
          .filter((assignment) => {
            const feeName = (assignment.fee as { title?: string } | undefined)?.title?.toLowerCase() || ''
            const athleteName = assignment.athlete
              ? `${assignment.athlete.first_name} ${assignment.athlete.last_name}`.toLowerCase()
              : ''
            return feeName.includes(searchLower) || athleteName.includes(searchLower)
          })
          .slice(0, Math.ceil(limit / entityTypes.length))

        filtered.forEach((assignment: EnrichedAssignment) => {
          const athleteName = assignment.athlete
            ? `${assignment.athlete.first_name} ${assignment.athlete.last_name}`
            : 'Unknown'
          const feeName = (assignment.fee as { title?: string } | undefined)?.title || 'Fee'
          const feeAmountCents = (assignment.fee as { amount_cents?: number } | undefined)?.amount_cents
          const amount = feeAmountCents != null ? `$${(feeAmountCents / 100).toFixed(2)}` : ''

          results.push({
            id: assignment.id,
            entityType: 'payment',
            title: `${feeName} - ${athleteName}`,
            context: 'Payment',
            url: `/portal/payments/${assignment.id}`,
            metadata: amount || undefined,
          })
        })
      }
    }

    // Sort by relevance (simple: exact matches first, then partial)
    const searchLower = query.toLowerCase()
    results.sort((a, b) => {
      const aExact = a.title.toLowerCase().startsWith(searchLower)
      const bExact = b.title.toLowerCase().startsWith(searchLower)
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      return a.title.localeCompare(b.title)
    })

    // Limit total results
    const limitedResults = results.slice(0, limit)

    debug.data('PortalSearchService.searchPortalEntities', 'Response', { resultCount: limitedResults.length })
    return { data: limitedResults, error: null }
  } catch (err) {
    debug.error('PortalSearchService.searchPortalEntities', 'Error', { error: err, query })
    return {
      data: [],
      error: err instanceof Error ? err : new Error('Search failed'),
    }
  }
}
