/**
 * Feature Upgrade Paywall Content
 * 
 * Paywall content component that displays within AdminLayout.
 * Uses org admin CSS classes and respects org theme colors.
 */

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useLicense } from '../../hooks/useLicense'
import { useAuth } from '../../hooks/useAuth'
import { useLoadingState } from '../../contexts/LoadingStateContext'
import { useCheckoutSession } from '../../hooks/useCheckoutSession'
import { hasAnyRole } from '../../utils/roleHelpers'
import { LicensePlan } from '../../utils/licenseUtils'
import { t } from '../../i18n'
import { getLink, RouteKeys } from '../../utils/routes'

interface PlanCard {
  id: LicensePlan
  name: string
  price: string
  description: string
  features: string[]
}

const planCards: PlanCard[] = [
  { 
    id: 'starter', 
    name: t('plans.starter.name'), 
    price: t('plans.starter.price'), 
    description: t('plans.starter.description'), 
    features: [
      t('plans.features.scheduling'), 
      t('plans.features.rosters'), 
      t('plans.features.messaging')
    ] 
  },
  { 
    id: 'standard', 
    name: t('plans.standard.name'), 
    price: t('plans.standard.price'), 
    description: t('plans.standard.description'), 
    features: [
      t('plans.features.scheduling'), 
      t('plans.features.rosters'), 
      t('plans.features.messaging'), 
      t('plans.features.payments'), 
      t('plans.features.uniforms')
    ] 
  },
  { 
    id: 'pro', 
    name: t('plans.pro.name'), 
    price: t('plans.pro.price'), 
    description: t('plans.pro.description'), 
    features: [
      t('plans.features.scheduling'), 
      t('plans.features.rosters'), 
      t('plans.features.messaging'), 
      t('plans.features.payments'), 
      t('plans.features.uniforms'), 
      t('plans.features.travel'), 
      t('plans.features.tryouts'), 
      t('plans.features.reporting'), 
      t('plans.features.support')
    ] 
  },
]

export default function FeatureUpgradePaywallContent() {
  const [searchParams] = useSearchParams()
  const referrer = searchParams.get('referrer') || 'default'
  const { currentOrganization } = useOrganization()
  const { setLoading } = useLoadingState()
  const orgId = currentOrganization?.id
  const { loading: licenseLoading, error: licenseError } = useLicense(orgId)
  const hasSetLoadingRef = useRef(false)

  const isAdmin = currentOrganization ? hasAnyRole(currentOrganization, ['org_admin']) : false
  const isPlatformAdmin = useAuth().profile?.isPlatformAdmin ?? false

  const successUrl = `${window.location.origin}${getLink(RouteKeys.ADMIN_ORGANIZATION_BILLING_CHECKOUT_SUCCESS)}`
  const cancelUrl = `${window.location.origin}${getLink(RouteKeys.ADMIN_ORGANIZATION_BILLING_CHECKOUT_CANCEL)}`

  const { loadingTierId, error: checkoutError, handleSelect } = useCheckoutSession({
    organizationId: orgId || '',
    successUrl,
    cancelUrl,
  })

  const canUpgrade = (isAdmin || isPlatformAdmin) && orgId

  // Handle loading state
  useEffect(() => {
    if (licenseLoading && !hasSetLoadingRef.current) {
      setLoading(true)
      hasSetLoadingRef.current = true
    } else if (!licenseLoading && hasSetLoadingRef.current) {
      setLoading(false)
      hasSetLoadingRef.current = false
    }
  }, [licenseLoading, setLoading])

  // Cleanup loading state on unmount
  useEffect(() => {
    return () => {
      if (hasSetLoadingRef.current) {
        setLoading(false)
        hasSetLoadingRef.current = false
      }
    }
  }, [setLoading])

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

  if (licenseLoading) {
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {planCards.map(plan => (
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
                <div className="oa-h2 oa-mb-4" style={{ fontWeight: 900 }}>{plan.price}</div>
                <p className="oa-body-s oa-mb-6" style={{ color: 'var(--org-text-secondary)' }}>{plan.description}</p>
                <div className="oa-flex oa-flex-col oa-gap-2 oa-mb-6" style={{ flex: 1 }}>
                  {plan.features.map(feature => (
                    <div key={feature} className="oa-flex oa-items-center oa-gap-2">
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--org-btn-primary-bg)' }}>check_circle</span>
                      <span className="oa-body-s" style={{ color: 'var(--org-text-primary)' }}>{feature}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleSelect(plan.id)}
                  disabled={!!loadingTierId}
                  className="oa-btn oa-btn--primary"
                  style={{
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '-0.01em',
                    opacity: loadingTierId === plan.id ? 0.5 : 1,
                    cursor: loadingTierId === plan.id ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loadingTierId === plan.id ? t('common.loading') : t('billing.continueToCheckout')}
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
