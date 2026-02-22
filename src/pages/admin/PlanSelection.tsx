import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useLicense } from '../../hooks/useLicense'
import { useCheckoutSession } from '../../hooks/useCheckoutSession'
import { t } from '../../i18n'
import { getLink, RouteKeys } from '../../utils/routes'
import { useAuth } from '../../hooks/useAuth'
import { getActiveTiers } from '../../data/services/licenseTiersService'
import type { LicenseTier } from '../../types/licenseTiers.types'
import { 
  AdminPageHeader, 
  Card, 
  Button 
} from '../../components/admin'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'

export default function PlanSelection() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id
  const { summary: licenseSummary, isActive: licenseActive, isPastGracePeriod, loading: licenseLoading } = useLicense(orgId)
  const isPlatformAdmin = profile?.isPlatformAdmin ?? false

  const [tiers, setTiers] = useState<LicenseTier[]>([])
  const [tiersLoading, setTiersLoading] = useState(true)
  const [tiersError, setTiersError] = useState<string | null>(null)
  const [tierLimits, _setTierLimits] = useState<Record<string, {
    max_teams: number | null
    max_athletes: number | null
    photo_storage_gb: number | null
    max_sub_orgs: number | null
  }>>({})

  const successUrl = `${window.location.origin}${getLink(RouteKeys.ADMIN_ORGANIZATION_BILLING_CHECKOUT_SUCCESS)}`
  const cancelUrl = `${window.location.origin}${getLink(RouteKeys.ADMIN_ORGANIZATION_BILLING_CHECKOUT_CANCEL)}`

  const { loadingTierId, error, handleSelect } = useCheckoutSession({
    organizationId: orgId || '',
    successUrl,
    cancelUrl,
  })

  // Fetch active tiers
  useEffect(() => {
    async function fetchTiers() {
      try {
        setTiersLoading(true)
        setTiersError(null)
        const activeTiers = await getActiveTiers()
        setTiers(activeTiers)
      } catch (err) {
        setTiersError(err instanceof Error ? err.message : 'Failed to load tiers')
      } finally {
        setTiersLoading(false)
      }
    }
    fetchTiers()
  }, [])

  // Format price for display
  const formatPrice = (tier: LicenseTier): string => {
    if (!tier.stripe_amount_cents) return 'Contact us'
    const amount = tier.stripe_amount_cents / 100
    const interval = tier.stripe_interval === 'year' ? '/year' : tier.stripe_interval === 'month' ? '/month' : ''
    return `$${amount.toFixed(0)}${interval}`
  }

  // Format limit value
  const formatLimit = (value: number | null): string => {
    if (value === null) return 'Unlimited'
    return value.toLocaleString()
  }

  if (!orgId) {
    return (
      <div className="oa-root">
        <div className="oa-card oa-text-danger" style={{ background: 'var(--oa-danger-bg)', border: 'none' }}>
          {t('errors.missingOrganization')}
        </div>
      </div>
    )
  }

  // Wait for license and tiers to load
  if (licenseLoading || tiersLoading) {
    return (
      <div className="oa-root">
        <div className="oa-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900 dark:border-white mx-auto"></div>
          <p 
            className="mt-4"
            style={{
              color: 'var(--pa-text-secondary)'
            }}
          >
            {t('common.loading')}
          </p>
        </div>
      </div>
    )
  }

  // Redirect to trial expired page if license is expired (platform admins bypass)
  // This prevents users from bypassing the paywall by navigating directly to plan-selection
  if (!isPlatformAdmin && !licenseActive && isPastGracePeriod) {
    return <Navigate to={getLink(RouteKeys.ADMIN_TRIAL_EXPIRED)} replace />
  }

  const currentTierId = licenseSummary?.tierId

  return (
    <div className="oa-root">
      <AdminPageHeader 
        title={t('billing.planSelectionTitle')} 
        actions={<OrgAdminButton variant="primary" onClick={() => navigate('/admin/organization/billing')}>{t('common.goBack')}</OrgAdminButton>} 
      />

      {(error || tiersError) && (
        <div className="oa-card oa-mb-4 oa-text-danger" style={{ background: 'var(--oa-danger-bg)', border: 'none' }}>
          {error || tiersError}
        </div>
      )}

      {tiers.length === 0 && !tiersLoading && (
        <div className="oa-card oa-mb-4" style={{ background: 'var(--oa-warning-bg)', border: 'none' }}>
          {t('billing.noTiersAvailable')}
        </div>
      )}

      <div className="oa-grid oa-grid-3 oa-gap-6">
        {tiers.map(tier => {
          const isCurrent = currentTierId === tier.id
          return (
            <Card key={tier.id} style={{ borderColor: isCurrent ? 'var(--oa-n900)' : 'transparent', borderWidth: isCurrent ? '2px' : '1px' }}>
              <div className="oa-flex oa-justify-between oa-items-center oa-mb-4">
                <h3 className="oa-h3">{tier.tier_name.toUpperCase()}</h3>
                {isCurrent && <div className="oa-badge oa-badge--neutral">CURRENT</div>}
              </div>
              <div className="oa-h1 oa-mb-4" style={{ fontWeight: 900 }}>{formatPrice(tier)}</div>
              <div className="oa-body-m oa-text-muted oa-mb-6">{tier.description || ''}</div>
              
              {/* Tier Limits */}
              {tierLimits[tier.id] && (
                <div className="oa-flex oa-flex-col oa-gap-3 oa-mb-8 oa-p-4" style={{ background: 'var(--oa-n50)', borderRadius: '8px' }}>
                  <div className="oa-body-s oa-font-semibold oa-text-muted oa-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                    Tier Limits
                  </div>
                  <div className="oa-grid oa-grid-2 oa-gap-3">
                    <div>
                      <div className="oa-body-xs oa-text-muted">Max Teams</div>
                      <div className="oa-body-m oa-font-semibold">{formatLimit(tierLimits[tier.id].max_teams)}</div>
                    </div>
                    <div>
                      <div className="oa-body-xs oa-text-muted">Max Athletes</div>
                      <div className="oa-body-m oa-font-semibold">{formatLimit(tierLimits[tier.id].max_athletes)}</div>
                    </div>
                    <div>
                      <div className="oa-body-xs oa-text-muted">Photo Storage</div>
                      <div className="oa-body-m oa-font-semibold">
                        {tierLimits[tier.id].photo_storage_gb === null ? 'Unlimited' : `${tierLimits[tier.id].photo_storage_gb} GB`}
                      </div>
                    </div>
                    <div>
                      <div className="oa-body-xs oa-text-muted">Sub Organizations</div>
                      <div className="oa-body-m oa-font-semibold">{formatLimit(tierLimits[tier.id].max_sub_orgs)}</div>
                    </div>
                  </div>
                </div>
              )}
              <Button 
                style={{ width: '100%' }} 
                variant={isCurrent ? 'secondary' : 'primary'} 
                onClick={() => handleSelect(tier.id)} 
                disabled={!!loadingTierId || !tier.stripe_price_id} 
                loading={loadingTierId === tier.id}
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
