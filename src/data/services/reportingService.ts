/**
 * Reporting Service
 *
 * Provides data access for the organization admin reporting console.
 * Handles saved reports, scheduled reports, export history, and metric queries.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import type {
  SavedReport,
  CreateSavedReportInput,
  UpdateSavedReportInput,
  ScheduledReport,
  CreateScheduledReportInput,
  UpdateScheduledReportInput,
  ExportHistory,
  ReportFilters,
  OrgHealthMetrics,
  ParticipationMetrics,
  SchedulingMetrics,
  TravelMetrics,
  PaymentMetrics,
  UniformMetrics,
  CommunicationMetrics,
  OperationsMetrics,
} from '../../types/reporting'
import { classifySupabaseError } from '../../utils/supabaseErrorHandler'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique share token for saved reports
 */
function generateShareToken(): string {
  return `sr_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Validate report filters
 */
function validateFilters(filters: ReportFilters): Error | null {
  if (!filters.orgId) {
    return new Error('Organization ID is required')
  }

  if (filters.dateRange) {
    if (!filters.dateRange.start || !filters.dateRange.end) {
      return new Error('Both start and end dates are required for date range')
    }
    const start = new Date(filters.dateRange.start)
    const end = new Date(filters.dateRange.end)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return new Error('Invalid date format')
    }
    if (start > end) {
      return new Error('Start date must be before end date')
    }
  }

  return null
}

// ============================================================================
// Saved Reports CRUD
// ============================================================================

/**
 * Get all saved reports for the current user and organization
 */
export async function getSavedReports(
  orgId: string,
  userId: string
): Promise<{ data: SavedReport[]; error: Error | null }> {
  debug.data('ReportingService.getSavedReports', 'Request', { orgId, userId })
  debug.perf.start('reportingService.getSavedReports')

  try {
    if (!orgId || !userId) {
      return {
        data: [],
        error: new Error('Organization ID and User ID are required'),
      }
    }

    const { data, error } = await supabase
      .from('saved_reports')
      .select('*')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      debug.perf.end('reportingService.getSavedReports')
      debug.error('ReportingService.getSavedReports', 'Database error', { error, orgId, userId })
      return {
        data: [],
        error: classifySupabaseError(error, 'getSavedReports'),
      }
    }

    const reports: SavedReport[] = (data || []).map((row) => ({
      id: row.id,
      org_id: row.org_id,
      user_id: row.user_id,
      name: row.name,
      description: row.description,
      config: row.config,
      is_shared: row.is_shared,
      share_token: row.share_token,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))

    debug.perf.end('reportingService.getSavedReports')
    debug.data('ReportingService.getSavedReports', 'Response', { count: reports.length })
    return { data: reports, error: null }
  } catch (err) {
    debug.perf.end('reportingService.getSavedReports')
    debug.error('ReportingService.getSavedReports', 'Unexpected error', { err, orgId, userId })
    return {
      data: [],
      error: err instanceof Error ? err : new Error('Failed to fetch saved reports'),
    }
  }
}

/**
 * Get a saved report by ID
 */
export async function getSavedReportById(
  reportId: string,
  orgId: string,
  userId: string
): Promise<{ data: SavedReport | null; error: Error | null }> {
  debug.data('ReportingService.getSavedReportById', 'Request', { reportId, orgId, userId })
  debug.perf.start('reportingService.getSavedReportById')

  try {
    if (!reportId || !orgId || !userId) {
      return {
        data: null,
        error: new Error('Report ID, Organization ID, and User ID are required'),
      }
    }

    const { data, error } = await supabase
      .from('saved_reports')
      .select('*')
      .eq('id', reportId)
      .eq('org_id', orgId)
      .single()

    if (error) {
      debug.perf.end('reportingService.getSavedReportById')
      debug.error('ReportingService.getSavedReportById', 'Database error', { error, reportId })
      return {
        data: null,
        error: classifySupabaseError(error, 'getSavedReportById'),
      }
    }

    // Check if user has access (owner or shared)
    if (data.user_id !== userId && !data.is_shared) {
      return {
        data: null,
        error: new Error('You do not have permission to access this report'),
      }
    }

    const report: SavedReport = {
      id: data.id,
      org_id: data.org_id,
      user_id: data.user_id,
      name: data.name,
      description: data.description,
      config: data.config,
      is_shared: data.is_shared,
      share_token: data.share_token,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    debug.perf.end('reportingService.getSavedReportById')
    debug.data('ReportingService.getSavedReportById', 'Response', { reportId: report.id })
    return { data: report, error: null }
  } catch (err) {
    debug.perf.end('reportingService.getSavedReportById')
    debug.error('ReportingService.getSavedReportById', 'Unexpected error', { err, reportId })
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to fetch saved report'),
    }
  }
}

/**
 * Get a saved report by share token
 */
export async function getSavedReportByToken(
  shareToken: string
): Promise<{ data: SavedReport | null; error: Error | null }> {
  debug.data('ReportingService.getSavedReportByToken', 'Request', { shareToken })
  debug.perf.start('reportingService.getSavedReportByToken')

  try {
    if (!shareToken) {
      return {
        data: null,
        error: new Error('Share token is required'),
      }
    }

    const { data, error } = await supabase
      .from('saved_reports')
      .select('*')
      .eq('share_token', shareToken)
      .eq('is_shared', true)
      .single()

    if (error) {
      debug.perf.end('reportingService.getSavedReportByToken')
      debug.error('ReportingService.getSavedReportByToken', 'Database error', { error, shareToken })
      return {
        data: null,
        error: classifySupabaseError(error, 'getSavedReportByToken'),
      }
    }

    const report: SavedReport = {
      id: data.id,
      org_id: data.org_id,
      user_id: data.user_id,
      name: data.name,
      description: data.description,
      config: data.config,
      is_shared: data.is_shared,
      share_token: data.share_token,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    debug.perf.end('reportingService.getSavedReportByToken')
    debug.data('ReportingService.getSavedReportByToken', 'Response', { reportId: report.id })
    return { data: report, error: null }
  } catch (err) {
    debug.perf.end('reportingService.getSavedReportByToken')
    debug.error('ReportingService.getSavedReportByToken', 'Unexpected error', { err, shareToken })
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to fetch saved report'),
    }
  }
}

/**
 * Create a new saved report
 */
export async function createSavedReport(
  input: CreateSavedReportInput,
  orgId: string,
  userId: string
): Promise<{ data: SavedReport | null; error: Error | null }> {
  debug.data('ReportingService.createSavedReport', 'Request', { orgId, userId, name: input.name })
  debug.perf.start('reportingService.createSavedReport')

  try {
    if (!orgId || !userId) {
      return {
        data: null,
        error: new Error('Organization ID and User ID are required'),
      }
    }

    if (!input.name || input.name.trim().length === 0) {
      return {
        data: null,
        error: new Error('Report name is required'),
      }
    }

    const validationError = validateFilters(input.config.filters)
    if (validationError) {
      return {
        data: null,
        error: validationError,
      }
    }

    const shareToken = input.is_shared ? generateShareToken() : null

    const { data, error } = await supabase
      .from('saved_reports')
      .insert({
        org_id: orgId,
        user_id: userId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        config: input.config,
        is_shared: input.is_shared || false,
        share_token: shareToken,
      })
      .select()
      .single()

    if (error) {
      debug.perf.end('reportingService.createSavedReport')
      debug.error('ReportingService.createSavedReport', 'Database error', { error, input })
      return {
        data: null,
        error: classifySupabaseError(error, 'createSavedReport'),
      }
    }

    const report: SavedReport = {
      id: data.id,
      org_id: data.org_id,
      user_id: data.user_id,
      name: data.name,
      description: data.description,
      config: data.config,
      is_shared: data.is_shared,
      share_token: data.share_token,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    debug.perf.end('reportingService.createSavedReport')
    debug.data('ReportingService.createSavedReport', 'Response', { reportId: report.id })
    return { data: report, error: null }
  } catch (err) {
    debug.perf.end('reportingService.createSavedReport')
    debug.error('ReportingService.createSavedReport', 'Unexpected error', { err, input })
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to create saved report'),
    }
  }
}

/**
 * Update a saved report
 */
export async function updateSavedReport(
  reportId: string,
  input: UpdateSavedReportInput,
  orgId: string,
  userId: string
): Promise<{ data: SavedReport | null; error: Error | null }> {
  debug.data('ReportingService.updateSavedReport', 'Request', { reportId, orgId, userId })
  debug.perf.start('reportingService.updateSavedReport')

  try {
    if (!reportId || !orgId || !userId) {
      return {
        data: null,
        error: new Error('Report ID, Organization ID, and User ID are required'),
      }
    }

    if (input.name !== undefined && input.name.trim().length === 0) {
      return {
        data: null,
        error: new Error('Report name cannot be empty'),
      }
    }

    if (input.config?.filters) {
      const validationError = validateFilters(input.config.filters)
      if (validationError) {
        return {
          data: null,
          error: validationError,
        }
      }
    }

    const updateData: Record<string, unknown> = {}
    if (input.name !== undefined) updateData.name = input.name.trim()
    if (input.description !== undefined) updateData.description = input.description?.trim() || null
    if (input.config !== undefined) updateData.config = input.config
    if (input.is_shared !== undefined) {
      updateData.is_shared = input.is_shared
      // Generate token if sharing is enabled and token doesn't exist
      if (input.is_shared) {
        const { data: existing } = await supabase
          .from('saved_reports')
          .select('share_token')
          .eq('id', reportId)
          .single()
        if (!existing?.share_token) {
          updateData.share_token = generateShareToken()
        }
      } else {
        updateData.share_token = null
      }
    }

    const { data, error } = await supabase
      .from('saved_reports')
      .update(updateData)
      .eq('id', reportId)
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      debug.perf.end('reportingService.updateSavedReport')
      debug.error('ReportingService.updateSavedReport', 'Database error', { error, reportId, input })
      return {
        data: null,
        error: classifySupabaseError(error, 'updateSavedReport'),
      }
    }

    const report: SavedReport = {
      id: data.id,
      org_id: data.org_id,
      user_id: data.user_id,
      name: data.name,
      description: data.description,
      config: data.config,
      is_shared: data.is_shared,
      share_token: data.share_token,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    debug.perf.end('reportingService.updateSavedReport')
    debug.data('ReportingService.updateSavedReport', 'Response', { reportId: report.id })
    return { data: report, error: null }
  } catch (err) {
    debug.perf.end('reportingService.updateSavedReport')
    debug.error('ReportingService.updateSavedReport', 'Unexpected error', { err, reportId, input })
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to update saved report'),
    }
  }
}

/**
 * Delete a saved report
 */
export async function deleteSavedReport(
  reportId: string,
  orgId: string,
  userId: string
): Promise<{ error: Error | null }> {
  debug.data('ReportingService.deleteSavedReport', 'Request', { reportId, orgId, userId })
  debug.perf.start('reportingService.deleteSavedReport')

  try {
    if (!reportId || !orgId || !userId) {
      return {
        error: new Error('Report ID, Organization ID, and User ID are required'),
      }
    }

    const { error } = await supabase
      .from('saved_reports')
      .delete()
      .eq('id', reportId)
      .eq('org_id', orgId)
      .eq('user_id', userId)

    if (error) {
      debug.perf.end('reportingService.deleteSavedReport')
      debug.error('ReportingService.deleteSavedReport', 'Database error', { error, reportId })
      return {
        error: classifySupabaseError(error, 'deleteSavedReport'),
      }
    }

    debug.perf.end('reportingService.deleteSavedReport')
    debug.data('ReportingService.deleteSavedReport', 'Response', { reportId })
    return { error: null }
  } catch (err) {
    debug.perf.end('reportingService.deleteSavedReport')
    debug.error('ReportingService.deleteSavedReport', 'Unexpected error', { err, reportId })
    return {
      error: err instanceof Error ? err : new Error('Failed to delete saved report'),
    }
  }
}

// ============================================================================
// Scheduled Reports CRUD
// ============================================================================

/**
 * Get all scheduled reports for the organization
 */
export async function getScheduledReports(
  orgId: string,
  userId: string
): Promise<{ data: ScheduledReport[]; error: Error | null }> {
  debug.data('ReportingService.getScheduledReports', 'Request', { orgId, userId })
  debug.perf.start('reportingService.getScheduledReports')

  try {
    if (!orgId || !userId) {
      return {
        data: [],
        error: new Error('Organization ID and User ID are required'),
      }
    }

    const { data, error } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      debug.perf.end('reportingService.getScheduledReports')
      debug.error('ReportingService.getScheduledReports', 'Database error', { error, orgId })
      return {
        data: [],
        error: classifySupabaseError(error, 'getScheduledReports'),
      }
    }

    const reports: ScheduledReport[] = (data || []).map((row) => ({
      id: row.id,
      org_id: row.org_id,
      user_id: row.user_id,
      name: row.name,
      report_config: row.report_config,
      schedule: row.schedule,
      recipients: row.recipients,
      format: row.format,
      is_active: row.is_active,
      last_run_at: row.last_run_at,
      next_run_at: row.next_run_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))

    debug.perf.end('reportingService.getScheduledReports')
    debug.data('ReportingService.getScheduledReports', 'Response', { count: reports.length })
    return { data: reports, error: null }
  } catch (err) {
    debug.perf.end('reportingService.getScheduledReports')
    debug.error('ReportingService.getScheduledReports', 'Unexpected error', { err, orgId })
    return {
      data: [],
      error: err instanceof Error ? err : new Error('Failed to fetch scheduled reports'),
    }
  }
}

/**
 * Create a new scheduled report
 */
export async function createScheduledReport(
  input: CreateScheduledReportInput,
  orgId: string,
  userId: string
): Promise<{ data: ScheduledReport | null; error: Error | null }> {
  debug.data('ReportingService.createScheduledReport', 'Request', { orgId, userId, name: input.name })
  debug.perf.start('reportingService.createScheduledReport')

  try {
    if (!orgId || !userId) {
      return {
        data: null,
        error: new Error('Organization ID and User ID are required'),
      }
    }

    if (!input.name || input.name.trim().length === 0) {
      return {
        data: null,
        error: new Error('Report name is required'),
      }
    }

    if (!input.recipients || input.recipients.length === 0) {
      return {
        data: null,
        error: new Error('At least one recipient email is required'),
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    for (const email of input.recipients) {
      if (!emailRegex.test(email)) {
        return {
          data: null,
          error: new Error(`Invalid email address: ${email}`),
        }
      }
    }

    const validationError = validateFilters(input.report_config.filters)
    if (validationError) {
      return {
        data: null,
        error: validationError,
      }
    }

    // Calculate next_run_at based on schedule
    const nextRunAt = calculateNextRunAt(input.schedule)

    const { data, error } = await supabase
      .from('scheduled_reports')
      .insert({
        org_id: orgId,
        user_id: userId,
        name: input.name.trim(),
        report_config: input.report_config,
        schedule: input.schedule,
        recipients: input.recipients,
        format: input.format,
        is_active: true,
        next_run_at: nextRunAt,
      })
      .select()
      .single()

    if (error) {
      debug.perf.end('reportingService.createScheduledReport')
      debug.error('ReportingService.createScheduledReport', 'Database error', { error, input })
      return {
        data: null,
        error: classifySupabaseError(error, 'createScheduledReport'),
      }
    }

    const report: ScheduledReport = {
      id: data.id,
      org_id: data.org_id,
      user_id: data.user_id,
      name: data.name,
      report_config: data.report_config,
      schedule: data.schedule,
      recipients: data.recipients,
      format: data.format,
      is_active: data.is_active,
      last_run_at: data.last_run_at,
      next_run_at: data.next_run_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    debug.perf.end('reportingService.createScheduledReport')
    debug.data('ReportingService.createScheduledReport', 'Response', { reportId: report.id })
    return { data: report, error: null }
  } catch (err) {
    debug.perf.end('reportingService.createScheduledReport')
    debug.error('ReportingService.createScheduledReport', 'Unexpected error', { err, input })
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to create scheduled report'),
    }
  }
}

/**
 * Update a scheduled report
 */
export async function updateScheduledReport(
  reportId: string,
  input: UpdateScheduledReportInput,
  orgId: string,
  userId: string
): Promise<{ data: ScheduledReport | null; error: Error | null }> {
  debug.data('ReportingService.updateScheduledReport', 'Request', { reportId, orgId, userId })
  debug.perf.start('reportingService.updateScheduledReport')

  try {
    if (!reportId || !orgId || !userId) {
      return {
        data: null,
        error: new Error('Report ID, Organization ID, and User ID are required'),
      }
    }

    if (input.name !== undefined && input.name.trim().length === 0) {
      return {
        data: null,
        error: new Error('Report name cannot be empty'),
      }
    }

    if (input.recipients !== undefined) {
      if (input.recipients.length === 0) {
        return {
          data: null,
          error: new Error('At least one recipient email is required'),
        }
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      for (const email of input.recipients) {
        if (!emailRegex.test(email)) {
          return {
            data: null,
            error: new Error(`Invalid email address: ${email}`),
          }
        }
      }
    }

    if (input.report_config?.filters) {
      const validationError = validateFilters(input.report_config.filters)
      if (validationError) {
        return {
          data: null,
          error: validationError,
        }
      }
    }

    const updateData: Record<string, unknown> = {}
    if (input.name !== undefined) updateData.name = input.name.trim()
    if (input.report_config !== undefined) updateData.report_config = input.report_config
    if (input.schedule !== undefined) {
      updateData.schedule = input.schedule
      // Recalculate next_run_at if schedule changed
      updateData.next_run_at = calculateNextRunAt(input.schedule)
    }
    if (input.recipients !== undefined) updateData.recipients = input.recipients
    if (input.format !== undefined) updateData.format = input.format
    if (input.is_active !== undefined) updateData.is_active = input.is_active

    const { data, error } = await supabase
      .from('scheduled_reports')
      .update(updateData)
      .eq('id', reportId)
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      debug.perf.end('reportingService.updateScheduledReport')
      debug.error('ReportingService.updateScheduledReport', 'Database error', { error, reportId, input })
      return {
        data: null,
        error: classifySupabaseError(error, 'updateScheduledReport'),
      }
    }

    const report: ScheduledReport = {
      id: data.id,
      org_id: data.org_id,
      user_id: data.user_id,
      name: data.name,
      report_config: data.report_config,
      schedule: data.schedule,
      recipients: data.recipients,
      format: data.format,
      is_active: data.is_active,
      last_run_at: data.last_run_at,
      next_run_at: data.next_run_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    debug.perf.end('reportingService.updateScheduledReport')
    debug.data('ReportingService.updateScheduledReport', 'Response', { reportId: report.id })
    return { data: report, error: null }
  } catch (err) {
    debug.perf.end('reportingService.updateScheduledReport')
    debug.error('ReportingService.updateScheduledReport', 'Unexpected error', { err, reportId, input })
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to update scheduled report'),
    }
  }
}

/**
 * Delete a scheduled report
 */
export async function deleteScheduledReport(
  reportId: string,
  orgId: string,
  userId: string
): Promise<{ error: Error | null }> {
  debug.data('ReportingService.deleteScheduledReport', 'Request', { reportId, orgId, userId })
  debug.perf.start('reportingService.deleteScheduledReport')

  try {
    if (!reportId || !orgId || !userId) {
      return {
        error: new Error('Report ID, Organization ID, and User ID are required'),
      }
    }

    const { error } = await supabase
      .from('scheduled_reports')
      .delete()
      .eq('id', reportId)
      .eq('org_id', orgId)
      .eq('user_id', userId)

    if (error) {
      debug.perf.end('reportingService.deleteScheduledReport')
      debug.error('ReportingService.deleteScheduledReport', 'Database error', { error, reportId })
      return {
        error: classifySupabaseError(error, 'deleteScheduledReport'),
      }
    }

    debug.perf.end('reportingService.deleteScheduledReport')
    debug.data('ReportingService.deleteScheduledReport', 'Response', { reportId })
    return { error: null }
  } catch (err) {
    debug.perf.end('reportingService.deleteScheduledReport')
    debug.error('ReportingService.deleteScheduledReport', 'Unexpected error', { err, reportId })
    return {
      error: err instanceof Error ? err : new Error('Failed to delete scheduled report'),
    }
  }
}

// ============================================================================
// Export History
// ============================================================================

/**
 * Get export history for the organization
 */
export async function getExportHistory(
  orgId: string,
  userId: string,
  limit: number = 50
): Promise<{ data: ExportHistory[]; error: Error | null }> {
  debug.data('ReportingService.getExportHistory', 'Request', { orgId, userId, limit })
  debug.perf.start('reportingService.getExportHistory')

  try {
    if (!orgId || !userId) {
      return {
        data: [],
        error: new Error('Organization ID and User ID are required'),
      }
    }

    const { data, error } = await supabase
      .from('export_history')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      debug.perf.end('reportingService.getExportHistory')
      debug.error('ReportingService.getExportHistory', 'Database error', { error, orgId })
      return {
        data: [],
        error: classifySupabaseError(error, 'getExportHistory'),
      }
    }

    const history: ExportHistory[] = (data || []).map((row) => ({
      id: row.id,
      org_id: row.org_id,
      user_id: row.user_id,
      report_config: row.report_config,
      format: row.format,
      file_url: row.file_url,
      file_size_bytes: row.file_size_bytes,
      status: row.status,
      error_message: row.error_message,
      created_at: row.created_at,
      completed_at: row.completed_at,
    }))

    debug.perf.end('reportingService.getExportHistory')
    debug.data('ReportingService.getExportHistory', 'Response', { count: history.length })
    return { data: history, error: null }
  } catch (err) {
    debug.perf.end('reportingService.getExportHistory')
    debug.error('ReportingService.getExportHistory', 'Unexpected error', { err, orgId })
    return {
      data: [],
      error: err instanceof Error ? err : new Error('Failed to fetch export history'),
    }
  }
}

/**
 * Create an export history entry
 */
export async function createExportHistory(
  reportConfig: unknown,
  format: 'csv' | 'xlsx' | 'pdf',
  orgId: string,
  userId: string
): Promise<{ data: ExportHistory | null; error: Error | null }> {
  debug.data('ReportingService.createExportHistory', 'Request', { orgId, userId, format })
  debug.perf.start('reportingService.createExportHistory')

  try {
    if (!orgId || !userId) {
      return {
        data: null,
        error: new Error('Organization ID and User ID are required'),
      }
    }

    const { data, error } = await supabase
      .from('export_history')
      .insert({
        org_id: orgId,
        user_id: userId,
        report_config: reportConfig,
        format,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      debug.perf.end('reportingService.createExportHistory')
      debug.error('ReportingService.createExportHistory', 'Database error', { error })
      return {
        data: null,
        error: classifySupabaseError(error, 'createExportHistory'),
      }
    }

    const history: ExportHistory = {
      id: data.id,
      org_id: data.org_id,
      user_id: data.user_id,
      report_config: data.report_config,
      format: data.format,
      file_url: data.file_url,
      file_size_bytes: data.file_size_bytes,
      status: data.status,
      error_message: data.error_message,
      created_at: data.created_at,
      completed_at: data.completed_at,
    }

    debug.perf.end('reportingService.createExportHistory')
    debug.data('ReportingService.createExportHistory', 'Response', { historyId: history.id })
    return { data: history, error: null }
  } catch (err) {
    debug.perf.end('reportingService.createExportHistory')
    debug.error('ReportingService.createExportHistory', 'Unexpected error', { err })
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to create export history'),
    }
  }
}

/**
 * Update export history status
 */
export async function updateExportHistory(
  historyId: string,
  updates: {
    status?: 'pending' | 'processing' | 'completed' | 'failed'
    file_url?: string
    file_size_bytes?: number
    error_message?: string
  }
): Promise<{ error: Error | null }> {
  debug.data('ReportingService.updateExportHistory', 'Request', { historyId, updates })
  debug.perf.start('reportingService.updateExportHistory')

  try {
    if (!historyId) {
      return {
        error: new Error('History ID is required'),
      }
    }

    const updateData: Record<string, unknown> = {}
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.file_url !== undefined) updateData.file_url = updates.file_url
    if (updates.file_size_bytes !== undefined) updateData.file_size_bytes = updates.file_size_bytes
    if (updates.error_message !== undefined) updateData.error_message = updates.error_message
    if (updates.status === 'completed' || updates.status === 'failed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('export_history')
      .update(updateData)
      .eq('id', historyId)

    if (error) {
      debug.perf.end('reportingService.updateExportHistory')
      debug.error('ReportingService.updateExportHistory', 'Database error', { error, historyId })
      return {
        error: classifySupabaseError(error, 'updateExportHistory'),
      }
    }

    debug.perf.end('reportingService.updateExportHistory')
    debug.data('ReportingService.updateExportHistory', 'Response', { historyId })
    return { error: null }
  } catch (err) {
    debug.perf.end('reportingService.updateExportHistory')
    debug.error('ReportingService.updateExportHistory', 'Unexpected error', { err, historyId })
    return {
      error: err instanceof Error ? err : new Error('Failed to update export history'),
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate next run time based on schedule
 */
function calculateNextRunAt(schedule: { frequency: string; day_of_week?: number; day_of_month?: number; time?: string }): string {
  const now = new Date()
  const time = schedule.time ? schedule.time.split(':') : ['09', '00']
  const hour = parseInt(time[0], 10)
  const minute = parseInt(time[1], 10)

  let nextRun = new Date(now)
  nextRun.setHours(hour, minute, 0, 0)

  switch (schedule.frequency) {
    case 'daily':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1)
      }
      break

    case 'weekly':
      if (schedule.day_of_week !== undefined) {
        const targetDay = schedule.day_of_week
        const currentDay = nextRun.getDay()
        let daysUntilTarget = targetDay - currentDay
        if (daysUntilTarget < 0 || (daysUntilTarget === 0 && nextRun <= now)) {
          daysUntilTarget += 7
        }
        nextRun.setDate(nextRun.getDate() + daysUntilTarget)
      }
      break

    case 'monthly':
      if (schedule.day_of_month !== undefined) {
        const targetDay = schedule.day_of_month
        nextRun.setDate(targetDay)
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1)
        }
      }
      break
  }

  return nextRun.toISOString()
}

// ============================================================================
// Metric Queries (Placeholder - will be implemented with RPC functions)
// ============================================================================

/**
 * Get organization health metrics
 * TODO: Implement RPC function get_org_health_metrics
 */
export async function getOrgHealthMetrics(
  filters: ReportFilters
): Promise<{ data: OrgHealthMetrics | null; error: Error | null }> {
  // Placeholder - will be implemented with RPC
  return {
    data: null,
    error: new Error('Organization health metrics not yet implemented'),
  }
}

/**
 * Get participation metrics
 * TODO: Implement RPC function get_participation_metrics
 */
export async function getParticipationMetrics(
  filters: ReportFilters
): Promise<{ data: ParticipationMetrics | null; error: Error | null }> {
  // Placeholder - will be implemented with RPC
  return {
    data: null,
    error: new Error('Participation metrics not yet implemented'),
  }
}

/**
 * Get scheduling metrics
 * TODO: Implement RPC function get_scheduling_metrics
 */
export async function getSchedulingMetrics(
  filters: ReportFilters
): Promise<{ data: SchedulingMetrics | null; error: Error | null }> {
  // Placeholder - will be implemented with RPC
  return {
    data: null,
    error: new Error('Scheduling metrics not yet implemented'),
  }
}

/**
 * Get travel metrics
 * TODO: Implement RPC function get_travel_metrics
 */
export async function getTravelMetrics(
  filters: ReportFilters
): Promise<{ data: TravelMetrics | null; error: Error | null }> {
  // Placeholder - will be implemented with RPC
  return {
    data: null,
    error: new Error('Travel metrics not yet implemented'),
  }
}

/**
 * Get payment metrics
 * TODO: Implement RPC function get_payment_metrics
 */
export async function getPaymentMetrics(
  filters: ReportFilters
): Promise<{ data: PaymentMetrics | null; error: Error | null }> {
  // Placeholder - will be implemented with RPC
  return {
    data: null,
    error: new Error('Payment metrics not yet implemented'),
  }
}

/**
 * Get uniform metrics
 * TODO: Implement RPC function get_uniform_metrics
 */
export async function getUniformMetrics(
  filters: ReportFilters
): Promise<{ data: UniformMetrics | null; error: Error | null }> {
  // Placeholder - will be implemented with RPC
  return {
    data: null,
    error: new Error('Uniform metrics not yet implemented'),
  }
}

/**
 * Get communication metrics
 * TODO: Implement RPC function get_communication_metrics
 */
export async function getCommunicationMetrics(
  filters: ReportFilters
): Promise<{ data: CommunicationMetrics | null; error: Error | null }> {
  // Placeholder - will be implemented with RPC
  return {
    data: null,
    error: new Error('Communication metrics not yet implemented'),
  }
}

/**
 * Get operations metrics
 * TODO: Implement RPC function get_operations_metrics
 */
export async function getOperationsMetrics(
  filters: ReportFilters
): Promise<{ data: OperationsMetrics | null; error: Error | null }> {
  // Placeholder - will be implemented with RPC
  return {
    data: null,
    error: new Error('Operations metrics not yet implemented'),
  }
}
