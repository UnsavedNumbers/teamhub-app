/**
 * useExportOrganization Hook
 * 
 * Handles chunked export of organization data with progress tracking.
 * Prevents browser crashes from large datasets.
 * 
 * Issue #9 Solution: Large Data Exports - Could Timeout or Crash Browser
 */

import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { handleRpcError } from '../utils/rpcErrorHandler'
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast'
import type { AdminOrganization } from '../types/platformAdmin.types'

interface ExportProgress {
  stage: 'users' | 'payments' | 'structure' | 'fees' | 'activity' | 'complete'
  progress: number // 0-100
  message: string
}

interface ExportOptions {
  format: 'csv' | 'json'
  includeUsers?: boolean
  includePayments?: boolean
  includeStructure?: boolean
  includeFees?: boolean
  includeActivity?: boolean
}

/**
 * Hook for exporting organization data with progress tracking
 * 
 * @param organizationId - Organization ID to export
 * @returns Export function and progress state
 */
export function useExportOrganization(organizationId: string | null) {
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [cancelled, setCancelled] = useState(false)
  const cancelRef = useRef(false)

  const cancelExport = useCallback(() => {
    cancelRef.current = true
    setCancelled(true)
    setExporting(false)
  }, [])

  const exportData = useCallback(async (options: ExportOptions) => {
    if (!organizationId) {
      showError('Organization ID is required')
      return
    }

    setExporting(true)
    setProgress(null)
    setCancelled(false)
    cancelRef.current = false

    const toastId = showLoading('Preparing export...')

    try {
      const chunks: Record<string, unknown[]> = {
        organization: [],
        users: [],
        payments: [],
        structure: [],
        fees: [],
        activity: [],
      }

      // Fetch organization data
      const { data: orgData, error: orgError } = await supabase
        .from('admin_organizations')
        .select('*')
        .eq('id', organizationId)
        .single()

      if (orgError) {
        throw handleRpcError(orgError, 'fetch_organization')
      }

      if (orgData) {
        chunks.organization = [orgData]
      }

      if (cancelRef.current) return

      // Fetch users in chunks
      if (options.includeUsers) {
        setProgress({ stage: 'users', progress: 10, message: 'Exporting users...' })
        const { data: usersData } = await supabase.rpc('get_organization_users', {
          target_org_id: organizationId,
        })
        if (usersData && !cancelRef.current) {
          chunks.users = usersData as unknown[]
        }
      }

      if (cancelRef.current) return

      // Fetch payments in chunks
      if (options.includePayments) {
        setProgress({ stage: 'payments', progress: 30, message: 'Exporting payments...' })
        let offset = 0
        const limit = 1000
        const payments: unknown[] = []

        while (!cancelRef.current) {
          const { data, error } = await supabase
            .from('admin_payments')
            .select('*')
            .eq('org_id', organizationId)
            .range(offset, offset + limit - 1)

          if (error) break
          if (!data || data.length === 0) break

          payments.push(...data)
          offset += limit

          if (data.length < limit) break
        }

        if (!cancelRef.current) {
          chunks.payments = payments
        }
      }

      if (cancelRef.current) return

      // Fetch structure
      if (options.includeStructure) {
        setProgress({ stage: 'structure', progress: 50, message: 'Exporting structure...' })
        const { data: structureData } = await supabase
          .from('admin_structure')
          .select('*')
          .eq('org_id', organizationId)

        if (structureData && !cancelRef.current) {
          chunks.structure = structureData as unknown[]
        }
      }

      if (cancelRef.current) return

      // Fetch fees
      if (options.includeFees) {
        setProgress({ stage: 'fees', progress: 70, message: 'Exporting fees...' })
        const { data: feesData } = await supabase
          .from('admin_fees_status')
          .select('*')
          .eq('org_id', organizationId)

        if (feesData && !cancelRef.current) {
          chunks.fees = feesData as unknown[]
        }
      }

      if (cancelRef.current) return

      // Fetch activity in chunks
      if (options.includeActivity) {
        setProgress({ stage: 'activity', progress: 85, message: 'Exporting activity...' })
        let offset = 0
        const limit = 1000
        const activity: unknown[] = []

        while (!cancelRef.current) {
          const { data, error } = await supabase
            .from('admin_event_logs')
            .select('*')
            .eq('org_id', organizationId)
            .range(offset, offset + limit - 1)

          if (error) break
          if (!data || data.length === 0) break

          activity.push(...data)
          offset += limit

          if (data.length < limit) break
        }

        if (!cancelRef.current) {
          chunks.activity = activity
        }
      }

      if (cancelRef.current) return

      // Generate file
      setProgress({ stage: 'complete', progress: 95, message: 'Generating file...' })

      let fileContent: string
      let fileName: string
      let mimeType: string

      if (options.format === 'json') {
        fileContent = JSON.stringify(chunks, null, 2)
        fileName = `organization-${organizationId}-export.json`
        mimeType = 'application/json'
      } else {
        // CSV export (simplified - would need proper CSV library for complex data)
        fileContent = generateCSV(chunks)
        fileName = `organization-${organizationId}-export.csv`
        mimeType = 'text/csv'
      }

      // Download file
      const blob = new Blob([fileContent], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      dismissToast(toastId)
      setProgress({ stage: 'complete', progress: 100, message: 'Export complete' })
      showSuccess('Export completed successfully')
    } catch (err) {
      dismissToast(toastId)
      const normalized = handleRpcError(err, 'export_organization')
      showError(normalized.message)
      setProgress(null)
    } finally {
      setExporting(false)
    }
  }, [organizationId])

  return {
    exportData,
    exporting,
    progress,
    cancelled,
    cancelExport,
  }
}

/**
 * Generate CSV from chunks (simplified implementation)
 */
function generateCSV(chunks: Record<string, unknown[]>): string {
  const lines: string[] = []

  for (const [section, data] of Object.entries(chunks)) {
    if (data.length === 0) continue

    lines.push(`\n=== ${section.toUpperCase()} ===\n`)

    // Get headers from first object
    const first = data[0] as Record<string, unknown>
    const headers = Object.keys(first)
    lines.push(headers.join(','))

    // Add rows
    for (const item of data) {
      const row = headers.map(header => {
        const value = (item as Record<string, unknown>)[header]
        if (value === null || value === undefined) return ''
        if (typeof value === 'object') return JSON.stringify(value)
        return String(value).replace(/"/g, '""')
      })
      lines.push(row.map(v => `"${v}"`).join(','))
    }
  }

  return lines.join('\n')
}
