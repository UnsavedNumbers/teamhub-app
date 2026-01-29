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
} from '../../components/platformAdmin'

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
        <div
          className="pa-card pa-text-danger"
          style={{ background: 'var(--pa-danger-bg)', border: 'none' }}
        >
          {t('errors.missingOrganization')}
        </div>
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

      <div className="pa-form-container" style={{ maxWidth: '896px', margin: '0 auto', paddingTop: '48px', paddingBottom: '48px' }}>
        {/* Organization Subscription Section */}
        <Card className="pa-mb-12" style={{ padding: '48px' }}>
          <div className="pa-flex pa-flex-col md:pa-flex-row md:pa-items-center pa-justify-between pa-gap-8">
            <div>
              <div className="pa-flex pa-items-center pa-gap-3 pa-mb-4">
                <span className="pa-body-s" style={{ color: 'var(--pa-n600)', fontWeight: 500 }}>
                  Organization Subscription
                </span>
                <span
                  className="pa-body-xs"
                  style={{
                    backgroundColor: '#dbeafe',
                    color: '#2563eb',
                    fontWeight: 600,
                    padding: '2px 10px',
                    borderRadius: '9999px',
                    border: '1px solid #bfdbfe',
                  }}
                >
                  {statusBadgeText}
                </span>
              </div>
              <h1 className="pa-h1" style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Annual Organization License
              </h1>
              <div className="pa-flex pa-flex-wrap pa-gap-8" style={{ marginTop: '32px' }}>
                <div>
                  <p className="pa-body-xs" style={{ color: 'var(--pa-n600)', marginBottom: '8px' }}>
                    Organization Tier
                  </p>
                  <p className="pa-body-s" style={{ fontWeight: 600 }}>
                    {currentPlanLabel}
                  </p>
                </div>
                {/* Note: Seats and Storage data not currently available - can be added when available */}
              </div>
            </div>
            <div className="pa-flex pa-shrink-0" style={{ marginTop: '32px' }}>
              <Button
                variant="primary"
                onClick={handleOpenPortal}
                loading={portalLoading}
                disabled={loading || portalLoading}
                style={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}
              >
                Manage Billing
              </Button>
            </div>
          </div>
        </Card>

        {/* Billing Summary Section */}
        <Card className="pa-mb-12" style={{ padding: '48px' }}>
          <div className="pa-flex pa-items-center pa-justify-between" style={{ marginBottom: '32px' }}>
            <h2 className="pa-h3" style={{ fontSize: '18px', fontWeight: 600 }}>
              Billing Summary
            </h2>
            <button
              onClick={handleDownloadStatement}
              className="pa-flex pa-items-center pa-gap-1.5 pa-body-s"
              style={{
                color: '#3b82f6',
                fontWeight: 500,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#1d4ed8'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#3b82f6'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                download
              </span>
              Download Statement
            </button>
          </div>

          {/* Line Items */}
          <div
            className="pa-border pa-rounded-lg pa-overflow-hidden"
            style={{
              border: '1px solid #f3f4f6',
              marginBottom: '32px',
            }}
          >
            <div
              className="pa-p-4 pa-flex pa-justify-between pa-items-center"
              style={{
                borderBottom: '1px solid #f3f4f6',
                backgroundColor: 'white',
              }}
            >
              <span className="pa-body-s" style={{ color: 'var(--pa-n600)' }}>
                Base Plan
              </span>
              <span className="pa-body-s" style={{ fontWeight: 500 }}>
                {summary?.plan ? `${currentPlanLabel} / yr` : '—'}
              </span>
            </div>
            {/* Add-ons can be added here when available */}
          </div>

          {/* Next Payment Due */}
          <div
            className="pa-bg-gray-50 pa-rounded-lg pa-p-6"
            style={{
              backgroundColor: '#f9fafb',
            }}
          >
            <div style={{ width: '100%' }}>
              <p className="pa-body-xs" style={{ color: 'var(--pa-n600)', marginBottom: '8px' }}>
                Next Payment Due
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span className="pa-h2" style={{ fontSize: '24px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {summary?.currentPeriodEnd ? formatDateUppercase(summary.currentPeriodEnd) : '—'}
                </span>
                {summary?.currentPeriodEnd && (
                  <span className="pa-body-s" style={{ color: 'var(--pa-n600)' }}>
                    on {formatDate(summary.currentPeriodEnd)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Renewal & Payment Section */}
        <Card className="pa-mb-12" style={{ padding: '48px' }}>
          <h2 className="pa-h3 pa-mb-8" style={{ fontSize: '18px', fontWeight: 600 }}>
            Renewal & Payment
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Payment Method Card */}
            <div
              className="pa-flex pa-items-center pa-justify-between pa-p-5 pa-border pa-rounded-lg"
              style={{
                border: '1px solid #f3f4f6',
              }}
            >
              <div className="pa-flex pa-items-center pa-gap-4">
                <div
                  className="pa-size-10 pa-bg-gray-50 pa-rounded pa-flex pa-items-center pa-justify-center pa-border"
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #f3f4f6',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ color: 'var(--pa-n500)', fontSize: '20px' }}>
                    credit_card
                  </span>
                </div>
                <div>
                  <p className="pa-body-s" style={{ fontWeight: 600, marginBottom: '4px' }}>
                    {/* Payment method details not available - managed via Stripe portal */}
                    Payment method managed in Stripe
                  </p>
                  <p className="pa-body-xs" style={{ color: 'var(--pa-n600)' }}>
                    Update payment method in customer portal
                  </p>
                </div>
              </div>
              <Button variant="secondary" onClick={handleOpenPortal} disabled={portalLoading || loading}>
                Update
              </Button>
            </div>

            {/* Auto-Renewal Card */}
            <div
              className="pa-flex pa-items-center pa-justify-between pa-p-5 pa-border pa-rounded-lg"
              style={{
                border: summary?.cancelAtPeriodEnd ? '1px solid #f3f4f6' : '1px solid #bfdbfe',
                backgroundColor: summary?.cancelAtPeriodEnd ? 'white' : 'rgba(219, 234, 254, 0.2)',
              }}
            >
              <div className="pa-flex pa-items-center pa-gap-4">
                <div
                  className="pa-size-10 pa-rounded pa-flex pa-items-center pa-justify-center"
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: summary?.cancelAtPeriodEnd ? '#f9fafb' : 'rgba(219, 234, 254, 0.5)',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      color: '#3b82f6',
                      fontSize: '20px',
                    }}
                  >
                    event_repeat
                  </span>
                </div>
                <div>
                  <p className="pa-body-s" style={{ fontWeight: 600, marginBottom: '4px' }}>
                    {summary?.cancelAtPeriodEnd ? 'Auto-Renewal is Off' : 'Auto-Renewal is On'}
                  </p>
                  <p className="pa-body-xs" style={{ color: 'var(--pa-n600)' }}>
                    {summary?.cancelAtPeriodEnd
                      ? `Subscription will cancel on ${summary.currentPeriodEnd ? formatDate(summary.currentPeriodEnd) : 'renewal date'}.`
                      : summary?.currentPeriodEnd
                        ? `Your license will automatically renew on ${formatDate(summary.currentPeriodEnd)}.`
                        : 'Your license will automatically renew.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Cancel Subscription Link */}
            {!summary?.cancelAtPeriodEnd && summary?.stripeSubscriptionId && (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  handleOpenPortal()
                }}
                className="pa-body-xs"
                style={{
                  color: 'var(--pa-n500)',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-block',
                  marginTop: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ef4444'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--pa-n500)'
                }}
              >
                Cancel Subscription
              </a>
            )}
          </div>
        </Card>

        {/* Status Message */}
        {statusMessage && (
          <Card
            className="pa-mb-12"
            style={{
              background:
                summary?.status === 'past_due' || summary?.status === 'expired'
                  ? 'var(--pa-warning-bg)'
                  : 'var(--pa-info-bg)',
              border: 'none',
              padding: '24px',
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
              <div className="pa-body-m" style={{ fontWeight: 500 }}>
                {statusMessage}
              </div>
            </div>
          </Card>
        )}

        {/* Billing History */}
        <Card style={{ padding: '48px' }}>
          <h3 className="pa-h3 pa-mb-8">{t('billing.viewBillingHistory')}</h3>
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
