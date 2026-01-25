import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useLicense } from '../../hooks/useLicense'
import { t } from '../../i18n'
import { formatDate } from '../../utils/licenseUtils'
import { createCustomerPortalSession, getBillingHistory, BillingEvent } from '../../api/billing'
import { LicenseStatusBadge } from '../../components/admin/LicenseStatusBadge'
import { BillingHistoryTimeline } from '../../components/admin/BillingHistoryTimeline'
import { getErrorMessage } from '../../utils/errorUtils'
import {
  shouldShowRetryButton,
  shouldShowGracePeriod,
  shouldShowTrialEnd,
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

  const { summary, loading, error, refresh } = useLicense(orgId)

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
    if (!summary?.plan) return t('license.planLabel')
    switch (summary.plan) {
      case 'starter':
        return t('license.planStarter')
      case 'standard':
        return t('license.planStandard')
      case 'pro':
        return t('license.planPro')
      default:
        return t('license.planLabel')
    }
  }, [summary?.plan])

  const showRetryButton = useMemo(() => {
    return shouldShowRetryButton(history, summary)
  }, [history, summary])

  const statusMessage = useMemo(() => {
    return getStatusMessage(summary)
  }, [summary])

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

      <div className="pa-form-container">
        {/* License Overview Card */}
        <Card className="pa-mb-8">
          <div className="pa-flex pa-items-center pa-gap-3 pa-mb-6">
            <LicenseStatusBadge status={summary?.status ?? 'unknown'} />
            <h3 className="pa-h3">{t('billing.licenseOverview')}</h3>
          </div>

          {/* License Details - Organized Grid Layout */}
          <div className="pa-grid" style={{ 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--pa-space-6)',
            marginBottom: 'var(--pa-space-6)'
          }}>
            <div>
              <div className="pa-body-s pa-text-muted pa-mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '11px' }}>
                {t('license.planLabel')}
              </div>
              <div className="pa-body-l" style={{ fontWeight: 600 }}>
                {currentPlanLabel}
              </div>
            </div>
            {summary?.currentPeriodEnd && (
              <div>
                <div className="pa-body-s pa-text-muted pa-mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '11px' }}>
                  {t('billing.renewalDate')}
                </div>
                <div className="pa-body-m" style={{ fontWeight: 600 }}>
                  {formatDate(summary.currentPeriodEnd)}
                </div>
              </div>
            )}
            {shouldShowTrialEnd(summary) && summary?.trialEndsAt && (
              <div>
                <div className="pa-body-s pa-text-muted pa-mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '11px' }}>
                  {t('billing.trialEnds')}
                </div>
                <div className="pa-body-m" style={{ fontWeight: 600 }}>
                  {formatDate(summary.trialEndsAt)}
                </div>
              </div>
            )}
            {shouldShowGracePeriod(summary) && summary?.graceEndsAt && (
              <div>
                <div className="pa-body-s pa-text-muted pa-mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '11px' }}>
                  {t('billing.graceEnds')}
                </div>
                <div className="pa-body-m" style={{ fontWeight: 600, color: 'var(--pa-warning)' }}>
                  {formatDate(summary.graceEndsAt)}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="pa-divider pa-mb-6" />

          {/* Actions */}
          <div className="pa-flex pa-gap-3 pa-flex-wrap">
            <Button
              variant="primary"
              onClick={handleSelectPlan}
              disabled={loading}
            >
              {t('billing.changePlan')}
            </Button>
            <Button
              variant="secondary"
              onClick={handleOpenPortal}
              loading={portalLoading}
              disabled={loading || portalLoading}
            >
              {t('billing.portalCta')}
            </Button>
            {showRetryButton && (
              <Button
                variant="secondary"
                onClick={() => refresh()}
                disabled={loading}
                loading={loading}
              >
                {t('common.retry')}
              </Button>
            )}
          </div>
        </Card>

        {/* Status Message */}
        {statusMessage && (
          <Card
            className="pa-mb-8"
            style={{
              background:
                summary?.status === 'past_due' || summary?.status === 'expired'
                  ? 'var(--pa-warning-bg)'
                  : 'var(--pa-info-bg)',
              border: 'none',
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
        <Card>
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
