import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useLicense } from '../../hooks/useLicense'
import { t } from '../../i18n'
import { formatDate } from '../../utils/licenseUtils'
import { createCustomerPortalSession, getBillingHistory, BillingEvent } from '../../api/billing'
import { LicenseStatusBadge } from '../../components/admin/LicenseStatusBadge'
import { LicenseWarningBanner } from '../../components/admin/LicenseWarningBanner'
import { getErrorMessage } from '../../utils/errorUtils'
import { 
  PageHeader, 
  Card, 
  Button, 
} from '../../components/platformAdmin'

export default function OrganizationBilling() {
  const navigate = useNavigate()
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id

  const { summary, loading, error, isActive, refresh } = useLicense(orgId)

  const [history, setHistory] = useState<BillingEvent[]>([])
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const loadHistory = useCallback(async (organizationId: string) => {
    try {
      const events = await getBillingHistory(organizationId)
      setHistory(events)
    } catch (err: unknown) {
      setHistoryError(getErrorMessage(err))
    }
  }, [])

  useEffect(() => {
    if (orgId) loadHistory(orgId)
  }, [orgId, loadHistory])

  const currentPlanLabel = useMemo(() => {
    if (!summary?.plan) return t('license.planLabel').toUpperCase()
    switch (summary.plan) {
      case 'starter': return t('license.planStarter')
      case 'standard': return t('license.planStandard')
      case 'pro': return t('license.planPro')
      default: return t('license.planLabel').toUpperCase()
    }
  }, [summary?.plan])

  async function handleOpenPortal() {
    if (!orgId) return
    setPortalLoading(true)
    try {
      const { portal_url } = await createCustomerPortalSession({
        organizationId: orgId,
        returnUrl: `${window.location.origin}/admin/organization/billing`,
      })
      if (portal_url) window.location.href = portal_url
    } catch (err: unknown) {
      setHistoryError(getErrorMessage(err) || t('billing.errorCreatingPortal'))
    } finally {
      setPortalLoading(false)
    }
  }

  if (!orgId) {
    return (
      <div className="pa-root">
        <div className="pa-card pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>
          {t('errors.missingOrganization')}
        </div>
      </div>
    )
  }

  return (
    <div className="pa-root">
      <PageHeader title={t('billing.pageTitle')} />

      {summary && (
        <LicenseWarningBanner summary={summary} />
      )}

      {error && (
        <div className="pa-card pa-mb-4 pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>
          {error}
        </div>
      )}

      <div className="pa-grid pa-grid-12 pa-gap-6">
        <div className="pa-col-8">
          <Card className="pa-mb-6">
            <div className="pa-flex pa-justify-between pa-items-center pa-mb-6">
              <h3 className="pa-h3">{t('billing.statusSectionTitle').toUpperCase()}</h3>
              <LicenseStatusBadge status={summary?.status ?? 'unknown'} />
            </div>

            <div className="pa-grid pa-grid-2 pa-gap-6 pa-mb-6">
              <div>
                <div className="pa-text-overline pa-mb-1">{t('license.planLabel')}</div>
                <div className="pa-h4">{currentPlanLabel}</div>
              </div>
              <div>
                <div className="pa-text-overline pa-mb-1">{t('billing.renewalDate')}</div>
                <div className="pa-body-m">{formatDate(summary?.currentPeriodEnd)}</div>
              </div>
              {summary?.trialEndsAt && (
                <div>
                  <div className="pa-text-overline pa-mb-1">{t('billing.trialEnds')}</div>
                  <div className="pa-body-m">{formatDate(summary.trialEndsAt)}</div>
                </div>
              )}
              {summary?.graceEndsAt && (
                <div>
                  <div className="pa-text-overline pa-mb-1">{t('billing.graceEnds')}</div>
                  <div className="pa-body-m">{formatDate(summary.graceEndsAt)}</div>
                </div>
              )}
            </div>

            <div className="pa-divider pa-mb-6" />

            <div className="pa-flex pa-gap-3 pa-flex-wrap">
              <Button onClick={() => navigate('/admin/organization/billing/plan-selection')} disabled={loading}>
                {t('billing.changePlan')}
              </Button>
              <Button variant="secondary" onClick={handleOpenPortal} loading={portalLoading}>
                {t('billing.portalCta')}
              </Button>
              <Button variant="secondary" onClick={() => refresh()} disabled={loading} loading={loading}>
                {t('common.retry')}
              </Button>
            </div>
          </Card>

          <Card>
            <div className="pa-flex pa-justify-between pa-items-center pa-mb-6">
              <h3 className="pa-h3">{t('billing.viewBillingHistory').toUpperCase()}</h3>
              {loading && <div className="pa-skeleton" style={{ width: '24px', height: '24px' }} />}
            </div>

            {historyError && (
              <div className="pa-card pa-mb-4 pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>
                {historyError}
              </div>
            )}

            {history.length === 0 && !historyError ? (
              <div className="pa-body-m pa-text-muted">{t('billing.billingHistoryEmpty')}</div>
            ) : (
              <div className="pa-flex pa-flex-col pa-gap-3">
                {history.map(event => (
                  <div key={event.id} className="pa-flex pa-justify-between pa-items-center pa-py-2" style={{ borderBottom: '1px solid var(--pa-n100)' }}>
                    <div className="pa-body-m" style={{ fontWeight: 600 }}>{event.event_type?.replace(/_/g, ' ').toUpperCase()}</div>
                    <div className="pa-body-s pa-text-muted">{formatDate(event.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="pa-col-4">
          <Card>
            <h3 className="pa-h3 pa-mb-6">{t('billing.detailsSectionTitle').toUpperCase()}</h3>
            <div className="pa-flex pa-flex-col pa-gap-4">
              <DetailRow label={t('license.statusLabel')} value={summary?.status ? t(`license.status.${summary.status}` as const) : '-'} />
              <DetailRow label={t('license.planLabel')} value={currentPlanLabel} />
              <DetailRow label={t('billing.renewalDate')} value={formatDate(summary?.currentPeriodEnd)} />
              {summary?.trialEndsAt && <DetailRow label={t('billing.trialEnds')} value={formatDate(summary.trialEndsAt)} />}
              {summary?.graceEndsAt && <DetailRow label={t('billing.graceEnds')} value={formatDate(summary.graceEndsAt)} />}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="pa-flex pa-justify-between">
      <div className="pa-body-s pa-text-muted">{label}</div>
      <div className="pa-body-s" style={{ fontWeight: 600 }}>{value || '-'}</div>
    </div>
  )
}
