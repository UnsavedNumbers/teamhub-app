import { useState, useEffect, useRef } from 'react'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useLicense } from '../../hooks/useLicense'
import { useAuth } from '../../hooks/useAuth'
import { useLoadingState } from '../../contexts/LoadingStateContext'
import { useCheckoutSession } from '../../hooks/useCheckoutSession'
import { useTheme } from '../../hooks/useTheme'
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

import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'

export default function TrialExpired() {
  useDebugLifecycle('TrialExpired')
  const { currentOrganization } = useOrganization()
  const { profile, signOut } = useAuth()
  const { setLoading } = useLoadingState()
  const { resolvedTheme } = useTheme()
  const orgId = currentOrganization?.id
  const { loading: licenseLoading, error: licenseError } = useLicense(orgId)
  const [logoError, setLogoError] = useState(false)
  const [logoVersion, setLogoVersion] = useState(0)

  const isAdmin = currentOrganization ? hasAnyRole(currentOrganization, ['org_admin']) : false
  const isPlatformAdmin = profile?.isPlatformAdmin ?? false

  // Logo based on theme (same as PortalNav)
  const logoSrc = resolvedTheme === 'dark' 
    ? '/images/logo-dark.png' 
    : '/images/logo-light.png'
  const logoSrcWithCacheBust = `${logoSrc}?theme=${resolvedTheme}&v=${logoVersion}`

  // Reset logo error and increment version when theme changes
  useEffect(() => {
    setLogoError(false)
    setLogoVersion(prev => prev + 1)
  }, [resolvedTheme])

  const successUrl = `${window.location.origin}${getLink(RouteKeys.ADMIN_ORGANIZATION_BILLING_CHECKOUT_SUCCESS)}`
  const cancelUrl = `${window.location.origin}${getLink(RouteKeys.ADMIN_ORGANIZATION_BILLING_CHECKOUT_CANCEL)}`

  const { loadingPlan, error: checkoutError, handleSelect } = useCheckoutSession({
    organizationId: orgId || '',
    successUrl,
    cancelUrl,
  })

  const canUpgrade = (isAdmin || isPlatformAdmin) && orgId

  const handleSignOut = async () => {
    await signOut()
  }

  // Track whether we've set loading to true using a ref (survives through cleanup)
  const hasSetLoadingRef = useRef(false)

  // Handle loading state - only call setLoading when state actually changes to avoid counter imbalance
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

  if (!orgId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center p-8">
          <p className="text-[#4c739a] text-lg">{t('errors.missingOrganization')}</p>
        </div>
      </div>
    )
  }

  if (licenseLoading) {
    return null
  }

  if (licenseError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center p-8 max-w-md">
          <p className="text-[#4c739a] text-lg mb-4">{licenseError}</p>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm font-bold text-[#4c739a] hover:text-[#0d141b] transition-colors uppercase"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#0d141b] dark:text-slate-50 min-h-screen flex flex-col">
      {/* Minimal Header */}
      <header className="flex items-center justify-between px-10 py-6 border-b border-solid border-[#e7edf3] dark:border-slate-800 bg-white dark:bg-background-dark">
        <div className="flex items-center gap-2">
          {!logoError ? (
            <img 
              key={logoSrc}
              src={logoSrcWithCacheBust} 
              alt="Youth Sports" 
              className="h-8 w-auto transition-opacity duration-200"
              onError={() => {
                console.error('Failed to load logo:', logoSrc)
                setLogoError(true)
              }}
            />
          ) : (
            <div className="size-8 text-primary">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z" fill="currentColor"></path>
                <path clipRule="evenodd" d="M39.998 12.236C39.9944 12.2537 39.9875 12.2845 39.9748 12.3294C39.9436 12.4399 39.8949 12.5741 39.8346 12.7175C39.8168 12.7597 39.7989 12.8007 39.7813 12.8398C38.5103 13.7113 35.9788 14.9393 33.7095 15.4811C30.9875 16.131 27.6413 16.5217 24 16.5217C20.3587 16.5217 17.0125 16.131 14.2905 15.4811C12.0012 14.9346 9.44505 13.6897 8.18538 12.8168C8.17384 12.7925 8.16216 12.767 8.15052 12.7408C8.09919 12.6249 8.05721 12.5114 8.02977 12.411C8.00356 12.3152 8.00039 12.2667 8.00004 12.2612C8.00004 12.261 8 12.2607 8.00004 12.2612C8.00004 12.2359 8.0104 11.9233 8.68485 11.3686C9.34546 10.8254 10.4222 10.2469 11.9291 9.72276C14.9242 8.68098 19.1919 8 24 8C28.8081 8 33.0758 8.68098 36.0709 9.72276C37.5778 10.2469 38.6545 10.8254 39.3151 11.3686C39.9006 11.8501 39.9857 12.1489 39.998 12.236ZM4.95178 15.2312L21.4543 41.6973C22.6288 43.5809 25.3712 43.5809 26.5457 41.6973L43.0534 15.223C43.0709 15.1948 43.0878 15.1662 43.104 15.1371L41.3563 14.1648C43.104 15.1371 43.1038 15.1374 43.104 15.1371L43.1051 15.135L43.1065 15.1325L43.1101 15.1261L43.1199 15.1082C43.1276 15.094 43.1377 15.0754 43.1497 15.0527C43.1738 15.0075 43.2062 14.9455 43.244 14.8701C43.319 14.7208 43.4196 14.511 43.5217 14.2683C43.6901 13.8679 44 13.0689 44 12.2609C44 10.5573 43.003 9.22254 41.8558 8.2791C40.6947 7.32427 39.1354 6.55361 37.385 5.94477C33.8654 4.72057 29.133 4 24 4C18.867 4 14.1346 4.72057 10.615 5.94478C8.86463 6.55361 7.30529 7.32428 6.14419 8.27911C4.99695 9.22255 3.99999 10.5573 3.99999 12.2609C3.99999 13.1275 4.29264 13.9078 4.49321 14.3607C4.60375 14.6102 4.71348 14.8196 4.79687 14.9689C4.83898 15.0444 4.87547 15.1065 4.9035 15.1529C4.91754 15.1762 4.92954 15.1957 4.93916 15.2111L4.94662 15.223L4.95178 15.2312ZM35.9868 18.996L24 38.22L12.0131 18.996C12.4661 19.1391 12.9179 19.2658 13.3617 19.3718C16.4281 20.1039 20.0901 20.5217 24 20.5217C27.9099 20.5217 31.5719 20.1039 34.6383 19.3718C35.082 19.2658 35.5339 19.1391 35.9868 18.996Z" fill="currentColor" fillRule="evenodd"></path>
              </svg>
            </div>
          )}
        </div>
        <div className="flex gap-4">
          <a
            href="mailto:support@youthsports.team"
            className="px-4 py-2 text-sm font-bold text-[#4c739a] hover:text-[#0d141b] dark:hover:text-white transition-colors uppercase"
          >
            {t('trialExpired.header.support')}
          </a>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm font-bold text-[#4c739a] hover:text-[#0d141b] dark:hover:text-white transition-colors uppercase"
          >
            {t('trialExpired.header.signOut')}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start py-12 px-6">
        {/* Massive Headline */}
        <div className="max-w-[1200px] w-full text-center mb-10">
          <h1 className="text-[#0d141b] dark:text-white text-[96px] font-black leading-none tracking-tight uppercase">
            {t('trialExpired.headline')}
          </h1>
          <p className="text-[#4c739a] text-xl font-medium mt-4 max-w-2xl mx-auto uppercase tracking-widest">
            {t('trialExpired.subheadline')}
          </p>
        </div>

        {/* Status Header Card */}
        <div className="max-w-[960px] w-full mb-16">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-[#e7edf3] dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <span className="size-3 bg-red-500 rounded-full animate-pulse"></span>
                <h2 className="text-2xl font-black uppercase tracking-tight">{t('trialExpired.statusTitle')}</h2>
              </div>
              <p className="text-[#4c739a] text-lg">
                {canUpgrade ? t('trialExpired.statusDescriptionAdmin') : t('trialExpired.statusDescriptionNonAdmin')}
              </p>
            </div>
            {canUpgrade && (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => {
                    const planSelectionSection = document.getElementById('plan-selection')
                    if (planSelectionSection) {
                      planSelectionSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }}
                  className="bg-primary text-white font-black text-xl px-12 py-5 rounded-lg shadow-[0_8px_0_0_#0d5bb1] hover:translate-y-[2px] hover:shadow-[0_6px_0_0_#0d5bb1] active:translate-y-[8px] active:shadow-none transition-all uppercase tracking-tight"
                >
                  {t('trialExpired.upgradeButton')}
                </button>
                <p className="text-[10px] text-[#4c739a] font-bold uppercase mt-2">{t('trialExpired.tagline')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {checkoutError && (
          <div className="max-w-[960px] w-full mb-8">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200 text-sm">{checkoutError}</p>
            </div>
          </div>
        )}

        {/* Comparison Grid */}
        <div className="max-w-[960px] w-full mb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-[#cfdbe7] dark:border-slate-700 rounded-2xl overflow-hidden">
            {/* Restricted Column */}
            <div className="bg-[#f8f9fb] dark:bg-slate-950 p-10 flex flex-col gap-8 border-r border-[#cfdbe7] dark:border-slate-700">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#4c739a] text-3xl">lock</span>
                <h3 className="text-2xl font-black uppercase tracking-tight text-[#4c739a]">{t('trialExpired.restricted')}</h3>
              </div>
              <ul className="space-y-6">
                <li className="flex flex-col gap-1 border-b border-dashed border-[#cfdbe7] pb-4">
                  <p className="text-[#4c739a] text-xs font-black uppercase tracking-wider">{t('trialExpired.comparison.restricted.performanceInsights')}</p>
                  <p className="text-[#0d141b] dark:text-slate-300 text-lg font-bold">{t('trialExpired.comparison.restricted.viewOnly')}</p>
                </li>
                <li className="flex flex-col gap-1 border-b border-dashed border-[#cfdbe7] pb-4">
                  <p className="text-[#4c739a] text-xs font-black uppercase tracking-wider">{t('trialExpired.comparison.restricted.teamSize')}</p>
                  <p className="text-[#0d141b] dark:text-slate-300 text-lg font-bold">{t('trialExpired.comparison.restricted.athletesMax')}</p>
                </li>
                <li className="flex flex-col gap-1 border-b border-dashed border-[#cfdbe7] pb-4">
                  <p className="text-[#4c739a] text-xs font-black uppercase tracking-wider">{t('trialExpired.comparison.restricted.accessLevel')}</p>
                  <p className="text-[#0d141b] dark:text-slate-300 text-lg font-bold">{t('trialExpired.comparison.restricted.readOnlyMode')}</p>
                </li>
              </ul>
            </div>
            {/* Restored Column */}
            <div className="bg-white dark:bg-slate-900 p-10 flex flex-col gap-8">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-3xl">check_circle</span>
                <h3 className="text-2xl font-black uppercase tracking-tight text-primary">{t('trialExpired.restored')}</h3>
              </div>
              <ul className="space-y-6">
                <li className="flex flex-col gap-1 border-b border-dashed border-primary/20 pb-4">
                  <p className="text-primary text-xs font-black uppercase tracking-wider">{t('trialExpired.comparison.restored.performanceAnalytics')}</p>
                  <p className="text-[#0d141b] dark:text-white text-lg font-bold">{t('trialExpired.comparison.restored.realTimeInsights')}</p>
                </li>
                <li className="flex flex-col gap-1 border-b border-dashed border-primary/20 pb-4">
                  <p className="text-primary text-xs font-black uppercase tracking-wider">{t('trialExpired.comparison.restored.growYourTeam')}</p>
                  <p className="text-[#0d141b] dark:text-white text-lg font-bold">{t('trialExpired.comparison.restored.unlimitedAthletes')}</p>
                </li>
                <li className="flex flex-col gap-1 border-b border-dashed border-primary/20 pb-4">
                  <p className="text-primary text-xs font-black uppercase tracking-wider">{t('trialExpired.comparison.restored.fullControl')}</p>
                  <p className="text-[#0d141b] dark:text-white text-lg font-bold">{t('trialExpired.comparison.restored.exportManage')}</p>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Plan Selection (Admin Only) */}
        {canUpgrade && (
          <div id="plan-selection" className="max-w-[960px] w-full mb-20 scroll-mt-8">
            <h3 className="text-2xl font-black uppercase tracking-tight text-center mb-8 text-[#0d141b] dark:text-white">
              {t('trialExpired.planSelectionTitle')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {planCards.map(plan => (
                <div
                  key={plan.id}
                  className="bg-white dark:bg-slate-900 border border-[#e7edf3] dark:border-slate-800 rounded-2xl p-6 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-black uppercase tracking-tight">{plan.name}</h4>
                  </div>
                  <div className="text-3xl font-black mb-4">{plan.price}</div>
                  <p className="text-[#4c739a] text-sm mb-6">{plan.description}</p>
                  <div className="flex flex-col gap-2 mb-6 flex-1">
                    {plan.features.map(feature => (
                      <div key={feature} className="flex items-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                        <span className="text-[#0d141b] dark:text-slate-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleSelect(plan.id)}
                    disabled={!!loadingPlan}
                    className="bg-primary text-white font-black px-6 py-3 rounded-lg uppercase tracking-tight disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                  >
                    {loadingPlan === plan.id ? t('common.loading') : t('billing.continueToCheckout')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Why Organizations Upgrade */}
        <div className="max-w-[960px] w-full text-center pb-20">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[#4c739a] mb-8">{t('trialExpired.whyUpgrade')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-6 border border-[#e7edf3] dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-primary text-4xl">speed</span>
              <p className="font-black uppercase tracking-tighter text-sm">{t('trialExpired.upgradeReasons.elitePerformance')}</p>
            </div>
            <div className="p-6 border border-[#e7edf3] dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-primary text-4xl">hub</span>
              <p className="font-black uppercase tracking-tighter text-sm">{t('trialExpired.upgradeReasons.centralizedData')}</p>
            </div>
            <div className="p-6 border border-[#e7edf3] dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-primary text-4xl">verified_user</span>
              <p className="font-black uppercase tracking-tighter text-sm">{t('trialExpired.upgradeReasons.totalControl')}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-10 px-10 border-t border-[#e7edf3] dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4c739a]">
            {t('trialExpired.footer.copyright')}
          </div>
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-[#4c739a]">
            <a className="hover:text-primary transition-colors" href="#">{t('trialExpired.footer.privacy')}</a>
            <a className="hover:text-primary transition-colors" href="#">{t('trialExpired.footer.terms')}</a>
            <a className="hover:text-primary transition-colors" href="#">{t('trialExpired.footer.security')}</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
