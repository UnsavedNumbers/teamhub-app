import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useLicense } from '../../hooks/useLicense'
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
import { createCheckoutSession, upgradeOrgLicense } from '../../api/billing'
import { getErrorMessage } from '../../utils/errorUtils'

export default function PlanSelection() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id
  const { summary: licenseSummary, isActive: licenseActive, isPastGracePeriod, loading: licenseLoading, refresh: refreshLicense } = useLicense(orgId)
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

  const [loadingTierId, setLoadingTierId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSelect = async (tierId: string) => {
    if (!orgId) {
      setError(t('errors.missingOrganization'))
      return
    }

    setError(null)
    setSuccessMessage(null)
    setLoadingTierId(tierId)

    try {
      // Check if org has active subscription
      const hasActiveSubscription =
        licenseSummary?.stripeSubscriptionId && licenseSummary?.status === 'active'

      if (hasActiveSubscription) {
        // UPGRADE FLOW
        const result = await upgradeOrgLicense({
          organizationId: orgId,
          targetTierId: tierId,
          returnUrl: window.location.href,
        })

        if (result.payment_action_required && result.client_secret) {
          setError(t('billing.upgradePaymentRequired'))
          await refreshLicense()
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        } else if (result.success) {
          setSuccessMessage(t('billing.upgradeCompleted'))
          await refreshLicense()
          setTimeout(() => {
            navigate(getLink(RouteKeys.ADMIN_ORGANIZATION_BILLING))
          }, 1500)
        } else {
          setError(result.message || t('billing.errorUpgradingLicense'))
        }
      } else {
        // NEW SUBSCRIPTION FLOW (existing)
        const { checkout_session_url } = await createCheckoutSession({
          organizationId: orgId,
          tierId,
          successUrl,
          cancelUrl,
        })

        if (checkout_session_url) {
          window.location.href = checkout_session_url
        } else {
          setError(t('billing.errorCreatingSession'))
        }
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err) || t('billing.errorCreatingSession'))
    } finally {
      setLoadingTierId(null)
    }
  }

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

  // Determine current tier level to filter out downgrades
  const getCurrentTierLevel = (): number | null => {
    if (!licenseSummary?.tierName && !licenseSummary?.plan && !licenseSummary?.tierId) return null

    // Try to match by tier ID first
    if (licenseSummary.tierId && tiers) {
      const currentTier = tiers.find(t => t.id === licenseSummary.tierId)
      if (currentTier) {
        if (currentTier.tier_key === 'tier1') return 1
        if (currentTier.tier_key === 'tier2') return 2
        if (currentTier.tier_key === 'tier3') return 3
      }
    }

    // Fallback to tier name matching
    const tierName = licenseSummary.tierName?.toLowerCase() || ''
    const plan = licenseSummary.plan?.toLowerCase() || ''

    if (tierName.includes('starter') || plan === 'starter') return 1
    if (tierName.includes('growth') || plan === 'standard') return 2
    if (tierName.includes('professional') || plan === 'pro') return 3

    return null
  }

  const currentTierLevel = getCurrentTierLevel()

  // Map tier keys to tier levels
  const tierKeyToLevel = (tierKey: string): number => {
    if (tierKey === 'tier1') return 1
    if (tierKey === 'tier2') return 2
    if (tierKey === 'tier3') return 3
    return 1 // fallback
  }

  // Filter out downgrades and current tier - only show upgrades (higher tiers)
  const filteredUpgrades = currentTierLevel
    ? tiers.filter(tier => tierKeyToLevel(tier.tier_key) > currentTierLevel)
    : tiers

  // Show success message if user is on highest tier (no upgrades available)
  const showHighestTierMessage = currentTierLevel !== null && filteredUpgrades.length === 0

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
        actions={<OrgAdminButton variant="primary" onClick={() => navigate(getLink(RouteKeys.ADMIN_ORGANIZATION_BILLING))}>{t('common.goBack')}</OrgAdminButton>} 
      />

      {(error || tiersError) && (
        <div className="oa-card oa-mb-4 oa-text-danger" style={{ background: 'var(--oa-danger-bg)', border: 'none' }}>
          {error || tiersError}
        </div>
      )}

      {successMessage && (
        <div className="oa-card oa-mb-4" style={{ background: 'var(--oa-success-bg)', border: 'none' }}>
          <div className="oa-flex oa-items-center oa-gap-3">
            <span className="material-symbols-outlined oa-text-success" style={{ fontSize: '24px' }}>check_circle</span>
            <div className="oa-body-m">{successMessage}</div>
          </div>
        </div>
      )}

      {licenseSummary?.stripeSubscriptionId && licenseSummary?.status === 'active' && (
        <div className="oa-card oa-mb-4" style={{ background: 'var(--oa-info-bg)', border: 'none' }}>
          <div className="oa-body-m">
            {t('billing.proratedChargeMessage')}
          </div>
        </div>
      )}

      {showHighestTierMessage && (
        <div className="oa-card oa-mb-4" style={{ background: 'var(--oa-success-bg)', border: 'none' }}>
          <div className="oa-flex oa-items-center oa-gap-3">
            <span className="material-symbols-outlined oa-text-success" style={{ fontSize: '24px' }}>check_circle</span>
            <div>
              <div className="oa-body-l oa-font-semibold">You're on the highest tier!</div>
              <div className="oa-body-s oa-text-muted">No upgrade options are currently available.</div>
            </div>
          </div>
        </div>
      )}

      <div className="oa-grid oa-grid-3 oa-gap-6">
        {filteredUpgrades.map(tier => {
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
