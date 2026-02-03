import { useNavigate, Navigate } from 'react-router-dom'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useLicense } from '../../hooks/useLicense'
import { useCheckoutSession } from '../../hooks/useCheckoutSession'
import { LicensePlan } from '../../utils/licenseUtils'
import { t } from '../../i18n'
import { getLink, RouteKeys } from '../../utils/routes'
import { useAuth } from '../../hooks/useAuth'
import { 
  AdminPageHeader, 
  Card, 
  Button 
} from '../../components/platformAdmin'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'

interface PlanCard {
  id: LicensePlan
  name: string
  price: string
  description: string
  features: string[]
}

const planCards: PlanCard[] = [
  { id: 'starter', name: t('plans.starter.name'), price: t('plans.starter.price'), description: t('plans.starter.description'), features: [t('plans.features.scheduling'), t('plans.features.rosters'), t('plans.features.messaging')] },
  { id: 'standard', name: t('plans.standard.name'), price: t('plans.standard.price'), description: t('plans.standard.description'), features: [t('plans.features.scheduling'), t('plans.features.rosters'), t('plans.features.messaging'), t('plans.features.payments'), t('plans.features.uniforms')] },
  { id: 'pro', name: t('plans.pro.name'), price: t('plans.pro.price'), description: t('plans.pro.description'), features: [t('plans.features.scheduling'), t('plans.features.rosters'), t('plans.features.messaging'), t('plans.features.payments'), t('plans.features.uniforms'), t('plans.features.travel'), t('plans.features.tryouts'), t('plans.features.reporting'), t('plans.features.support')] },
]

export default function PlanSelection() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id
  const { licensePlan, isActive: licenseActive, isPastGracePeriod, loading: licenseLoading } = useLicense(orgId)
  const isPlatformAdmin = profile?.isPlatformAdmin ?? false

  const successUrl = `${window.location.origin}${getLink(RouteKeys.ADMIN_ORGANIZATION_BILLING_CHECKOUT_SUCCESS)}`
  const cancelUrl = `${window.location.origin}${getLink(RouteKeys.ADMIN_ORGANIZATION_BILLING_CHECKOUT_CANCEL)}`

  const { loadingPlan, error, handleSelect } = useCheckoutSession({
    organizationId: orgId || '',
    successUrl,
    cancelUrl,
  })

  if (!orgId) {
    return (
      <div className="pa-root">
        <div className="pa-card pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>
          {t('errors.missingOrganization')}
        </div>
      </div>
    )
  }

  // Wait for license to load
  if (licenseLoading) {
    return (
      <div className="pa-root">
        <div className="pa-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // Redirect to trial expired page if license is expired (platform admins bypass)
  // This prevents users from bypassing the paywall by navigating directly to plan-selection
  if (!isPlatformAdmin && !licenseActive && isPastGracePeriod) {
    return <Navigate to={getLink(RouteKeys.ADMIN_TRIAL_EXPIRED)} replace />
  }

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title={t('billing.planSelectionTitle')} 
        actions={<OrgAdminButton variant="primary" onClick={() => navigate('/admin/organization/billing')}>{t('common.goBack')}</OrgAdminButton>} 
      />

      {error && <div className="pa-card pa-mb-4 pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>{error}</div>}

      <div className="pa-grid pa-grid-3 pa-gap-6">
        {planCards.map(plan => {
          const isCurrent = licensePlan === plan.id
          return (
            <Card key={plan.id} style={{ borderColor: isCurrent ? 'var(--pa-n900)' : 'transparent', borderWidth: isCurrent ? '2px' : '1px' }}>
              <div className="pa-flex pa-justify-between pa-items-center pa-mb-4">
                <h3 className="pa-h3">{plan.name.toUpperCase()}</h3>
                {isCurrent && <div className="pa-badge pa-badge--neutral">CURRENT</div>}
              </div>
              <div className="pa-h1 pa-mb-4" style={{ fontWeight: 900 }}>{plan.price}</div>
              <div className="pa-body-m pa-text-muted pa-mb-6">{plan.description}</div>
              <div className="pa-flex pa-flex-col pa-gap-2 pa-mb-8">
                {plan.features.map(f => (
                  <div key={f} className="pa-body-s pa-flex pa-items-center pa-gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--pa-success)' }}>check_circle</span>
                    {f}
                  </div>
                ))}
              </div>
              <Button 
                style={{ width: '100%' }} 
                variant={isCurrent ? 'secondary' : 'primary'} 
                onClick={() => handleSelect(plan.id)} 
                disabled={!!loadingPlan} 
                loading={loadingPlan === plan.id}
              >
                {isCurrent ? 'SELECTED' : t('billing.continueToCheckout')}
              </Button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
