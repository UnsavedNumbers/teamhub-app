import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useLicense } from '../../hooks/useLicense'
import { createCheckoutSession } from '../../api/billing'
import { LicensePlan } from '../../utils/licenseUtils'
import { t } from '../../i18n'
import { getErrorMessage } from '../../utils/errorUtils'
import { 
  AdminPageHeader, 
  Card, 
  Button 
} from '../../components/platformAdmin'

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
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id
  const { licensePlan } = useLicense(orgId)

  const [loadingPlan, setLoadingPlan] = useState<LicensePlan | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!orgId) {
    return (
      <div className="pa-root">
        <div className="pa-card pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>
          {t('errors.missingOrganization')}
        </div>
      </div>
    )
  }

  async function handleSelect(plan: LicensePlan) {
    if (!orgId) return
    setError(null); setLoadingPlan(plan)
    try {
      const { checkout_session_url } = await createCheckoutSession({
        organizationId: orgId, requestedPlan: plan, successUrl: `${window.location.origin}/admin/organization/billing/checkout/success`, cancelUrl: `${window.location.origin}/admin/organization/billing/checkout/cancel`,
      })
      if (checkout_session_url) window.location.href = checkout_session_url
    } catch (err: unknown) {
      setError(getErrorMessage(err) || t('billing.errorCreatingSession'))
    } finally { setLoadingPlan(null) }
  }

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title={t('billing.planSelectionTitle')} 
        actions={<Button variant="secondary" onClick={() => navigate('/admin/organization/billing')}>{t('common.goBack')}</Button>} 
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
