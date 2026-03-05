/**
 * Admin Contact Request Detail Page
 *
 * Shows the full details of a single contact request from a guardian or athlete.
 * Allows the org admin to update status, assign, and add notes.
 *
 * For feature_request category:
 *   - Shows "Not included in current plan" badge
 *   - Shows demand signal count (how many others requested the same feature)
 *   - CTA routes to billing/plan upgrade flow
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useT } from '../../i18n/useI18n'
import { showSuccess, showError } from '../../utils/toast'
import { captureEvent } from '../../lib/analytics/analytics'
import {
  getOrgContactRequest,
  updateOrgContactRequest,
  getFeatureRequestCount,
} from '../../data/services/contactRequestsService'
import type {
  OrgContactRequest,
  OrgContactRequestUpdate,
  ContactRequestStatus,
} from '../../types/contactRequests'
import { CONTACT_REQUEST_STATUSES } from '../../types/contactRequests'
import {
  AdminPageHeader,
  Badge,
  Card,
  Button,
  ErrorState,
  AdminLoadingSpinner,
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

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

// ============================================================================
// Component
// ============================================================================

export default function AdminContactRequestDetail() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id

  const [request, setRequest] = useState<OrgContactRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Workflow edits
  const [status, setStatus] = useState<ContactRequestStatus>('new')
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Demand signal
  const [featureCount30d, setFeatureCount30d] = useState<number | null>(null)

  // ============================================================================
  // Load request
  // ============================================================================

  const loadRequest = useCallback(async () => {
    if (!id) {
      setLoadError(t('admin.contactRequests.detail.loadError'))
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)

    const { data, error } = await getOrgContactRequest(id)

    setLoading(false)
    if (error || !data) {
      setLoadError(t('admin.contactRequests.detail.loadError'))
      return
    }

    setRequest(data)
    setStatus(data.status)
    setAdminNotes(data.admin_notes ?? '')

    captureEvent('org_admin_request_viewed', {
      request_id: data.id,
      category: data.category,
      org_id: data.org_id,
    })

    // Load demand signal for feature requests
    if (data.category === 'feature_request' && data.requested_feature_key && orgId) {
      getFeatureRequestCount(orgId, data.requested_feature_key, 30).then(res => {
        if (!res.error && res.data !== null) {
          setFeatureCount30d(res.data)
        }
      })
    }
  }, [id, orgId, t])

  useEffect(() => {
    loadRequest()
  }, [loadRequest])

  // ============================================================================
  // Save handler
  // ============================================================================

  async function handleSave() {
    if (!request || saving) return
    setSaving(true)

    const updates: OrgContactRequestUpdate = {
      status,
      admin_notes: adminNotes.trim() || null,
    }

    const { error } = await updateOrgContactRequest(request.id, updates)

    setSaving(false)

    if (error) {
      showError(t('admin.contactRequests.detail.saveError'))
      return
    }

    showSuccess(t('admin.contactRequests.detail.saveSuccess'))
    setRequest(prev => prev ? { ...prev, ...updates, updated_at: new Date().toISOString() } : prev)

    captureEvent('org_admin_request_resolved', {
      request_id: request.id,
      category: request.category,
      new_status: status,
      org_id: request.org_id,
    })
  }

  // ============================================================================
  // Render: loading / error
  // ============================================================================

  if (loading) {
    return (
      <div className="oa-page">
        <AdminPageHeader title={t('admin.contactRequests.detail.title')} />
        <AdminLoadingSpinner />
      </div>
    )
  }

  if (loadError || !request) {
    return (
      <div className="oa-page">
        <AdminPageHeader title={t('admin.contactRequests.detail.title')} />
        <ErrorState
          message={loadError ?? t('common.error.loadFailed')}
          onRetry={loadRequest}
        />
      </div>
    )
  }

  const isFeatureRequest = request.category === 'feature_request'

  // ============================================================================
  // Render: detail
  // ============================================================================

  return (
    <div className="oa-page">
      <AdminPageHeader
        title={t('admin.contactRequests.detail.title')}
        breadcrumbs={[
          { label: t('admin.contactRequests.title'), path: getLink('admin.contactRequests.list') },
          { label: t('admin.contactRequests.detail.title') },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">

        {/* Left column: request details */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Request summary card */}
          <Card>
            <div className="oa-card-body">
              {/* Category + status row */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                    {t('admin.contactRequests.detail.category')}
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-100">
                    {t(`admin.contactRequests.categories.${request.category}`)}
                  </div>
                </div>
                <Badge variant={statusVariant(request.status)}>
                  {t(`admin.contactRequests.statuses.${request.status}`)}
                </Badge>
              </div>

              {/* Feature request details */}
              {isFeatureRequest && request.requested_feature_name && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg">
                      lock
                    </span>
                    <span className="font-semibold text-amber-800 dark:text-amber-200">
                      {request.requested_feature_name}
                    </span>
                    <Badge variant="warning">
                      {t('admin.contactRequests.detail.notInPlan')}
                    </Badge>
                  </div>
                  {request.requested_feature_use_case && (
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-1">
                      <strong>{t('admin.contactRequests.detail.recommendedAction')}:</strong>{' '}
                      {t('admin.contactRequests.detail.upgradePlan')}
                    </p>
                  )}
                  {featureCount30d !== null && featureCount30d > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                      {t('admin.contactRequests.detail.demandSignal', {
                        count: featureCount30d,
                        days: 30,
                      })}
                    </p>
                  )}
                </div>
              )}

              {/* Metadata table */}
              <dl className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <dt className="text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                    {t('admin.contactRequests.detail.submittedBy')}
                  </dt>
                  <dd className="text-slate-800 dark:text-slate-100 capitalize">
                    {t(`admin.contactRequests.roles.${request.requester_role}` as any)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                    {t('admin.contactRequests.detail.submittedOn')}
                  </dt>
                  <dd className="text-slate-800 dark:text-slate-100">
                    {formatDateTime(request.created_at)}
                  </dd>
                </div>
                {request.requested_feature_key && (
                  <div className="col-span-2">
                    <dt className="text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                      {t('admin.contactRequests.detail.featureRequested')}
                    </dt>
                    <dd className="font-mono text-sm text-slate-700 dark:text-slate-300">
                      {request.requested_feature_key}
                    </dd>
                  </div>
                )}
                <div className="col-span-2">
                  <dt className="text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                    {t('admin.contactRequests.detail.requestId')}
                  </dt>
                  <dd className="font-mono text-xs text-slate-400 dark:text-slate-500 break-all">
                    {request.id}
                  </dd>
                </div>
              </dl>

              {/* Message */}
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                  {t('admin.contactRequests.detail.message')}
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg px-4 py-3 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                  {request.message}
                </div>
              </div>

              {/* Feature reason (if any) */}
              {request.requested_feature_reason && (
                <div className="mt-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                    {t('admin.contactRequests.detail.featureRequested')}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 italic">
                    {request.requested_feature_reason}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Upgrade CTA for feature requests */}
          {isFeatureRequest && (
            <Card>
              <div className="oa-card-body">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                  {t('admin.contactRequests.detail.recommendedAction')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  {t('admin.contactRequests.detail.upgradePlan')}
                </p>
                <Button
                  variant="primary"
                  icon="upgrade"
                  as="a"
                  href={getLink('admin.contactRequests.list').replace('contact-requests', 'organization/billing/plan-selection')}
                  onClick={() => {
                    captureEvent('org_admin_clicked_upgrade_plan', {
                      request_id: request.id,
                      feature_key: request.requested_feature_key ?? '',
                      org_id: request.org_id,
                    })
                  }}
                >
                  {t('admin.contactRequests.detail.upgradeAction')}
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Right column: workflow controls */}
        <div className="flex flex-col gap-6">
          <Card title={t('admin.contactRequests.detail.status')}>
            <div className="oa-card-body">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                {t('admin.contactRequests.detail.status')}
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as ContactRequestStatus)}
                className="oa-input w-full mb-4"
              >
                {CONTACT_REQUEST_STATUSES.map(s => (
                  <option key={s} value={s}>
                    {t(`admin.contactRequests.statuses.${s}`)}
                  </option>
                ))}
              </select>

              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                {t('admin.contactRequests.detail.adminNotes')}
              </label>
              <textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder={t('admin.contactRequests.detail.adminNotesPlaceholder')}
                rows={5}
                className="oa-input w-full mb-4"
              />

              <Button
                variant="primary"
                loading={saving}
                onClick={handleSave}
                disabled={saving}
                className="w-full"
              >
                {saving
                  ? t('admin.contactRequests.detail.saving')
                  : t('admin.contactRequests.detail.saveChanges')
                }
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
