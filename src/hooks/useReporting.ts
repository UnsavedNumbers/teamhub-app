/**
 * Reporting Hooks
 *
 * React Query hooks for the reporting console.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { useOrganization } from '../contexts/OrganizationContext'
import {
  getSavedReports,
  getSavedReportById,
  getSavedReportByToken,
  createSavedReport,
  updateSavedReport,
  deleteSavedReport,
  getScheduledReports,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  getExportHistory,
  createExportHistory,
  updateExportHistory,
  getOrgHealthMetrics,
  getParticipationMetrics,
  getSchedulingMetrics,
  getTravelMetrics,
  getPaymentMetrics,
  getUniformMetrics,
  getCommunicationMetrics,
  getOperationsMetrics,
  getRevenueMetrics,
  getTicketingMetrics,
  getRegistrationMetrics,
  getVideoMetrics,
  getEventsMetrics,
  getErrorsMetrics,
} from '../data/services/reportingService'
import type {
  CreateSavedReportInput,
  UpdateSavedReportInput,
  CreateScheduledReportInput,
  UpdateScheduledReportInput,
  ReportFilters,
} from '../types/reporting'
import { CACHE_TTL } from '../constants/api'

// ============================================================================
// Saved Reports Hooks
// ============================================================================

/**
 * Get all saved reports for the current user and organization
 */
export function useSavedReports() {
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()

  return useQuery({
    queryKey: ['savedReports', currentOrganization?.id, profile?.id],
    queryFn: async () => {
      if (!currentOrganization?.id || !profile?.id) {
        throw new Error('Organization and user context required')
      }
      const result = await getSavedReports(currentOrganization.id, profile.id)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!currentOrganization?.id && !!profile?.id,
    staleTime: CACHE_TTL.FEATURE_GATE_MS,
  })
}

/**
 * Get a saved report by ID
 */
export function useSavedReport(reportId: string | null) {
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()

  return useQuery({
    queryKey: ['savedReport', reportId, currentOrganization?.id, profile?.id],
    queryFn: async () => {
      if (!reportId || !currentOrganization?.id || !profile?.id) {
        throw new Error('Report ID, organization, and user context required')
      }
      const result = await getSavedReportById(reportId, currentOrganization.id, profile.id)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!reportId && !!currentOrganization?.id && !!profile?.id,
    staleTime: CACHE_TTL.FEATURE_GATE_MS,
  })
}

/**
 * Get a saved report by share token
 */
export function useSavedReportByToken(shareToken: string | null) {
  return useQuery({
    queryKey: ['savedReportByToken', shareToken],
    queryFn: async () => {
      if (!shareToken) {
        throw new Error('Share token is required')
      }
      const result = await getSavedReportByToken(shareToken)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!shareToken,
    staleTime: CACHE_TTL.FEATURE_GATE_MS,
  })
}

/**
 * Create a saved report mutation
 */
export function useCreateSavedReport() {
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateSavedReportInput) => {
      if (!currentOrganization?.id || !profile?.id) {
        throw new Error('Organization and user context required')
      }
      const result = await createSavedReport(input, currentOrganization.id, profile.id)
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedReports'] })
    },
  })
}

/**
 * Update a saved report mutation
 */
export function useUpdateSavedReport() {
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ reportId, input }: { reportId: string; input: UpdateSavedReportInput }) => {
      if (!currentOrganization?.id || !profile?.id) {
        throw new Error('Organization and user context required')
      }
      const result = await updateSavedReport(reportId, input, currentOrganization.id, profile.id)
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['savedReports'] })
      queryClient.invalidateQueries({ queryKey: ['savedReport', variables.reportId] })
    },
  })
}

/**
 * Delete a saved report mutation
 */
export function useDeleteSavedReport() {
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reportId: string) => {
      if (!currentOrganization?.id || !profile?.id) {
        throw new Error('Organization and user context required')
      }
      const result = await deleteSavedReport(reportId, currentOrganization.id, profile.id)
      if (result.error) throw result.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedReports'] })
    },
  })
}

// ============================================================================
// Scheduled Reports Hooks
// ============================================================================

/**
 * Get all scheduled reports for the organization
 */
export function useScheduledReports() {
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()

  return useQuery({
    queryKey: ['scheduledReports', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id || !profile?.id) {
        throw new Error('Organization and user context required')
      }
      const result = await getScheduledReports(currentOrganization.id, profile.id)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!currentOrganization?.id && !!profile?.id,
    staleTime: CACHE_TTL.FEATURE_GATE_MS,
  })
}

/**
 * Create a scheduled report mutation
 */
export function useCreateScheduledReport() {
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateScheduledReportInput) => {
      if (!currentOrganization?.id || !profile?.id) {
        throw new Error('Organization and user context required')
      }
      const result = await createScheduledReport(input, currentOrganization.id, profile.id)
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledReports'] })
    },
  })
}

/**
 * Update a scheduled report mutation
 */
export function useUpdateScheduledReport() {
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ reportId, input }: { reportId: string; input: UpdateScheduledReportInput }) => {
      if (!currentOrganization?.id || !profile?.id) {
        throw new Error('Organization and user context required')
      }
      const result = await updateScheduledReport(reportId, input, currentOrganization.id, profile.id)
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledReports'] })
    },
  })
}

/**
 * Delete a scheduled report mutation
 */
export function useDeleteScheduledReport() {
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reportId: string) => {
      if (!currentOrganization?.id || !profile?.id) {
        throw new Error('Organization and user context required')
      }
      const result = await deleteScheduledReport(reportId, currentOrganization.id, profile.id)
      if (result.error) throw result.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledReports'] })
    },
  })
}

// ============================================================================
// Export History Hooks
// ============================================================================

/**
 * Get export history for the organization
 */
export function useExportHistory(limit: number = 50) {
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()

  return useQuery({
    queryKey: ['exportHistory', currentOrganization?.id, limit],
    queryFn: async () => {
      if (!currentOrganization?.id || !profile?.id) {
        throw new Error('Organization and user context required')
      }
      const result = await getExportHistory(currentOrganization.id, profile.id, limit)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!currentOrganization?.id && !!profile?.id,
    staleTime: CACHE_TTL.FEATURE_GATE_MS,
  })
}

/**
 * Create export history mutation
 */
export function useCreateExportHistory() {
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ reportConfig, format }: { reportConfig: unknown; format: 'csv' | 'xlsx' | 'pdf' }) => {
      if (!currentOrganization?.id || !profile?.id) {
        throw new Error('Organization and user context required')
      }
      const result = await createExportHistory(reportConfig, format, currentOrganization.id, profile.id)
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportHistory'] })
    },
  })
}

/**
 * Update export history mutation
 */
export function useUpdateExportHistory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ historyId, updates }: { historyId: string; updates: { status?: 'pending' | 'processing' | 'completed' | 'failed'; file_url?: string; file_size_bytes?: number; error_message?: string } }) => {
      const result = await updateExportHistory(historyId, updates)
      if (result.error) throw result.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportHistory'] })
    },
  })
}

// ============================================================================
// Metric Hooks
// ============================================================================

/**
 * Get organization health metrics
 */
export function useOrgHealthMetrics(filters: ReportFilters | null) {
  return useQuery({
    queryKey: ['orgHealthMetrics', filters],
    queryFn: async () => {
      if (!filters) {
        throw new Error('Filters are required')
      }
      const result = await getOrgHealthMetrics(filters)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!filters && !!filters.orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get participation metrics
 */
export function useParticipationMetrics(filters: ReportFilters | null) {
  return useQuery({
    queryKey: ['participationMetrics', filters],
    queryFn: async () => {
      if (!filters) {
        throw new Error('Filters are required')
      }
      const result = await getParticipationMetrics(filters)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!filters && !!filters.orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get scheduling metrics
 */
export function useSchedulingMetrics(filters: ReportFilters | null) {
  return useQuery({
    queryKey: ['schedulingMetrics', filters],
    queryFn: async () => {
      if (!filters) {
        throw new Error('Filters are required')
      }
      const result = await getSchedulingMetrics(filters)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!filters && !!filters.orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get travel metrics
 */
export function useTravelMetrics(filters: ReportFilters | null) {
  return useQuery({
    queryKey: ['travelMetrics', filters],
    queryFn: async () => {
      if (!filters) {
        throw new Error('Filters are required')
      }
      const result = await getTravelMetrics(filters)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!filters && !!filters.orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get payment metrics
 */
export function usePaymentMetrics(filters: ReportFilters | null) {
  return useQuery({
    queryKey: ['paymentMetrics', filters],
    queryFn: async () => {
      if (!filters) {
        throw new Error('Filters are required')
      }
      const result = await getPaymentMetrics(filters)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!filters && !!filters.orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get uniform metrics
 */
export function useUniformMetrics(filters: ReportFilters | null) {
  return useQuery({
    queryKey: ['uniformMetrics', filters],
    queryFn: async () => {
      if (!filters) {
        throw new Error('Filters are required')
      }
      const result = await getUniformMetrics(filters)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!filters && !!filters.orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get communication metrics
 */
export function useCommunicationMetrics(filters: ReportFilters | null) {
  return useQuery({
    queryKey: ['communicationMetrics', filters],
    queryFn: async () => {
      if (!filters) {
        throw new Error('Filters are required')
      }
      const result = await getCommunicationMetrics(filters)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!filters && !!filters.orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get operations metrics
 */
export function useOperationsMetrics(filters: ReportFilters | null) {
  return useQuery({
    queryKey: ['operationsMetrics', filters],
    queryFn: async () => {
      if (!filters) {
        throw new Error('Filters are required')
      }
      const result = await getOperationsMetrics(filters)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!filters && !!filters.orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get revenue metrics
 */
export function useRevenueMetrics(filters: ReportFilters | null) {
  return useQuery({
    queryKey: ['revenueMetrics', filters],
    queryFn: async () => {
      if (!filters) {
        throw new Error('Filters are required')
      }
      const result = await getRevenueMetrics(filters)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!filters && !!filters.orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get ticketing metrics
 */
export function useTicketingMetrics(filters: ReportFilters | null) {
  return useQuery({
    queryKey: ['ticketingMetrics', filters],
    queryFn: async () => {
      if (!filters) {
        throw new Error('Filters are required')
      }
      const result = await getTicketingMetrics(filters)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!filters && !!filters.orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get registration metrics
 */
export function useRegistrationMetrics(filters: ReportFilters | null) {
  return useQuery({
    queryKey: ['registrationMetrics', filters],
    queryFn: async () => {
      if (!filters) {
        throw new Error('Filters are required')
      }
      const result = await getRegistrationMetrics(filters)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!filters && !!filters.orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get video metrics
 */
export function useVideoMetrics(filters: ReportFilters | null) {
  return useQuery({
    queryKey: ['videoMetrics', filters],
    queryFn: async () => {
      if (!filters) {
        throw new Error('Filters are required')
      }
      const result = await getVideoMetrics(filters)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!filters && !!filters.orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get events metrics
 */
export function useEventsMetrics(filters: ReportFilters | null) {
  return useQuery({
    queryKey: ['eventsMetrics', filters],
    queryFn: async () => {
      if (!filters) {
        throw new Error('Filters are required')
      }
      const result = await getEventsMetrics(filters)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!filters && !!filters.orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get errors metrics
 */
export function useErrorsMetrics(filters: ReportFilters | null) {
  return useQuery({
    queryKey: ['errorsMetrics', filters],
    queryFn: async () => {
      if (!filters) {
        throw new Error('Filters are required')
      }
      const result = await getErrorsMetrics(filters)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!filters && !!filters.orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
