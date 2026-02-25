/**
 * Admin Contact Requests Page
 *
 * Shows all contact requests submitted by guardians/athletes in the current org.
 * Supports filtering by status, category, and date range.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useT } from '../../i18n/useI18n'
import { captureEvent } from '../../lib/analytics/analytics'
import { getOrgContactRequests } from '../../data/services/contactRequestsService'
import type {
  OrgContactRequest,
  OrgContactRequestFilters,
  ContactRequestCategory,
  ContactRequestStatus,
} from '../../types/contactRequests'
import { CONTACT_REQUEST_CATEGORIES, CONTACT_REQUEST_STATUSES } from '../../types/contactRequests'
import {
  AdminPageHeader,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  AdminSkeletonTable,
  NoOrganizationEmptyState,
} from '../../components/admin'
import { getLink } from '../../utils/routes'
import '../../styles/orgAdmin.css'

// ============================================================================
// Helpers
// ============================================================================

function statusVariant(
  status: ContactRequestStatus
): 'info' | 'warning' | 'success' | 'neutral' {
  switch (status) {
    case 'new': return 'info'
    case 'open': return 'info'
    case 'in_progress': return 'warning'
    case 'resolved': return 'success'
    case 'closed': return 'neutral'
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

// ============================================================================
// Component
// ============================================================================

export default function AdminContactRequests() {
  const t = useT()
  const navigate = useNavigate()
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id

  const [requests, setRequests] = useState<OrgContactRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState<OrgContactRequestFilters>({})
  const [page, setPage] = useState(0)
  const ROW_LIMIT = 25

  // ============================================================================
  // Data loading
  // ============================================================================

  const loadRequests = useCallback(async () => {
    if (!orgId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const { data, error: err } = await getOrgContactRequests(orgId, filters, page, ROW_LIMIT)

    setLoading(false)
    if (err) {
      setError(t('common.error.loadFailed'))
    } else {
      setRequests(data ?? [])
    }
  }, [orgId, filters, page, t])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  // ============================================================================
  // No org guard
  // ============================================================================

  if (!orgId) {
    return (
      <div className="oa-page">
        <AdminPageHeader title={t('admin.contactRequests.title')} />
        <NoOrganizationEmptyState />
      </div>
    )
  }

  // ============================================================================
  // Filter helpers
  // ============================================================================

  function setStatusFilter(value: string) {
    setFilters(prev => ({ ...prev, status: (value || undefined) as ContactRequestStatus | undefined }))
    setPage(0)
  }

  function setCategoryFilter(value: string) {
    setFilters(prev => ({ ...prev, category: (value || undefined) as ContactRequestCategory | undefined }))
    setPage(0)
  }

  function setDateFrom(value: string) {
    setFilters(prev => ({ ...prev, date_from: value || undefined }))
    setPage(0)
  }

  function setDateTo(value: string) {
    setFilters(prev => ({ ...prev, date_to: value || undefined }))
    setPage(0)
  }

  function handleRowClick(request: OrgContactRequest) {
    captureEvent('org_admin_request_viewed', {
      request_id: request.id,
      category: request.category,
      org_id: orgId,
    })
    navigate(getLink('admin.contactRequests.detail', { id: request.id }))
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="oa-page">
      <AdminPageHeader
        title={t('admin.contactRequests.title')}
        subtitle={t('admin.contactRequests.subtitle')}
      />

      {/* Filters */}
      <Card className="mb-6">
        <div className="oa-card-body">
          <div className="flex flex-wrap gap-3">
            {/* Status filter */}
            <select
              value={filters.status ?? ''}
              onChange={e => setStatusFilter(e.target.value)}
              className="oa-input oa-input--compact"
              aria-label={t('admin.contactRequests.filters.allStatuses')}
            >
              <option value="">{t('admin.contactRequests.filters.allStatuses')}</option>
              {CONTACT_REQUEST_STATUSES.map(s => (
                <option key={s} value={s}>
                  {t(`admin.contactRequests.statuses.${s}`)}
                </option>
              ))}
            </select>

            {/* Category filter */}
            <select
              value={filters.category ?? ''}
              onChange={e => setCategoryFilter(e.target.value)}
              className="oa-input oa-input--compact"
              aria-label={t('admin.contactRequests.filters.allCategories')}
            >
              <option value="">{t('admin.contactRequests.filters.allCategories')}</option>
              {CONTACT_REQUEST_CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {t(`admin.contactRequests.categories.${c}`)}
                </option>
              ))}
            </select>

            {/* Date range */}
            <input
              type="date"
              value={filters.date_from ?? ''}
              onChange={e => setDateFrom(e.target.value)}
              className="oa-input oa-input--compact"
              aria-label={t('admin.contactRequests.filters.dateFrom')}
            />
            <input
              type="date"
              value={filters.date_to ?? ''}
              onChange={e => setDateTo(e.target.value)}
              className="oa-input oa-input--compact"
              aria-label={t('admin.contactRequests.filters.dateTo')}
            />
          </div>
        </div>
      </Card>

      {/* Content */}
      {loading && <AdminSkeletonTable rows={8} />}

      {!loading && error && (
        <ErrorState
          message={error}
          onRetry={loadRequests}
        />
      )}

      {!loading && !error && requests.length === 0 && (
        <EmptyState
          icon="inbox"
          title={t('admin.contactRequests.noRequests')}
          description={t('admin.contactRequests.noRequestsMessage')}
        />
      )}

      {!loading && !error && requests.length > 0 && (
        <Card>
          <div className="oa-table-wrapper">
            <table className="oa-table">
              <thead>
                <tr>
                  <th>{t('admin.contactRequests.columns.date')}</th>
                  <th>{t('admin.contactRequests.columns.category')}</th>
                  <th>{t('admin.contactRequests.columns.message')}</th>
                  <th>{t('admin.contactRequests.columns.requester')}</th>
                  <th>{t('admin.contactRequests.columns.status')}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr
                    key={req.id}
                    className="oa-table-row cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    onClick={() => handleRowClick(req)}
                  >
                    <td className="whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(req.created_at)}
                    </td>
                    <td>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t(`admin.contactRequests.categories.${req.category}`)}
                      </span>
                      {req.category === 'feature_request' && req.requested_feature_name && (
                        <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                          {req.requested_feature_name}
                        </div>
                      )}
                    </td>
                    <td className="max-w-xs">
                      <p className="text-sm text-slate-600 dark:text-slate-300 truncate">
                        {req.message}
                      </p>
                    </td>
                    <td>
                      <span className="text-sm text-slate-500 dark:text-slate-400 capitalize">
                        {t(`admin.contactRequests.roles.${req.requester_role}` as any)}
                      </span>
                    </td>
                    <td>
                      <Badge variant={statusVariant(req.status)}>
                        {t(`admin.contactRequests.statuses.${req.status}`)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(page > 0 || requests.length === ROW_LIMIT) && (
            <div className="oa-table-pagination">
              <button
                type="button"
                className="oa-btn oa-btn--ghost oa-btn--compact"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                {t('common.table.previousPage')}
              </button>
              <span className="text-sm text-slate-500 dark:text-slate-400 px-4">
                {t('common.table.page')} {page + 1}
              </span>
              <button
                type="button"
                className="oa-btn oa-btn--ghost oa-btn--compact"
                onClick={() => setPage(p => p + 1)}
                disabled={requests.length < ROW_LIMIT}
              >
                {t('common.table.nextPage')}
              </button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
