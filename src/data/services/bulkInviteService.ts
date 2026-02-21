/**
 * Bulk Invite Service
 * 
 * Provides data access for bulk invite operations including:
 * - Template generation and download
 * - File upload and validation
 * - Import job execution and status tracking
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'

/** Local types for bulk_import_jobs (table may not be in generated Database types yet) */
export interface BulkInviteTotalsJson {
  unique_emails?: number
  athletes?: number
  guardians?: number
  coaches?: number
}

export interface BulkInviteProgressJson {
  step?: string
  completed?: number
  total?: number
}

interface BulkImportJobInsert {
  org_id: string
  created_by?: string
  status: string
  file_path: string | null
  file_name: string | null
  file_size_bytes: number | null
  totals_json?: unknown
}

export interface ValidationResult {
  valid: boolean
  blocking_errors: number
  warnings: number
  totals: {
    org_admins: number
    coaches: number
    guardians: number
    athletes: number
    unique_emails: number
  }
  row_errors: Array<{
    sheet: string
    row: number
    field?: string
    message: string
    severity: 'error' | 'warning'
  }>
  consolidated_preview: Array<{
    email: string
    name: string
    name_source: string
    roles: string[]
    is_new_user: boolean
    existing_org_member: boolean
    existing_roles: string[]
    name_conflicts: Array<{ sheet: string; name: string }>
  }>
  athlete_guardian_links: Array<{
    athlete_email: string
    athlete_name: string
    guardian_email: string
    guardian_name: string
    guardian_source: 'new' | 'existing'
    status: 'ok' | 'missing' | 'invalid'
  }>
}

export interface ImportJobStatus {
  id: string
  status: string
  progress_json: BulkInviteProgressJson | null
  totals_json: BulkInviteTotalsJson | null
  error_summary: Record<string, unknown> | null
  started_at: string | null
  finished_at: string | null
  created_at: string
  file_name: string | null
}

/**
 * Download bulk invite template
 */
export async function downloadBulkInviteTemplate(orgId: string): Promise<{ error: Error | null }> {
  console.groupCollapsed(`%cdownloadBulkInviteTemplate: ${orgId}`, 'color: #666; font-weight: bold;')
  debug.data('BulkInviteService.downloadBulkInviteTemplate', 'Request', { orgId })
  debug.perf.start('bulkInviteService.downloadBulkInviteTemplate')

  try {
    if (!orgId) {
      return { error: new Error('Organization ID is required') }
    }

    // Call Edge Function to generate template
    // The Edge Function returns the file directly as a blob response
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) {
      throw new Error('Not authenticated')
    }

    const url = `${supabaseUrl}/functions/v1/bulk-invite-generate-template?org_id=${encodeURIComponent(orgId)}`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to download template: ${response.statusText} - ${errorText}`)
    }

    const blob = await response.blob()
    const downloadUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = 'bulk-invite-template.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(downloadUrl)

    debug.perf.end('bulkInviteService.downloadBulkInviteTemplate')
    debug.flow('BulkInviteService.downloadBulkInviteTemplate', 'Template downloaded', { orgId })
    console.groupEnd()
    return { error: null }
  } catch (err) {
    debug.perf.end('bulkInviteService.downloadBulkInviteTemplate')
    debug.error('BulkInviteService.downloadBulkInviteTemplate', 'Download failed', { error: err, orgId })
    console.groupEnd()
    return { error: err instanceof Error ? err : new Error('Failed to download template') }
  }
}

/**
 * Upload file to storage and return file path
 */
export async function uploadBulkInviteFile(
  orgId: string,
  file: File
): Promise<{ filePath: string | null; error: Error | null }> {
  console.groupCollapsed(`%cuploadBulkInviteFile: ${orgId}`, 'color: #666; font-weight: bold;')
  debug.data('BulkInviteService.uploadBulkInviteFile', 'Request', { orgId, fileName: file.name })
  debug.perf.start('bulkInviteService.uploadBulkInviteFile')

  try {
    if (!orgId) {
      return { filePath: null, error: new Error('Organization ID is required') }
    }

    if (!file) {
      return { filePath: null, error: new Error('File is required') }
    }

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { filePath: null, error: new Error('Not authenticated') }
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ]
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
      return { filePath: null, error: new Error('Invalid file type. Please upload an XLSX or CSV file.') }
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return { filePath: null, error: new Error('File size exceeds 10MB limit') }
    }

    // Generate unique file path
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop() || 'xlsx'
    const filePath = `${user.id}/${orgId}/${timestamp}/upload.${fileExt}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('bulk-imports')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      throw uploadError
    }

    debug.perf.end('bulkInviteService.uploadBulkInviteFile')
    debug.flow('BulkInviteService.uploadBulkInviteFile', 'File uploaded', { orgId, filePath })
    console.groupEnd()
    return { filePath, error: null }
  } catch (err) {
    debug.perf.end('bulkInviteService.uploadBulkInviteFile')
    debug.error('BulkInviteService.uploadBulkInviteFile', 'Upload failed', { error: err, orgId })
    console.groupEnd()
    return { filePath: null, error: err instanceof Error ? err : new Error('Failed to upload file') }
  }
}

/**
 * Validate uploaded file
 */
export async function validateBulkInviteFile(
  orgId: string,
  filePath: string
): Promise<{ data: ValidationResult | null; error: Error | null }> {
  console.groupCollapsed(`%cvalidateBulkInviteFile: ${orgId}`, 'color: #666; font-weight: bold;')
  debug.data('BulkInviteService.validateBulkInviteFile', 'Request', { orgId, filePath })
  debug.perf.start('bulkInviteService.validateBulkInviteFile')

  try {
    if (!orgId || !filePath) {
      return { data: null, error: new Error('Organization ID and file path are required') }
    }

    // Call Edge Function to validate
    const { data, error } = await supabase.functions.invoke('bulk-invite-validate', {
      body: {
        org_id: orgId,
        file_path: filePath,
      },
    })

    if (error) {
      throw error
    }

    debug.perf.end('bulkInviteService.validateBulkInviteFile')
    debug.flow('BulkInviteService.validateBulkInviteFile', 'Validation completed', { orgId, valid: data?.valid })
    console.groupEnd()
    return { data: data as ValidationResult, error: null }
  } catch (err) {
    debug.perf.end('bulkInviteService.validateBulkInviteFile')
    debug.error('BulkInviteService.validateBulkInviteFile', 'Validation failed', { error: err, orgId })
    console.groupEnd()
    return { data: null, error: err instanceof Error ? err : new Error('Failed to validate file') }
  }
}

/**
 * Create import job and start import
 */
export async function startBulkInviteImport(
  orgId: string,
  filePath: string,
  fileName: string,
  fileSize: number,
  totals: ValidationResult['totals']
): Promise<{ data: { jobId: string } | null; error: Error | null }> {
  console.groupCollapsed(`%cstartBulkInviteImport: ${orgId}`, 'color: #666; font-weight: bold;')
  debug.data('BulkInviteService.startBulkInviteImport', 'Request', { orgId, filePath })
  debug.perf.start('bulkInviteService.startBulkInviteImport')

  try {
    if (!orgId || !filePath) {
      return { data: null, error: new Error('Organization ID and file path are required') }
    }

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: new Error('Not authenticated') }
    }

    // Create job record
    const jobData: BulkImportJobInsert = {
      org_id: orgId,
      created_by: user.id,
      status: 'validated',
      file_path: filePath,
      file_name: fileName,
      file_size_bytes: fileSize,
      totals_json: totals,
    }

    const { data: job, error: insertError } = await (supabase as any)
      .from('bulk_import_jobs')
      .insert(jobData)
      .select()
      .single()

    if (insertError || !job) {
      throw insertError || new Error('Failed to create job')
    }

    // Start import via Edge Function
    const { error: importError } = await supabase.functions.invoke('bulk-invite-import', {
      body: {
        job_id: job.id,
        org_id: orgId,
      },
    })

    if (importError) {
      // Update job to failed
      await (supabase as any)
        .from('bulk_import_jobs')
        .update({ status: 'failed', error_summary: { error: importError.message } })
        .eq('id', job.id)

      throw importError
    }

    debug.perf.end('bulkInviteService.startBulkInviteImport')
    debug.flow('BulkInviteService.startBulkInviteImport', 'Import started', { orgId, jobId: job.id })
    console.groupEnd()
    return { data: { jobId: job.id }, error: null }
  } catch (err) {
    debug.perf.end('bulkInviteService.startBulkInviteImport')
    debug.error('BulkInviteService.startBulkInviteImport', 'Import start failed', { error: err, orgId })
    console.groupEnd()
    return { data: null, error: err instanceof Error ? err : new Error('Failed to start import') }
  }
}

/**
 * Get import job status
 */
export async function getBulkInviteJobStatus(
  orgId: string,
  jobId: string
): Promise<{ data: ImportJobStatus | null; error: Error | null }> {
  try {
    if (!orgId || !jobId) {
      return { data: null, error: new Error('Organization ID and job ID are required') }
    }

    const { data, error } = await (supabase as any)
      .from('bulk_import_jobs')
      .select('id, status, progress_json, totals_json, error_summary, started_at, finished_at, created_at, file_name')
      .eq('id', jobId)
      .eq('org_id', orgId)
      .single()

    if (error || !data) {
      return { data: null, error: error || new Error('Job not found') }
    }

    return { data: data as unknown as ImportJobStatus, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Failed to get job status') }
  }
}

/**
 * Get import job history for organization
 */
export async function getBulkInviteJobHistory(
  orgId: string
): Promise<{ data: ImportJobStatus[] | null; error: Error | null }> {
  try {
    if (!orgId) {
      return { data: null, error: new Error('Organization ID is required') }
    }

    const { data, error } = await (supabase as any)
      .from('bulk_import_jobs')
      .select('id, status, progress_json, totals_json, error_summary, started_at, finished_at, created_at, file_name')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return { data: null, error }
    }

    return { data: (data || []) as ImportJobStatus[], error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Failed to get job history') }
  }
}

/**
 * Generate CSV with errors only for a completed job
 */
export async function downloadBulkInviteErrorsCSV(
  orgId: string,
  jobId: string
): Promise<{ error: Error | null }> {
  try {
    if (!orgId || !jobId) {
      return { error: new Error('Organization ID and job ID are required') }
    }

    // Get job with error summary
    const { data: job, error: jobError } = await (supabase as any)
      .from('bulk_import_jobs')
      .select('error_summary, file_name')
      .eq('id', jobId)
      .eq('org_id', orgId)
      .single()

    if (jobError || !job) {
      return { error: jobError || new Error('Job not found') }
    }

    // Extract errors from error_summary
    const errorSummary = (job as { error_summary?: unknown }).error_summary as any
    const rowErrors = errorSummary?.row_errors || []

    // Filter only errors (not warnings)
    const errorsOnly = rowErrors.filter((e: any) => e.severity === 'error')

    if (errorsOnly.length === 0) {
      return { error: new Error('No errors found for this job') }
    }

    // Generate CSV
    const headers = ['Sheet', 'Row', 'Field', 'Message']
    const rows = errorsOnly.map((e: any) => [
      e.sheet || '',
      e.row || '',
      e.field || '',
      e.message || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row: string[]) => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const downloadUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `bulk-invite-errors-${jobId}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(downloadUrl)

    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Failed to generate CSV') }
  }
}
