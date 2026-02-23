/**
 * Feature Upgrade Paywall Content
 * 
 * Paywall content component that displays within AdminLayout.
 * Uses org admin CSS classes and respects org theme colors.
 */

import { useEffect, useRef, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useLicense } from '../../hooks/useLicense'
import { useAuth } from '../../hooks/useAuth'
import { useLoadingState } from '../../contexts/LoadingStateContext'
import { hasAnyRole } from '../../utils/roleHelpers'
import { LicensePlan } from '../../utils/licenseUtils'
import { t } from '../../i18n'
import { getLink, RouteKeys } from '../../utils/routes'
import { getActiveTiers } from '../../data/services/licenseTiersService'
import { createCheckoutSession, upgradeOrgLicense } from '../../api/billing'
import { getErrorMessage } from '../../utils/errorUtils'
import { resolveFeatureFlag } from '../../utils/featureFlags'
import { supabase } from '../../lib/supabase'

interface PlanCard {
  id: LicensePlan
  tierId: string
  tierKey: string
  name: string
  price: string
  description: string
  features: string[]
}

export default function FeatureUpgradePaywallContent() {
  const [searchParams] = useSearchParams()
  const referrer = searchParams.get('referrer') || 'default'
  const { currentOrganization } = useOrganization()
  const { setLoading } = useLoadingState()
  const orgId = currentOrganization?.id
  const { loading: licenseLoading, error: licenseError, summary, refresh: refreshLicense } = useLicense(orgId)
  const hasSetLoadingRef = useRef(false)

  const isAdmin = currentOrganization ? hasAnyRole(currentOrganization, ['org_admin']) : false
  const isPlatformAdmin = useAuth().profile?.isPlatformAdmin ?? false

  // Fetch active tiers
  const { data: tiers, isLoading: tiersLoading } = useQuery({
    queryKey: ['active-tiers'],
    queryFn: () => getActiveTiers(),
  })

  // Map tier_key to LicensePlan for backward compatibility
  const tierKeyToPlanId = (tierKey: string): LicensePlan => {
    if (tierKey === 'tier1') return 'starter'
    if (tierKey === 'tier2') return 'standard'
    if (tierKey === 'tier3') return 'pro'
    return 'starter' // fallback
  }

  // Convert tiers to plan cards
  const planCards: PlanCard[] = useMemo(() => {
    if (!tiers || tiers.length === 0) return []
    
    const isUpgrade = summary?.stripeSubscriptionId && 
      (summary?.status === 'active' || summary?.status === 'trial')
    
    // Calculate prorated amount for upgrades
    const calculateProratedPrice = (targetTier: typeof tiers[0]): string | null => {
      if (!summary?.stripeSubscriptionId || 
          (summary?.status !== 'active' && summary?.status !== 'trial') ||
          !summary.currentPeriodEnd ||
          !tiers) {
        return null
      }

      // Find current tier
      const currentTier = tiers.find(t => t.id === summary.tierId || t.stripe_price_id === summary.stripePriceId)
      if (!currentTier || currentTier.id === targetTier.id) {
        return null // No upgrade or same tier
      }

      // Calculate days remaining in billing period
      const periodEnd = new Date(summary.currentPeriodEnd)
      const now = new Date()
      const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      
      if (daysRemaining <= 0) return null

      const targetPriceCents = targetTier.stripe_amount_cents || 0
      const currentPriceCents = currentTier.stripe_amount_cents || 0
      const priceDifferenceCents = targetPriceCents - currentPriceCents

      if (priceDifferenceCents <= 0) return null // Not an upgrade

      // Calculate prorated amount based on interval
      let proratedCents = 0
      if (targetTier.stripe_interval === 'year') {
        // Annual: prorate based on days remaining in year (365 days)
        proratedCents = Math.ceil((priceDifferenceCents * daysRemaining) / 365)
      } else {
        // Monthly: prorate based on days remaining in month (30 days)
        proratedCents = Math.ceil((priceDifferenceCents * daysRemaining) / 30)
      }

      // Round up to nearest dollar (no cents)
      const proratedDollars = Math.ceil(proratedCents / 100)

      // Format: "$100 ~~$1,199/yr~~"
      const proratedAmount = proratedDollars.toLocaleString('en-US')
      const fullAmount = (targetPriceCents / 100).toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })
      const interval = targetTier.stripe_interval === 'year' ? 'yr' : 'mo'

      return `$${proratedAmount} ~~$${fullAmount}/${interval}~~`
    }
    
    return tiers.map(tier => {
      const planId = tierKeyToPlanId(tier.tier_key)
      const baseFeatures = [
        t('plans.features.scheduling'), 
        t('plans.features.rosters'), 
        t('plans.features.messaging')
      ]
      
      let features = [...baseFeatures]
      if (tier.tier_key === 'tier2' || tier.tier_key === 'tier3') {
        features.push(t('plans.features.payments'), t('plans.features.uniforms'))
      }
      if (tier.tier_key === 'tier3') {
        features.push(
          t('plans.features.travel'), 
          t('plans.features.tryouts'), 
          t('plans.features.reporting'), 
          t('plans.features.support')
        )
      }

      // Format price - show prorated amount for upgrades
      let price: string
      if (tier.stripe_amount_cents) {
        if (isUpgrade) {
          const proratedPrice = calculateProratedPrice(tier)
          price = proratedPrice || `$${(tier.stripe_amount_cents / 100).toLocaleString()}/${tier.stripe_interval === 'year' ? 'yr' : 'mo'}`
        } else {
          price = `$${(tier.stripe_amount_cents / 100).toLocaleString()}/${tier.stripe_interval === 'year' ? 'yr' : 'mo'}`
        }
      } else {
        price = t('plans.starter.price') // fallback
      }

      return {
        id: planId,
        tierId: tier.id,
        tierKey: tier.tier_key,
        name: tier.tier_name,
        price,
        description: tier.description || '',
        features,
      }
    })
  }, [tiers, summary, t])

  // Determine current tier level to filter out downgrades
  const getCurrentTierLevel = (): number | null => {
    if (!summary?.tierName && !summary?.plan && !summary?.tierId) return null
    
    // Try to match by tier ID first
    if (summary.tierId && tiers) {
      const currentTier = tiers.find(t => t.id === summary.tierId)
      if (currentTier) {
        if (currentTier.tier_key === 'tier1') return 1
        if (currentTier.tier_key === 'tier2') return 2
        if (currentTier.tier_key === 'tier3') return 3
      }
    }
    
    // Fallback to tier name matching
    const tierName = summary.tierName?.toLowerCase() || ''
    const plan = summary.plan?.toLowerCase() || ''
    
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
    ? planCards.filter(plan => tierKeyToLevel(plan.tierKey) > currentTierLevel)
    : planCards
  // If filtering leaves nothing (already on highest tier or no tier data), show all
  const availablePlans = filteredUpgrades.length > 0 ? filteredUpgrades : planCards

  const successUrl = `${window.location.origin}${getLink(RouteKeys.ADMIN_ORGANIZATION_BILLING_CHECKOUT_SUCCESS)}`
  const cancelUrl = `${window.location.origin}${getLink(RouteKeys.ADMIN_ORGANIZATION_BILLING_CHECKOUT_CANCEL)}`

  const [loadingTierId, setLoadingTierId] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [trialDays, setTrialDays] = useState<number | null>(null)
  const [trialEligible, setTrialEligible] = useState<boolean>(false)

  const handleSelect = async (tierId: string) => {
    if (!orgId) {
      setCheckoutError(t('errors.missingOrganization'))
      return
    }

    setCheckoutError(null)
    setSuccessMessage(null)
    setLoadingTierId(tierId)

    try {
      // Check if org has an active subscription (active or trial) that can be upgraded
      const hasActiveSubscription =
        summary?.stripeSubscriptionId && 
        (summary?.status === 'active' || summary?.status === 'trial')

      if (process.env.NODE_ENV === 'development') {
        console.log('[FeatureUpgradePaywallContent] Upgrade check:', {
          hasActiveSubscription,
          stripeSubscriptionId: summary?.stripeSubscriptionId,
          status: summary?.status,
          tierId,
        })
      }

      if (hasActiveSubscription) {
        const result = await upgradeOrgLicense({
          organizationId: orgId,
          targetTierId: tierId,
          returnUrl: window.location.href,
        })

        if (result.payment_action_required && result.client_secret) {
          setCheckoutError(t('billing.upgradePaymentRequired'))
          await refreshLicense()
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        } else if (result.success) {
          setSuccessMessage(t('billing.upgradeCompleted'))
          await refreshLicense()
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        } else {
          setCheckoutError(result.message || t('billing.errorUpgradingLicense'))
        }
      } else {
        const { checkout_session_url } = await createCheckoutSession({
          organizationId: orgId,
          tierId,
          successUrl,
          cancelUrl,
        })

        if (checkout_session_url) {
          window.location.href = checkout_session_url
        } else {
          setCheckoutError(t('billing.errorCreatingSession'))
        }
      }
    } catch (err: unknown) {
      setCheckoutError(getErrorMessage(err) || t('billing.errorCreatingSession'))
    } finally {
      setLoadingTierId(null)
    }
  }

  const canUpgrade = (isAdmin || isPlatformAdmin) && orgId

  // Handle loading state
  useEffect(() => {
    if ((licenseLoading || tiersLoading) && !hasSetLoadingRef.current) {
      setLoading(true)
      hasSetLoadingRef.current = true
    } else if (!licenseLoading && !tiersLoading && hasSetLoadingRef.current) {
      setLoading(false)
      hasSetLoadingRef.current = false
    }
  }, [licenseLoading, tiersLoading, setLoading])

  // Cleanup loading state on unmount
  useEffect(() => {
    return () => {
      if (hasSetLoadingRef.current) {
        setLoading(false)
        hasSetLoadingRef.current = false
      }
    }
  }, [setLoading])

  // Fetch trial info (eligibility and days)
  useEffect(() => {
    async function fetchTrialInfo() {
      if (!orgId) {
        setTrialDays(null)
        setTrialEligible(false)
        return
      }

      try {
        // Read feature flag client-side for display
        const flag = await resolveFeatureFlag('free_trial_days', undefined, orgId)
        const days = flag?.value_type === 'integer' ? (flag.value as number) : 0
        setTrialDays(days > 0 ? days : 0)

        // Check eligibility via RPC (single source of truth)
        const { data: eligibility, error: eligibilityError } = await (supabase as any).rpc('check_trial_eligibility', {
          p_org_id: orgId,
        })

        if (eligibilityError) {
          console.error('[FeatureUpgradePaywallContent] Error checking trial eligibility:', eligibilityError)
          setTrialEligible(false)
        } else {
          setTrialEligible((eligibility as { eligible?: boolean } | null)?.eligible ?? false)
        }
      } catch (err) {
        console.error('[FeatureUpgradePaywallContent] Error fetching trial info:', err)
        setTrialDays(0)
        setTrialEligible(false)
      }
    }

    fetchTrialInfo()
  }, [orgId])

  // Calculate trial end date
  const getTrialEndDate = (): Date | null => {
    if (!trialDays || trialDays === 0) return null
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + trialDays)
    return endDate
  }

  const trialEndDate = getTrialEndDate()

  // Get feature-specific translations
  const getFeatureTranslation = (key: string, fallbackKey: string) => {
    const featureKey = `featureUpgrade.${referrer}.${key}` as any
    const fallback = `featureUpgrade.default.${fallbackKey}` as any
    const featureTranslation = t(featureKey)
    if (featureTranslation === featureKey) {
      return t(fallback)
    }
    return featureTranslation
  }

  if (!orgId) {
    return (
      <div className="oa-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div className="oa-text-center">
          <p className="oa-body-l" style={{ color: 'var(--org-text-secondary)' }}>{t('errors.missingOrganization')}</p>
        </div>
      </div>
    )
  }

  if (licenseLoading || tiersLoading) {
    return null
  }

  if (licenseError) {
    return (
      <div className="oa-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div className="oa-text-center">
          <p className="oa-body-l oa-mb-4" style={{ color: 'var(--org-text-secondary)' }}>{licenseError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="oa-content" style={{ padding: '48px 24px' }}>
      {/* Massive Headline */}
      <div className="oa-text-center oa-mb-10" style={{ maxWidth: '1200px', margin: '0 auto 40px' }}>
        <h1 className="oa-h1" style={{ fontSize: '96px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', textTransform: 'uppercase', color: 'var(--org-text-primary)' }}>
          {getFeatureTranslation('headline', 'headline')}
        </h1>
        <p className="oa-body-xl oa-mt-4" style={{ color: 'var(--org-text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', maxWidth: '672px', margin: '16px auto 0' }}>
          {getFeatureTranslation('subheadline', 'subheadline')}
        </p>
      </div>

      {/* Status Header Card */}
      <div style={{ maxWidth: '960px', margin: '0 auto 64px' }}>
        <div 
          className="oa-card"
          style={{
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ flex: 1, textAlign: 'center', width: '100%' }}>
            <div className="oa-flex oa-items-center oa-justify-center oa-gap-3 oa-mb-2">
              <span style={{ width: '12px', height: '12px', backgroundColor: 'var(--org-status-error, #ef4444)', borderRadius: '50%', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></span>
              <h2 className="oa-h2" style={{ textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{getFeatureTranslation('statusTitle', 'statusTitle')}</h2>
            </div>
            <p className="oa-body-l" style={{ color: 'var(--org-text-secondary)' }}>
              {canUpgrade 
                ? getFeatureTranslation('statusDescriptionAdmin', 'statusDescriptionAdmin')
                : getFeatureTranslation('statusDescriptionNonAdmin', 'statusDescriptionNonAdmin')
              }
            </p>
          </div>
          {canUpgrade && (
            <div className="oa-flex oa-flex-col oa-items-center oa-gap-2">
              <button
                onClick={() => {
                  const planSelectionSection = document.getElementById('plan-selection')
                  if (planSelectionSection) {
                    planSelectionSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                }}
                className="oa-btn oa-btn--primary"
                    style={{
                      fontSize: '20px',
                      fontWeight: 900,
                      padding: '20px 48px',
                      textTransform: 'uppercase',
                      letterSpacing: '-0.01em',
                      boxShadow: '0 8px 0 0 rgba(0, 0, 0, 0.2)',
                      transform: 'translateY(0)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(2px)'
                      e.currentTarget.style.boxShadow = '0 6px 0 0 rgba(0, 0, 0, 0.2)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 8px 0 0 rgba(0, 0, 0, 0.2)'
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'translateY(8px)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'translateY(2px)'
                      e.currentTarget.style.boxShadow = '0 6px 0 0 rgba(0, 0, 0, 0.2)'
                    }}
              >
                {getFeatureTranslation('upgradeButton', 'upgradeButton')}
              </button>
              <p className="oa-body-xs" style={{ color: 'var(--org-text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginTop: '8px' }}>{getFeatureTranslation('tagline', 'tagline')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {checkoutError && (
        <div style={{ maxWidth: '960px', margin: '0 auto 32px' }}>
          <div className="oa-card" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--org-status-error, #ef4444)', padding: '16px' }}>
            <p className="oa-body-s" style={{ color: 'var(--org-status-error, #ef4444)' }}>{checkoutError}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div style={{ maxWidth: '960px', margin: '0 auto 32px' }}>
          <div className="oa-card" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'var(--org-status-success, #22c55e)', padding: '16px' }}>
            <p className="oa-body-s" style={{ color: 'var(--org-status-success, #22c55e)' }}>{successMessage}</p>
          </div>
        </div>
      )}


      {/* Comparison Grid */}
      <div style={{ maxWidth: '960px', margin: '0 auto 80px' }}>
        <div className="oa-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0, padding: 0, overflow: 'hidden' }}>
          {/* Restricted Column */}
          <div 
            className="oa-card"
            style={{
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              gap: '32px',
              borderRight: '1px solid var(--org-border-default)',
            }}
          >
            <div className="oa-flex oa-items-center oa-gap-3">
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--org-text-secondary)' }}>lock</span>
              <h3 className="oa-h3" style={{ textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--org-text-secondary)' }}>{getFeatureTranslation('restricted', 'restricted')}</h3>
            </div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '24px', listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px dashed var(--org-border-default)', paddingBottom: '16px' }}>
                <p className="oa-body-xs" style={{ color: 'var(--org-text-secondary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{getFeatureTranslation('comparison.restricted.feature1', 'comparison.restricted.feature1')}</p>
                <p className="oa-body-l" style={{ fontWeight: 700, color: 'var(--org-text-primary)' }}>{getFeatureTranslation('comparison.restricted.feature1Value', 'comparison.restricted.feature1Value')}</p>
              </li>
              <li style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px dashed var(--org-border-default)', paddingBottom: '16px' }}>
                <p className="oa-body-xs" style={{ color: 'var(--org-text-secondary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{getFeatureTranslation('comparison.restricted.feature2', 'comparison.restricted.feature2')}</p>
                <p className="oa-body-l" style={{ fontWeight: 700, color: 'var(--org-text-primary)' }}>{getFeatureTranslation('comparison.restricted.feature2Value', 'comparison.restricted.feature2Value')}</p>
              </li>
              <li style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px dashed var(--org-border-default)', paddingBottom: '16px' }}>
                <p className="oa-body-xs" style={{ color: 'var(--org-text-secondary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{getFeatureTranslation('comparison.restricted.feature3', 'comparison.restricted.feature3')}</p>
                <p className="oa-body-l" style={{ fontWeight: 700, color: 'var(--org-text-primary)' }}>{getFeatureTranslation('comparison.restricted.feature3Value', 'comparison.restricted.feature3Value')}</p>
              </li>
            </ul>
          </div>
          {/* Restored Column */}
          <div 
            className="oa-card"
            style={{
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              gap: '32px',
            }}
          >
            <div className="oa-flex oa-items-center oa-gap-3">
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--org-btn-primary-bg)' }}>check_circle</span>
              <h3 className="oa-h3" style={{ textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--org-btn-primary-bg)' }}>{getFeatureTranslation('restored', 'restored')}</h3>
            </div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '24px', listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px dashed var(--org-border-default)', paddingBottom: '16px' }}>
                <p className="oa-body-xs" style={{ color: 'var(--org-btn-primary-bg)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{getFeatureTranslation('comparison.restored.feature1', 'comparison.restored.feature1')}</p>
                <p className="oa-body-l" style={{ fontWeight: 700, color: 'var(--org-text-primary)' }}>{getFeatureTranslation('comparison.restored.feature1Value', 'comparison.restored.feature1Value')}</p>
              </li>
              <li style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px dashed var(--org-border-default)', paddingBottom: '16px' }}>
                <p className="oa-body-xs" style={{ color: 'var(--org-btn-primary-bg)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{getFeatureTranslation('comparison.restored.feature2', 'comparison.restored.feature2')}</p>
                <p className="oa-body-l" style={{ fontWeight: 700, color: 'var(--org-text-primary)' }}>{getFeatureTranslation('comparison.restored.feature2Value', 'comparison.restored.feature2Value')}</p>
              </li>
              <li style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px dashed var(--org-border-default)', paddingBottom: '16px' }}>
                <p className="oa-body-xs" style={{ color: 'var(--org-btn-primary-bg)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{getFeatureTranslation('comparison.restored.feature3', 'comparison.restored.feature3')}</p>
                <p className="oa-body-l" style={{ fontWeight: 700, color: 'var(--org-text-primary)' }}>{getFeatureTranslation('comparison.restored.feature3Value', 'comparison.restored.feature3Value')}</p>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Plan Selection (Admin Only) */}
      {canUpgrade && (
        <div id="plan-selection" style={{ maxWidth: '960px', margin: '0 auto 80px', scrollMarginTop: '32px' }}>
          <h3 className="oa-h3 oa-text-center oa-mb-8" style={{ textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
            {getFeatureTranslation('planSelectionTitle', 'planSelectionTitle')}
          </h3>
          
          {/* Proration Message */}
          {summary?.stripeSubscriptionId && 
            (summary?.status === 'active' || summary?.status === 'trial') && (
            <div style={{ maxWidth: '960px', margin: '0 auto 24px' }}>
              <div 
                className="oa-card" 
                style={{ 
                  backgroundColor: 'rgba(234, 179, 8, 0.1)', 
                  border: '2px solid rgba(234, 179, 8, 0.3)',
                  borderRadius: '12px',
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 2px 8px rgba(234, 179, 8, 0.15)',
                }}
              >
                <span 
                  className="material-symbols-outlined" 
                  style={{ 
                    fontSize: '24px', 
                    color: 'var(--org-status-warning, #eab308)',
                    flexShrink: 0,
                  }}
                >
                  info
                </span>
                <p 
                  className="oa-body-m" 
                  style={{ 
                    color: 'var(--org-status-warning, #eab308)', 
                    fontWeight: 500,
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {t('billing.proratedChargeMessage')}
                </p>
              </div>
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${availablePlans.length}, 1fr)`, gap: '24px' }}>
            {availablePlans.map(plan => (
              <div
                key={plan.id}
                className="oa-card"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div className="oa-flex oa-items-center oa-justify-between oa-mb-4">
                  <h4 className="oa-h4" style={{ textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{plan.name}</h4>
                </div>
                <div 
                  className="oa-h2 oa-mb-4" 
                  style={{ fontWeight: 900 }}
                  dangerouslySetInnerHTML={{ 
                    __html: plan.price.replace(/~~(.*?)~~/g, '<span style="text-decoration: line-through; opacity: 0.6; margin-left: 8px;">$1</span>')
                  }}
                />
                
                {/* Trial Badge - Only show for paid tiers (tier2, tier3) when eligible and not upgrading */}
                {trialDays !== null && 
                 trialDays > 0 && 
                 trialEligible && 
                 plan.tierKey !== 'tier1' && 
                 !(summary?.stripeSubscriptionId && (summary?.status === 'active' || summary?.status === 'trial')) && (
                  <div className="oa-badge oa-badge--success oa-mb-2" style={{ alignSelf: 'flex-start' }}>
                    {t('billing.trialBadge', { days: trialDays })}
                  </div>
                )}
                
                <p className="oa-body-s oa-mb-6" style={{ color: 'var(--org-text-secondary)' }}>{plan.description}</p>
                
                {/* Trial Messaging - Only show for paid tiers when eligible and not upgrading */}
                {trialDays !== null && 
                 trialDays > 0 && 
                 trialEligible && 
                 plan.tierKey !== 'tier1' && 
                 trialEndDate &&
                 !(summary?.stripeSubscriptionId && (summary?.status === 'active' || summary?.status === 'trial')) && (
                  <div className="oa-mb-6">
                    <div className="oa-body-s oa-text-muted oa-mb-2">
                      {t('billing.trialNoChargeToday')}
                    </div>
                    <div className="oa-body-xs oa-text-muted">
                      {t('billing.trialAutoChargeDate', { date: trialEndDate.toLocaleDateString() })}
                    </div>
                  </div>
                )}
                <div className="oa-flex oa-flex-col oa-gap-2 oa-mb-6" style={{ flex: 1 }}>
                  {plan.features.map(feature => (
                    <div key={feature} className="oa-flex oa-items-center oa-gap-2">
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--org-btn-primary-bg)' }}>check_circle</span>
                      <span className="oa-body-s" style={{ color: 'var(--org-text-primary)' }}>{feature}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleSelect(plan.tierId)}
                  disabled={!!loadingTierId}
                  className="oa-btn oa-btn--primary"
                  style={{
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '-0.01em',
                    opacity: loadingTierId === plan.tierId ? 0.5 : 1,
                    cursor: loadingTierId === plan.tierId ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loadingTierId === plan.tierId ? t('common.loading') : t('billing.continueToCheckout')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Why Organizations Upgrade */}
      <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '80px', textAlign: 'center' }}>
        <h3 className="oa-body-xs oa-mb-8" style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--org-text-secondary)' }}>{getFeatureTranslation('whyUpgrade', 'whyUpgrade')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div className="oa-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--org-btn-primary-bg)' }}>speed</span>
            <p className="oa-body-s" style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{getFeatureTranslation('upgradeReasons.reason1', 'upgradeReasons.reason1')}</p>
          </div>
          <div className="oa-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--org-btn-primary-bg)' }}>hub</span>
            <p className="oa-body-s" style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{getFeatureTranslation('upgradeReasons.reason2', 'upgradeReasons.reason2')}</p>
          </div>
          <div className="oa-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--org-btn-primary-bg)' }}>verified_user</span>
            <p className="oa-body-s" style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{getFeatureTranslation('upgradeReasons.reason3', 'upgradeReasons.reason3')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
