/**
 * Contact Submissions Service
 * 
 * Provides CRUD operations for contact form submissions.
 * Used by platform admin to view and manage submissions.
 */

import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA } from '../config'
import { debug } from '../../lib/debug'
import type { ContactSurface } from '../../types/contact'
import { createServiceResponse, normalizeSupabaseResponse } from './responseHelpers'
import { classifySupabaseError } from '../../utils/supabaseErrorHandler'
import type { ServiceResponse } from './responseHelpers'

// ============================================================================
// Types
// ============================================================================

export interface ContactSubmission {
  id: string
  surface: ContactSurface
  subject_enum: string
  subject_label: string
  message: string
  submitted_at: string
  
  // User identity
  user_id: string | null
  email: string | null
  name: string | null
  role_context: 'guardian' | 'coach' | 'org_admin' | 'public' | null
  org_id: string | null
  org_name: string | null
  team_ids: string[]
  athlete_ids: string[]
  
  // Client metadata
  app_version: string | null
  environment: 'dev' | 'staging' | 'prod' | null
  page_url: string | null
  route_path: string | null
  user_agent: string | null
  timezone: string | null
  locale: string | null
  theme: 'light' | 'dark' | null
  active_org_id: string | null
  active_role: string | null
  
  // Diagnostics
  feature_flags_snapshot: Record<string, boolean> | null
  
  // Webhook tracking
  webhook_url: string | null
  webhook_success: boolean
  webhook_response_status: number | null
  webhook_error_message: string | null
  webhook_sent_at: string | null
  
  // Admin tracking
  viewed_by_platform_admin_id: string | null
  viewed_at: string | null
  status: 'new' | 'in_progress' | 'resolved' | 'closed'
  admin_notes: string | null
  
  created_at: string
  updated_at: string
}

export interface ContactSubmissionFilters {
  surface?: ContactSurface
  status?: ContactSubmission['status']
  user_id?: string
  org_id?: string
  search?: string
  date_from?: string
  date_to?: string
}

export interface ContactSubmissionUpdate {
  status?: ContactSubmission['status']
  admin_notes?: string
  viewed_by_platform_admin_id?: string | null
  viewed_at?: string | null
}

// ============================================================================
// Mock Data (for demo mode)
// ============================================================================

function generateMockSubmissions(): ContactSubmission[] {
  const surfaces: ContactSurface[] = ['help', 'portal', 'admin']
  const statuses: ContactSubmission['status'][] = ['new', 'in_progress', 'resolved', 'closed']
  const subjects = {
    help: ['general_question', 'account_help', 'billing_question', 'bug_report'],
    portal: ['schedule_question', 'payments_question', 'roster_question', 'bug_report'],
    admin: ['onboarding_help', 'billing_and_license', 'rls_or_permissions', 'data_issue'],
  }
  
  const mockSubmissions: ContactSubmission[] = []
  const now = new Date()
  
  for (let i = 0; i < 15; i++) {
    const surface = surfaces[i % surfaces.length]
    const daysAgo = Math.floor(i / 2)
    const submittedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
    
    mockSubmissions.push({
      id: `mock-submission-${i}`,
      surface,
      subject_enum: subjects[surface][i % subjects[surface].length],
      subject_label: `Subject ${i + 1}`,
      message: `This is a mock contact submission ${i + 1}. User is asking about ${subjects[surface][i % subjects[surface].length]}.`,
      submitted_at: submittedAt.toISOString(),
      user_id: i % 3 === 0 ? `user-${i}` : null,
      email: i % 3 === 0 ? `user${i}@example.com` : `public${i}@example.com`,
      name: i % 3 === 0 ? `User ${i}` : `Public User ${i}`,
      role_context: i % 3 === 0 ? 'guardian' : 'public',
      org_id: i % 3 === 0 ? `org-${i % 2}` : null,
      org_name: i % 3 === 0 ? `Organization ${i % 2}` : null,
      team_ids: i % 3 === 0 ? [`team-${i}`] : [],
      athlete_ids: i % 3 === 0 ? [`athlete-${i}`] : [],
      app_version: '1.0.0',
      environment: 'dev',
      page_url: `https://example.com/${surface}/contact`,
      route_path: `/${surface}/contact`,
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      timezone: 'America/New_York',
      locale: 'en',
      theme: i % 2 === 0 ? 'light' : 'dark',
      active_org_id: i % 3 === 0 ? `org-${i % 2}` : null,
      active_role: i % 3 === 0 ? 'guardian' : null,
      feature_flags_snapshot: { feature_a: true, feature_b: false },
      webhook_url: 'https://webhook.example.com/contact',
      webhook_success: i % 4 !== 0,
      webhook_response_status: i % 4 !== 0 ? 200 : 500,
      webhook_error_message: i % 4 === 0 ? 'Webhook failed' : null,
      webhook_sent_at: submittedAt.toISOString(),
      viewed_by_platform_admin_id: i > 5 ? 'admin-1' : null,
      viewed_at: i > 5 ? new Date(submittedAt.getTime() + 1000).toISOString() : null,
      status: statuses[i % statuses.length],
      admin_notes: i > 10 ? `Admin notes for submission ${i}` : null,
      created_at: submittedAt.toISOString(),
      updated_at: submittedAt.toISOString(),
    })
  }
  
  return mockSubmissions.sort((a, b) => 
    new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  )
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Get contact submissions with filters and pagination
 */
export async function getContactSubmissions(
  filters: ContactSubmissionFilters = {},
  page: number = 0,
  rowsPerPage: number = 25
): Promise<ServiceResponse<ContactSubmission[]>> {
  debug.data('ContactSubmissionsService.getContactSubmissions', 'Request', { filters, page, rowsPerPage })
  debug.perf.start('contactSubmissionsService.getContactSubmissions')

  if (USE_FAKE_DATA) {
    try {
      await new Promise(resolve => setTimeout(resolve, 300)) // Simulate delay
      
      let mockData = generateMockSubmissions()
      
      // Apply filters
      if (filters.surface) {
        mockData = mockData.filter(s => s.surface === filters.surface)
      }
      if (filters.status) {
        mockData = mockData.filter(s => s.status === filters.status)
      }
      if (filters.user_id) {
        mockData = mockData.filter(s => s.user_id === filters.user_id)
      }
      if (filters.org_id) {
        mockData = mockData.filter(s => s.org_id === filters.org_id)
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        mockData = mockData.filter(s => 
          s.message.toLowerCase().includes(searchLower) ||
          s.subject_label.toLowerCase().includes(searchLower) ||
          (s.email && s.email.toLowerCase().includes(searchLower)) ||
          (s.name && s.name.toLowerCase().includes(searchLower))
        )
      }
      if (filters.date_from) {
        const fromDate = new Date(filters.date_from)
        mockData = mockData.filter(s => new Date(s.submitted_at) >= fromDate)
      }
      if (filters.date_to) {
        const toDate = new Date(filters.date_to)
        mockData = mockData.filter(s => new Date(s.submitted_at) <= toDate)
      }
      
      // Paginate
      const start = page * rowsPerPage
      const end = start + rowsPerPage
      const paginated = mockData.slice(start, end)
      
      debug.perf.end('contactSubmissionsService.getContactSubmissions')
      return createServiceResponse(paginated, null)
    } catch (err) {
      debug.perf.end('contactSubmissionsService.getContactSubmissions')
      return createServiceResponse([], err instanceof Error ? err : new Error('Unknown error'))
    }
  }

  try {
    let query = (supabase as any)
      .from('contact_submissions')
      .select('*', { count: 'exact' })
      .order('submitted_at', { ascending: false })

    // Apply filters
    if (filters.surface) {
      query = query.eq('surface', filters.surface)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id)
    }
    if (filters.org_id) {
      query = query.eq('org_id', filters.org_id)
    }
    if (filters.search) {
      // Use full-text search
      query = query.textSearch('message', filters.search, {
        type: 'websearch',
        config: 'english',
      })
    }
    if (filters.date_from) {
      query = query.gte('submitted_at', filters.date_from)
    }
    if (filters.date_to) {
      query = query.lte('submitted_at', filters.date_to)
    }

    // Pagination
    const from = page * rowsPerPage
    const to = from + rowsPerPage - 1
    query = query.range(from, to)

    const { data, error } = await query

    if (error) throw error

    const normalized = normalizeSupabaseResponse(data, true) as ContactSubmission[]
    
    debug.perf.end('contactSubmissionsService.getContactSubmissions')
    return createServiceResponse(normalized, null)
  } catch (err) {
    debug.perf.end('contactSubmissionsService.getContactSubmissions')
    const classifiedError = classifySupabaseError(err)
    return createServiceResponse([], classifiedError)
  }
}

/**
 * Get contact submission by ID
 */
export async function getContactSubmissionById(
  id: string
): Promise<ServiceResponse<ContactSubmission | null>> {
  debug.data('ContactSubmissionsService.getContactSubmissionById', 'Request', { id })
  debug.perf.start('contactSubmissionsService.getContactSubmissionById')

  if (USE_FAKE_DATA) {
    try {
      await new Promise(resolve => setTimeout(resolve, 200))
      const mockData = generateMockSubmissions()
      const submission = mockData.find(s => s.id === id) || null
      
      debug.perf.end('contactSubmissionsService.getContactSubmissionById')
      return createServiceResponse(submission, null)
    } catch (err) {
      debug.perf.end('contactSubmissionsService.getContactSubmissionById')
      return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error'))
    }
  }

  try {
    const { data, error } = await (supabase as any)
      .from('contact_submissions')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    debug.perf.end('contactSubmissionsService.getContactSubmissionById')
    return createServiceResponse(data as ContactSubmission, null)
  } catch (err) {
    debug.perf.end('contactSubmissionsService.getContactSubmissionById')
    const classifiedError = classifySupabaseError(err)
    return createServiceResponse(null, classifiedError)
  }
}

/**
 * Create contact submission (insert into database)
 */
export async function createContactSubmission(
  payload: Omit<ContactSubmission, 'id' | 'created_at' | 'updated_at'>
): Promise<ServiceResponse<ContactSubmission>> {
  debug.data('ContactSubmissionsService.createContactSubmission', 'Request', { surface: payload.surface })
  debug.perf.start('contactSubmissionsService.createContactSubmission')

  if (USE_FAKE_DATA) {
    // In demo mode, don't actually create - just return success
    try {
      await new Promise(resolve => setTimeout(resolve, 200))
      const mockSubmission: ContactSubmission = {
        ...payload,
        id: `mock-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      debug.perf.end('contactSubmissionsService.createContactSubmission')
      return createServiceResponse(mockSubmission, null)
    } catch (err) {
      debug.perf.end('contactSubmissionsService.createContactSubmission')
      return createServiceResponse(null as any, err instanceof Error ? err : new Error('Unknown error'))
    }
  }

  try {
    const { data, error } = await (supabase as any)
      .from('contact_submissions')
      .insert(payload)
      .select()
      .single()

    if (error) throw error

    debug.perf.end('contactSubmissionsService.createContactSubmission')
    return createServiceResponse(data as ContactSubmission, null)
  } catch (err) {
    debug.perf.end('contactSubmissionsService.createContactSubmission')
    const classifiedError = classifySupabaseError(err)
    return createServiceResponse(null as any, classifiedError)
  }
}

/**
 * Update contact submission (admin actions)
 */
export async function updateContactSubmission(
  id: string,
  updates: ContactSubmissionUpdate
): Promise<ServiceResponse<ContactSubmission>> {
  debug.data('ContactSubmissionsService.updateContactSubmission', 'Request', { id, updates })
  debug.perf.start('contactSubmissionsService.updateContactSubmission')

  if (USE_FAKE_DATA) {
    try {
      await new Promise(resolve => setTimeout(resolve, 200))
      const mockData = generateMockSubmissions()
      const existing = mockData.find(s => s.id === id)
      if (!existing) {
        throw new Error('Submission not found')
      }
      const updated: ContactSubmission = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
      }
      
      debug.perf.end('contactSubmissionsService.updateContactSubmission')
      return createServiceResponse(updated, null)
    } catch (err) {
      debug.perf.end('contactSubmissionsService.updateContactSubmission')
      return createServiceResponse(null as any, err instanceof Error ? err : new Error('Unknown error'))
    }
  }

  try {
    const { data, error } = await (supabase as any)
      .from('contact_submissions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    debug.perf.end('contactSubmissionsService.updateContactSubmission')
    return createServiceResponse(data as ContactSubmission, null)
  } catch (err) {
    debug.perf.end('contactSubmissionsService.updateContactSubmission')
    const classifiedError = classifySupabaseError(err)
    return createServiceResponse(null as any, classifiedError)
  }
}

/**
 * Get submission count by status (for dashboard stats)
 */
export async function getContactSubmissionStats(): Promise<ServiceResponse<{
  total: number
  new: number
  in_progress: number
  resolved: number
  closed: number
}>> {
  debug.data('ContactSubmissionsService.getContactSubmissionStats', 'Request')
  debug.perf.start('contactSubmissionsService.getContactSubmissionStats')

  if (USE_FAKE_DATA) {
    try {
      await new Promise(resolve => setTimeout(resolve, 200))
      const mockData = generateMockSubmissions()
      const stats = {
        total: mockData.length,
        new: mockData.filter(s => s.status === 'new').length,
        in_progress: mockData.filter(s => s.status === 'in_progress').length,
        resolved: mockData.filter(s => s.status === 'resolved').length,
        closed: mockData.filter(s => s.status === 'closed').length,
      }
      
      debug.perf.end('contactSubmissionsService.getContactSubmissionStats')
      return createServiceResponse(stats, null)
    } catch (err) {
      debug.perf.end('contactSubmissionsService.getContactSubmissionStats')
      return createServiceResponse(null as any, err instanceof Error ? err : new Error('Unknown error'))
    }
  }

  try {
    const { data, error } = await (supabase as any)
      .from('contact_submissions')
      .select('status', { count: 'exact' })

    if (error) throw error

    const total = data?.length || 0
    const stats = {
      total,
      new: data?.filter((s: any) => s.status === 'new').length || 0,
      in_progress: data?.filter((s: any) => s.status === 'in_progress').length || 0,
      resolved: data?.filter((s: any) => s.status === 'resolved').length || 0,
      closed: data?.filter((s: any) => s.status === 'closed').length || 0,
    }

    debug.perf.end('contactSubmissionsService.getContactSubmissionStats')
    return createServiceResponse(stats, null)
  } catch (err) {
    debug.perf.end('contactSubmissionsService.getContactSubmissionStats')
    const classifiedError = classifySupabaseError(err)
    return createServiceResponse(null as any, classifiedError)
  }
}
