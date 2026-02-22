/**
 * Reporting Service
 *
 * Provides data access for the organization admin reporting console.
 * Handles saved reports, scheduled reports, export history, and metric queries.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import { isInDemoSession } from '../../utils/demoMode'
import { USE_FAKE_DATA } from '../config'
import type {
  SavedReport,
  SavedReportConfig,
  ScheduleConfig,
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
  RevenueMetrics,
  TicketingMetrics,
  RegistrationMetrics,
  VideoMetrics,
  EventsMetrics,
  ErrorsMetrics,
} from '../../types/reporting'
import type { Json } from '../../lib/database.types'
import { classifySupabaseError } from '../../utils/supabaseErrorHandler'
import {
  getFakeOrgHealthMetrics,
  getFakeParticipationMetrics,
  getFakeSchedulingMetrics,
  getFakeTravelMetrics,
  getFakePaymentMetrics,
  getFakeUniformMetrics,
  getFakeCommunicationMetrics,
  getFakeOperationsMetrics,
  getFakeRevenueMetrics,
  getFakeTicketingMetrics,
  getFakeRegistrationMetrics,
  getFakeVideoMetrics,
  getFakeEventsMetrics,
  getFakeErrorsMetrics,
  getFakeSavedReportById,
  getFakeSavedReportByToken,
  updateFakeSavedReport,
  deleteFakeSavedReport,
  getFakeScheduledReports,
  createFakeScheduledReport,
  updateFakeScheduledReport,
  deleteFakeScheduledReport,
  getFakeExportHistory,
  createFakeExportHistory,
  updateFakeExportHistory,
} from '../fake/fakeReporting'

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
      config: row.config as unknown as SavedReportConfig,
      is_shared: row.is_shared ?? false,
      share_token: row.share_token,
      created_at: row.created_at ?? '',
      updated_at: row.updated_at ?? '',
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

    // Use fake data in demo session
    if (isInDemoSession()) {
      return await getFakeSavedReportById(reportId, orgId, userId)
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
      config: data.config as unknown as SavedReportConfig,
      is_shared: data.is_shared ?? false,
      share_token: data.share_token,
      created_at: data.created_at ?? '',
      updated_at: data.updated_at ?? '',
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

    // Use fake data in demo session
    if (isInDemoSession()) {
      return await getFakeSavedReportByToken(shareToken)
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
      config: data.config as unknown as SavedReportConfig,
      is_shared: data.is_shared ?? false,
      share_token: data.share_token,
      created_at: data.created_at ?? '',
      updated_at: data.updated_at ?? '',
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
        config: input.config as unknown as Json,
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
      config: data.config as unknown as SavedReportConfig,
      is_shared: data.is_shared ?? false,
      share_token: data.share_token,
      created_at: data.created_at ?? '',
      updated_at: data.updated_at ?? '',
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

    // Use fake data in demo session
    if (isInDemoSession()) {
      return await updateFakeSavedReport(reportId, input, orgId, userId)
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
      config: data.config as unknown as SavedReportConfig,
      is_shared: data.is_shared ?? false,
      share_token: data.share_token,
      created_at: data.created_at ?? '',
      updated_at: data.updated_at ?? '',
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

    // Use fake data in demo session
    if (isInDemoSession()) {
      return await deleteFakeSavedReport(reportId, orgId, userId)
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

    // Use fake data in demo session
    if (isInDemoSession()) {
      return await getFakeScheduledReports(orgId, userId)
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
      report_config: row.report_config as unknown as SavedReportConfig,
      schedule: row.schedule as unknown as ScheduleConfig,
      recipients: row.recipients || [],
      format: row.format as 'csv' | 'xlsx' | 'pdf',
      is_active: row.is_active ?? false,
      last_run_at: row.last_run_at,
      next_run_at: row.next_run_at,
      created_at: row.created_at ?? '',
      updated_at: row.updated_at ?? '',
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

    // Use fake data in demo session
    if (isInDemoSession()) {
      return await createFakeScheduledReport(input, orgId, userId)
    }

    // Calculate next_run_at based on schedule
    const nextRunAt = calculateNextRunAt(input.schedule)

    const { data, error } = await supabase
      .from('scheduled_reports')
      .insert({
        org_id: orgId,
        user_id: userId,
        name: input.name.trim(),
        report_config: input.report_config as unknown as Json,
        schedule: input.schedule as unknown as Json,
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
      report_config: data.report_config as unknown as SavedReportConfig,
      schedule: data.schedule as unknown as ScheduleConfig,
      recipients: data.recipients || [],
      format: data.format as 'csv' | 'xlsx' | 'pdf',
      is_active: data.is_active ?? false,
      last_run_at: data.last_run_at,
      next_run_at: data.next_run_at,
      created_at: data.created_at ?? '',
      updated_at: data.updated_at ?? '',
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

    // Use fake data in demo session
    if (isInDemoSession()) {
      return await updateFakeScheduledReport(reportId, input, orgId, userId)
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
      report_config: data.report_config as unknown as SavedReportConfig,
      schedule: data.schedule as unknown as ScheduleConfig,
      recipients: data.recipients || [],
      format: data.format as 'csv' | 'xlsx' | 'pdf',
      is_active: data.is_active ?? false,
      last_run_at: data.last_run_at,
      next_run_at: data.next_run_at,
      created_at: data.created_at ?? '',
      updated_at: data.updated_at ?? '',
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

    // Use fake data in demo session
    if (isInDemoSession()) {
      return await deleteFakeScheduledReport(reportId, orgId, userId)
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

    // Use fake data in demo session
    if (isInDemoSession()) {
      return await getFakeExportHistory(orgId, userId, limit)
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
      report_config: row.report_config as unknown as SavedReportConfig,
      format: row.format as 'csv' | 'xlsx' | 'pdf',
      file_url: row.file_url,
      file_size_bytes: row.file_size_bytes,
      status: row.status as 'pending' | 'processing' | 'completed' | 'failed',
      error_message: row.error_message,
      created_at: row.created_at ?? '',
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

    // Use fake data in demo session
    if (isInDemoSession()) {
      return await createFakeExportHistory(reportConfig, format, orgId, userId)
    }

    const { data, error } = await supabase
      .from('export_history')
      .insert({
        org_id: orgId,
        user_id: userId,
        report_config: reportConfig as unknown as Json,
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
      report_config: data.report_config as unknown as SavedReportConfig,
      format: data.format as 'csv' | 'xlsx' | 'pdf',
      file_url: data.file_url,
      file_size_bytes: data.file_size_bytes,
      status: data.status as 'pending' | 'processing' | 'completed' | 'failed',
      error_message: data.error_message,
      created_at: data.created_at ?? '',
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

    // Use fake data in demo session
    if (isInDemoSession()) {
      return await updateFakeExportHistory(historyId, updates as Partial<ExportHistory>)
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
 */
export async function getOrgHealthMetrics(
  filters: ReportFilters
): Promise<{ data: OrgHealthMetrics | null; error: Error | null }> {
  try {
    const validationError = validateFilters(filters)
    if (validationError) {
      return { data: null, error: validationError }
    }

    // Use fake data in demo session or if USE_FAKE_DATA is enabled
    if (isInDemoSession() || USE_FAKE_DATA) {
      return await getFakeOrgHealthMetrics(filters)
    }

    // Try RPC function first
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('get_org_health_metrics', {
      p_org_id: filters.orgId,
      p_sub_org_id: filters.subOrgId || null,
      p_date_start: filters.dateRange?.start || null,
      p_date_end: filters.dateRange?.end || null,
    })

    if (!rpcError && rpcData) {
      return { data: (rpcData as unknown) as OrgHealthMetrics, error: null }
    }

    // When USE_FAKE_DATA is false, return error instead of falling back to fake data
    debug.error('Failed to fetch org health metrics', rpcError?.message || String(rpcError))
    return { data: null, error: rpcError ? classifySupabaseError(rpcError) : new Error('Failed to fetch org health metrics') }
  } catch (err) {
    debug.error('Error fetching org health metrics', err instanceof Error ? err.message : String(err))
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get participation metrics
 */
export async function getParticipationMetrics(
  filters: ReportFilters
): Promise<{ data: ParticipationMetrics | null; error: Error | null }> {
  try {
    const validationError = validateFilters(filters)
    if (validationError) {
      return { data: null, error: validationError }
    }

    // Use fake data in demo session or if USE_FAKE_DATA is enabled
    if (isInDemoSession() || USE_FAKE_DATA) {
      return await getFakeParticipationMetrics(filters)
    }

    // Try RPC function first
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('get_participation_metrics', {
      p_org_id: filters.orgId,
      p_sub_org_id: filters.subOrgId || null,
      p_season_id: filters.seasonId || null,
      p_team_id: filters.teamId || null,
      p_date_start: filters.dateRange?.start || null,
      p_date_end: filters.dateRange?.end || null,
    })

    if (!rpcError && rpcData) {
      return { data: (rpcData as unknown) as ParticipationMetrics, error: null }
    }

    // When USE_FAKE_DATA is false, return error instead of falling back to fake data
    debug.error('Failed to fetch participation metrics', rpcError?.message || String(rpcError))
    return { data: null, error: rpcError ? classifySupabaseError(rpcError) : new Error('Failed to fetch participation metrics') }
  } catch (err) {
    debug.error('Error fetching participation metrics', err instanceof Error ? err.message : String(err))
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get scheduling metrics
 */
export async function getSchedulingMetrics(
  filters: ReportFilters
): Promise<{ data: SchedulingMetrics | null; error: Error | null }> {
  try {
    const validationError = validateFilters(filters)
    if (validationError) {
      return { data: null, error: validationError }
    }

    // Use fake data in demo session or if USE_FAKE_DATA is enabled
    if (isInDemoSession() || USE_FAKE_DATA) {
      return await getFakeSchedulingMetrics(filters)
    }

    // Try RPC function first
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('get_scheduling_metrics', {
      p_org_id: filters.orgId,
      p_sub_org_id: filters.subOrgId || null,
      p_season_id: filters.seasonId || null,
      p_sport_id: filters.sportId || null,
      p_program_id: filters.programId || null,
      p_level_id: filters.levelId || null,
      p_team_id: filters.teamId || null,
      p_date_start: filters.dateRange?.start || null,
      p_date_end: filters.dateRange?.end || null,
    })

    if (!rpcError && rpcData) {
      return { data: (rpcData as unknown) as SchedulingMetrics, error: null }
    }

    // When USE_FAKE_DATA is false, return error instead of falling back to fake data
    debug.error('Failed to fetch scheduling metrics', rpcError?.message || String(rpcError))
    return { data: null, error: rpcError ? classifySupabaseError(rpcError) : new Error('Failed to fetch scheduling metrics') }
    let eventsQuery = supabase
      .from('events')
      .select('id, title, start_time, end_time, is_cancelled, team_id, type, teams(name)')
      .eq('org_id', filters.orgId)

    const dateRange = filters.dateRange
    if (dateRange != null) {
      const start = dateRange!.start
      const end = dateRange!.end
      if (start != null && end != null) {
        eventsQuery = eventsQuery.gte('start_time', start).lte('start_time', end)
      }
    }

    const { data: events, error: eventsError } = await eventsQuery

    if (eventsError) {
      debug.error('Failed to fetch events', eventsError?.message || String(eventsError))
      return { data: null, error: classifySupabaseError(eventsError) }
    }

    // Group events by type
    const eventsByTypeMap = new Map<string, number>()
    ;(events || []).forEach((e: any) => {
      const type = e.type || 'other'
      eventsByTypeMap.set(type, (eventsByTypeMap.get(type) || 0) + 1)
    })

    const eventsByType = Array.from(eventsByTypeMap.entries()).map(([type, count]) => ({ type, count }))

    // Query attendance data
    const eventIds = (events || []).map((e: any) => e.id)
    const { data: attendance } = eventIds.length > 0
      ? await supabase
          .from('attendance')
          .select('event_id, status, events!inner(team_id, teams(name))')
          .in('event_id', eventIds)
      : { data: [] }

    // Query RSVP data
    const { data: rsvps } = eventIds.length > 0
      ? await supabase
          .from('event_rsvps')
          .select('event_id, status, events!inner(team_id, teams(name))')
          .in('event_id', eventIds)
      : { data: [] }

    // Calculate attendance rates by team
    const teamAttendanceMap = new Map<string, { total: number; going: number }>()
    ;(attendance || []).forEach((a: any) => {
      const teamName = a.events?.teams?.name || 'Unknown'
      const current = teamAttendanceMap.get(teamName) || { total: 0, going: 0 }
      teamAttendanceMap.set(teamName, {
        total: current.total + 1,
        going: current.going + (a.status === 'going' ? 1 : 0),
      })
    })

    // Get team IDs for attendance rates
    const teamIds = [...new Set((events || []).map((e: any) => e.team_id).filter(Boolean))]
    const { data: teams } = teamIds.length > 0
      ? await supabase
          .from('teams')
          .select('id, name')
          .in('id', teamIds)
      : { data: [] }

    const teamMap = new Map<string, string>()
    ;(teams || []).forEach((team: any) => {
      teamMap.set(team.id, team.name || 'Unknown')
    })

    const attendanceRates = Array.from(teamAttendanceMap.entries()).map(([teamName, stats]) => {
      // Find team ID by name
      const teamId = Array.from(teamMap.entries()).find(([_, name]) => name === teamName)?.[0] || ''
      return {
        teamId,
        teamName,
        rate: stats.total > 0 ? (stats.going / stats.total) * 100 : 0,
      }
    })

    // Calculate RSVP rates by team
    const teamRsvpMap = new Map<string, { total: number; responded: number }>()
    ;(rsvps || []).forEach((r: any) => {
      const teamName = r.events?.teams?.name || 'Unknown'
      const current = teamRsvpMap.get(teamName) || { total: 0, responded: 0 }
      teamRsvpMap.set(teamName, {
        total: current.total + 1,
        responded: current.responded + 1,
      })
    })

    const rsvpRates = Array.from(teamRsvpMap.entries()).map(([teamName, stats]) => {
      const teamId = Array.from(teamMap.entries()).find(([_, name]) => name === teamName)?.[0] || ''
      return {
        teamId,
        teamName,
        rate: stats.total > 0 ? (stats.responded / stats.total) * 100 : 0,
      }
    })

    // Detect scheduling conflicts (events with overlapping times for same team)
    const conflicts: Array<{ teamId: string; teamName: string; conflictCount: number }> = []
    const teamEventsMap = new Map<string, Array<{ id: string; starts_at: string; ends_at: string }>>()
    ;(events || []).forEach((e: any) => {
      if (e.team_id && e.start_time) {
        const teamName = e.teams?.name || 'Unknown'
        const current = teamEventsMap.get(teamName) || []
        current.push({
          id: e.id,
          starts_at: e.start_time,
          ends_at: e.end_time || e.start_time,
        })
        teamEventsMap.set(teamName, current)
      }
    })

    teamEventsMap.forEach((teamEvents, teamName) => {
      let conflictCount = 0
      for (let i = 0; i < teamEvents.length; i++) {
        for (let j = i + 1; j < teamEvents.length; j++) {
          const e1 = teamEvents[i]
          const e2 = teamEvents[j]
          if (
            (e1.starts_at <= e2.starts_at && e1.ends_at >= e2.starts_at) ||
            (e2.starts_at <= e1.starts_at && e2.ends_at >= e1.starts_at)
          ) {
            conflictCount++
          }
        }
      }
      if (conflictCount > 0) {
        const teamId = Array.from(teamMap.entries()).find(([_, name]) => name === teamName)?.[0] || ''
        conflicts.push({ teamId, teamName, conflictCount })
      }
    })

    // Calculate no-response list (athletes who haven't RSVP'd to events)
    const noResponseList: Array<{ eventId: string; eventName: string; athleteId: string; athleteName: string }> = []
    // This would require querying athletes assigned to teams and comparing with RSVPs
    // For now, return empty array

    const schedulingMetrics: SchedulingMetrics = {
      eventsByType,
      attendanceRates,
      rsvpRates,
      conflicts,
      noResponseList,
    }

    return { data: schedulingMetrics, error: null }
  } catch (err) {
    debug.error('Error fetching scheduling metrics', err instanceof Error ? err.message : String(err))
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get travel metrics
 */
export async function getTravelMetrics(
  filters: ReportFilters
): Promise<{ data: TravelMetrics | null; error: Error | null }> {
  try {
    const validationError = validateFilters(filters)
    if (validationError) {
      return { data: null, error: validationError }
    }

    // Use fake data in demo session or if USE_FAKE_DATA is enabled
    if (isInDemoSession() || USE_FAKE_DATA) {
      return await getFakeTravelMetrics(filters)
    }

    // Try RPC function first
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('get_travel_metrics', {
      p_org_id: filters.orgId,
      p_sub_org_id: filters.subOrgId || null,
      p_season_id: filters.seasonId || null,
      p_sport_id: filters.sportId || null,
      p_program_id: filters.programId || null,
      p_level_id: filters.levelId || null,
      p_team_id: filters.teamId || null,
      p_date_start: filters.dateRange?.start || null,
      p_date_end: filters.dateRange?.end || null,
    })

    if (!rpcError && rpcData) {
      return { data: (rpcData as unknown) as TravelMetrics, error: null }
    }

    // When USE_FAKE_DATA is false, return error instead of falling back to fake data
    debug.error('Failed to fetch travel metrics', rpcError?.message || String(rpcError))
    return { data: null, error: rpcError ? classifySupabaseError(rpcError) : new Error('Failed to fetch travel metrics') }
  } catch (err) {
    debug.error('Error fetching travel metrics', err instanceof Error ? err.message : String(err))
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get payment metrics
 */
export async function getPaymentMetrics(
  filters: ReportFilters
): Promise<{ data: PaymentMetrics | null; error: Error | null }> {
  try {
    const validationError = validateFilters(filters)
    if (validationError) {
      return { data: null, error: validationError }
    }

    // Use fake data in demo session or if USE_FAKE_DATA is enabled
    if (isInDemoSession() || USE_FAKE_DATA) {
      return await getFakePaymentMetrics(filters)
    }

    const { data, error } = await (supabase.rpc as any)('get_payment_metrics', {
      p_org_id: filters.orgId,
      p_sub_org_id: filters.subOrgId || null,
      p_season_id: filters.seasonId || null,
      p_sport_id: filters.sportId || null,
      p_program_id: filters.programId || null,
      p_level_id: filters.levelId || null,
      p_team_id: filters.teamId || null,
      p_date_start: filters.dateRange?.start || null,
      p_date_end: filters.dateRange?.end || null,
    })

    if (error) {
      // When USE_FAKE_DATA is false, return error instead of falling back to fake data
      debug.error('Failed to fetch payment metrics', error?.message || String(error))
      return { data: null, error: classifySupabaseError(error) }
    }

    return { data: (data as unknown) as PaymentMetrics, error: null }
  } catch (err) {
    debug.error('Error fetching payment metrics', err instanceof Error ? err.message : String(err))
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get uniform metrics
 */
export async function getUniformMetrics(
  filters: ReportFilters
): Promise<{ data: UniformMetrics | null; error: Error | null }> {
  try {
    const validationError = validateFilters(filters)
    if (validationError) {
      return { data: null, error: validationError }
    }

    // Use fake data in demo session or if USE_FAKE_DATA is enabled
    if (isInDemoSession() || USE_FAKE_DATA) {
      return await getFakeUniformMetrics(filters)
    }

    // Try RPC function first
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('get_uniform_metrics', {
      p_org_id: filters.orgId,
      p_sub_org_id: filters.subOrgId || null,
      p_season_id: filters.seasonId || null,
      p_sport_id: filters.sportId || null,
      p_program_id: filters.programId || null,
      p_level_id: filters.levelId || null,
      p_team_id: filters.teamId || null,
      p_date_start: filters.dateRange?.start || null,
      p_date_end: filters.dateRange?.end || null,
    })

    if (!rpcError && rpcData) {
      return { data: (rpcData as unknown) as UniformMetrics, error: null }
    }

    // When USE_FAKE_DATA is false, return error instead of falling back to fake data
    debug.error('Failed to fetch uniform metrics', rpcError?.message || String(rpcError))
    return { data: null, error: rpcError ? classifySupabaseError(rpcError) : new Error('Failed to fetch uniform metrics') }
  } catch (err) {
    debug.error('Error fetching uniform metrics', err instanceof Error ? err.message : String(err))
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get communication metrics
 */
export async function getCommunicationMetrics(
  filters: ReportFilters
): Promise<{ data: CommunicationMetrics | null; error: Error | null }> {
  try {
    const validationError = validateFilters(filters)
    if (validationError) {
      return { data: null, error: validationError }
    }

    // Use fake data in demo session or if USE_FAKE_DATA is enabled
    if (isInDemoSession() || USE_FAKE_DATA) {
      return await getFakeCommunicationMetrics(filters)
    }

    // Try RPC function first
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('get_communication_metrics', {
      p_org_id: filters.orgId,
      p_sub_org_id: filters.subOrgId || null,
      p_season_id: filters.seasonId || null,
      p_sport_id: filters.sportId || null,
      p_program_id: filters.programId || null,
      p_level_id: filters.levelId || null,
      p_team_id: filters.teamId || null,
      p_date_start: filters.dateRange?.start || null,
      p_date_end: filters.dateRange?.end || null,
    })

    if (!rpcError && rpcData) {
      return { data: (rpcData as unknown) as CommunicationMetrics, error: null }
    }

    // When USE_FAKE_DATA is false, return error instead of falling back to fake data
    debug.error('Failed to fetch communication metrics', rpcError?.message || String(rpcError))
    return { data: null, error: rpcError ? classifySupabaseError(rpcError) : new Error('Failed to fetch communication metrics') }
  } catch (err) {
    debug.error('Error fetching communication metrics', err instanceof Error ? err.message : String(err))
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get operations metrics
 */
export async function getOperationsMetrics(
  filters: ReportFilters
): Promise<{ data: OperationsMetrics | null; error: Error | null }> {
  try {
    const validationError = validateFilters(filters)
    if (validationError) {
      return { data: null, error: validationError }
    }

    // Use fake data in demo session or if USE_FAKE_DATA is enabled
    if (isInDemoSession() || USE_FAKE_DATA) {
      return await getFakeOperationsMetrics(filters)
    }

    // Try RPC function first
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('get_operations_metrics', {
      p_org_id: filters.orgId,
      p_sub_org_id: filters.subOrgId || null,
      p_date_start: filters.dateRange?.start || null,
      p_date_end: filters.dateRange?.end || null,
    })

    if (!rpcError && rpcData) {
      return { data: (rpcData as unknown) as OperationsMetrics, error: null }
    }

    // When USE_FAKE_DATA is false, return error instead of falling back to fake data
    debug.error('Failed to fetch operations metrics', rpcError?.message || String(rpcError))
    return { data: null, error: rpcError ? classifySupabaseError(rpcError) : new Error('Failed to fetch operations metrics') }
  } catch (err) {
    debug.error('Error fetching operations metrics', err instanceof Error ? err.message : String(err))
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get revenue metrics
 */
export async function getRevenueMetrics(
  filters: ReportFilters
): Promise<{ data: RevenueMetrics | null; error: Error | null }> {
  try {
    const validationError = validateFilters(filters)
    if (validationError) {
      return { data: null, error: validationError }
    }

    // Use fake data in demo session or if USE_FAKE_DATA is enabled
    if (isInDemoSession() || USE_FAKE_DATA) {
      return await getFakeRevenueMetrics(filters)
    }

    // Try RPC function first
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('get_revenue_metrics', {
      p_org_id: filters.orgId,
      p_sub_org_id: filters.subOrgId || null,
      p_season_id: filters.seasonId || null,
      p_sport_id: filters.sportId || null,
      p_program_id: filters.programId || null,
      p_level_id: filters.levelId || null,
      p_team_id: filters.teamId || null,
      p_date_start: filters.dateRange?.start || null,
      p_date_end: filters.dateRange?.end || null,
    })

    if (!rpcError && rpcData) {
      return { data: (rpcData as unknown) as RevenueMetrics, error: null }
    }

    // When USE_FAKE_DATA is false, return error instead of falling back to fake data
    debug.error('Failed to fetch revenue metrics', rpcError?.message || String(rpcError))
    return { data: null, error: rpcError ? classifySupabaseError(rpcError) : new Error('Failed to fetch revenue metrics') }
  } catch (err) {
    debug.error('Error fetching revenue metrics', err instanceof Error ? err.message : String(err))
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get ticketing metrics
 */
export async function getTicketingMetrics(
  filters: ReportFilters
): Promise<{ data: TicketingMetrics | null; error: Error | null }> {
  try {
    const validationError = validateFilters(filters)
    if (validationError) {
      return { data: null, error: validationError }
    }

    // Use fake data in demo session or if USE_FAKE_DATA is enabled
    if (isInDemoSession() || USE_FAKE_DATA) {
      return await getFakeTicketingMetrics(filters)
    }

    // Try RPC function first
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('get_ticketing_metrics', {
      p_org_id: filters.orgId,
      p_sub_org_id: filters.subOrgId || null,
      p_season_id: filters.seasonId || null,
      p_sport_id: filters.sportId || null,
      p_program_id: filters.programId || null,
      p_level_id: filters.levelId || null,
      p_team_id: filters.teamId || null,
      p_date_start: filters.dateRange?.start || null,
      p_date_end: filters.dateRange?.end || null,
    })

    if (!rpcError && rpcData) {
      return { data: (rpcData as unknown) as TicketingMetrics, error: null }
    }
    debug.error('Failed to fetch ticketing metrics', rpcError?.message || String(rpcError))
    return { data: null, error: rpcError ? classifySupabaseError(rpcError) : new Error('Failed to fetch ticketing metrics') }
  } catch (err) {
    debug.error('Error fetching ticketing metrics', err instanceof Error ? err.message : String(err))
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get registration metrics
 */
export async function getRegistrationMetrics(
  filters: ReportFilters
): Promise<{ data: RegistrationMetrics | null; error: Error | null }> {
  try {
    const validationError = validateFilters(filters)
    if (validationError) {
      return { data: null, error: validationError }
    }

    // Use fake data in demo session or if USE_FAKE_DATA is enabled
    if (isInDemoSession() || USE_FAKE_DATA) {
      return await getFakeRegistrationMetrics(filters)
    }

    // Try RPC function first
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('get_registration_metrics', {
      p_org_id: filters.orgId,
      p_sub_org_id: filters.subOrgId || null,
      p_date_start: filters.dateRange?.start || null,
      p_date_end: filters.dateRange?.end || null,
    })

    if (!rpcError && rpcData) {
      return { data: (rpcData as unknown) as RegistrationMetrics, error: null }
    }

    // When USE_FAKE_DATA is false, return error instead of falling back to fake data
    debug.error('Failed to fetch registration metrics', rpcError?.message || String(rpcError))
    return { data: null, error: rpcError ? classifySupabaseError(rpcError) : new Error('Failed to fetch registration metrics') }
  } catch (err) {
    debug.error('Error fetching registration metrics', err instanceof Error ? err.message : String(err))
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get video metrics
 */
export async function getVideoMetrics(
  filters: ReportFilters
): Promise<{ data: VideoMetrics | null; error: Error | null }> {
  try {
    const validationError = validateFilters(filters)
    if (validationError) {
      return { data: null, error: validationError }
    }

    // Use fake data in demo session or if USE_FAKE_DATA is enabled
    if (isInDemoSession() || USE_FAKE_DATA) {
      return await getFakeVideoMetrics(filters)
    }

    // Try RPC function first
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('get_video_metrics', {
      p_org_id: filters.orgId,
      p_sub_org_id: filters.subOrgId || null,
      p_season_id: filters.seasonId || null,
      p_sport_id: filters.sportId || null,
      p_program_id: filters.programId || null,
      p_level_id: filters.levelId || null,
      p_team_id: filters.teamId || null,
      p_date_start: filters.dateRange?.start || null,
      p_date_end: filters.dateRange?.end || null,
    })

    if (!rpcError && rpcData) {
      return { data: (rpcData as unknown) as VideoMetrics, error: null }
    }

    // When USE_FAKE_DATA is false, return error instead of falling back to fake data
    debug.error('Failed to fetch video metrics', rpcError?.message || String(rpcError))
    return { data: null, error: rpcError ? classifySupabaseError(rpcError) : new Error('Failed to fetch video metrics') }
  } catch (err) {
    debug.error('Error fetching video metrics', err instanceof Error ? err.message : String(err))
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get events metrics
 */
export async function getEventsMetrics(
  filters: ReportFilters
): Promise<{ data: EventsMetrics | null; error: Error | null }> {
  try {
    const validationError = validateFilters(filters)
    if (validationError) {
      return { data: null, error: validationError }
    }

    // Use fake data in demo session or if USE_FAKE_DATA is enabled
    if (isInDemoSession() || USE_FAKE_DATA) {
      return await getFakeEventsMetrics(filters)
    }

    // Try RPC function first
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('get_events_metrics', {
      p_org_id: filters.orgId,
      p_sub_org_id: filters.subOrgId || null,
      p_season_id: filters.seasonId || null,
      p_sport_id: filters.sportId || null,
      p_program_id: filters.programId || null,
      p_level_id: filters.levelId || null,
      p_team_id: filters.teamId || null,
      p_date_start: filters.dateRange?.start || null,
      p_date_end: filters.dateRange?.end || null,
    })

    if (!rpcError && rpcData) {
      return { data: (rpcData as unknown) as EventsMetrics, error: null }
    }
    debug.error('Failed to fetch events metrics', rpcError?.message || String(rpcError))
    return { data: null, error: rpcError ? classifySupabaseError(rpcError) : new Error('Failed to fetch events metrics') }
  } catch (err) {
    debug.error('Error fetching events metrics', err instanceof Error ? err.message : String(err))
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get errors metrics
 */
export async function getErrorsMetrics(
  filters: ReportFilters
): Promise<{ data: ErrorsMetrics | null; error: Error | null }> {
  try {
    const validationError = validateFilters(filters)
    if (validationError) {
      return { data: null, error: validationError }
    }

    // Use fake data in demo session or if USE_FAKE_DATA is enabled
    if (isInDemoSession() || USE_FAKE_DATA) {
      return await getFakeErrorsMetrics(filters)
    }

    // Try RPC function first
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('get_errors_metrics', {
      p_org_id: filters.orgId,
      p_sub_org_id: filters.subOrgId || null,
      p_season_id: filters.seasonId || null,
      p_sport_id: filters.sportId || null,
      p_program_id: filters.programId || null,
      p_level_id: filters.levelId || null,
      p_team_id: filters.teamId || null,
      p_date_start: filters.dateRange?.start || null,
      p_date_end: filters.dateRange?.end || null,
    })

    if (!rpcError && rpcData) {
      return { data: (rpcData as unknown) as ErrorsMetrics, error: null }
    }

    // When USE_FAKE_DATA is false, return error instead of falling back to fake data
    debug.error('Failed to fetch errors metrics', rpcError?.message || String(rpcError))
    return { data: null, error: rpcError ? classifySupabaseError(rpcError) : new Error('Failed to fetch errors metrics') }
  } catch (err) {
    debug.error('Error fetching errors metrics', err instanceof Error ? err.message : String(err))
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
