/**
 * Ticketing Service
 * 
 * Data access layer for ticketing system (events, tickets, orders, validation)
 */

import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { USE_FAKE_DATA } from '../config'
import type {
  TicketedEvent,
  TicketType,
  TicketOrder,
  TicketOrderItem,
  Ticket,
  SeatMap,
  SeatMapSection,
  SeatMapWithSections,
  BulkSeatConfig,
  SeatAvailabilityMap,
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  ValidateScanRequest,
  ValidateScanResponse,
  StaffLinkExchangeRequest,
  StaffLinkExchangeResponse,
} from '../../types/ticketing'
import { normalizeSupabaseResponse, createServiceResponse } from './responseHelpers'
import { assertNotDemoMode } from '@/utils/demoMode'
import { classifySupabaseError, ValidationError } from '@/utils/supabaseErrorHandler'
import { getLink, RouteKeys } from '@/utils/routes'
import {
  createFakeCheckoutSession,
  createFakeStaffValidationLink,
  getFakeTicketTypesTotalCount,
  getFakeMyTicketOrders,
  getFakeTicketedEvent,
  getFakeTicketedEvents,
  getFakeTicketOrderById,
  getFakeTicketTypes,
  getFakeTicketsForOrder,
} from '../fake/ticketingFakeService'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const FUNCTIONS_URL = `${SUPABASE_URL.replace('/rest/v1', '')}/functions/v1`

// ============================================================================
// Ticketed Events
// ============================================================================

export async function getTicketedEvents(filters?: {
  org_id?: string
  status?: 'published' | 'draft' | 'cancelled' | 'completed'
  upcoming_only?: boolean
}) {
  if (USE_FAKE_DATA) {
    return getFakeTicketedEvents(filters)
  }

  try {
    let query = supabase
      .from('ticketed_events')
      .select('*')
      .order('starts_at', { ascending: true })

    if (filters?.org_id) {
      query = query.eq('org_id', filters.org_id)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.upcoming_only) {
      query = query.gte('starts_at', new Date().toISOString())
    }

    const { data, error } = await query
    if (error) throw error

    return normalizeSupabaseResponse<TicketedEvent[]>(data as unknown as TicketedEvent[], true)
  } catch (error) {
    throw classifySupabaseError(error, 'Ticketed events')
  }
}

/**
 * Get ticketed event by ID (public - requires org_id for isolation)
 * This function MUST be used for public routes to ensure org isolation
 */
export async function getTicketedEventById(id: string, orgId: string) {
  if (!orgId) {
    throw new ValidationError('Organization ID is required for public event queries')
  }

  if (USE_FAKE_DATA) {
    const event = getFakeTicketedEvent(id, orgId)
    if (!event) throw new Error('Ticketed event not found')
    return event
  }

  try {
    const { data, error } = await supabase
      .from('ticketed_events')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId) // CRITICAL: Always filter by org_id for public routes
      .single()

    if (error) throw error

    return normalizeSupabaseResponse<TicketedEvent>(data as unknown as TicketedEvent, false)
  } catch (error) {
    throw classifySupabaseError(error, 'Ticketed event')
  }
}

/**
 * Get ticketed event by ID (public - no org scope)
 * Only returns published events
 */
export async function getPublicTicketedEventById(id: string) {
  if (USE_FAKE_DATA) {
    const event = getFakeTicketedEvent(id, null)
    if (!event || event.status !== 'published') {
      throw new Error('Ticketed event not found')
    }
    return event
  }

  try {
    const { data, error } = await supabase
      .from('ticketed_events')
      .select('*')
      .eq('id', id)
      .eq('status', 'published')
      .single()

    if (error) throw error

    return normalizeSupabaseResponse<TicketedEvent>(data as unknown as TicketedEvent, false)
  } catch (error) {
    throw classifySupabaseError(error, 'Ticketed event')
  }
}

/**
 * Get ticketed event by ID (admin/internal use - no org filter)
 * Only use this when org context is already enforced by RLS or admin context
 */
export async function getTicketedEventByIdAdmin(id: string) {
  if (USE_FAKE_DATA) {
    const event = getFakeTicketedEvent(id, null)
    if (!event) throw new Error('Ticketed event not found')
    return event
  }

  try {
    const { data, error } = await supabase
      .from('ticketed_events')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return normalizeSupabaseResponse<TicketedEvent>(data as unknown as TicketedEvent, false)
  } catch (error) {
    throw classifySupabaseError(error, 'Ticketed event')
  }
}

// ============================================================================
// Ticket Types
// ============================================================================

/**
 * Get ticket types for an event (public - requires org_id for isolation)
 */
export async function getTicketTypesForEvent(ticketedEventId: string, orgId: string) {
  if (!orgId) {
    throw new ValidationError('Organization ID is required for public ticket type queries')
  }

  if (USE_FAKE_DATA) {
    return getFakeTicketTypes(ticketedEventId, orgId)
  }

  try {
    // First verify the event belongs to the org
    const { data: event, error: eventError } = await supabase
      .from('ticketed_events')
      .select('id, org_id')
      .eq('id', ticketedEventId)
      .eq('org_id', orgId)
      .single()

    if (eventError) throw eventError

    if (!event) {
      return normalizeSupabaseResponse<TicketType[]>([], true)
    }

    const { data, error } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('ticketed_event_id', ticketedEventId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error

    return normalizeSupabaseResponse<TicketType[]>(data as unknown as TicketType[], true)
  } catch (error) {
    throw classifySupabaseError(error, 'Ticket types')
  }
}

/**
 * Get ticket types for an event (public - no org scope)
 * Only returns types for published events
 */
export async function getPublicTicketTypesForEvent(ticketedEventId: string) {
  if (USE_FAKE_DATA) {
    return getFakeTicketTypes(ticketedEventId, null)
  }

  try {
    const { data: event, error: eventError } = await supabase
      .from('ticketed_events')
      .select('id, status')
      .eq('id', ticketedEventId)
      .eq('status', 'published')
      .single()

    if (eventError) throw eventError
    if (!event) {
      return normalizeSupabaseResponse<TicketType[]>([], true)
    }

    const { data, error } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('ticketed_event_id', ticketedEventId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error

    return normalizeSupabaseResponse<TicketType[]>(data as unknown as TicketType[], true)
  } catch (error) {
    throw classifySupabaseError(error, 'Ticket types')
  }
}

/**
 * Get ticket types for an event (admin/internal use)
 */
export async function getTicketTypesForEventAdmin(ticketedEventId: string) {
  if (USE_FAKE_DATA) {
    return getFakeTicketTypes(ticketedEventId, null)
  }

  try {
    const { data, error } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('ticketed_event_id', ticketedEventId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error

    return normalizeSupabaseResponse<TicketType[]>(data as unknown as TicketType[], true)
  } catch (error) {
    throw classifySupabaseError(error, 'Ticket types')
  }
}

export async function getTicketTypesTotalCountForEventAdmin(ticketedEventId: string): Promise<number> {
  if (!ticketedEventId) {
    throw new ValidationError('Ticketed event is required')
  }

  if (USE_FAKE_DATA) {
    return getFakeTicketTypesTotalCount(ticketedEventId)
  }

  try {
    const { count, error } = await supabase
      .from('ticket_types')
      .select('id', { head: true, count: 'exact' })
      .eq('ticketed_event_id', ticketedEventId)

    if (error) throw error
    return count ?? 0
  } catch (error) {
    throw classifySupabaseError(error, 'Ticket type count')
  }
}

export async function createStaffValidationLinkForEventAdmin(ticketedEventId: string): Promise<string> {
  if (!ticketedEventId) {
    throw new ValidationError('Ticketed event ID is required to generate a staff link.')
  }

  if (USE_FAKE_DATA) {
    return createFakeStaffValidationLink(ticketedEventId)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new ValidationError('Permission denied')
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (userError) {
    throw classifySupabaseError(userError, 'Staff link generation')
  }

  if (!userData?.org_id) {
    throw new ValidationError('Permission denied')
  }

  const array = new Uint8Array(32)
  window.crypto.getRandomValues(array)
  const token = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
  const tokenHash = await hashToken(token)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { error } = await supabase.from('ticket_staff_links').insert({
    org_id: userData.org_id,
    ticketed_event_id: ticketedEventId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
    created_by_user_id: user.id,
  })

  if (error) {
    throw classifySupabaseError(error, 'Staff link generation')
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const validatePath = getLink(RouteKeys.PORTAL_TICKET_VALIDATE, { token })
  return `${baseUrl}${validatePath}`
}

export interface TicketTypeSortMetrics {
  activeCount: number
  totalCount: number
  nextSortOrder: number
}

export async function getTicketTypeSortMetricsForEventAdmin(ticketedEventId: string): Promise<TicketTypeSortMetrics> {
  if (!ticketedEventId) {
    throw new ValidationError('Ticketed event is required')
  }

  if (USE_FAKE_DATA) {
    const fakeTypes = getFakeTicketTypes(ticketedEventId, null)
    const maxSortOrder = fakeTypes.reduce(
      (maxValue, ticketType) => (ticketType.sort_order > maxValue ? ticketType.sort_order : maxValue),
      -1,
    )
    return {
      activeCount: fakeTypes.length,
      totalCount: fakeTypes.length,
      nextSortOrder: maxSortOrder + 1,
    }
  }

  try {
    const supabaseAny = supabase as any
    const { data, error } = await supabaseAny
      .from('ticket_types')
      .select('is_active, sort_order')
      .eq('ticketed_event_id', ticketedEventId)

    if (error) throw error

    const rows = (data ?? []) as Array<{ is_active: boolean | null; sort_order: number | null }>
    const activeCount = rows.filter((row) => row.is_active !== false).length
    const maxSortOrder = rows.reduce((maxValue, row) => {
      if (typeof row.sort_order !== 'number') {
        return maxValue
      }
      return row.sort_order > maxValue ? row.sort_order : maxValue
    }, -1)

    return {
      activeCount,
      totalCount: rows.length,
      nextSortOrder: maxSortOrder + 1,
    }
  } catch (error) {
    throw classifySupabaseError(error, 'Ticket type metrics')
  }
}

export async function createTicketType(
  insert: Database['public']['Tables']['ticket_types']['Insert'],
) {
  try {
    assertNotDemoMode('create ticket types')

    const { data, error } = await supabase
      .from('ticket_types')
      .insert(insert)
      .select('*')
      .single()

    if (error) {
      return createServiceResponse<TicketType>(null, error)
    }

    return createServiceResponse<TicketType>(data as unknown as TicketType, null)
  } catch (error: unknown) {
    return createServiceResponse<TicketType>(null, error as Error)
  }
}

export async function getSeatMapsForEvent(ticketedEventId: string): Promise<SeatMap[]> {
  if (!ticketedEventId) {
    throw new ValidationError('Ticketed event is required')
  }

  try {
    const supabaseAny = supabase as any
    const { data, error } = await supabaseAny
      .from('seat_maps')
      .select('*')
      .eq('ticketed_event_id', ticketedEventId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return normalizeSupabaseResponse<SeatMap[]>(data as unknown as SeatMap[], true)
  } catch (error) {
    throw classifySupabaseError(error, 'Seat maps')
  }
}

export interface ReservedCapacitySnapshot {
  capacityTotal: number
  capacityRemaining: number
}

export async function getReservedCapacitySnapshot(seatMapId: string): Promise<ReservedCapacitySnapshot> {
  if (!seatMapId) {
    throw new ValidationError('Seat map is required')
  }

  try {
    const supabaseAny = supabase as any

    const { count: totalAvailableCount, error: totalAvailableError } = await supabaseAny
      .from('seat_map_sections')
      .select('id', { count: 'exact', head: true })
      .eq('seat_map_id', seatMapId)
      .eq('is_available', true)

    if (totalAvailableError) throw totalAvailableError

    const { count: soldCount, error: soldError } = await supabaseAny
      .from('seat_assignments')
      .select('id, seat_map_sections!inner(seat_map_id)', { count: 'exact', head: true })
      .eq('seat_map_sections.seat_map_id', seatMapId)

    if (soldError) throw soldError

    const capacityTotal = totalAvailableCount ?? 0
    const sold = soldCount ?? 0

    return {
      capacityTotal,
      capacityRemaining: Math.max(capacityTotal - sold, 0),
    }
  } catch (error) {
    throw classifySupabaseError(error, 'Reserved capacity')
  }
}

export async function createSeatMap(ticketedEventId: string, name: string): Promise<SeatMap> {
  if (!ticketedEventId) {
    throw new ValidationError('Ticketed event is required')
  }

  if (!name.trim()) {
    throw new ValidationError('Seat map name is required')
  }

  try {
    const supabaseAny = supabase as any
    const { data, error } = await supabaseAny
      .from('seat_maps')
      .insert({
        ticketed_event_id: ticketedEventId,
        name: name.trim(),
      })
      .select('*')
      .single()

    if (error) throw error

    return normalizeSupabaseResponse<SeatMap>(data as unknown as SeatMap, false)
  } catch (error) {
    throw classifySupabaseError(error, 'Create seat map')
  }
}

export async function updateSeatMap(
  seatMapId: string,
  updates: Partial<Pick<SeatMap, 'name' | 'chart_image_url' | 'metadata'>>,
): Promise<void> {
  if (!seatMapId) {
    throw new ValidationError('Seat map is required')
  }

  try {
    const supabaseAny = supabase as any
    const payload: Record<string, unknown> = {}
    if (updates.name !== undefined) payload.name = updates.name
    if (updates.chart_image_url !== undefined) payload.chart_image_url = updates.chart_image_url
    if (updates.metadata !== undefined) payload.metadata = updates.metadata

    if (Object.keys(payload).length === 0) {
      return
    }

    const { error } = await supabaseAny
      .from('seat_maps')
      .update(payload)
      .eq('id', seatMapId)

    if (error) throw error
  } catch (error) {
    throw classifySupabaseError(error, 'Update seat map')
  }
}

export async function uploadSeatMapChart(seatMapId: string, file: File): Promise<string> {
  if (!seatMapId) {
    throw new ValidationError('Seat map is required')
  }

  if (!file) {
    throw new ValidationError('Chart file is required')
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new ValidationError('Seating chart must be 5MB or smaller')
  }

  try {
    const supabaseAny = supabase as any
    const safeFileName = file.name.replace(/\s+/g, '-').replace(/\//g, '-')
    const timestampedFileName = `${Date.now()}-${safeFileName}`
    const bucket = 'ticketing-seat-maps'

    let orgId: string | null = null
    const { data: seatMapRecord, error: seatMapError } = await supabaseAny
      .from('seat_maps')
      .select('ticketed_event_id')
      .eq('id', seatMapId)
      .maybeSingle()

    if (!seatMapError && seatMapRecord?.ticketed_event_id) {
      const { data: ticketedEventRecord, error: ticketedEventError } = await supabaseAny
        .from('ticketed_events')
        .select('org_id')
        .eq('id', seatMapRecord.ticketed_event_id)
        .maybeSingle()

      if (!ticketedEventError && ticketedEventRecord?.org_id) {
        orgId = ticketedEventRecord.org_id
      }
    }

    const pathCandidates = [
      orgId ? `${orgId}/${seatMapId}/${timestampedFileName}` : null,
      `${seatMapId}/${timestampedFileName}`,
    ].filter((candidate): candidate is string => Boolean(candidate))

    let uploadedPath: string | null = null
    let lastUploadError: any = null

    for (const candidatePath of pathCandidates) {
      const { error: uploadError } = await supabaseAny.storage
        .from(bucket)
        .upload(candidatePath, file, { upsert: true, contentType: file.type || 'image/jpeg' })

      if (!uploadError) {
        uploadedPath = candidatePath
        break
      }

      lastUploadError = uploadError
    }

    if (!uploadedPath) {
      throw lastUploadError ?? new Error('Seat map chart upload failed')
    }

    const { data: urlData } = supabaseAny.storage.from(bucket).getPublicUrl(uploadedPath)
    const publicUrl = urlData.publicUrl

    const { error: updateError } = await supabaseAny
      .from('seat_maps')
      .update({ chart_image_url: publicUrl })
      .eq('id', seatMapId)

    if (updateError) throw updateError

    return publicUrl
  } catch (error) {
    throw classifySupabaseError(error, 'Upload seat map chart')
  }
}

export async function bulkAddSeats(seatMapId: string, config: BulkSeatConfig): Promise<number> {
  if (!seatMapId) {
    throw new ValidationError('Seat map is required')
  }

  const rowStart = Number(config.row_start)
  const rowEnd = Number(config.row_end)
  const seatStart = Number(config.seat_start)
  const seatEnd = Number(config.seat_end)
  const sectionName = config.section_name?.trim()

  if (!sectionName) {
    throw new ValidationError('Section name is required')
  }
  if (Number.isNaN(rowStart) || Number.isNaN(rowEnd) || rowEnd < rowStart) {
    throw new ValidationError('Row range is invalid')
  }
  if (Number.isNaN(seatStart) || Number.isNaN(seatEnd) || seatEnd < seatStart) {
    throw new ValidationError('Seat range is invalid')
  }

  const rowCount = rowEnd - rowStart + 1
  const seatCount = seatEnd - seatStart + 1
  const totalSeats = rowCount * seatCount

  if (totalSeats > 5000) {
    throw new ValidationError('Bulk add supports up to 5000 seats per operation')
  }

  const rows: Array<{
    seat_map_id: string
    section_name: string
    row_identifier: string
    seat_identifier: string
    seat_attributes: Record<string, unknown>
    is_available: boolean
  }> = []

  for (let row = rowStart; row <= rowEnd; row += 1) {
    for (let seat = seatStart; seat <= seatEnd; seat += 1) {
      rows.push({
        seat_map_id: seatMapId,
        section_name: sectionName,
        row_identifier: String(row),
        seat_identifier: String(seat),
        seat_attributes: (config.seat_attributes ?? {}) as Record<string, unknown>,
        is_available: true,
      })
    }
  }

  try {
    const supabaseAny = supabase as any
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100)
      let lastError: any = null

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const { error } = await supabaseAny.from('seat_map_sections').insert(chunk)
          if (!error) {
            lastError = null
            break
          }

          const status = Number((error as any)?.status ?? 0)
          const message = String((error as any)?.message ?? '').toLowerCase()
          const retryable = status >= 500 || message.includes('gateway') || message.includes('cors') || message.includes('failed to fetch') || message.includes('network')
          lastError = error

          if (!retryable || attempt === 2) {
            break
          }
        } catch (error: any) {
          const message = String(error?.message ?? '').toLowerCase()
          const retryable = message.includes('failed to fetch') || message.includes('network') || message.includes('cors') || message.includes('gateway')
          lastError = error

          if (!retryable || attempt === 2) {
            break
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)))
      }

      if (lastError) {
        throw lastError
      }
    }
    return rows.length
  } catch (error) {
    throw classifySupabaseError(error, 'Bulk add seats')
  }
}

export async function importSeatRows(
  seatMapId: string,
  rows: Array<{
    section: string
    row: string
    seat: string
    seat_attributes?: Record<string, unknown>
  }>,
): Promise<number> {
  if (!seatMapId) {
    throw new ValidationError('Seat map is required')
  }

  if (rows.length === 0) {
    return 0
  }

  const inserts = rows.map((row) => ({
    seat_map_id: seatMapId,
    section_name: row.section.trim(),
    row_identifier: row.row.trim(),
    seat_identifier: row.seat.trim(),
    seat_attributes: row.seat_attributes ?? {},
    is_available: true,
  }))

  try {
    const supabaseAny = supabase as any
    for (let i = 0; i < inserts.length; i += 100) {
      const chunk = inserts.slice(i, i + 100)
      let lastError: any = null

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const { error } = await supabaseAny.from('seat_map_sections').insert(chunk)
          if (!error) {
            lastError = null
            break
          }

          const status = Number((error as any)?.status ?? 0)
          const message = String((error as any)?.message ?? '').toLowerCase()
          const retryable = status >= 500 || message.includes('gateway') || message.includes('cors') || message.includes('failed to fetch') || message.includes('network')
          lastError = error

          if (!retryable || attempt === 2) {
            break
          }
        } catch (error: any) {
          const message = String(error?.message ?? '').toLowerCase()
          const retryable = message.includes('failed to fetch') || message.includes('network') || message.includes('cors') || message.includes('gateway')
          lastError = error

          if (!retryable || attempt === 2) {
            break
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)))
      }

      if (lastError) {
        throw lastError
      }
    }
    return inserts.length
  } catch (error) {
    throw classifySupabaseError(error, 'Import seats')
  }
}

export async function updateSeat(sectionId: string, updates: Partial<SeatMapSection>): Promise<void> {
  if (!sectionId) {
    throw new ValidationError('Seat section is required')
  }

  try {
    const supabaseAny = supabase as any
    const { error } = await supabaseAny
      .from('seat_map_sections')
      .update({
        section_name: updates.section_name,
        row_identifier: updates.row_identifier,
        seat_identifier: updates.seat_identifier,
        seat_attributes: updates.seat_attributes,
        is_available: updates.is_available,
        position_metadata: updates.position_metadata,
      })
      .eq('id', sectionId)

    if (error) throw error
  } catch (error) {
    throw classifySupabaseError(error, 'Update seat')
  }
}

export async function deleteSeat(sectionId: string): Promise<void> {
  if (!sectionId) {
    throw new ValidationError('Seat section is required')
  }

  try {
    const supabaseAny = supabase as any
    const { count, error: assignmentError } = await supabaseAny
      .from('seat_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('seat_map_section_id', sectionId)

    if (assignmentError) throw assignmentError

    if ((count ?? 0) > 0) {
      throw new ValidationError('Cannot delete a seat that is already assigned')
    }

    const { error } = await supabaseAny
      .from('seat_map_sections')
      .delete()
      .eq('id', sectionId)

    if (error) throw error
  } catch (error) {
    throw classifySupabaseError(error, 'Delete seat')
  }
}

export async function getSeatMapWithSeats(seatMapId: string): Promise<SeatMapWithSections> {
  if (!seatMapId) {
    throw new ValidationError('Seat map is required')
  }

  try {
    const supabaseAny = supabase as any
    const [{ data: seatMap, error: mapError }, { data: sections, error: sectionError }] = await Promise.all([
      supabaseAny.from('seat_maps').select('*').eq('id', seatMapId).single(),
      supabaseAny
        .from('seat_map_sections')
        .select('*')
        .eq('seat_map_id', seatMapId)
        .order('section_name', { ascending: true })
        .order('row_identifier', { ascending: true })
        .order('seat_identifier', { ascending: true }),
    ])

    if (mapError) throw mapError
    if (sectionError) throw sectionError

    const seatMapData = normalizeSupabaseResponse<SeatMap>(seatMap as unknown as SeatMap, false)
    const sectionData = normalizeSupabaseResponse<SeatMapSection[]>(sections as unknown as SeatMapSection[], true)

    return {
      ...seatMapData,
      sections: sectionData,
    }
  } catch (error) {
    throw classifySupabaseError(error, 'Seat map')
  }
}

export async function getSeatAvailability(ticketTypeId: string): Promise<SeatAvailabilityMap> {
  if (!ticketTypeId) {
    throw new ValidationError('Ticket type is required')
  }

  try {
    const supabaseAny = supabase as any
    const { data: ticketType, error: ticketTypeError } = await supabaseAny
      .from('ticket_types')
      .select('seat_map_id')
      .eq('id', ticketTypeId)
      .single()

    if (ticketTypeError) throw ticketTypeError

    const seatMapId = ticketType?.seat_map_id as string | null
    if (!seatMapId) {
      return {}
    }

    const { data: seats, error: seatsError } = await supabaseAny
      .from('seat_map_sections')
      .select('id, section_name, row_identifier, seat_identifier, seat_attributes')
      .eq('seat_map_id', seatMapId)
      .eq('is_available', true)

    if (seatsError) throw seatsError

    const seatRows = (seats ?? []) as Array<{
      id: string
      section_name: string
      row_identifier: string
      seat_identifier: string
      seat_attributes: Record<string, unknown> | null
    }>
    if (seatRows.length === 0) {
      return {}
    }

    const seatIds = seatRows.map((seat) => seat.id)
    const nowIso = new Date().toISOString()

    const [{ data: assignments, error: assignmentError }, { data: holds, error: holdsError }] = await Promise.all([
      supabaseAny
        .from('seat_assignments')
        .select('seat_map_section_id')
        .in('seat_map_section_id', seatIds),
      supabaseAny
        .from('seat_holds')
        .select('seat_map_section_id')
        .in('seat_map_section_id', seatIds)
        .gt('expires_at', nowIso),
    ])

    if (assignmentError) throw assignmentError
    if (holdsError) throw holdsError

    const assignedIds = new Set((assignments ?? []).map((row: any) => row.seat_map_section_id as string))
    const heldIds = new Set((holds ?? []).map((row: any) => row.seat_map_section_id as string))

    const availability: SeatAvailabilityMap = {}
    for (const seat of seatRows) {
      const available = !assignedIds.has(seat.id) && !heldIds.has(seat.id)
      availability[seat.id] = {
        available,
        attributes: (seat.seat_attributes ?? {}) as Record<string, unknown>,
        section: seat.section_name,
        row: seat.row_identifier,
        seat: seat.seat_identifier,
      }
    }

    return availability
  } catch (error) {
    throw classifySupabaseError(error, 'Seat availability')
  }
}

// ============================================================================
// Ticket Orders
// ============================================================================

/**
 * Get ticket order by ID (public - requires org_id for isolation)
 */
export async function getTicketOrderById(orderId: string, orgId: string) {
  if (!orgId) {
    throw new ValidationError('Organization ID is required for public order queries')
  }

  if (USE_FAKE_DATA) {
    const order = getFakeTicketOrderById(orderId, orgId)
    if (!order) throw new Error('Order not found')
    return order
  }

  try {
    const { data, error } = await supabase
      .from('ticket_orders')
      .select(`
        *,
        ticket_order_items (
          *,
          ticket_types (
            name,
            description
          )
        ),
        ticketed_events (
          id,
          title,
          starts_at,
          ends_at,
          venue_name,
          venue_city,
          venue_state
        )
      `)
      .eq('id', orderId)
      .eq('org_id', orgId) // CRITICAL: Always filter by org_id for public routes
      .single()

    if (error) throw error

    return normalizeSupabaseResponse<TicketOrder & {
      ticket_order_items: Array<TicketOrderItem & {
        ticket_types: Pick<TicketType, 'name' | 'description'>
      }>
      ticketed_events: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
    }>(data as unknown as (TicketOrder & {
      ticket_order_items: Array<TicketOrderItem & {
        ticket_types: Pick<TicketType, 'name' | 'description'>
      }>
      ticketed_events: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
    }), false)
  } catch (error) {
    throw classifySupabaseError(error, 'Ticket order')
  }
}

/**
 * Get ticket order by ID (public - no org scope)
 */
export async function getPublicTicketOrderById(orderId: string) {
  if (USE_FAKE_DATA) {
    const order = getFakeTicketOrderById(orderId, null)
    if (!order) throw new Error('Order not found')
    return order
  }

  try {
    const { data, error } = await supabase
      .from('ticket_orders')
      .select(`
        *,
        ticket_order_items (
          *,
          ticket_types (
            name,
            description
          )
        ),
        ticketed_events (
          id,
          title,
          starts_at,
          ends_at,
          venue_name,
          venue_city,
          venue_state
        )
      `)
      .eq('id', orderId)
      .single()

    if (error) throw error

    return normalizeSupabaseResponse<TicketOrder & {
      ticket_order_items: Array<TicketOrderItem & {
        ticket_types: Pick<TicketType, 'name' | 'description'>
      }>
      ticketed_events: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
    }>(data as unknown as (TicketOrder & {
      ticket_order_items: Array<TicketOrderItem & {
        ticket_types: Pick<TicketType, 'name' | 'description'>
      }>
      ticketed_events: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
    }), false)
  } catch (error) {
    throw classifySupabaseError(error, 'Ticket order')
  }
}

/**
 * Public order access response type
 */
export interface PublicOrderResponse {
  order: {
    id: string
    status: string
    total_cents: number
    purchaser_name: string
    purchaser_email: string
    created_at: string
    items: Array<{
      id: string
      quantity: number
      unit_price_cents: number
      subtotal_cents: number
      ticket_types: Pick<TicketType, 'id' | 'name' | 'description'>
    }>
    event: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
  }
  tickets: Array<{
    id: string
    entry_code: string
    status: string
    used_at: string | null
    ticket_type: Pick<TicketType, 'id' | 'name' | 'description'>
    event: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
  }>
}

/**
 * Get ticket order by ID (public - via edge function, no auth required)
 * Uses order ID as implicit authentication (UUID is unguessable)
 * Expires day after the event
 */
export async function getPublicOrderWithTickets(orderId: string, orgId?: string): Promise<PublicOrderResponse> {
  try {
    const response = await fetch(`${FUNCTIONS_URL}/tickets-get-order-public`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ order_id: orderId, org_id: orgId }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to fetch order')
    }

    return await response.json()
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch order')
  }
}

/**
 * Get ticket order by ID (admin/internal use)
 */
export async function getTicketOrderByIdAdmin(orderId: string) {
  if (USE_FAKE_DATA) {
    const order = getFakeTicketOrderById(orderId, null)
    if (!order) throw new Error('Order not found')
    return order
  }

  const { data } = await supabase
    .from('ticket_orders')
    .select(`
      *,
      ticket_order_items (
        *,
        ticket_types (
          name,
          description
        )
      ),
      ticketed_events (
        id,
        title,
        starts_at,
        ends_at,
        venue_name,
        venue_city,
        venue_state
      )
    `)
    .eq('id', orderId)
    .single()

  return normalizeSupabaseResponse<TicketOrder & {
    ticket_order_items: Array<TicketOrderItem & {
      ticket_types: Pick<TicketType, 'name' | 'description'>
    }>
    ticketed_events: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
  }>(data as unknown as (TicketOrder & {
    ticket_order_items: Array<TicketOrderItem & {
      ticket_types: Pick<TicketType, 'name' | 'description'>
    }>
    ticketed_events: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
  }), false)
}

// Note: getTicketOrderByIdAdmin uses SELECT * which includes all columns including Connect fields
// (stripe_connect_account_id, platform_fee_cents, org_revenue_cents, stripe_charge_id, stripe_application_fee_id, processed_at)

export async function getMyTicketOrders() {
  if (USE_FAKE_DATA) {
    return createServiceResponse<TicketOrder[]>(getFakeMyTicketOrders(), null)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return createServiceResponse<TicketOrder[]>(null, new Error('Not authenticated'))
  }

  // Get user email
  const { data: userData } = await supabase
    .from('users')
    .select('email')
    .eq('id', user.id)
    .single()

  const { data } = await supabase
    .from('ticket_orders')
    .select('*')
    .or(`purchaser_user_id.eq.${user.id}${userData?.email ? `,purchaser_email.eq.${userData.email}` : ''}`)
    .order('created_at', { ascending: false })

  return normalizeSupabaseResponse<TicketOrder[]>(data as unknown as TicketOrder[], true)
}

// ============================================================================
// Tickets
// ============================================================================

export async function getTicketsForOrder(orderId: string) {
  if (USE_FAKE_DATA) {
    return getFakeTicketsForOrder(orderId)
  }

  try {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        ticket_types (
          name,
          description
        ),
        ticketed_events (
          id,
          title,
          starts_at,
          ends_at,
          venue_name,
          venue_city,
          venue_state
        ),
        ticket_orders (
          purchaser_email
        )
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    if (error) throw error

    const tickets = normalizeSupabaseResponse<Array<Ticket & {
      ticket_types: Pick<TicketType, 'name' | 'description'>
      ticketed_events: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
      ticket_orders: { purchaser_email: string }
    }>>(data as unknown as Array<Ticket & {
      ticket_types: Pick<TicketType, 'name' | 'description'>
      ticketed_events: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
      ticket_orders: { purchaser_email: string }
    }>, true)

    const seatAssignmentIds = tickets
      .map((ticket) => ticket.seat_assignment_id)
      .filter((id): id is string => Boolean(id))

    if (seatAssignmentIds.length === 0) {
      return tickets
    }

    const supabaseAny = supabase as any
    const { data: seatAssignments, error: seatAssignmentError } = await supabaseAny
      .from('seat_assignments')
      .select(`
        id,
        seat_map_sections (
          section_name,
          row_identifier,
          seat_identifier,
          seat_attributes
        )
      `)
      .in('id', seatAssignmentIds)

    if (seatAssignmentError) throw seatAssignmentError

    const seatInfoByAssignmentId = new Map<string, {
      section: string
      row: string
      seat: string
      attributes?: Record<string, unknown>
    }>()

    for (const row of seatAssignments ?? []) {
      const section = (row as any).seat_map_sections
      if (!section) {
        continue
      }
      seatInfoByAssignmentId.set((row as any).id, {
        section: section.section_name,
        row: section.row_identifier,
        seat: section.seat_identifier,
        attributes: section.seat_attributes ?? undefined,
      })
    }

    return tickets.map((ticket) => {
      if (!ticket.seat_assignment_id) {
        return ticket
      }

      const seatInfo = seatInfoByAssignmentId.get(ticket.seat_assignment_id) ?? null
      return {
        ...ticket,
        seat_info: seatInfo,
      }
    })
  } catch (error) {
    throw classifySupabaseError(error, 'Tickets')
  }
}

/**
 * Get tickets by access token (public - requires org_id for isolation)
 * Magic links are org-scoped, so we verify the order belongs to the org
 */
export async function getTicketsByAccessToken(token: string, orgId: string) {
  if (!orgId) {
    throw new ValidationError('Organization ID is required for public ticket access queries')
  }

  if (USE_FAKE_DATA) {
    const tickets = getFakeTicketsForOrder(token)
    if (tickets.length === 0 || tickets[0].org_id !== orgId) {
      throw new Error('Invalid access token')
    }
    return tickets
  }

  // Hash token and lookup access link
  const tokenHash = await hashToken(token)

  const { data: accessLink } = await supabase
    .from('ticket_access_links')
    .select(`
      order_id, 
      expires_at, 
      used_at,
      ticket_orders!inner(org_id)
    `)
    .eq('token_hash', tokenHash)
    .eq('ticket_orders.org_id', orgId) // CRITICAL: Verify order belongs to org
    .single()

  if (!accessLink) {
    return createServiceResponse<Array<Ticket & {
      ticket_types: Pick<TicketType, 'name' | 'description'>
      ticketed_events: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
    }>>(null, new Error('Invalid access token'))
  }

  if (new Date(accessLink.expires_at) < new Date()) {
    return createServiceResponse<Array<Ticket & {
      ticket_types: Pick<TicketType, 'name' | 'description'>
      ticketed_events: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
    }>>(null, new Error('Access token expired'))
  }

  return getTicketsForOrder(accessLink.order_id)
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ============================================================================
// Ticket Access Link Decryption
// ============================================================================

export interface DecryptAccessLinkResponse {
  id: string
  entry_code: string
  qr_token: string
  status: string
  ticket_type_name: string
  event_id: string
  event_name: string
  event_date: string
  event_location: string
  purchaser_name: string
  purchaser_email: string
}

export async function decryptTicketAccessLink(
  encryptedPayload: string,
): Promise<{ data: DecryptAccessLinkResponse | null; error: Error | null }> {
  try {
    const response = await fetch(`${FUNCTIONS_URL}/tickets-decrypt-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payload: encryptedPayload }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return createServiceResponse<DecryptAccessLinkResponse>(
        null,
        new Error(errorData.error || 'Failed to decrypt access link')
      )
    }

    const data = await response.json()
    return createServiceResponse<DecryptAccessLinkResponse>(data, null)
  } catch (error: any) {
    return createServiceResponse<DecryptAccessLinkResponse>(null, error)
  }
}

// ============================================================================
// Checkout
// ============================================================================

export async function createCheckoutSession(
  request: CreateCheckoutRequest,
): Promise<{ data: CreateCheckoutResponse | null; error: Error | null }> {
  try {
    if (!request.ticketed_event_id) {
      return createServiceResponse<CreateCheckoutResponse>(null, new ValidationError('Event is required'))
    }
    if (!request.items?.length) {
      return createServiceResponse<CreateCheckoutResponse>(null, new ValidationError('Select at least one ticket'))
    }
    const email = request.purchaser_email?.trim() || ''
    if (!email) {
      return createServiceResponse<CreateCheckoutResponse>(null, new ValidationError('Email is required'))
    }
    if (request.items.some(item => !item.ticket_type_id || item.quantity <= 0)) {
      return createServiceResponse<CreateCheckoutResponse>(null, new ValidationError('Ticket quantities must be greater than zero'))
    }

    if (USE_FAKE_DATA) {
      return createFakeCheckoutSession(request)
    }

    // Always include return_base_url when window is available (T3)
    const requestWithBaseUrl: CreateCheckoutRequest = {
      ...request,
      return_base_url: typeof window !== 'undefined' ? window.location.origin : request.return_base_url,
    }
    const session = await supabase.auth.getSession()
    const accessToken = session.data.session?.access_token
    const response = await fetch(`${FUNCTIONS_URL}/tickets-create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(requestWithBaseUrl),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return createServiceResponse<CreateCheckoutResponse>(null, new Error(errorData.error || 'Failed to create checkout'))
    }

    const data = await response.json()
    return createServiceResponse<CreateCheckoutResponse>(data, null)
  } catch (error: any) {
    return createServiceResponse<CreateCheckoutResponse>(null, error)
  }
}

// ============================================================================
// Validation
// ============================================================================

export async function validateTicketScan(
  request: ValidateScanRequest,
  staffLinkToken?: string,
): Promise<{ data: ValidateScanResponse | null; error: Error | null }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (staffLinkToken) {
      headers['X-Staff-Link-Token'] = staffLinkToken
    } else {
      const session = await supabase.auth.getSession()
      if (session.data.session?.access_token) {
        headers['Authorization'] = `Bearer ${session.data.session.access_token}`
      }
    }

    const response = await fetch(`${FUNCTIONS_URL}/tickets-validate-scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return createServiceResponse<ValidateScanResponse>(null, new Error(errorData.error || 'Validation failed'))
    }

    const data = await response.json()
    return createServiceResponse<ValidateScanResponse>(data, null)
  } catch (error: any) {
    return createServiceResponse<ValidateScanResponse>(null, error)
  }
}

// ============================================================================
// Staff Link Exchange
// ============================================================================

// ============================================================================
// Resend Tickets
// ============================================================================

export interface ResendTicketsRequest {
  order_id: string
  email: string
}

export interface ResendTicketsResponse {
  success: boolean
  message: string
  tickets_resent: number
}

export async function resendTickets(
  request: ResendTicketsRequest,
): Promise<{ data: ResendTicketsResponse | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    try {
      // Import dynamically to avoid circular dependencies if any, or just use what we have
      const result = await import('../fake/ticketingFakeService').then(m => m.resendFakeTickets(request.order_id, request.email))
      return createServiceResponse<ResendTicketsResponse>(result, null)
    } catch (error: any) {
      return createServiceResponse<ResendTicketsResponse>(null, error)
    }
  }

  try {
    const response = await fetch(`${FUNCTIONS_URL}/resend-tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return createServiceResponse<ResendTicketsResponse>(
        null,
        new Error(errorData.error || 'Failed to resend tickets')
      )
    }

    const data = await response.json()
    return createServiceResponse<ResendTicketsResponse>(data, null)
  } catch (error: any) {
    return createServiceResponse<ResendTicketsResponse>(null, error)
  }
}

// ============================================================================
// Staff Link Exchange
// ============================================================================

// ============================================================================
// Comp Ticket Generation
// ============================================================================

export interface GenerateCompTicketsRequest {
  event_id: string
  ticket_type_id: string
  quantity: number
  recipient_email: string
  recipient_name?: string
  notes?: string
}

export interface GenerateCompTicketsResponse {
  success: boolean
  order_id: string
  tickets_created: number
  message: string
}

export async function generateCompTickets(
  request: GenerateCompTicketsRequest,
): Promise<{ data: GenerateCompTicketsResponse | null; error: Error | null }> {
  try {
    const session = await supabase.auth.getSession()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (session.data.session?.access_token) {
      headers['Authorization'] = `Bearer ${session.data.session.access_token}`
    }

    const response = await fetch(`${FUNCTIONS_URL}/generate-comp-tickets`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return createServiceResponse<GenerateCompTicketsResponse>(
        null,
        new Error(errorData.error || 'Failed to generate comp tickets')
      )
    }

    const data = await response.json()
    return createServiceResponse<GenerateCompTicketsResponse>(data, null)
  } catch (error: any) {
    return createServiceResponse<GenerateCompTicketsResponse>(null, error)
  }
}

// ============================================================================
// Staff Link Exchange
// ============================================================================

export async function exchangeStaffLink(
  request: StaffLinkExchangeRequest,
): Promise<{ data: StaffLinkExchangeResponse | null; error: Error | null }> {
  try {
    const response = await fetch(`${FUNCTIONS_URL}/tickets-staff-link-exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return createServiceResponse<StaffLinkExchangeResponse>(null, new Error(errorData.error || 'Invalid staff link'))
    }

    const data = await response.json()
    return createServiceResponse<StaffLinkExchangeResponse>(data, null)
  } catch (error: any) {
    return createServiceResponse<StaffLinkExchangeResponse>(null, error)
  }
}

// ============================================================================
// Refunds
// ============================================================================

export async function processTicketOrderRefund(
  orderId: string,
  amountCents?: number,
): Promise<{ data: { refund_id: string; amount: number; status: string; message: string } | null; error: Error | null }> {
  try {
    const session = await supabase.auth.getSession()
    const response = await fetch(`${FUNCTIONS_URL}/tickets-process-refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.data.session?.access_token || ''}`,
      },
      body: JSON.stringify({
        order_id: orderId,
        ...(amountCents !== undefined ? { amount_cents: amountCents } : {}),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return createServiceResponse<{ refund_id: string; amount: number; status: string; message: string }>(
        null,
        new Error(errorData.error || 'Failed to process refund')
      )
    }

    const data = await response.json()
    return createServiceResponse<{ refund_id: string; amount: number; status: string; message: string }>(data, null)
  } catch (error: any) {
    return createServiceResponse<{ refund_id: string; amount: number; status: string; message: string }>(null, error)
  }
}

/**
 * Manually complete a stuck ticket order
 * Used when webhook fails and order is stuck in pending_payment
 */
export async function manuallyCompleteTicketOrder(
  orderId: string,
): Promise<{ data: { success: boolean; message: string; tickets_created: number } | null; error: Error | null }> {
  try {
    const session = await supabase.auth.getSession()
    const response = await fetch(`${FUNCTIONS_URL}/tickets-manual-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.data.session?.access_token || ''}`,
      },
      body: JSON.stringify({ order_id: orderId }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return createServiceResponse<{ success: boolean; message: string; tickets_created: number }>(
        null,
        new Error(errorData.error || 'Failed to complete order')
      )
    }

    const data = await response.json()
    return createServiceResponse<{ success: boolean; message: string; tickets_created: number }>(data, null)
  } catch (error: any) {
    return createServiceResponse<{ success: boolean; message: string; tickets_created: number }>(null, error)
  }
}
