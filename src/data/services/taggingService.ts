/**
 * Tagging Service
 *
 * Handles tagging operations for gallery photos.
 * Provides context-aware suggestion logic based on gallery type.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import type { UserContext } from '../fake/userContext'
import { USE_FAKE_DATA } from '../config'

// ============================================================================
// Type Definitions
// ============================================================================

export type GalleryType = 'org' | 'team' | 'athlete' | 'event' | 'travel' | 'program' | 'season'

export interface GalleryContext {
  galleryId: string
  galleryType: GalleryType
  entityId: string | null
  orgId: string
}

export interface SuggestedPerson {
  id: string
  first_name: string
  last_name: string
  photo_url?: string | null
  role?: string | null
  source?: string // For debugging/ordering: 'staff', 'roster', 'coach', etc.
}

export interface TaggedPerson extends SuggestedPerson {
  displayName: string // Cached full name for display
}

export interface TaggingServiceResponse<T> {
  data: T | null
  error: Error | null
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

const FAKE_SUGGESTED_PEOPLE: SuggestedPerson[] = [
  { id: 'mock-athlete-1', first_name: 'Emma', last_name: 'Johnson', source: 'athlete' },
  { id: 'mock-athlete-2', first_name: 'Liam', last_name: 'Parker', source: 'athlete' },
  { id: 'mock-athlete-3', first_name: 'Sofia', last_name: 'Martinez', source: 'athlete' },
  { id: 'mock-athlete-4', first_name: 'Noah', last_name: 'Campbell', source: 'athlete' },
  { id: 'mock-athlete-5', first_name: 'Ava', last_name: 'Robinson', source: 'athlete' },
  { id: 'mock-athlete-6', first_name: 'Mason', last_name: 'Lee', source: 'athlete' },
]

const fakePhotoTags = new Map<string, Set<string>>()

function getFakeSuggestedPeople(excludeIds: string[], limit: number): SuggestedPerson[] {
  const excluded = new Set(excludeIds)
  return FAKE_SUGGESTED_PEOPLE.filter((person) => !excluded.has(person.id)).slice(0, limit)
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get suggested people for a gallery based on its type and context.
 * Results are ordered by relevance (staff → coaches → athletes for org, etc.).
 * Excludes already-tagged people from the results.
 *
 * @param context User context
 * @param galleryContext Gallery information
 * @param excludeTaggedIds IDs of people already tagged (to exclude from suggestions)
 * @param limit Maximum number of results (default 20)
 */
export async function getSuggestedPeopleForGallery(
  context: UserContext,
  galleryContext: GalleryContext,
  excludeTaggedIds: string[] = [],
  limit: number = 20
): Promise<TaggingServiceResponse<SuggestedPerson[]>> {
  console.groupCollapsed(`%cgetSuggestedPeopleForGallery: ${galleryContext.galleryType}`, 'color: #666; font-weight: bold;');
  debug.data('TaggingService.getSuggestedPeopleForGallery', 'Request', { galleryType: galleryContext.galleryType, galleryId: galleryContext.galleryId, excludeCount: excludeTaggedIds.length, limit })
  debug.perf.start('taggingService.getSuggestedPeopleForGallery')

  try {
    if (USE_FAKE_DATA) {
      const fakeResults = getFakeSuggestedPeople(excludeTaggedIds, limit)
      debug.perf.end('taggingService.getSuggestedPeopleForGallery')
      debug.data('TaggingService.getSuggestedPeopleForGallery', 'Response (fake)', { count: fakeResults.length })
      console.groupEnd()
      return { data: fakeResults, error: null }
    }

    if (!isValidUUID(galleryContext.galleryId)) {
      debug.perf.end('taggingService.getSuggestedPeopleForGallery')
      debug.error('TaggingService.getSuggestedPeopleForGallery', 'Invalid gallery ID', { galleryId: galleryContext.galleryId })
      console.groupEnd()
      throw new Error('Invalid gallery ID')
    }

    if (!context.orgId) {
      debug.perf.end('taggingService.getSuggestedPeopleForGallery')
      debug.error('TaggingService.getSuggestedPeopleForGallery', 'Organization context required', { galleryId: galleryContext.galleryId })
      console.groupEnd()
      throw new Error('Organization context required')
    }

    const { galleryType, entityId, orgId } = galleryContext
    let results: SuggestedPerson[] = []

    // Build query based on gallery type
    switch (galleryType) {
      case 'org': {
        // Order: staff → coaches → athletes (alphabetical within group)
        results = await getOrgSuggestions(orgId, excludeTaggedIds, limit)
        break
      }
      case 'season': {
        // Order: athletes → coaches → staff
        if (entityId) {
          results = await getSeasonSuggestions(entityId, orgId, excludeTaggedIds, limit)
        } else {
          // Fallback to org-level if no entity_id
          results = await getOrgSuggestions(orgId, excludeTaggedIds, limit)
        }
        break
      }
      case 'team': {
        // Order: athletes by jersey_number → coaches → staff
        if (entityId) {
          results = await getTeamSuggestions(entityId, orgId, excludeTaggedIds, limit)
        } else {
          results = await getOrgSuggestions(orgId, excludeTaggedIds, limit)
        }
        break
      }
      case 'event': {
        // Order: participating athletes → coaches → attendees
        if (entityId) {
          results = await getEventSuggestions(entityId, orgId, excludeTaggedIds, limit)
        } else {
          results = await getOrgSuggestions(orgId, excludeTaggedIds, limit)
        }
        break
      }
      case 'travel': {
        // Order: travel roster → chaperones → team athletes
        if (entityId) {
          results = await getTravelSuggestions(entityId, orgId, excludeTaggedIds, limit)
        } else {
          results = await getOrgSuggestions(orgId, excludeTaggedIds, limit)
        }
        break
      }
      case 'program': {
        // Similar to team/season - program participants
        if (entityId) {
          results = await getProgramSuggestions(entityId, orgId, excludeTaggedIds, limit)
        } else {
          results = await getOrgSuggestions(orgId, excludeTaggedIds, limit)
        }
        break
      }
      case 'athlete': {
        // Order: owner → teammates → coaches
        if (entityId) {
          results = await getAthleteGallerySuggestions(entityId, orgId, excludeTaggedIds, limit)
        } else {
          results = await getOrgSuggestions(orgId, excludeTaggedIds, limit)
        }
        break
      }
      default: {
        // Unknown type - fallback to org-level
        results = await getOrgSuggestions(orgId, excludeTaggedIds, limit)
        break
      }
    }

    const finalResults = results.slice(0, limit)
    debug.perf.end('taggingService.getSuggestedPeopleForGallery')
    debug.data('TaggingService.getSuggestedPeopleForGallery', 'Response', { galleryType: galleryContext.galleryType, count: finalResults.length })
    console.groupEnd()
    return {
      data: finalResults,
      error: null,
    }
  } catch (err) {
    debug.perf.end('taggingService.getSuggestedPeopleForGallery')
    debug.error('TaggingService.getSuggestedPeopleForGallery', 'Failed to get suggested people', { error: err, galleryType: galleryContext.galleryType })
    console.groupEnd()
    console.error('[taggingService] Error getting suggested people:', err)
    return {
      data: [],
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Search for people within a gallery's context.
 * Uses the same scope as getSuggestedPeopleForGallery but filters by name.
 *
 * @param context User context
 * @param galleryContext Gallery information
 * @param query Search query (searches first_name and last_name)
 * @param limit Maximum number of results (default 20)
 */
export async function searchPeopleForGallery(
  context: UserContext,
  galleryContext: GalleryContext,
  query: string,
  limit: number = 20
): Promise<TaggingServiceResponse<SuggestedPerson[]>> {
  console.groupCollapsed(`%csearchPeopleForGallery: ${galleryContext.galleryType} - "${query}"`, 'color: #666; font-weight: bold;');
  debug.data('TaggingService.searchPeopleForGallery', 'Request', { galleryType: galleryContext.galleryType, query, limit })
  debug.perf.start('taggingService.searchPeopleForGallery')

  try {
    if (!query || query.trim().length === 0) {
      debug.perf.end('taggingService.searchPeopleForGallery')
      debug.data('TaggingService.searchPeopleForGallery', 'Response (empty query)', { query })
      console.groupEnd()
      return { data: [], error: null }
    }

    if (USE_FAKE_DATA) {
      const searchTerm = query.trim().toLowerCase()
      const fakeResults = FAKE_SUGGESTED_PEOPLE.filter((person) => {
        const fullName = `${person.first_name} ${person.last_name}`.toLowerCase()
        return fullName.includes(searchTerm)
      }).slice(0, limit)
      debug.perf.end('taggingService.searchPeopleForGallery')
      debug.data('TaggingService.searchPeopleForGallery', 'Response (fake)', { query, count: fakeResults.length })
      console.groupEnd()
      return { data: fakeResults, error: null }
    }

    if (!isValidUUID(galleryContext.galleryId)) {
      debug.perf.end('taggingService.searchPeopleForGallery')
      debug.error('TaggingService.searchPeopleForGallery', 'Invalid gallery ID', { galleryId: galleryContext.galleryId, query })
      console.groupEnd()
      throw new Error('Invalid gallery ID')
    }

    if (!context.orgId) {
      debug.perf.end('taggingService.searchPeopleForGallery')
      debug.error('TaggingService.searchPeopleForGallery', 'Organization context required', { query })
      console.groupEnd()
      throw new Error('Organization context required')
    }

    const searchTerm = query.trim().toLowerCase()

    // Get all suggestions for this gallery type, then filter by name
    const result = await getSuggestedPeopleForGallery(context, galleryContext, [], limit * 3)

    if (result.error || !result.data) {
      return result
    }

    // Filter by search query (case-insensitive, matches first or last name)
    const filtered = result.data.filter((person) => {
      const fullName = `${person.first_name} ${person.last_name}`.toLowerCase()
      return fullName.includes(searchTerm)
    })

    const finalResults = filtered.slice(0, limit)
    debug.perf.end('taggingService.searchPeopleForGallery')
    debug.data('TaggingService.searchPeopleForGallery', 'Response', { query, count: finalResults.length })
    console.groupEnd()
    return {
      data: finalResults,
      error: null,
    }
  } catch (err) {
    debug.perf.end('taggingService.searchPeopleForGallery')
    debug.error('TaggingService.searchPeopleForGallery', 'Failed to search people', { error: err, query })
    console.groupEnd()
    console.error('[taggingService] Error searching people:', err)
    return {
      data: [],
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Add a tag to a photo.
 *
 * @param photoId Photo ID
 * @param athleteId Athlete ID to tag
 */
export async function addTag(
  photoId: string,
  athleteId: string
): Promise<TaggingServiceResponse<void>> {
  console.groupCollapsed(`%caddTag: ${photoId} - ${athleteId}`, 'color: #666; font-weight: bold;');
  debug.flow('TaggingService.addTag', 'Adding tag', { photoId, athleteId })
  debug.perf.start('taggingService.addTag')

  try {
    if (USE_FAKE_DATA) {
      const current = fakePhotoTags.get(photoId) || new Set<string>()
      current.add(athleteId)
      fakePhotoTags.set(photoId, current)
      debug.perf.end('taggingService.addTag')
      console.groupEnd()
      return { data: undefined, error: null }
    }

    if (!isValidUUID(photoId)) {
      debug.perf.end('taggingService.addTag')
      debug.error('TaggingService.addTag', 'Invalid photo ID', { photoId, athleteId })
      console.groupEnd()
      throw new Error('Invalid photo ID')
    }

    if (!isValidUUID(athleteId)) {
      debug.perf.end('taggingService.addTag')
      debug.error('TaggingService.addTag', 'Invalid athlete ID', { photoId, athleteId })
      console.groupEnd()
      throw new Error('Invalid athlete ID')
    }

    const { error } = await supabase
      .from('gallery_photo_tags')
      .insert({
        photo_id: photoId,
        athlete_id: athleteId,
      })
      .single()

    if (error) {
      // Ignore unique constraint violations (already tagged)
      if (error.code === '23505') {
        debug.perf.end('taggingService.addTag')
        debug.data('TaggingService.addTag', 'Response (already tagged)', { photoId, athleteId })
        console.groupEnd()
        return { data: undefined, error: null }
      }
      throw error
    }

    debug.perf.end('taggingService.addTag')
    debug.flow('TaggingService.addTag', 'Tag added successfully', { photoId, athleteId })
    console.groupEnd()
    return { data: undefined, error: null }
  } catch (err) {
    debug.perf.end('taggingService.addTag')
    debug.error('TaggingService.addTag', 'Failed to add tag', { error: err, photoId, athleteId })
    console.groupEnd()
    console.error('[taggingService] Error adding tag:', err)
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Remove a tag from a photo.
 *
 * @param photoId Photo ID
 * @param athleteId Athlete ID to untag
 */
export async function removeTag(
  photoId: string,
  athleteId: string
): Promise<TaggingServiceResponse<void>> {
  try {
    if (USE_FAKE_DATA) {
      const current = fakePhotoTags.get(photoId)
      if (current) {
        current.delete(athleteId)
        fakePhotoTags.set(photoId, current)
      }
      debug.perf.end('taggingService.removeTag')
      console.groupEnd()
      return { data: undefined, error: null }
    }

    if (!isValidUUID(photoId)) {
      throw new Error('Invalid photo ID')
    }

    if (!isValidUUID(athleteId)) {
      throw new Error('Invalid athlete ID')
    }

    const { error } = await supabase
      .from('gallery_photo_tags')
      .delete()
      .eq('photo_id', photoId)
      .eq('athlete_id', athleteId)

    if (error) throw error

    debug.perf.end('taggingService.removeTag')
    debug.flow('TaggingService.removeTag', 'Tag removed successfully', { photoId, athleteId })
    console.groupEnd()
    return { data: undefined, error: null }
  } catch (err) {
    debug.perf.end('taggingService.removeTag')
    debug.error('TaggingService.removeTag', 'Failed to remove tag', { error: err, photoId, athleteId })
    console.groupEnd()
    console.error('[taggingService] Error removing tag:', err)
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Set tags for a photo (replace all existing tags with new set).
 * Computes diff and applies insert/delete as needed.
 *
 * @param photoId Photo ID
 * @param athleteIds Array of athlete IDs to tag
 */
export async function setTagsForPhoto(
  photoId: string,
  athleteIds: string[]
): Promise<TaggingServiceResponse<void>> {
  console.groupCollapsed(`%csetTagsForPhoto: ${photoId}`, 'color: #666; font-weight: bold;');
  debug.flow('TaggingService.setTagsForPhoto', 'Setting tags', { photoId, athleteCount: athleteIds.length })
  debug.perf.start('taggingService.setTagsForPhoto')

  try {
    if (USE_FAKE_DATA) {
      fakePhotoTags.set(photoId, new Set(athleteIds))
      debug.perf.end('taggingService.setTagsForPhoto')
      debug.flow('TaggingService.setTagsForPhoto', 'Tags set successfully (fake)', { photoId, athleteCount: athleteIds.length })
      console.groupEnd()
      return { data: undefined, error: null }
    }

    if (!isValidUUID(photoId)) {
      debug.perf.end('taggingService.setTagsForPhoto')
      debug.error('TaggingService.setTagsForPhoto', 'Invalid photo ID', { photoId })
      console.groupEnd()
      throw new Error('Invalid photo ID')
    }

    // Validate all athlete IDs
    for (const id of athleteIds) {
      if (!isValidUUID(id)) {
        debug.perf.end('taggingService.setTagsForPhoto')
        debug.error('TaggingService.setTagsForPhoto', 'Invalid athlete ID', { photoId, invalidId: id })
        console.groupEnd()
        throw new Error(`Invalid athlete ID: ${id}`)
      }
    }

    // Get current tags
    const { data: currentTags, error: fetchError } = await supabase
      .from('gallery_photo_tags')
      .select('athlete_id')
      .eq('photo_id', photoId)

    if (fetchError) throw fetchError

    const currentIds = new Set((currentTags || []).map((t) => t.athlete_id))
    const newIds = new Set(athleteIds)

    // Compute diff
    const toAdd = athleteIds.filter((id) => !currentIds.has(id))
    const toRemove = Array.from(currentIds).filter((id) => !newIds.has(id))

    // Apply changes
    if (toAdd.length > 0) {
      const { error: insertError } = await supabase
        .from('gallery_photo_tags')
        .upsert(
          toAdd.map((athleteId) => ({
            photo_id: photoId,
            athlete_id: athleteId,
          })),
          { onConflict: 'photo_id,athlete_id' }
        )

      if (insertError) throw insertError
    }

    if (toRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('gallery_photo_tags')
        .delete()
        .eq('photo_id', photoId)
        .in('athlete_id', toRemove)

      if (deleteError) throw deleteError
    }

    debug.perf.end('taggingService.setTagsForPhoto')
    debug.flow('TaggingService.setTagsForPhoto', 'Tags set successfully', { photoId, athleteCount: athleteIds.length, added: toAdd.length, removed: toRemove.length })
    console.groupEnd()
    return { data: undefined, error: null }
  } catch (err) {
    debug.perf.end('taggingService.setTagsForPhoto')
    debug.error('TaggingService.setTagsForPhoto', 'Failed to set tags', { error: err, photoId })
    console.groupEnd()
    console.error('[taggingService] Error setting tags:', err)
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

// ============================================================================
// Internal Helper Functions by Gallery Type
// ============================================================================

/**
 * Get org-level suggestions: staff → coaches → athletes
 */
async function getOrgSuggestions(
  orgId: string,
  excludeIds: string[],
  limit: number
): Promise<SuggestedPerson[]> {
  const results: SuggestedPerson[] = []

  try {
    // Use the RPC function that properly handles org-level athlete queries
    const { data: athletes, error: athletesError } = await supabase
      .rpc('get_athletes_with_guardian_status', {
        p_org_id: orgId,
        p_limit: limit + excludeIds.length, // Get extra to account for exclusions
        p_offset: 0,
      })

    if (athletesError) {
      console.error('[taggingService] Error fetching athletes via RPC:', athletesError)
      return []
    }

    if (athletes) {
      for (const athlete of athletes) {
        // Skip excluded athletes and soft-deleted athletes
        if (excludeIds.includes(athlete.athlete_id) || athlete.deleted_at) {
          continue
        }
        
        results.push({
          id: athlete.athlete_id,
          first_name: athlete.first_name,
          last_name: athlete.last_name,
          source: 'athlete',
        })

        // Stop if we've reached the limit
        if (results.length >= limit) {
          break
        }
      }
    }

    return results
  } catch (err) {
    console.error('[taggingService] Error getting org suggestions:', err)
    return []
  }
}

/**
 * Get season suggestions: athletes → coaches → staff
 */
async function getSeasonSuggestions(
  seasonId: string,
  orgId: string,
  excludeIds: string[],
  limit: number
): Promise<SuggestedPerson[]> {
  const results: SuggestedPerson[] = []

  try {
    // Get athletes with team_memberships for this season
    const { data: seasonTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('season_id', seasonId)
      .limit(50)

    if (seasonTeams && seasonTeams.length > 0) {
      const teamIds = seasonTeams.map((t) => t.id)

      let query = supabase
        .from('team_memberships')
        .select('athlete_id, athletes!inner(id, first_name, last_name)')
        .in('team_id', teamIds)
        .is('deleted_at', null)
        .limit(limit)

      // Only apply exclude filter if there are IDs to exclude
      if (excludeIds.length > 0) {
        query = query.not('athlete_id', 'in', `(${excludeIds.join(',')})`)
      }

      const { data: memberships } = await query

      if (memberships) {
        for (const m of memberships) {
          const athlete = m.athletes as any
          results.push({
            id: athlete.id,
            first_name: athlete.first_name,
            last_name: athlete.last_name,
            source: 'season-athlete',
          })
        }
      }
    }

    // Add coaches and staff from org
    const orgResults = await getOrgSuggestions(orgId, excludeIds.concat(results.map((r) => r.id)), limit)
    results.push(...orgResults)

    return results
  } catch (err) {
    // On error, fall back to org-level
    console.warn('[taggingService] season query failed, falling back to org-level:', err)
    return await getOrgSuggestions(orgId, excludeIds, limit)
  }
}

/**
 * Get team suggestions: roster → coaches → staff
 */
async function getTeamSuggestions(
  teamId: string,
  orgId: string,
  excludeIds: string[],
  limit: number
): Promise<SuggestedPerson[]> {
  const results: SuggestedPerson[] = []

  try {
    // Get roster from team_memberships
    let query = supabase
      .from('team_memberships')
      .select('athlete_id, athletes!inner(id, first_name, last_name)')
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .limit(limit)

    // Only apply exclude filter if there are IDs to exclude
    if (excludeIds.length > 0) {
      query = query.not('athlete_id', 'in', `(${excludeIds.join(',')})`)
    }

    const { data: memberships } = await query

    if (memberships) {
      for (const m of memberships) {
        const athlete = m.athletes as any
        results.push({
          id: athlete.id,
          first_name: athlete.first_name,
          last_name: athlete.last_name,
          source: 'roster',
        })
      }
    }

    // Add coaches and staff from org
    const orgResults = await getOrgSuggestions(orgId, excludeIds.concat(results.map((r) => r.id)), limit)
    results.push(...orgResults)

    return results
  } catch (err) {
    // On error, fall back to org-level
    console.warn('[taggingService] team query failed, falling back to org-level:', err)
    return await getOrgSuggestions(orgId, excludeIds, limit)
  }
}

/**
 * Get event suggestions: participating athletes → coaches
 * Note: events have a single team_id, not a junction table
 */
async function getEventSuggestions(
  eventId: string,
  orgId: string,
  excludeIds: string[],
  limit: number
): Promise<SuggestedPerson[]> {
  try {
    // Get the event to find its team
    const { data: event } = await supabase
      .from('events')
      .select('team_id')
      .eq('id', eventId)
      .single()

    if (event?.team_id) {
      // Get athletes from the event's team
      return await getTeamSuggestions(event.team_id, orgId, excludeIds, limit)
    }

    // Fallback to org-level if no team found
    return await getOrgSuggestions(orgId, excludeIds, limit)
  } catch (err) {
    console.error('[taggingService] Error getting event suggestions:', err)
    return await getOrgSuggestions(orgId, excludeIds, limit)
  }
}

/**
 * Get travel plan suggestions: team roster
 * Note: travel_plans have a team_id, no separate travel_plan_members table
 */
async function getTravelSuggestions(
  travelPlanId: string,
  orgId: string,
  excludeIds: string[],
  limit: number
): Promise<SuggestedPerson[]> {
  try {
    // Get the travel plan to find its team
    const { data: travelPlan } = await supabase
      .from('travel_plans')
      .select('team_id')
      .eq('id', travelPlanId)
      .single()

    if (travelPlan?.team_id) {
      // Get athletes from the travel plan's team
      return await getTeamSuggestions(travelPlan.team_id, orgId, excludeIds, limit)
    }

    // Fallback to org-level if no team found
    return await getOrgSuggestions(orgId, excludeIds, limit)
  } catch (err) {
    console.error('[taggingService] Error getting travel suggestions:', err)
    return await getOrgSuggestions(orgId, excludeIds, limit)
  }
}

/**
 * Get program suggestions
 */
async function getProgramSuggestions(
  _programId: string,
  orgId: string,
  excludeIds: string[],
  limit: number
): Promise<SuggestedPerson[]> {
  // Programs are similar to teams - use org-level for now
  return await getOrgSuggestions(orgId, excludeIds, limit)
}

/**
 * Get athlete gallery suggestions: owner → teammates → coaches
 */
async function getAthleteGallerySuggestions(
  athleteId: string,
  orgId: string,
  excludeIds: string[],
  limit: number
): Promise<SuggestedPerson[]> {
  const results: SuggestedPerson[] = []

  try {
    // Owner first
    if (!excludeIds.includes(athleteId)) {
      const { data: athlete } = await supabase
        .from('athletes')
        .select('id, first_name, last_name')
        .eq('id', athleteId)
        .single()

      if (athlete) {
        results.push({
          id: athlete.id,
          first_name: athlete.first_name,
          last_name: athlete.last_name,
          source: 'owner',
        })
      }
    }

    // Get teammates (same teams)
    const { data: memberships } = await supabase
      .from('team_memberships')
      .select('team_id, athlete_id, athletes!inner(id, first_name, last_name)')
      .eq('athlete_id', athleteId)
      .is('deleted_at', null)
      .limit(10)

    if (memberships && memberships.length > 0) {
      const teamIds = memberships.map((m) => m.team_id)

      const allExcludeIds = [athleteId, ...excludeIds]
      let query = supabase
        .from('team_memberships')
        .select('athlete_id, athletes!inner(id, first_name, last_name)')
        .in('team_id', teamIds)
        .is('deleted_at', null)
        .limit(limit)

      // Only apply exclude filter if there are IDs to exclude
      if (allExcludeIds.length > 0) {
        query = query.not('athlete_id', 'in', `(${allExcludeIds.join(',')})`)
      }

      const { data: teammates } = await query

      if (teammates) {
        for (const m of teammates) {
          const athlete = m.athletes as any
          results.push({
            id: athlete.id,
            first_name: athlete.first_name,
            last_name: athlete.last_name,
            source: 'teammate',
          })
        }
      }
    }

    // Add coaches and staff from org
    if (results.length < limit) {
      const orgResults = await getOrgSuggestions(
        orgId,
        excludeIds.concat(results.map((r) => r.id)),
        limit - results.length
      )
      results.push(...orgResults)
    }

    return results
  } catch (err) {
    // On error, fall back to org-level
    console.warn('[taggingService] athlete gallery query failed, falling back to org-level:', err)
    return await getOrgSuggestions(orgId, excludeIds, limit)
  }
}
