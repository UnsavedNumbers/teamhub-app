import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useLicense } from '../../hooks/useLicense'
import { t } from '../../i18n'
import { formatDate } from '../../utils/licenseUtils'
import { createCustomerPortalSession, getBillingHistory, BillingEvent } from '../../api/billing'
import { BillingHistoryTimeline } from '../../components/admin/BillingHistoryTimeline'
import { getErrorMessage } from '../../utils/errorUtils'
import {
  getStatusMessage,
} from '../../utils/billingHelpers'
import { useIsMounted } from '../../hooks/useIsMounted'
import {
  AdminPageHeader,
  Card,
  Button,
  Badge,
} from '../../components/platformAdmin'
import '../../styles/orgAdmin.css'

export default function OrganizationBilling() {
  const navigate = useNavigate()
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id
  const isMounted = useIsMounted()

  const { summary, loading, error } = useLicense(orgId)

  const [history, setHistory] = useState<BillingEvent[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const loadHistory = useCallback(async (organizationId: string) => {
    if (!organizationId) return

    setHistoryLoading(true)
    setHistoryError(null)

    try {
      const events = await getBillingHistory(organizationId)
      // Check if component is still mounted before updating state
      if (isMounted.current) {
        setHistory(events)
      }
    } catch (err: unknown) {
      if (isMounted.current) {
        setHistoryError(getErrorMessage(err))
      }
    } finally {
      if (isMounted.current) {
        setHistoryLoading(false)
      }
    }
  }, [isMounted])

  useEffect(() => {
    if (orgId) {
      loadHistory(orgId)
    }
  }, [orgId, loadHistory])

  const currentPlanLabel = useMemo(() => {
    return summary?.tierName ?? t('license.planLabel')
  }, [summary?.tierName])

  const statusMessage = useMemo(() => {
    return getStatusMessage(summary)
  }, [summary])

  const statusBadgeText = useMemo(() => {
    if (!summary?.status) return 'Unknown'
    switch (summary.status) {
      case 'active':
        return 'Active'
      case 'trial':
        return 'Trial'
      case 'past_due':
        return 'Past Due'
      case 'canceled':
        return 'Canceled'
      case 'expired':
        return 'Expired'
      default:
        return String(summary.status).replace('_', ' ').toUpperCase()
    }
  }, [summary?.status])

  const statusBadgeVariant = useMemo(() => {
    switch (summary?.status) {
      case 'active':
        return 'success'
      case 'trial':
        return 'info'
      case 'past_due':
        return 'warning'
      case 'expired':
        return 'danger'
      case 'canceled':
        return 'neutral'
      default:
        return 'neutral'
    }
  }, [summary?.status])

  const formatDateUppercase = useCallback((value?: string | null): string => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).toUpperCase()
  }, [])

  const isAutoRenewing = summary ? !summary.cancelAtPeriodEnd : false

  async function handleOpenPortal() {
    if (!orgId) return
    setPortalLoading(true)
    try {
      const { portal_url } = await createCustomerPortalSession({
        organizationId: orgId,
        returnUrl: `${window.location.origin}/admin/organization/billing`,
      })
      if (portal_url) {
        // Don't set state after navigation - window.location.href will navigate away
        window.location.href = portal_url
      }
    } catch (err: unknown) {
      if (isMounted.current) {
        setHistoryError(getErrorMessage(err) || t('billing.errorCreatingPortal'))
      }
    } finally {
      if (isMounted.current) {
        setPortalLoading(false)
      }
    }
  }

  function handleSelectPlan() {
    navigate('/admin/organization/billing/plan-selection')
  }

  function handleDownloadStatement() {
    // Open customer portal for invoice downloads
    handleOpenPortal()
  }

  if (!orgId) {
    return (
      <div className="pa-root">
        <Card className="oa-card pa-text-danger">
          {t('errors.missingOrganization')}
        </Card>
      </div>
    )
  }

  return (
    <div className="pa-root">
      <AdminPageHeader title={t('billing.pageTitle')} />

      {error && (
        <div
          className="pa-card pa-mb-4 pa-text-danger"
          style={{ background: 'var(--pa-danger-bg)', border: 'none' }}
        >
          {error}
        </div>
      )}

      <div className="oa-form-container" style={{ maxWidth: '896px', margin: '0 auto' }}>
        {/* Organization Subscription */}
        <Card className="oa-card pa-mb-6">
          <div className="pa-flex pa-flex-col md:pa-flex-row md:pa-items-center pa-justify-between pa-gap-6">
            <div>
              <div className="pa-flex pa-items-center pa-gap-3 pa-mb-2">
                <span className="pa-body-s pa-text-slate-500 pa-font-medium">
                  Organization Subscription
                </span>
                <Badge variant={statusBadgeVariant}>{statusBadgeText}</Badge>
              </div>
              <h1 className="pa-h1 pa-mb-4 pa-uppercase">
                Annual Organization License
              </h1>
              <p className="pa-body-s pa-text-slate-600 pa-mb-1">
                <span className="pa-font-semibold">Tier:</span> {currentPlanLabel}
              </p>
            </div>
            <div className="pa-shrink-0">
              <Button
                variant="primary"
                onClick={handleOpenPortal}
                loading={portalLoading}
                disabled={loading || portalLoading}
                className="pa-uppercase pa-font-semibold"
              >
                Manage Billing
              </Button>
            </div>
          </div>
        </Card>

        {/* Billing Summary */}
        <Card className="oa-card pa-mb-6">
          <div className="pa-flex pa-items-center pa-justify-between pa-mb-4">
            <h2 className="pa-h3 pa-font-semibold">
              Billing Summary
            </h2>
            <Button
              variant="ghost"
              size="compact"
              icon="download"
              onClick={handleDownloadStatement}
            >
              Download Statement
            </Button>
          </div>
          <div className="pa-flex pa-flex-wrap pa-gap-6">
            <div>
              <p className="pa-body-xs pa-text-slate-500 pa-mb-1">
                Base Plan
              </p>
              <p className="pa-body-s pa-font-medium">
                {summary?.plan ? `${currentPlanLabel} / yr` : '—'}
              </p>
            </div>
            <div>
              <p className="pa-body-xs pa-text-slate-500 pa-mb-1">
                Next Payment Due
              </p>
              <p className="pa-body-s pa-font-medium">
                {summary?.currentPeriodEnd ? formatDate(summary.currentPeriodEnd) : '—'}
              </p>
            </div>
          </div>
        </Card>

        {/* Renewal & Payment */}
        <Card className="oa-card pa-mb-6">
          <h2 className="pa-h3 pa-font-semibold pa-mb-4">
            Renewal & Payment
          </h2>
          <div className="pa-flex pa-flex-col pa-gap-4">
            <div className="pa-flex pa-items-center pa-justify-between">
              <div>
                <p className="pa-body-s pa-font-semibold pa-mb-0">
                  Payment method managed in Stripe
                </p>
                <p className="pa-body-xs pa-text-slate-500">
                  Update payment method in customer portal
                </p>
              </div>
              <Button variant="secondary" onClick={handleOpenPortal} disabled={portalLoading || loading}>
                Update
              </Button>
            </div>
            <div className="pa-flex pa-items-center pa-justify-between">
              <div>
                <p className="pa-body-s pa-font-semibold pa-mb-0">
                  {isAutoRenewing ? 'Auto-Renewal is On' : 'Auto-Renewal is Off'}
                </p>
                <p className="pa-body-xs pa-text-slate-500">
                  {isAutoRenewing
                    ? summary?.currentPeriodEnd
                      ? `Renews on ${formatDate(summary.currentPeriodEnd)}.`
                      : 'Your license will automatically renew.'
                    : `Cancels on ${summary?.currentPeriodEnd ? formatDate(summary.currentPeriodEnd) : 'renewal date'}.`}
                </p>
              </div>
              <Badge variant={isAutoRenewing ? 'info' : 'neutral'}>
                {isAutoRenewing ? 'Auto' : 'Manual'}
              </Badge>
            </div>
            {!summary?.cancelAtPeriodEnd && summary?.stripeSubscriptionId && (
              <Button
                variant="ghost"
                size="compact"
                onClick={handleOpenPortal}
                className="pa-text-danger pa-self-start"
              >
                Cancel Subscription
              </Button>
            )}
          </div>
        </Card>

        {/* Status Message */}
        {statusMessage && (
          <Card
            className="oa-card pa-mb-8"
            style={{
              background:
                summary?.status === 'past_due' || summary?.status === 'expired'
                  ? 'var(--pa-warning-bg)'
                  : 'var(--pa-info-bg)',
            }}
          >
            <div className="pa-flex pa-items-start pa-gap-3">
              <span
                className="material-symbols-outlined"
                style={{
                  color:
                    summary?.status === 'past_due' || summary?.status === 'expired'
                      ? 'var(--pa-warning)'
                      : 'var(--pa-info)',
                  fontSize: '20px',
                  flexShrink: 0,
                }}
              >
                {summary?.status === 'past_due' || summary?.status === 'expired'
                  ? 'warning'
                  : 'info'}
              </span>
              <div className="pa-body-m pa-font-medium">
                {statusMessage}
              </div>
            </div>
          </Card>
        )}

        {/* Billing History */}
        <Card className="oa-card">
          <h3 className="pa-h3 pa-mb-6">{t('billing.viewBillingHistory')}</h3>
          <BillingHistoryTimeline
            events={history}
            loading={historyLoading}
            error={historyError}
            hasSubscription={!!summary?.stripeSubscriptionId}
            onSelectPlan={handleSelectPlan}
          />
        </Card>
      </div>
    </div>
  )
}
