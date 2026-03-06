import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useLicense } from '../../hooks/useLicense'
import { t } from '../../i18n'
import { formatDate } from '../../utils/licenseUtils'
import { AdminPageHeader, Card, Button } from '../../components/admin'
import { getLink, RouteKeys } from '../../utils/routes'
import '../../styles/orgAdmin.css'

export default function CheckoutSuccess() {
  const navigate = useNavigate()
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id
  const { summary } = useLicense(orgId)

  useEffect(() => {
    const timer = setTimeout(() => navigate(getLink(RouteKeys.ADMIN_ORGANIZATION_BILLING)), 3000)
    return () => clearTimeout(timer)
  }, [navigate])

  const isTrial = summary?.status === 'trial' && summary?.trialStart

  return (
    <div className="oa-root">
      <AdminPageHeader title={t('billing.checkoutSuccessTitle').toUpperCase()} />
      <Card style={{ maxWidth: '600px' }}>
        <div className="oa-flex oa-items-center oa-gap-4 oa-mb-6 oa-text-success">
          <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>check_circle</span>
          <div>
            <h3 className="oa-h3 oa-mb-1">{t('billing.checkoutSuccessTitle')}</h3>
            <p className="oa-body-m">{t('billing.checkoutSuccessBody')}</p>
          </div>
        </div>
        {isTrial && summary.trialEndsAt && (
          <div className="oa-mb-6 oa-p-4" style={{ background: 'var(--oa-info-bg)', borderRadius: '8px' }}>
            <div className="oa-body-s oa-font-semibold oa-mb-2">
              {t('billing.trialBadge', { days: summary.daysRemaining || 0 })}
            </div>
            <div className="oa-body-xs oa-text-muted">
              {summary.trialStart && t('billing.trialStartedOn', { date: formatDate(summary.trialStart) })}
            </div>
            <div className="oa-body-xs oa-text-muted oa-mt-1">
              {t('billing.trialAutoChargeDate', { date: formatDate(summary.trialEndsAt) })}
            </div>
          </div>
        )}
        <div className="oa-flex oa-flex-col oa-gap-4">
          <p className="oa-body-s oa-text-muted">{t('checkout.redirecting')}</p>
          <Button onClick={() => navigate(getLink(RouteKeys.ADMIN_ORGANIZATION_BILLING))}>{t('checkout.returnToBilling')}</Button>
        </div>
      </Card>
    </div>
  )
}
